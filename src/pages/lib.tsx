import { useState, type ReactNode } from 'react';
import { Download, Send, Eye, FileText, Image as ImageIcon, Wrench, FlaskConical, Flame, Siren, Check } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { ME_NAME, TODAY, DAYS, MONTHS, nowStamp, parseDate, daysFrom, fmtDate, type Job, type Property, type Tone, type Comm, type Bill, type CDoc, type TermsDoc, type TermsId } from '../data';
import { Btn, Chip, Modal, KV, Card, Empty, Field, Area, Note } from '../ui';

/* Shared pieces for the contractor portal: what each job status means to the contractor, money, and the LSP paper.
   The contractor only sees what LSP pays them. Never LSP's price to the landlord or agent, budgets, plans or who owns the home. */

export type S = ReturnType<typeof useStore>;
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const num = (n: number) => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const ddmm = (x: string) => { const t = parseDate(x); return `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`; };
export const adminName = (s: S, id?: string) => s.staff.find(x => x.id === id)?.name ?? 'LSP';
export const adminOf = (s: S, id?: string) => s.staff.find(x => x.id === id);
export const homeType = (p: Property) => p.type === 'HMO' ? `Shared house · ${p.rooms} rooms` : `${p.beds} bed ${p.type.toLowerCase()}`;
export const firstName = (n: string) => n.split(' ')[0];
export const timeOf = (at: string) => at.split(', ')[1] ?? '';
export const dayOf = (at: string) => at.split(', ')[0];
/** "Thu 15 Oct" */
export const dayLabel = (at: string) => { const d = parseDate(at); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const whenLabel = (at: string) => { const n = daysFrom(at); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === -1 ? 'Yesterday' : dayLabel(at); };

/* ---------------- jobs, as the contractor sees them ---------------- */
export const DONE_JOB = ['Approved', 'Cancelled'];
export const isOpen = (j: Job) => !DONE_JOB.includes(j.status);
/** What the contractor has to do next on a job, if anything. */
export function todo(j: Job): string | null {
  if (j.status === 'Assigned') return j.visitOk ? (daysFrom(j.visit) <= 0 ? 'Start work' : null) : 'Confirm the visit';
  if (j.status === 'In progress') return 'Finish and send photos';
  if (j.status === 'Sent back') return 'Put it right';
  return null;
}
export const needsMe = (j: Job) => !!todo(j);
export const billOf = (s: S, j: Job) => s.bills.find(b => b.job === j.id);
export function jobView(s: S, j: Job): { label: string; tone: Tone } {
  switch (j.status) {
    case 'Assigned': return j.visitOk ? { label: daysFrom(j.visit) <= 0 ? 'Visit today' : 'Visit booked', tone: 'brand' } : { label: 'Confirm the visit', tone: 'warn' };
    case 'In progress': return { label: 'Work in progress', tone: 'brand' };
    case 'Proof uploaded': return { label: 'LSP checking', tone: 'info' };
    case 'Sent back': return { label: 'Sent back to fix', tone: 'err' };
    case 'Approved': { const b = billOf(s, j); return b?.paid ? { label: 'Paid', tone: 'ok' } : { label: `Approved · paid ${b ? b.payRun.replace(' 2026', '') : 'Friday'}`, tone: 'ok' }; }
    default: return { label: 'Cancelled', tone: 'neutral' };
  }
}
export const STEPS = ['Job given to you', 'Visit confirmed', 'Work started', 'Photos and invoice sent', 'Checked by LSP', 'Paid'];
export function stepAt(s: S, j: Job) {
  if (j.status === 'Approved') return billOf(s, j)?.paid ? 6 : 5;
  return ({ Assigned: j.visitOk ? 2 : 1, 'In progress': 3, 'Sent back': 3, 'Proof uploaded': 4, Cancelled: j.visitOk ? 2 : 1 } as Record<string, number>)[j.status] ?? 1;
}
/** Add a line to a job's history (date, time and who). */
export function jobEvent(s: S, id: string, text: string, patch: Partial<Job> = {}, by = s.me.name) {
  s.setJobs(js => js.map(x => x.id === id ? { ...x, ...patch, events: [...x.events, { at: nowStamp(), by, text }] } : x));
}
export const payText = (j: Job) => j.pay.kind === 'Hourly' ? `${j.pay.hours} hour${j.pay.hours === 1 ? '' : 's'} at ${money(j.pay.rate ?? 0)}${j.pay.parts ? ` + ${money(j.pay.parts)} parts` : ''}` : 'Fixed price';
/** Time off that covers a date. */
export const offOn = (s: S, at: string) => s.timeOff.find(t => { const d = parseDate(dayOf(at)).getTime(); return d >= parseDate(t.from).getTime() && d <= parseDate(t.to).getTime(); });

/* ---------------- money ---------------- */
/** Where the contractor's own invoice stands. */
export function invView(s: S, j: Job): { label: string; tone: Tone } {
  const b = billOf(s, j);
  if (b?.paid) return { label: `Paid ${b.paid}`, tone: 'ok' };
  if (b) return { label: `Approved · paid ${b.payRun}`, tone: 'ok' };
  if (j.status === 'Sent back') return { label: 'On hold · job sent back', tone: 'err' };
  if (j.status === 'Cancelled') return { label: 'Not paid · cancelled', tone: 'neutral' };
  return { label: 'LSP checking', tone: 'info' };
}
/** LSP pays approved invoices every Friday. The next pay day on or after today. */
export function nextPayDay(from = TODAY) { const d = new Date(from); while (d.getDay() !== 5) d.setDate(d.getDate() + 1); return fmtDate(d); }
export function moneyOf(s: S) {
  const sent = s.jobs.filter(j => j.cInvoice);
  const approved = s.bills.filter(b => !b.paid); const toCome = r2(approved.reduce((a, b) => a + b.amount, 0));
  const checking = sent.filter(j => !billOf(s, j) && ['Proof uploaded', 'Sent back'].includes(j.status));
  const checkingAmt = r2(checking.reduce((a, j) => a + (j.cInvoice?.amount ?? 0), 0));
  const paidYear = r2(s.bills.filter(b => b.paid?.endsWith('2026')).reduce((a, b) => a + b.amount, 0));
  const booked = s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status)); const bookedAmt = r2(booked.reduce((a, j) => a + j.pay.amount, 0));
  return { approved, toCome, checking, checkingAmt, paidYear, booked, bookedAmt, next: approved.sort((a, b) => daysFrom(a.payRun) - daysFrom(b.payRun))[0]?.payRun ?? nextPayDay() };
}
/** Bills paid together on one pay day make one remittance. */
export function remittances(s: S) {
  const by: Record<string, Bill[]> = {}; s.bills.filter(b => b.remit).forEach(b => { (by[b.remit!] ??= []).push(b); });
  return Object.entries(by).map(([id, bs]) => ({ id, date: bs[0].paid!, bills: bs, total: r2(bs.reduce((a, b) => a + b.amount, 0)) })).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
}

/* ---------------- documents LSP needs ---------------- */
export function docView(d: CDoc): { label: string; tone: Tone; days?: number } {
  if (d.status === 'Uploaded') return { label: 'LSP checking', tone: 'info' };
  if (d.status === 'Rejected') return { label: 'Upload again', tone: 'err' };
  if (d.expires) { const n = daysFrom(d.expires); if (n < 0) return { label: 'Expired', tone: 'err', days: n }; if (n <= 60) return { label: `Expires in ${n} days`, tone: 'warn', days: n }; return { label: 'In date', tone: 'ok', days: n }; }
  return { label: 'Checked', tone: 'ok' };
}
export const docsDue = (s: S) => s.me.docs.filter(d => ['err', 'warn'].includes(docView(d).tone));

/* ---------------- messages ---------------- */
const comm = (by: string, subject: string, text: string, dir: 'in' | 'out'): Comm => ({ id: 'cm' + Date.now() + Math.round(Math.random() * 1000), at: nowStamp(), by, channel: dir === 'in' ? 'Portal' : 'Email', dir, subject, text });
/** The contractor sends LSP a message. Saved in Messages with the date and time. */
export function sendMsg(s: S, subject: string, text: string) { s.setMe(a => ({ ...a, comms: [...a.comms, comm(ME_NAME, subject, text, 'in')] })); }
/** LSP's reply (prototype answers). */
export function lspSays(s: S, subject: string, text: string, by = 'Emma Thompson') { const c = comm(by, subject, text, 'out'); s.setMe(a => ({ ...a, comms: [...a.comms, c] })); }
export const unreadOf = (s: S) => s.me.comms.filter(c => c.by !== ME_NAME && !s.read.includes(c.id));

/* ---------------- the LSP paper template ---------------- */
export const COMPANY = { name: 'Landlord Service Plans Limited', address: ['1 Upper Street', 'London N1 0PQ'], email: 'accounts@lsp.co.uk', reg: 'Company Registration No. 13940065' };
/** Opens the browser's print dialog for the document only (Save as PDF). */
export function downloadPdf(s: S, name: string) {
  s.toast(`${name} ready. Choose "Save as PDF" to download.`);
  document.body.classList.add('printdoc');
  setTimeout(() => { try { window.print(); } catch { /* preview frames may block printing */ } document.body.classList.remove('printdoc'); }, 60);
}
export function DocSheet({ kind, to, meta, site, rows, foot, stamp, children }: {
  kind: string; to: { label: string; rows: string[] }; meta: [string, string][]; site?: string;
  rows?: { a: string; b: string; c?: string; amt: number }[]; foot?: [string, string][]; stamp?: { text: string; tone: 'ok' | 'info' | 'warn' }; children?: ReactNode;
}) {
  return <div className="docwrap"><div className="paper">
    <div className="doc-h">
      <div className="stack" style={{ gap: 2 }}><b className="doc-co">{COMPANY.name}</b>{COMPANY.address.map(a => <span key={a}>{a}</span>)}<span>{COMPANY.email}</span><span className="doc-reg">{COMPANY.reg}</span></div>
      <img src="images/logo.svg" alt="Landlord Service Plans" className="doc-logo" />
    </div>
    <div className="doc-title">{kind}{stamp && <span className={`doc-stamp s-${stamp.tone}`}>{stamp.text}</span>}</div>
    <div className="doc-top">
      <div className="stack" style={{ gap: 2 }}><span className="doc-lab">{to.label}</span>{to.rows.filter(Boolean).map((r, i) => <span key={i} className={i === 0 ? 'strong' : ''}>{r}</span>)}
        {site && <><span className="doc-lab" style={{ marginTop: 14 }}>Site address</span><span>{site}</span></>}</div>
      <div className="doc-meta">{meta.map(([k, v]) => <div key={k}><span className="doc-lab">{k}</span><span>{v}</span></div>)}</div>
    </div>
    {rows && <>
      <table className="doc-t"><thead><tr><th>Your invoice</th><th>Job</th><th>Approved</th><th className="r">Amount</th></tr></thead>
        <tbody>{rows.map((l, i) => <tr key={i}><td>{l.a}</td><td>{l.b}</td><td>{l.c}</td><td className="r">{num(l.amt)}</td></tr>)}</tbody></table>
      <div className="doc-tot">{(foot ?? []).map(([k, v], i, a) => <div key={k} className={i === a.length - 1 ? 'big' : ''}><span>{k}</span><b>{v}</b></div>)}</div>
    </>}
    {children}
    <div className="doc-f"><div className="stack" style={{ gap: 2 }}><span>{COMPANY.name}</span><span>{COMPANY.email}</span></div><span>Page 1 of 1</span></div>
  </div></div>;
}

/** Remittance: what LSP paid on one pay day, on LSP paper. */
export function RemittanceModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore(); const L = useLookups(); const r = remittances(s).find(x => x.id === id)!;
  return <Modal wide title={`Remittance ${r.id}`} sub={`Paid ${r.date} to the account ending ${last4(s)}.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log(`Downloaded remittance ${r.id}`, 'Payments'); downloadPdf(s, `Remittance ${r.id}`); }}>Download PDF</Btn></>}>
    <DocSheet kind="REMITTANCE ADVICE" stamp={{ text: 'PAID', tone: 'ok' }} to={{ label: 'Paid to', rows: [s.me.name, s.me.address, `Account ···· ${last4(s)}`] }}
      meta={[['Remittance', r.id], ['Paid on', ddmm(r.date)], ['Paid by', 'Bank transfer'], ['Invoices', String(r.bills.length)]]}
      rows={r.bills.map(b => { const j = s.jobs.find(x => x.id === b.job); return { a: b.no, b: `${j?.title ?? b.job} · ${L.prop(j?.property)?.address ?? ''}`, c: dayOf(b.approved), amt: b.amount }; })}
      foot={[['Total paid', '£' + num(r.total)]]}>
      <p className="doc-note">Paid by bank transfer. It can take up to 2 hours to reach your account. Questions about a payment: {COMPANY.email}.</p>
    </DocSheet>
  </Modal>;
}

/** Job report: every step with the date and time, the photos and the certificate. No LSP prices. */
export function JobReportModal({ j, onClose }: { j: Job; onClose: () => void }) {
  const s = useStore(); const L = useLookups(); const p = L.prop(j.property);
  return <Modal wide title={`Job report · ${j.title}`} sub={`${p?.address} · every step with the date and time, and the photo proof.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Close</Btn><Btn icon={<Download size={16} />} onClick={() => { s.log(`Downloaded the job report for ${j.title}`, 'Jobs'); downloadPdf(s, `Job report ${j.id}`); }}>Download PDF</Btn></>}>
    <DocSheet kind="JOB REPORT" to={{ label: 'Contractor', rows: [s.me.name, s.me.contact, s.me.trade] }} site={p ? `${p.address}, ${p.area} ${p.postcode}` : ''}
      meta={[['Job', j.id], ['Status', jobView(s, j).label], ['Given', dayOf(j.given)], ['LSP contact', adminName(s, j.admin)]]}>
      <div className="doc-sec"><span className="doc-lab">The job</span><b>{j.title}</b><span>{j.note}</span>
        <div className="doc-kv"><span>Room or area</span><b>{j.area ?? '—'}</b><span>Visit</span><b>{j.visit}</b><span>Agreed</span><b>{payText(j)} · {money(j.pay.amount)}</b><span>Your invoice</span><b>{j.cInvoice ? `${j.cInvoice.no} · ${money(j.cInvoice.amount)} · ${invView(s, j).label}` : 'Not sent yet'}</b>{j.cert && <><span>Certificate</span><b>{j.cert.name} · {j.cert.result} · valid until {j.cert.expires}</b></>}</div></div>
      {j.workNote && <div className="doc-sec"><span className="doc-lab">Your notes</span><span>{j.workNote}</span></div>}
      <div className="doc-sec"><span className="doc-lab">What happened</span>{j.events.map((e, i) => <div key={i} className="doc-ev"><span>{e.at}</span><span>{e.text}<em> · {e.by}</em></span></div>)}</div>
      <div className="doc-sec"><span className="doc-lab">Photo proof</span>{j.proof?.length ? <div className="doc-ph">{j.proof.map((x, i) => <div key={i} style={{ backgroundImage: `url(images/home${(i % 3) + 1}.jpg)` }}><span>{x}</span></div>)}</div> : <span className="caption"><ImageIcon size={12} style={{ verticalAlign: -2 }} /> Photos are added when the work is finished.</span>}</div>
    </DocSheet>
  </Modal>;
}

/* ---------------- small shared blocks ---------------- */
/** Ask LSP something. Saved in Messages with the date and time. */
export function AskModal({ title, about, onClose, onSent, sub, label = 'Your message', placeholder = 'Type your message' }: { title: string; about: string; onClose: () => void; onSent?: (text: string) => void; sub?: string; label?: string; placeholder?: string }) {
  const s = useStore(); const [t, setT] = useState('');
  return <Modal title={title} sub={sub ?? 'Goes to the Office Admin at LSP who gave you the job. You see the reply in Messages.'} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={!t.trim()} onClick={() => {
      sendMsg(s, about, t.trim()); s.log(`Sent a message: ${about}`, 'Messages'); s.toast('Message sent to LSP'); onSent?.(t.trim()); onClose();
    }}>Send</Btn></>}>
    <Field label="About"><input className="input" readOnly value={about} /></Field>
    <Field label={label}><Area value={t} onChange={setT} placeholder={placeholder} /></Field>
  </Modal>;
}
/** Things only LSP does, shown so the next step of the flow can be tried without the staff portals. */
export function DemoAnswer({ children, note = 'In the live product LSP does this from the Office Admin portal. Use these to show what happens next.' }: { children: ReactNode; note?: string }) {
  return <div className="demo"><span className="flex" style={{ gap: 6 }}><FlaskConical size={14} /><b>Prototype: LSP's answer</b></span><span className="caption">{note}</span><div className="flex wrap" style={{ gap: 8 }}>{children}</div></div>;
}
export function JobIcon({ j, size = 32 }: { j: Job; size?: number }) {
  const t = j.status === 'Sent back' || (j.urgent && isOpen(j)) ? 't-err' : needsMe(j) ? 't-warn' : j.status === 'Cancelled' ? 't-neutral' : DONE_JOB.includes(j.status) ? 't-ok' : 't-info';
  return <span className={`tile ${t}`} style={{ width: size, height: size }}>{j.urgent && isOpen(j) ? <Siren size={size / 2.1} /> : j.safety ? <Flame size={size / 2.1} /> : <Wrench size={size / 2.1} />}</span>;
}
export function MiniJobList({ jobs, empty = 'No jobs.' }: { jobs: Job[]; empty?: string }) {
  const s = useStore(); const L = useLookups();
  return jobs.length ? <div className="divlist">{jobs.map(j => { const v = jobView(s, j); return <button key={j.id} className="item click" onClick={() => s.go('jobs', j.id)}><JobIcon j={j} /><div className="stack grow"><b>{j.title}</b><span className="caption">{L.prop(j.property)?.address} · {['Assigned', 'In progress'].includes(j.status) ? `${whenLabel(j.visit)} ${timeOf(j.visit)}` : dayOf(j.given)} · {money(j.pay.amount)}</span></div><Chip tone={v.tone}>{v.label}</Chip></button>; })}</div> : <Empty icon={<Wrench size={22} />}>{empty}</Empty>;
}
export function ViewBtn({ onClick, label = 'View' }: { onClick: () => void; label?: string }) { return <Btn sm kind="ghost" icon={<Eye size={14} />} onClick={onClick}>{label}</Btn>; }
export function DocIcon({ tone = 'brand' }: { tone?: string }) { return <span className={`tile t-${tone}`} style={{ width: 32, height: 32 }}><FileText size={15} /></span>; }
export function SectionNote({ children }: { children: ReactNode }) { return <Card className="flat"><span className="small">{children}</span></Card>; }
export const bankLine = (s: S) => s.me.bank ? `${s.me.bank.name} · ${s.me.bank.sort} · ···· ${s.me.bank.last4}` : 'Not added yet';
export const last4 = (s: S) => s.me.bank?.last4 ?? '····';
export function InvoiceSummary({ j }: { j: Job }) {
  const s = useStore(); const v = invView(s, j); const b = billOf(s, j);
  if (!j.cInvoice) return null;
  return <KV rows={[['Invoice number', j.cInvoice.no], ['Amount', money(j.cInvoice.amount)], ['Sent', j.cInvoice.at], ['File', j.cInvoice.file], ['Status', <Chip key="c" tone={v.tone}>{v.label}</Chip>], ...(b ? [['LSP reference', b.id] as [string, ReactNode]] : []), ...(b?.remit ? [['Remittance', b.remit] as [string, ReactNode]] : [])]} />;
}
export { daysFrom };

/* ---------------- LSP's contractor agreement and rules ---------------- */
/** Documents LSP published a newer version of, that this contractor hasn't accepted yet. */
export const termsDue = (s: S) => (['agreement', 'rules'] as TermsId[]).filter(id => (s.me.accepted[id]?.version ?? 0) < s.terms[id].version);
/** Read LSP's current agreement or rules. With onAccept, the contractor ticks and accepts this version. */
export function TermsModal({ doc, onClose, onAccept }: { doc: TermsDoc; onClose: () => void; onAccept?: () => void }) {
  const [tick, setTick] = useState(false);
  return <Modal wide title={doc.title} sub={`Version ${doc.version} · updated ${dayOf(doc.published)} by LSP`} onClose={onClose}
    footer={onAccept ? <><Btn kind="outline" onClick={onClose}>Not now</Btn><Btn icon={<Check size={16} />} disabled={!tick} onClick={onAccept}>Accept version {doc.version}</Btn></> : <Btn onClick={onClose}>Close</Btn>}>
    {doc.version > 1 && <Note>What changed: {doc.change}</Note>}
    <div className="terms">{doc.sections.map((x, i) => <div key={x.h} className="terms-i"><span className="terms-n">{i + 1}</span><div className="stack"><b>{x.h}</b><span>{x.t}</span></div></div>)}</div>
    {onAccept && <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={tick} onChange={e => setTick(e.target.checked)} /> I have read and accept version {doc.version}</label>}
  </Modal>;
}
