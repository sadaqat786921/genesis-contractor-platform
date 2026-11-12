import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Upload, Check, Send, FileText, Clock, ShieldCheck, Building2, Wrench, BadgeCheck, PenLine, Mail, Phone, KeyRound, TriangleAlert } from 'lucide-react';
import { LSP_PHONE, TODAY, fmtDate, nowStamp, type DocStatus, type Tone } from '../data';
import { Btn, Card, Chip, Field, HSteps, KV, Modal, Note, Select, Text, Timeline, docTone } from '../ui';
import { DemoAnswer } from './lib';

/* Contractor onboarding: a new contractor applies to work for LSP and uploads their KYC.
   The Supervisor checks it on the Sign-Ups page of the Supervisor portal, then approves it (login email),
   asks for more information, or rejects it. Here the prototype answer box shows those answers. */

const TRADES = ['Gas engineer', 'Plumber', 'Electrician', 'Roofer', 'Carpenter & locks', 'Locksmith', 'Damp and mould', 'Decorator', 'General maintenance', 'Site Inspector'];
const AREAS = ['Islington', 'Camden', 'Highbury', 'Holloway', 'Tottenham', 'Crouch End', 'Finchley', 'Highgate', 'Muswell Hill', 'Hampstead', 'Hackney', 'Enfield'];
/** The trade registration LSP asks for, by trade. */
const REG: Record<string, string> = { 'Gas engineer': 'Gas Safe registration', Electrician: 'NICEIC or NAPIT registration', Plumber: 'WaterSafe or CIPHE membership', Roofer: 'CompetentRoofer card', Locksmith: 'MLA membership', 'Site Inspector': 'AIIC or ABBE membership' };
const STEPS = ['Your business', 'Your work', 'Your documents', 'Agree and send', 'LSP checks'];

interface JDoc { key: string; name: string; why: string; file: string; status: DocStatus; expires?: string; ref?: string; note?: string; needsDate?: boolean }
interface App {
  type: string; name: string; companyNo: string; contact: string; email: string; phone: string; address: string; postcode: string; vat: string; vatNo: string;
  kind: string; trades: string[]; areas: string[]; rate: string; team: string; years: string; emergency: string;
  cover: string; bank: { name: string; sort: string; acc: string };
  docs: JDoc[]; agree: { terms: boolean; rules: boolean; checks: boolean; true: boolean };
  status: 'Draft' | 'Waiting' | 'More info asked' | 'Approved' | 'Rejected'; ref: string; sent?: string; reason?: string; events: { at: string; text: string; by: string }[];
}
const docsFor = (trades: string[]): JDoc[] => {
  const reg = trades.map(t => REG[t]).filter(Boolean);
  return [
    { key: 'id', name: 'Photo ID', why: 'Passport or photo driving licence of the main contact', file: '', status: 'Missing' },
    { key: 'rtw', name: 'Right to work', why: 'Share code from GOV.UK, or a UK or Irish passport', file: '', status: 'Missing' },
    { key: 'ins', name: 'Public liability insurance', why: 'At least £2 million cover. Add the date it ends.', file: '', status: 'Missing', needsDate: true },
    ...(reg.length ? [...new Set(reg)] : ['Trade certificate or qualification']).map((n, i) => ({ key: 'reg' + i, name: n, why: 'Your registration or membership. Add the number and the date it ends.', file: '', status: 'Missing' as DocStatus, needsDate: true })),
    { key: 'bank', name: 'Bank details', why: 'A bank letter or statement showing the account name, sort code and number', file: '', status: 'Missing' },
  ];
};
const START: App = {
  type: 'Limited company', name: '', companyNo: '', contact: '', email: '', phone: '', address: '', postcode: '', vat: 'No', vatNo: '',
  kind: 'Trade', trades: [], areas: [], rate: '', team: '1', years: '', emergency: 'Yes', cover: '£2 million',
  bank: { name: '', sort: '', acc: '' }, docs: docsFor([]), agree: { terms: false, rules: false, checks: false, true: false },
  status: 'Draft', ref: 'S5', events: [],
};
const DEMO: Partial<App> = { type: 'Limited company', name: 'Northside Plumbing & Heating Ltd', companyNo: '13377219', contact: 'Ade Bakare', email: 'ade@northsideph.co.uk', phone: '07700 900321', address: '18 Blackstock Road, London', postcode: 'N4 2DW', kind: 'Trade', trades: ['Gas engineer', 'Plumber'], areas: ['Islington', 'Highbury', 'Holloway', 'Finchley'], rate: '55', team: '3', years: '6', emergency: 'Yes' };

const daysTo = (iso: string) => Math.round((new Date(iso + 'T00:00').getTime() - TODAY.getTime()) / 864e5);
const isoLabel = (iso: string) => { const d = new Date(iso + 'T00:00'); return isNaN(d.getTime()) ? '' : fmtDate(d); };

export function Join({ onSignIn, onSetPassword }: { onSignIn: () => void; onSetPassword: (email: string) => void }) {
  const [a, setA] = useState<App>(START); const [step, setStep] = useState(0);
  const [doc, setDoc] = useState<JDoc | null>(null); const [show, setShow] = useState<'' | 'terms' | 'rules'>('');
  const set = (p: Partial<App>) => setA(x => ({ ...x, ...p }));
  const ev = (text: string, by = a.contact || 'You') => ({ at: nowStamp(), text, by });
  const ok0 = a.name.trim() && a.contact.trim() && a.email.includes('@') && a.phone.trim().length >= 10 && a.address.trim() && a.postcode.trim() && (a.type !== 'Limited company' || /^\d{8}$/.test(a.companyNo.trim())) && (a.vat === 'No' || a.vatNo.trim());
  const ok1 = a.trades.length > 0 && a.areas.length > 0 && +a.rate > 0;
  const docOk = (d: JDoc) => d.file && d.status !== 'Rejected' && (!d.needsDate || (d.expires && daysTo(d.expires) > 0));
  const ok2 = a.docs.every(docOk) && a.cover !== 'Less than £2 million' && a.bank.name.trim() && /^\d{2}-?\d{2}-?\d{2}$/.test(a.bank.sort.trim()) && /^\d{8}$/.test(a.bank.acc.trim());
  const ok3 = a.agree.terms && a.agree.rules && a.agree.checks && a.agree.true;
  const toggle = (k: 'trades' | 'areas', v: string) => { const l = a[k].includes(v) ? a[k].filter(x => x !== v) : [...a[k], v]; if (k === 'trades') { const nd = docsFor(l); set({ trades: l, docs: nd.map(d => a.docs.find(o => o.name === d.name) ?? d) }); } else set({ areas: l }); };
  const sent = a.status !== 'Draft';
  const at = a.status === 'Approved' ? 5 : sent ? 4 : step;
  const next = (n: number) => { setStep(n); window.scrollTo({ top: 0 }); };

  return <div className="join">
    <header className="join-top">
      <img src="images/logo.svg" alt="Landlord Service Plans" style={{ height: 34 }} />
      <span className="grow" />
      <span className="caption">Already work with LSP?</span><Btn sm kind="outline" onClick={onSignIn}>Sign in</Btn>
    </header>
    <main className="join-body">
      <div className="stack" style={{ gap: 6 }}><span className="caption-strong" style={{ color: 'var(--text-brand)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Work with LSP</span>
        <h1 className="h1">{sent ? 'Your application' : 'Join LSP as a contractor'}</h1>
        {!sent && <span className="small">LSP sends repair and safety work in North London to checked, insured contractors. It takes about 10 minutes. Have your ID, insurance, trade registration and bank details ready.</span>}</div>
      <Card><HSteps items={STEPS} at={at} stopped={a.status === 'Rejected' ? 'Not approved' : a.status === 'More info asked' ? 'More info needed' : undefined} /></Card>

      {!sent && step === 0 && <div className="dgrid">
        <Card title="1 · Your business" sub="Who LSP pays and who it talks to." action={<Btn sm kind="ghost" onClick={() => set({ ...DEMO, docs: docsFor(DEMO.trades ?? []) })}>Fill with example</Btn>}>
          <div className="grid g2"><Field label="Type of business"><Select value={a.type} onChange={v => set({ type: v })} options={['Limited company', 'Sole trader', 'Partnership'].map(x => ({ value: x, label: x }))} /></Field>
            <Field label="Business name"><Text value={a.name} onChange={v => set({ name: v })} placeholder="e.g. Northside Plumbing Ltd" /></Field></div>
          {a.type === 'Limited company' && <Field label="Company number" hint="8 digits, from Companies House"><Text value={a.companyNo} onChange={v => set({ companyNo: v.replace(/\D/g, '').slice(0, 8) })} /></Field>}
          <div className="grid g2"><Field label="Main contact"><Text value={a.contact} onChange={v => set({ contact: v })} placeholder="Full name" /></Field><Field label="Mobile" hint="For the security code and job texts"><Text value={a.phone} onChange={v => set({ phone: v })} /></Field></div>
          <Field label="Email" hint="Your login, and where LSP sends jobs and remittances"><Text value={a.email} onChange={v => set({ email: v })} /></Field>
          <div className="grid g2"><Field label="Business address"><Text value={a.address} onChange={v => set({ address: v })} /></Field><Field label="Postcode"><Text value={a.postcode} onChange={v => set({ postcode: v.toUpperCase() })} /></Field></div>
          <div className="grid g2"><Field label="VAT registered?"><Select value={a.vat} onChange={v => set({ vat: v })} options={['No', 'Yes'].map(x => ({ value: x, label: x }))} /></Field>{a.vat === 'Yes' && <Field label="VAT number"><Text value={a.vatNo} onChange={v => set({ vatNo: v })} placeholder="GB 123 4567 89" /></Field>}</div>
          <div className="flex" style={{ justifyContent: 'flex-end' }}><Btn onClick={() => next(1)} disabled={!ok0}>Next: your work <ArrowRight size={16} /></Btn></div>
        </Card>
        <Side />
      </div>}

      {!sent && step === 1 && <div className="dgrid">
        <Card title="2 · Your work" sub="LSP only sends you jobs in your trades and areas.">
          <Field label="What you do"><Select value={a.kind} onChange={v => set({ kind: v, trades: v === 'Site Inspector' ? ['Site Inspector'] : a.trades.filter(t => t !== 'Site Inspector'), docs: docsFor(v === 'Site Inspector' ? ['Site Inspector'] : a.trades.filter(t => t !== 'Site Inspector')) })} options={[{ value: 'Trade', label: 'Trade work (repairs, servicing, safety checks)' }, { value: 'Site Inspector', label: 'Site inspections (move-in, move-out, routine)' }]} /></Field>
          {a.kind === 'Trade' && <Field label="Your trades (choose all that apply)"><Picks list={TRADES.filter(t => t !== 'Site Inspector')} on={a.trades} toggle={v => toggle('trades', v)} /></Field>}
          <Field label="Areas you cover"><Picks list={AREAS} on={a.areas} toggle={v => toggle('areas', v)} /></Field>
          <div className="grid g2"><Field label="Your hourly rate (£)" hint="LSP agrees a rate with you before your first job"><Text value={a.rate} onChange={v => set({ rate: v.replace(/[^0-9.]/g, '') })} placeholder="e.g. 55" /></Field>
            <Field label="Emergency call-outs (same day)?"><Select value={a.emergency} onChange={v => set({ emergency: v })} options={['Yes', 'No'].map(x => ({ value: x, label: x }))} /></Field></div>
          <div className="grid g2"><Field label="How many people do the work"><Text value={a.team} onChange={v => set({ team: v.replace(/\D/g, '') })} /></Field><Field label="Years trading"><Text value={a.years} onChange={v => set({ years: v.replace(/\D/g, '') })} /></Field></div>
          <div className="flex between"><Btn kind="ghost" icon={<ArrowLeft size={16} />} onClick={() => next(0)}>Back</Btn><Btn onClick={() => next(2)} disabled={!ok1}>Next: your documents <ArrowRight size={16} /></Btn></div>
        </Card>
        <Side />
      </div>}

      {!sent && step === 2 && <div className="dgrid">
        <div className="col">
          <Card title="3 · Your documents (KYC)" sub="LSP checks each one before you get any work. PDF, JPG or PNG, up to 10 MB each.">
            <div className="divlist">{a.docs.map(d => <DocLine key={d.key} d={d} onUpload={() => setDoc(d)} />)}</div>
            <Field label="Insurance cover"><Select value={a.cover} onChange={v => set({ cover: v })} options={['£2 million', '£5 million', '£10 million', 'Less than £2 million'].map(x => ({ value: x, label: x }))} /></Field>
            {a.cover === 'Less than £2 million' && <Note tone="err">LSP needs at least £2 million public liability cover. Increase your cover, then upload the new policy.</Note>}
          </Card>
          <Card title="Where LSP pays you" sub="Must match the bank letter you upload.">
            <Field label="Account name"><Text value={a.bank.name} onChange={v => set({ bank: { ...a.bank, name: v } })} placeholder={a.name || 'Business name'} /></Field>
            <div className="grid g2"><Field label="Sort code"><Text value={a.bank.sort} onChange={v => set({ bank: { ...a.bank, sort: v } })} placeholder="20-41-06" /></Field><Field label="Account number"><Text value={a.bank.acc} onChange={v => set({ bank: { ...a.bank, acc: v.replace(/\D/g, '').slice(0, 8) } })} placeholder="8 digits" /></Field></div>
          </Card>
          <div className="flex between"><Btn kind="ghost" icon={<ArrowLeft size={16} />} onClick={() => next(1)}>Back</Btn><Btn onClick={() => next(3)} disabled={!ok2}>Next: agree and send <ArrowRight size={16} /></Btn></div>
        </div>
        <div className="col">
          <Card title="Checklist"><div className="col" style={{ gap: 8 }}>{a.docs.map(d => <span key={d.key} className="flex small" style={{ gap: 8, color: docOk(d) ? 'var(--ok)' : 'var(--text-tertiary)' }}><Check size={14} />{d.name}</span>)}
            <span className="flex small" style={{ gap: 8, color: a.bank.acc.length === 8 ? 'var(--ok)' : 'var(--text-tertiary)' }}><Check size={14} />Bank account number</span></div></Card>
          <Note>Documents that end within 60 days can be uploaded, but you'll be asked for the new one soon after you join.</Note>
        </div>
      </div>}

      {!sent && step === 3 && <div className="dgrid">
        <div className="col">
          <Card title="4 · Check and send">
            <KV rows={[['Business', `${a.name} · ${a.type}${a.companyNo ? ` · ${a.companyNo}` : ''}`], ['Contact', `${a.contact} · ${a.phone} · ${a.email}`], ['Address', `${a.address}, ${a.postcode}`], ['VAT', a.vat === 'Yes' ? a.vatNo : 'Not VAT registered'], ['Work', `${a.kind === 'Trade' ? a.trades.join(', ') : 'Site inspections'} · £${a.rate} an hour · emergencies: ${a.emergency}`], ['Areas', a.areas.join(', ')], ['Documents', `${a.docs.length} uploaded · cover ${a.cover}`], ['Paid into', `${a.bank.name} · ${a.bank.sort} · ···· ${a.bank.acc.slice(-4)}`]]} />
            <div className="flex wrap"><Btn sm kind="ghost" icon={<PenLine size={14} />} onClick={() => next(0)}>Change business</Btn><Btn sm kind="ghost" icon={<PenLine size={14} />} onClick={() => next(1)}>Change work</Btn><Btn sm kind="ghost" icon={<PenLine size={14} />} onClick={() => next(2)}>Change documents</Btn></div>
          </Card>
          <Card title="Agree">
            <Tick on={a.agree.terms} set={v => set({ agree: { ...a.agree, terms: v } })}>I agree to the <button className="link" onClick={e => { e.preventDefault(); setShow('terms'); }}>contractor agreement</button> (rate, payment every Friday, invoicing LSP)</Tick>
            <Tick on={a.agree.rules} set={v => set({ agree: { ...a.agree, rules: v } })}>I will follow LSP's <button className="link" onClick={e => { e.preventDefault(); setShow('rules'); }}>health, safety and conduct rules</button></Tick>
            <Tick on={a.agree.checks} set={v => set({ agree: { ...a.agree, checks: v } })}>LSP can check my ID, right to work, insurance and registration with the people who issued them</Tick>
            <Tick on={a.agree.true} set={v => set({ agree: { ...a.agree, true: v } })}>Everything I sent is true and up to date</Tick>
            <div className="flex between"><Btn kind="ghost" icon={<ArrowLeft size={16} />} onClick={() => next(2)}>Back</Btn><Btn icon={<Send size={16} />} disabled={!ok3} onClick={() => { const at2 = nowStamp(); setA(x => ({ ...x, status: 'Waiting', sent: at2, docs: x.docs.map(d => ({ ...d, status: 'Uploaded' })), events: [{ at: at2, text: 'Application sent with ' + x.docs.length + ' documents', by: x.contact }] })); window.scrollTo({ top: 0 }); }}>Send to LSP</Btn></div>
          </Card>
        </div>
        <Side />
      </div>}

      {sent && <div className="dgrid">
        <div className="col">
          <Card title={a.status === 'Approved' ? 'Approved. Welcome to LSP.' : a.status === 'Rejected' ? 'Not approved' : a.status === 'More info asked' ? 'LSP needs more information' : 'LSP is checking your application'}
            sub={`Application ${a.ref} · sent ${a.sent}`} action={<Chip tone={a.status === 'Approved' ? 'ok' : a.status === 'Rejected' ? 'neutral' : a.status === 'More info asked' ? 'warn' : 'info'}>{a.status === 'Waiting' ? 'Checking' : a.status}</Chip>}>
            {a.status === 'Waiting' && <Note>LSP checks your documents with the people who issued them, usually within 2 working days. We email {a.email} and text {a.phone} when it's done.</Note>}
            {a.status === 'More info asked' && <Note tone="warn">{a.reason} Upload the new document below, then send it back.</Note>}
            {a.status === 'Rejected' && <Note tone="err">{a.reason} You can apply again once this is sorted. Questions: call {LSP_PHONE}.</Note>}
            {a.status === 'Approved' && <><Note tone="ok">Your documents are checked and your rate of £{a.rate} an hour is agreed. We sent the login email to {a.email}.</Note>
              <div className="flex wrap"><Btn icon={<KeyRound size={16} />} onClick={() => onSetPassword(a.email)}>Set your password</Btn><Btn kind="outline" onClick={onSignIn}>Sign in</Btn></div></>}
            <div className="divlist">{a.docs.map(d => <DocLine key={d.key} d={d} onUpload={a.status === 'More info asked' && d.status === 'Rejected' ? () => setDoc(d) : undefined} />)}</div>
            {a.status === 'More info asked' && <div className="flex" style={{ justifyContent: 'flex-end' }}><Btn icon={<Send size={16} />} disabled={a.docs.some(d => d.status === 'Rejected')} onClick={() => setA(x => ({ ...x, status: 'Waiting', reason: undefined, events: [...x.events, ev('Sent the new document back to LSP')] }))}>Send back to LSP</Btn></div>}
          </Card>
          <Card title="What happened" sub="Every step, with the date and time."><Timeline items={[...a.events].reverse()} /></Card>
        </div>
        <div className="col">
          {a.status === 'Waiting' && <DemoAnswer note="In the live product the Supervisor answers from the Sign-Ups page of the Supervisor portal.">
            <Btn sm kind="outline" onClick={() => setA(x => ({ ...x, status: 'Approved', docs: x.docs.map(d => ({ ...d, status: 'Verified' })), events: [...x.events, { at: nowStamp(), text: `Approved. Rate agreed at £${x.rate} an hour. Login email sent from Outlook.`, by: 'Sarah Khan' }] }))}>LSP approves</Btn>
            <Btn sm kind="ghost" onClick={() => { const r = 'Your insurance policy page with the end date and cover amount is missing.'; setA(x => ({ ...x, status: 'More info asked', reason: r, docs: x.docs.map(d => d.key === 'ins' ? { ...d, status: 'Rejected', note: 'Upload the page with the end date and cover amount' } : { ...d, status: 'Verified' }), events: [...x.events, { at: nowStamp(), text: `Asked for more information: ${r}`, by: 'Sarah Khan' }] })); }}>LSP asks for more</Btn>
            <Btn sm kind="ghost" onClick={() => { const r = 'Your Gas Safe registration could not be found on the Gas Safe Register.'; setA(x => ({ ...x, status: 'Rejected', reason: r, events: [...x.events, { at: nowStamp(), text: `Not approved: ${r}`, by: 'Sarah Khan' }] })); }}>LSP rejects</Btn>
          </DemoAnswer>}
          <Card title="What happens next"><div className="col" style={{ gap: 10 }}>{[
            [ShieldCheck, 'LSP checks your ID, right to work, insurance and registration.'], [Mail, 'Approved: you get the login email and set a password.'], [Wrench, 'LSP gives you jobs here. Confirm visits, send photos and your invoice.'], [BadgeCheck, 'Keep insurance and registration in date, or you are paused.']].map(([Ic, t], i) => { const I2 = Ic as typeof Mail; return <span key={i} className="flex small" style={{ gap: 10, alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 28, height: 28, flex: 'none' }}><I2 size={14} /></span>{t as string}</span>; })}</div></Card>
          <Card title="Questions?"><span className="small"><Phone size={13} style={{ verticalAlign: -2 }} /> {LSP_PHONE} · Monday to Friday, 8:00 to 18:00</span></Card>
        </div>
      </div>}
    </main>
    {doc && <UploadDoc d={doc} onClose={() => setDoc(null)} onSave={(file, expires, ref) => { setA(x => ({ ...x, docs: x.docs.map(d => d.key === doc.key ? { ...d, file, expires: expires || d.expires, ref: ref || d.ref, status: sent ? 'Uploaded' : 'Missing', note: undefined } : d), events: sent ? [...x.events, ev(`Uploaded a new ${doc.name.toLowerCase()}`)] : x.events })); setDoc(null); }} />}
    {show && <Modal wide title={show === 'terms' ? 'Contractor agreement' : 'Health, safety and conduct rules'} sub="Summary. The full document is sent with your login email." onClose={() => setShow('')} footer={<Btn onClick={() => setShow('')}>Close</Btn>}>
      <div className="col" style={{ gap: 8 }}>{(show === 'terms' ? ['LSP gives you jobs through this portal. You confirm each visit.', 'You are paid your agreed hourly rate, or the fixed price on the job, plus parts LSP agrees.', 'Invoice Landlord Service Plans Limited from the job, with the photos. LSP pays approved invoices every Friday.', 'Extra work is only paid when LSP agrees it first.', 'Keep your insurance and trade registration in date. If one ends, LSP pauses you.', 'Either side can end the agreement with 30 days\' notice.'] : ['Carry ID and say you are from LSP when you arrive.', 'Only use the tenant\'s number for the visit. Never share their details.', 'Return keys the same day. Never copy a key.', 'Take before and after photos of every job.', 'Make anything unsafe safe straight away, label it and tell LSP.', 'Take your waste away and leave the home clean.']).map((t, i) => <span key={i} className="flex small" style={{ gap: 10, alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 24, height: 24, fontSize: 12, fontWeight: 700, flex: 'none' }}>{i + 1}</span>{t}</span>)}</div>
    </Modal>}
  </div>;
}

function Side() {
  return <div className="col">
    <Card title="What you need"><div className="col" style={{ gap: 10 }}>{[[Building2, 'Business details and company number'], [FileText, 'Photo ID and right to work'], [ShieldCheck, 'Public liability insurance, at least £2 million'], [BadgeCheck, 'Your trade registration, like Gas Safe'], [Clock, 'Bank letter or statement']].map(([Ic, t], i) => { const I2 = Ic as typeof Mail; return <span key={i} className="flex small" style={{ gap: 10 }}><span className="tile t-brand" style={{ width: 28, height: 28, flex: 'none' }}><I2 size={14} /></span>{t as string}</span>; })}</div></Card>
    <Note>Nothing is shared until you send it. LSP only uses your documents to check you can work on its homes.</Note>
  </div>;
}
function Picks({ list, on, toggle }: { list: string[]; on: string[]; toggle: (v: string) => void }) {
  return <div className="flex wrap" style={{ gap: 8 }}>{list.map(t => <button key={t} type="button" className={`chip ${on.includes(t) ? 'brand' : 'neutral'} nodot`} style={{ border: 0, cursor: 'pointer', padding: '6px 12px' }} aria-pressed={on.includes(t)} onClick={() => toggle(t)}>{on.includes(t) && <Check size={12} />}{t}</button>)}</div>;
}
function Tick({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: ReactNode }) {
  return <label className="check" style={{ cursor: 'pointer', alignItems: 'flex-start', fontWeight: 500 }}><input type="checkbox" checked={on} onChange={e => set(e.target.checked)} style={{ marginTop: 2 }} /><span>{children}</span></label>;
}
function DocLine({ d, onUpload }: { d: JDoc; onUpload?: () => void }) {
  const soon = d.expires && daysTo(d.expires) <= 60;
  const st: { label: string; tone: Tone } = d.status === 'Missing' ? (d.file ? { label: 'Ready to send', tone: 'info' } : { label: 'Needed', tone: 'warn' }) : d.status === 'Uploaded' ? { label: d.file ? 'LSP checking' : 'Needed', tone: 'info' } : d.status === 'Verified' ? { label: 'Checked', tone: 'ok' } : d.status === 'Rejected' ? { label: 'Upload again', tone: 'err' } : { label: d.status, tone: docTone(d.status) };
  return <div className="lrow" style={{ alignItems: 'flex-start' }}>
    <span className={`tile t-${d.file && d.status !== 'Rejected' ? 'ok' : 'brand'}`} style={{ width: 34, height: 34, flex: 'none' }}>{d.file && d.status !== 'Rejected' ? <Check size={16} /> : <FileText size={16} />}</span>
    <div className="stack grow"><b>{d.name}</b><span className="caption">{d.file ? `${d.file}${d.ref ? ` · ${d.ref}` : ''}${d.expires ? ` · ends ${isoLabel(d.expires)}` : ''}` : d.why}</span>
      {d.note && <span className="caption" style={{ color: 'var(--err)' }}>{d.note}</span>}
      {soon && <span className="caption" style={{ color: 'var(--warn)' }}><TriangleAlert size={11} style={{ verticalAlign: -1 }} /> Ends within 60 days</span>}</div>
    <Chip tone={st.tone}>{st.label}</Chip>
    {onUpload && <Btn sm kind={d.file && d.status !== 'Rejected' ? 'ghost' : 'primary'} icon={<Upload size={14} />} onClick={onUpload}>{d.file && d.status !== 'Rejected' ? 'Change' : 'Upload'}</Btn>}
  </div>;
}
function UploadDoc({ d, onClose, onSave }: { d: JDoc; onClose: () => void; onSave: (file: string, expires: string, ref: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState(''); const [exp, setExp] = useState(d.expires ?? ''); const [no, setNo] = useState(d.ref ?? '');
  const past = d.needsDate && exp && daysTo(exp) <= 0;
  return <Modal title={`Upload ${d.name.toLowerCase()}`} sub={d.why} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Upload size={16} />} disabled={!file || (d.needsDate && (!exp || !!past))} onClick={() => onSave(file, exp, no.trim())}>Upload</Btn></>}>
    <button type="button" className="dropzone" onClick={() => ref.current?.click()}><Upload size={22} />{file ? <><b>{file}</b><span className="caption">Click to choose a different file</span></> : <><b>Choose a file to upload</b><span className="caption">PDF, JPG or PNG · up to 10 MB</span></>}</button>
    <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden aria-label="File" onChange={e => setFile(e.target.files?.[0]?.name ?? '')} />
    {d.needsDate && <div className="grid g2"><Field label={d.key === 'ins' ? 'Policy number' : 'Registration number'}><Text value={no} onChange={setNo} /></Field><Field label="Date it ends"><input className="input" type="date" value={exp} onChange={e => setExp(e.target.value)} /></Field></div>}
    {past && <Note tone="err">This has already ended. Upload the current one.</Note>}
    {d.key === 'rtw' && <Field label="Share code (optional)" hint="9 characters, from GOV.UK"><Text value={no} onChange={setNo} placeholder="e.g. W4K 7RT 9PL" /></Field>}
  </Modal>;
}
