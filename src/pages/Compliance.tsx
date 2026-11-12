import { useState } from 'react';
import { BadgeCheck, Upload, Download, History, ShieldAlert, CalendarClock, FileText } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, daysFrom, type CDoc } from '../data';
import { Btn, Card, Chip, KV, Kpi, Note, UploadModal, Field, Text, Modal, Empty } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { docView, docsDue, DemoAnswer, downloadPdf, lspSays } from './lib';

/** What LSP needs before it gives a contractor work: ID, right to work, insurance, trade registration and bank details.
    Insurance and the trade registration must stay in date. If one runs out, the contractor is paused. */
export function Compliance() {
  const s = useStore(); const [up, setUp] = useState<CDoc | null>(null); const [hist, setHist] = useState<CDoc | null>(null);
  const due = docsDue(s); const ok = s.me.docs.filter(d => d.status === 'Verified' && docView(d).tone === 'ok').length;
  const next = s.me.docs.filter(d => d.expires && daysFrom(d.expires) >= 0).sort((a, b) => daysFrom(a.expires!) - daysFrom(b.expires!))[0];
  const paused = s.me.status === 'Paused';
  const setDoc = (id: string, patch: Partial<CDoc>) => s.setMe(m => ({ ...m, docs: m.docs.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const activeAgain = () => s.setMe(m => ({ ...m, status: m.docs.every(d => d.status === 'Verified' && (!d.expires || daysFrom(d.expires) >= 0)) ? 'Active' : m.status, pausedWhy: m.docs.every(d => d.status === 'Verified' && (!d.expires || daysFrom(d.expires) >= 0)) ? undefined : m.pausedWhy }));
  return <>
    <PageHeader crumbs={crumbsFor('compliance', s.go)} title="Insurance & Certificates" />
    {paused ? <Note tone="err">You are paused: {s.me.pausedWhy}. LSP can't give you new jobs or let you start booked ones until the new document is checked.</Note>
      : <Note tone="ok">You're active. Everything LSP needs is checked, so LSP can give you jobs.</Note>}
    <div className="grid g3">
      <Kpi icon={<BadgeCheck size={18} />} tone={paused ? 'err' : 'ok'} label="Your account" value={paused ? 'Paused' : 'Active'} caption={paused ? 'no new jobs until fixed' : 'LSP can give you jobs'} />
      <Kpi icon={<FileText size={18} />} tone={due.length ? 'warn' : 'ok'} label="Documents checked" value={`${ok} of ${s.me.docs.length}`} caption={due.length ? `${due.length} need${due.length === 1 ? 's' : ''} you` : 'all in date'} />
      <Kpi icon={<CalendarClock size={18} />} tone="info" label="Next renewal" value={next ? next.expires!.replace(/ \d{4}$/, '') : '—'} caption={next ? `${next.name} · in ${daysFrom(next.expires!)} days` : 'nothing ends soon'} />
    </div>
    <div className="col">
        <Card title="What LSP holds for you" sub="Upload a new one before the old one ends. LSP checks it, usually the same day. Earlier versions are kept.">
          <div className="tablewrap"><table className="t"><thead><tr><th>Document</th><th>File</th><th>Valid until</th><th>Status</th><th /></tr></thead><tbody>
            {s.me.docs.map(d => { const v = docView(d); return <tr key={d.id} style={{ cursor: 'default' }}>
              <td><span className="stack"><b className="strong">{d.name}</b><span className="caption">{d.ref ?? (d.needed === 'Always' ? 'Checked when you joined' : '')}</span></span></td>
              <td><span className="stack"><span>{d.file}</span><span className="caption">Uploaded {d.uploaded}</span></span></td>
              <td>{d.expires ?? <span className="muted">Doesn't end</span>}</td>
              <td><Chip tone={v.tone}>{v.label}</Chip>{d.note && <div className="caption" style={{ marginTop: 4, color: 'var(--err)' }}>{d.note}</div>}</td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><Btn sm kind={v.tone === 'err' || v.tone === 'warn' ? 'primary' : 'outline'} icon={<Upload size={14} />} onClick={() => setUp(d)}>Upload new</Btn>{' '}<Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => { s.log(`Downloaded ${d.name}`, 'Compliance'); downloadPdf(s, d.name); }}>Download</Btn>{d.history.length > 0 && <>{' '}<Btn sm kind="ghost" icon={<History size={14} />} onClick={() => setHist(d)}>Earlier</Btn></>}</td>
            </tr>; })}
          </tbody></table></div>
        </Card>
        {s.me.docs.some(d => d.status === 'Uploaded') && <DemoAnswer>{s.me.docs.filter(d => d.status === 'Uploaded').map(d => [
          <Btn key={d.id + 'y'} sm kind="outline" onClick={() => { setDoc(d.id, { status: 'Verified', note: undefined }); activeAgain(); lspSays(s, `${d.name} checked`, `Thanks Gary, your new ${d.name.toLowerCase()} is checked.`, 'James Carter'); s.log(`LSP checked your ${d.name}`, 'Compliance', 'James Carter'); s.toast(`${d.name} checked`); }}>LSP checks {d.name.toLowerCase()}</Btn>,
          <Btn key={d.id + 'n'} sm kind="ghost" onClick={() => { const r = 'The page with the end date is missing. Please upload the whole document.'; setDoc(d.id, { status: 'Rejected', note: r }); lspSays(s, `${d.name}: please upload again`, r, 'James Carter'); s.toast('LSP asked for it again'); }}>LSP asks for it again</Btn>])}</DemoAnswer>}
        {!paused && <DemoAnswer note="Shows what happens when a document runs out. In the live product this happens on the end date.">
          <Btn sm kind="outline" onClick={() => { s.setMe(m => ({ ...m, status: 'Paused', pausedWhy: 'Public liability insurance ended on 14 Oct 2026', docs: m.docs.map(d => d.id === 'D3' ? { ...d, expires: '14 Oct 2026' } : d) })); s.log('Paused: public liability insurance ended', 'Compliance', 'LSP'); s.toast('Insurance ended. You are paused.'); }}>Insurance runs out</Btn>
        </DemoAnswer>}
    </div>
    <div className="grid g2">
        <Card title="The rules" sub="The same for every contractor LSP uses.">
          <div className="col" style={{ gap: 8 }}>{['Photo ID, right to work and bank details are checked once, when you join.', 'Public liability insurance (at least £2 million) and your trade registration must stay in date.', 'You get reminders 60 and 30 days before one ends, by email and here.', 'If one ends, you are paused: no new jobs, and booked jobs may move to someone else.', 'Upload the new one and you are active again as soon as LSP checks it.'].map((t, i) => <span key={i} className="flex small" style={{ gap: 10, alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 24, height: 24, fontSize: 12, fontWeight: 700, flex: 'none' }}>{i + 1}</span>{t}</span>)}</div>
        </Card>
        <Card title="Gas Safe" action={<ShieldAlert size={18} color="#667085" />}><KV rows={[['Registration', s.me.docs.find(d => d.id === 'D4')?.ref ?? '—'], ['Valid until', s.me.docs.find(d => d.id === 'D4')?.expires ?? '—'], ['Work you do for LSP', 'Gas safety checks (CP12), boilers, heating']]} />
          <span className="caption">The engineer who does the work must be on your Gas Safe registration.</span></Card>
    </div>
    {up && <UploadDoc d={up} onClose={() => setUp(null)} onSave={(file, expires, ref) => {
      setDoc(up.id, { status: 'Uploaded', file, uploaded: nowStamp(), expires: up.expires ? expires : undefined, ref: ref || up.ref, note: undefined, history: [{ file: up.file, uploaded: up.uploaded, expires: up.expires }, ...up.history] });
      s.log(`Uploaded a new ${up.name}${up.expires ? `, valid until ${expires}` : ''}`, 'Compliance'); s.toast('Uploaded. LSP checks it, usually the same day.'); setUp(null);
    }} />}
    {hist && <Modal title={`Earlier versions · ${hist.name}`} sub="Kept for the record. Only the newest one counts." onClose={() => setHist(null)} footer={<Btn kind="outline" onClick={() => setHist(null)}>Close</Btn>}>
      {hist.history.length ? <div className="divlist">{hist.history.map((h, i) => <div key={i} className="lrow"><span className="tile t-neutral" style={{ width: 32, height: 32 }}><FileText size={15} /></span><div className="stack grow"><b>{h.file}</b><span className="caption">Uploaded {h.uploaded}{h.expires ? ` · valid until ${h.expires}` : ''}</span></div><Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => downloadPdf(s, h.file)}>Download</Btn></div>)}</div> : <Empty>No earlier versions.</Empty>}
    </Modal>}
  </>;
}

function UploadDoc({ d, onClose, onSave }: { d: CDoc; onClose: () => void; onSave: (file: string, expires: string, ref: string) => void }) {
  const [ref, setRef] = useState(d.ref ?? '');
  return <UploadModal title={`Upload a new ${d.name.toLowerCase()}`} sub={d.expires ? 'Add the date it ends. LSP checks it before it counts.' : 'LSP checks it before it counts.'} withExpiry={!!d.expires} cta="Upload for LSP to check"
    extra={<Field label={d.id === 'D3' ? 'Cover and policy number' : d.id === 'D4' ? 'Registration number' : 'Reference (optional)'}><Text value={ref} onChange={setRef} /></Field>}
    onClose={onClose} onSave={v => onSave(v.file, v.expires, ref)} />;
}
