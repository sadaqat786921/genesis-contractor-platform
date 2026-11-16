import { useRef, useState } from 'react';
import { BadgeCheck, Upload, Download, History, FileText, IdCard, ShieldCheck, Flame, UserCheck, Camera } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, daysFrom, fmtDate, type CDoc } from '../data';
import { Btn, Card, Chip, Note, UploadModal, Field, Text, Modal, Empty, InfoTip, MoreMenu, Facts } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { docView, DemoAnswer, downloadPdf, lspSays } from './lib';

const ICON: Record<string, typeof IdCard> = { D1: IdCard, D2: UserCheck, D3: ShieldCheck, D4: Flame, D5: BadgeCheck };

/** What LSP holds before it gives a contractor work: ID, right to work, insurance, trade registration and DBS check.
    Insurance, the trade registration and the DBS check must stay in date. If one runs out, the contractor is paused. */
export function Compliance() {
  const s = useStore(); const [up, setUp] = useState<CDoc | null>(null); const [hist, setHist] = useState<CDoc | null>(null);
  const paused = s.me.status === 'Paused';
  const setDoc = (id: string, patch: Partial<CDoc>) => s.setMe(m => ({ ...m, docs: m.docs.map(d => d.id === id ? { ...d, ...patch } : d) }));
  const allOk = (docs: CDoc[]) => docs.every(d => d.status === 'Verified' && (!d.expires || daysFrom(d.expires) >= 0));
  const activeAgain = () => s.setMe(m => allOk(m.docs) ? { ...m, status: 'Active', pausedWhy: undefined } : m);
  const save = (d: CDoc, patch: Partial<CDoc>, what: string) => {
    setDoc(d.id, { status: 'Uploaded', uploaded: nowStamp(), note: undefined, history: [{ file: d.file, uploaded: d.uploaded, expires: d.expires }, ...d.history], ...patch });
    s.log(what, 'Compliance'); s.toast('Uploaded. LSP checks it, usually the same day.'); setUp(null);
  };
  return <>
    <PageHeader crumbs={crumbsFor('compliance', s.go)} title="Insurance & Certificates" />
    {paused ? <div className="alertbar a-err"><span className="tile t-err" style={{ width: 32, height: 32 }}><BadgeCheck size={18} /></span><b className="grow">You're paused: {s.me.pausedWhy}. Upload the new one to get jobs again.</b></div>
      : <div className="alertbar a-ok"><span className="tile t-ok" style={{ width: 32, height: 32 }}><BadgeCheck size={18} /></span><b className="grow">You're active. Everything LSP needs is checked.</b></div>}
    <Card title={<span className="clean-h">Your documents<InfoTip>Insurance (at least £2 million), your trade registration and your DBS check must stay in date. You get reminders 60 and 30 days before. If one ends, LSP pauses you until the new one is checked.</InfoTip></span>}>
      <div>{s.me.docs.map(d => { const v = docView(d); const Ic = ICON[d.id] ?? FileText; return <div key={d.id} className="rowlink" style={{ cursor: 'default' }}>
        <span className={`tile t-${v.tone === 'ok' ? 'brand' : v.tone}`} style={{ width: 36, height: 36 }}><Ic size={17} /></span>
        <div className="stack grow" style={{ minWidth: 0 }}><b>{d.name}</b><span className="caption">{d.ref ?? 'Checked when you joined'}{d.files ? ' · photo of both sides' : ''}</span>{d.note && <span className="caption" style={{ color: 'var(--err)' }}>{d.note}</span>}</div>
        <span className="stack" style={{ width: 130 }}><span className="caption">{d.expires ? (d.renewLabel ?? 'Valid until') : 'Uploaded'}</span><b className="small" style={{ color: 'var(--text-primary)' }}>{d.expires ?? d.uploaded.split(',')[0]}</b></span>
        <span style={{ width: 130 }}><Chip tone={v.tone}>{v.label}</Chip></span>
        <Btn sm kind={v.tone === 'err' || v.tone === 'warn' ? 'primary' : 'outline'} icon={<Upload size={14} />} onClick={() => setUp(d)}>Upload new</Btn>
        <MoreMenu label="···" items={[{ label: 'Download', icon: <Download size={16} />, onClick: () => { s.log(`Downloaded ${d.name}`, 'Compliance'); downloadPdf(s, d.name); } }, d.history.length > 0 && { label: 'Earlier versions', icon: <History size={16} />, onClick: () => setHist(d) }]} />
      </div>; })}</div>
    </Card>
    {s.me.docs.some(d => d.status === 'Uploaded') && <DemoAnswer>{s.me.docs.filter(d => d.status === 'Uploaded').map(d => [
      <Btn key={d.id + 'y'} sm kind="outline" onClick={() => { setDoc(d.id, { status: 'Verified', note: undefined }); activeAgain(); lspSays(s, `${d.name} checked`, `Thanks Gary, your new ${d.name.toLowerCase()} is checked.`, 'James Carter'); s.log(`LSP checked your ${d.name}`, 'Compliance', 'James Carter'); s.toast(`${d.name} checked`); }}>LSP checks {d.name.toLowerCase()}</Btn>,
      <Btn key={d.id + 'n'} sm kind="ghost" onClick={() => { const r = d.files ? 'The back of the certificate is blurred. Please take a clear photo.' : 'The page with the end date is missing. Please upload the whole document.'; setDoc(d.id, { status: 'Rejected', note: r }); lspSays(s, `${d.name}: please upload again`, r, 'James Carter'); s.toast('LSP asked for it again'); }}>LSP asks for it again</Btn>])}</DemoAnswer>}
    {!paused && <DemoAnswer note="Shows what happens when a document runs out. In the live product this happens on the end date.">
      <Btn sm kind="outline" onClick={() => { s.setMe(m => ({ ...m, status: 'Paused', pausedWhy: 'public liability insurance ended on 14 Oct 2026', docs: m.docs.map(d => d.id === 'D3' ? { ...d, expires: '14 Oct 2026' } : d) })); s.log('Paused: public liability insurance ended', 'Compliance', 'LSP'); s.toast('Insurance ended. You are paused.'); }}>Insurance runs out</Btn>
    </DemoAnswer>}
    {up && (up.files ? <DbsUpload d={up} onClose={() => setUp(null)} onSave={(front, back, issued, ref) => { const i = new Date(issued + 'T00:00'); const r = new Date(i); r.setFullYear(r.getFullYear() + 3); save(up, { file: front, files: { front, back }, issued: fmtDate(i), expires: fmtDate(r), ref }, `Uploaded a new DBS check (issued ${fmtDate(i)})`); }} />
      : <UploadDoc d={up} onClose={() => setUp(null)} onSave={(file, expires, ref) => save(up, { file, expires: up.expires ? expires : undefined, ref: ref || up.ref }, `Uploaded a new ${up.name}${up.expires ? `, valid until ${expires}` : ''}`)} />)}
    {hist && <Modal title={`Earlier versions · ${hist.name}`} onClose={() => setHist(null)} footer={<Btn kind="outline" onClick={() => setHist(null)}>Close</Btn>}>
      {hist.history.length ? <div>{hist.history.map((h, i) => <div key={i} className="rowlink" style={{ cursor: 'default' }}><span className="tile t-neutral" style={{ width: 32, height: 32 }}><FileText size={15} /></span><div className="stack grow"><b>{h.file}</b><span className="caption">Uploaded {h.uploaded}{h.expires ? ` · valid until ${h.expires}` : ''}</span></div><Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => downloadPdf(s, h.file)}>Download</Btn></div>)}</div> : <Empty>No earlier versions.</Empty>}
    </Modal>}
  </>;
}

function UploadDoc({ d, onClose, onSave }: { d: CDoc; onClose: () => void; onSave: (file: string, expires: string, ref: string) => void }) {
  const [ref, setRef] = useState(d.ref ?? '');
  return <UploadModal title={`New ${d.name.toLowerCase()}`} withExpiry={!!d.expires} cta="Upload"
    extra={<Field label={d.id === 'D3' ? 'Cover and policy number' : d.id === 'D4' ? 'Registration number' : 'Reference (optional)'}><Text value={ref} onChange={setRef} /></Field>}
    onClose={onClose} onSave={v => onSave(v.file, v.expires, ref)} />;
}

/** DBS check: a photo of the front and the back of the certificate, its number and the date it was issued. */
export function DbsUpload({ onClose, onSave, d }: { d?: CDoc; onClose: () => void; onSave: (front: string, back: string, issued: string, ref: string) => void }) {
  const [front, setFront] = useState(''); const [back, setBack] = useState('');
  const [no, setNo] = useState(d?.ref?.match(/\d{12}/)?.[0] ?? ''); const [level, setLevel] = useState(d?.ref?.split(' DBS')[0] ?? 'Basic'); const [issued, setIssued] = useState('');
  const age = issued ? (Date.now() - new Date(issued + 'T00:00').getTime()) / (365.25 * 864e5) : 0;
  const tooOld = issued && age > 3; const future = issued && new Date(issued + 'T00:00') > new Date(2026, 9, 15);
  const ok = front && back && /^\d{12}$/.test(no) && issued && !tooOld && !future;
  return <Modal title="DBS check" sub="A photo of each side of your DBS certificate." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Upload size={16} />} disabled={!ok} onClick={() => onSave(front, back, issued, `${level} DBS · certificate ${no}`)}>Upload</Btn></>}>
    <div className="grid g2"><SidePick label="Front" value={front} set={setFront} /><SidePick label="Back" value={back} set={setBack} /></div>
    <div className="grid g2"><Field label="Type of check"><select className="input" value={level} onChange={e => setLevel(e.target.value)}>{['Basic', 'Standard', 'Enhanced'].map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Certificate number" hint="12 digits"><Text value={no} onChange={v => setNo(v.replace(/\D/g, '').slice(0, 12))} /></Field></div>
    <Field label="Date issued"><input className="input" type="date" value={issued} onChange={e => setIssued(e.target.value)} /></Field>
    {tooOld && <Note tone="err">LSP needs a DBS check from the last 3 years. Apply for a new one at gov.uk/request-copy-criminal-record.</Note>}
    {future && <Note tone="err">The issue date can't be in the future.</Note>}
    {issued && !tooOld && !future && <Facts items={[['LSP asks for a new one by', (() => { const r = new Date(issued + 'T00:00'); r.setFullYear(r.getFullYear() + 3); return fmtDate(r); })()]]} />}
  </Modal>;
}
function SidePick({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return <Field label={label}><button type="button" className="dropzone" style={{ minHeight: 110 }} onClick={() => ref.current?.click()}><Camera size={20} />{value ? <b>{value}</b> : <span className="caption">Photo of the {label.toLowerCase()}</span>}</button>
    <input ref={ref} type="file" accept="image/*,.pdf" hidden aria-label={`DBS ${label.toLowerCase()}`} onChange={e => set(e.target.files?.[0]?.name ?? '')} /></Field>;
}
