import { useState } from 'react';
import { ShieldCheck, Pencil, Send, KeyRound, LogOut, FileText, Landmark, MapPin, PoundSterling, Bell, Building2 } from 'lucide-react';
import { useStore, money } from '../store';
import { LSP_PHONE, nowStamp, type Contractor } from '../data';
import { Btn, Card, Chip, Field, KV, Modal, Note, Text, Avatar } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { downloadPdf, bankLine } from './lib';
import { RequestModal } from './Messages';
import type { ReqKind } from '../data';

type NKey = keyof Contractor['notify'];
const NOTE: Record<NKey, string> = { 'New job': 'LSP gives you a job or an emergency', 'Visit changes': 'A visit is moved or cancelled', 'Sent back': 'LSP asks you to put something right', Payments: 'An invoice is approved or paid', 'Expiry reminders': 'Insurance or a certificate is ending' };

export function Account() {
  const s = useStore();
  const [m, setM] = useState<'' | 'details' | 'password' | 'bank' | ReqKind>('');
  const setN = (k: NKey, ch: 'email' | 'sms') => { s.setMe(a => ({ ...a, notify: { ...a.notify, [k]: { ...a.notify[k], [ch]: !a.notify[k][ch] } } })); s.toast('Saved'); };
  const bankAsk = s.requests.find(r => r.kind === 'Bank details' && r.status === 'Sent');
  return <>
    <PageHeader crumbs={crumbsFor('account', s.go)} title="Account" />
    <div className="grid g2">
      <Card title="Your business" action={<Btn sm kind="ghost" icon={<Pencil size={14} />} onClick={() => setM('details')}>Edit</Btn>}>
        <div className="flex"><Avatar name={s.me.name} size="lg" /><div className="stack grow"><b style={{ fontSize: 15 }}>{s.me.name}</b><span className="caption">{s.me.trade} · working with LSP since {s.me.joined}</span></div><Chip tone={s.me.status === 'Active' ? 'ok' : 'err'}>{s.me.status}</Chip></div>
        <KV rows={[['Main contact', s.me.contact], ['Email', s.me.email], ['Mobile', s.me.phone], ['Address', s.me.address], ['Company number', s.me.companyNo ?? '—'], ['VAT', s.me.vatNo ?? 'Not VAT registered']]} />
        <span className="caption">To change the email you sign in with, send a request. LSP checks it first.</span>
      </Card>
      <Card title="Your work and rate" sub="LSP prices jobs with your hourly rate. Fixed-price jobs say the price on the job.">
        <div className="flex" style={{ gap: 12 }}><span className="tile t-brand"><PoundSterling size={18} /></span><div className="stack grow"><b style={{ fontSize: 18 }}>{money(s.me.rate)} an hour</b><span className="caption">Agreed when you joined · reviewed every January</span></div><Btn sm kind="outline" icon={<Send size={14} />} onClick={() => setM('Hourly rate')}>Ask to change</Btn></div>
        <KV rows={[['Trade', s.me.trade], ['Work for LSP', 'Gas safety checks (CP12), boilers and heating']]} />
        <div className="flex wrap" style={{ gap: 6 }}><MapPin size={16} color="var(--text-brand)" />{s.me.areas.map(a => <Chip key={a} tone="neutral" dot={false}>{a}</Chip>)}</div>
        <Btn sm kind="ghost" icon={<Send size={14} />} onClick={() => setM('Areas I cover')}>Change the areas I cover</Btn>
      </Card>
    </div>
    <div className="grid g2">
      <Card title="Where LSP pays you" action={<Landmark size={18} color="#667085" />}>
        <KV rows={[['Account', bankLine(s)], ['Paid', 'Every Friday by bank transfer, for invoices LSP approved'], ['Remittances', 'Sent to ' + s.me.email]]} />
        {bankAsk ? <Note>You asked to change your bank details on {bankAsk.at}. LSP calls you on {s.me.phone} to check before it is used. Until then you are paid into the account above.</Note>
          : <Btn kind="outline" icon={<Pencil size={16} />} onClick={() => setM('bank')}>Change bank details</Btn>}
      </Card>
      <Card title="What LSP tells you, and how" sub="Choose email, text or both." action={<Bell size={18} color="#667085" />}>
        <div className="tablewrap"><table className="t"><thead><tr><th>When</th><th>Email</th><th>Text</th></tr></thead><tbody>
          {(Object.keys(s.me.notify) as NKey[]).map(k => <tr key={k} style={{ cursor: 'default' }}><td><span className="stack"><b className="strong">{k}</b><span className="caption">{NOTE[k]}</span></span></td>
            {(['email', 'sms'] as const).map(ch => <td key={ch}><label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" aria-label={`${k} by ${ch === 'sms' ? 'text' : 'email'}`} checked={s.me.notify[k][ch]} onChange={() => setN(k, ch)} /></label></td>)}</tr>)}
        </tbody></table></div>
        <span className="caption">Emergency jobs always come by text and a phone call.</span>
      </Card>
    </div>
    <div className="grid g2">
      <Card title="Sign-in and security">
        <KV rows={[['Signed in as', `${s.me.contact} · ${s.me.name}`], ['Sign-in email', s.me.email], ['Password', 'Last changed 4 Jan 2026'], ['Security code', `Texted to the phone ending ${s.me.phone.slice(-4)}`]]} />
        <div className="flex wrap"><Btn sm kind="outline" icon={<KeyRound size={14} />} onClick={() => setM('password')}>Change password</Btn><Btn sm kind="ghost" icon={<LogOut size={14} />} onClick={() => { s.log('Signed out of all other devices', 'Account'); s.toast('Signed out of all other devices'); }}>Sign out other devices</Btn></div>
        <span className="caption"><ShieldCheck size={12} style={{ verticalAlign: -2 }} /> Five wrong codes lock the account. Call {LSP_PHONE} to unlock it.</span>
      </Card>
      <Card title="Agreement and your data">
        <div className="lrow"><FileText size={18} color="var(--text-brand)" /><div className="stack grow"><b>Contractor agreement with LSP</b><span className="caption">Signed {s.me.joined} · {money(s.me.rate)} an hour · paid every Friday</span></div><Btn sm kind="ghost" onClick={() => { s.log('Downloaded the contractor agreement', 'Account'); downloadPdf(s, 'Contractor agreement'); }}>Download</Btn></div>
        <div className="flex wrap"><Btn sm kind="ghost" onClick={() => { s.log('Asked for a copy of my data', 'Account'); s.toast('Request sent. LSP will email your data.'); }}>Ask for a copy of my data</Btn><Btn sm kind="ghost" onClick={() => setM('Pause my account')}>Pause my account</Btn><Btn sm kind="ghost" onClick={() => setM('Stop working with LSP')}>Stop working with LSP</Btn></div>
        <span className="caption"><Building2 size={12} style={{ verticalAlign: -2 }} /> Going on holiday? Add time off in the Calendar instead of pausing.</span>
      </Card>
    </div>
    {m === 'details' && <DetailsModal onClose={() => setM('')} />}
    {m === 'bank' && <BankModal onClose={() => setM('')} />}
    {(['Hourly rate', 'Areas I cover', 'Pause my account', 'Stop working with LSP', 'Email or phone'] as string[]).includes(m) && <RequestModal kind={m as ReqKind} onClose={() => setM('')} onSent={() => s.go('messages', 'requests')} />}
    {m === 'password' && <Modal title="Change password" sub="At least 10 characters, with a number and a capital letter." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Cancel</Btn><Btn onClick={() => { s.log('Changed the password', 'Account'); s.toast('Password changed'); setM(''); }}>Save</Btn></>}>
      <Field label="Current password"><input className="input" type="password" defaultValue="••••••••••" /></Field><Field label="New password"><input className="input" type="password" /></Field><Field label="Type it again"><input className="input" type="password" /></Field></Modal>}
  </>;
}

function DetailsModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [f, setF] = useState({ contact: s.me.contact, phone: s.me.phone, address: s.me.address });
  return <Modal title="Edit your details" sub="Saved straight away. LSP sees the new details." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn disabled={!f.contact.trim() || !f.phone.trim()} onClick={() => { s.setMe(a => ({ ...a, ...f })); s.log('Updated your business details', 'Account'); s.toast('Saved'); onClose(); }}>Save</Btn></>}>
    <Field label="Main contact"><Text value={f.contact} onChange={v => setF({ ...f, contact: v })} /></Field>
    <Field label="Mobile"><Text value={f.phone} onChange={v => setF({ ...f, phone: v })} /></Field>
    <Field label="Address"><Text value={f.address} onChange={v => setF({ ...f, address: v })} /></Field>
  </Modal>;
}

/** Bank detail changes: a security code to the phone, then LSP calls to check before using it. */
function BankModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [f, setF] = useState({ name: s.me.bank.name, sort: '', acc: '' }); const [step, setStep] = useState<'form' | 'code'>('form'); const [code, setCode] = useState('');
  const ok = f.name.trim() && /^\d{2}-?\d{2}-?\d{2}$/.test(f.sort.trim()) && /^\d{8}$/.test(f.acc.trim());
  return <Modal title="Change bank details" sub="To keep you safe, LSP checks every change by phone before it is used." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn>{step === 'form' ? <Btn disabled={!ok} onClick={() => setStep('code')}>Continue</Btn> : <Btn icon={<Send size={16} />} disabled={code !== '123456'} onClick={() => {
      s.setRequests(rs => [{ id: 'R' + Date.now(), kind: 'Bank details', title: `New bank account ending ${f.acc.slice(-4)}`, about: `${f.name.trim()} · sort code ${f.sort.trim()} · account ending ${f.acc.slice(-4)}`, at: nowStamp(), status: 'Sent' }, ...rs]);
      s.log(`Asked to change bank details to the account ending ${f.acc.slice(-4)}`, 'Account'); s.toast('Sent. LSP will call you to check it.'); onClose();
    }}>Send to LSP</Btn>}</>}>
    {step === 'form' ? <>
      <Field label="Account name"><Text value={f.name} onChange={v => setF({ ...f, name: v })} /></Field>
      <div className="grid g2"><Field label="Sort code"><Text value={f.sort} onChange={v => setF({ ...f, sort: v })} placeholder="20-41-06" /></Field><Field label="Account number"><Text value={f.acc} onChange={v => setF({ ...f, acc: v.replace(/\D/g, '').slice(0, 8) })} placeholder="8 digits" /></Field></div>
      <Note tone="warn">LSP will never ask you to change bank details by email. If you get an email like that, call {LSP_PHONE}.</Note>
    </> : <>
      <p className="small" style={{ margin: 0 }}>We sent a 6-digit code to your phone ending {s.me.phone.slice(-4)}. For this demo, use <b>123456</b>.</p>
      <Field label="Security code"><Text value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" /></Field>
      <Note>Then LSP calls you on {s.me.phone}. Until the call, payments go to the account ending {s.me.bank.last4}.</Note>
    </>}
  </Modal>;
}
