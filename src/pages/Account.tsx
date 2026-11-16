import { useState } from 'react';
import { Pencil, Send, KeyRound, LogOut, MapPin, ScrollText, Plus, Download, FileText, PauseCircle, XCircle } from 'lucide-react';
import { useStore, money } from '../store';
import { LSP_PHONE, nowStamp, type Contractor, type TermsId } from '../data';
import { Btn, Card, Chip, Field, Modal, Note, Text, Avatar, Facts, InfoTip, MoreMenu } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { downloadPdf, DemoAnswer, lspSays, TermsModal, dayOf } from './lib';
import { RequestModal } from './Messages';
import type { ReqKind } from '../data';

type NKey = keyof Contractor['notify'];

export function Account() {
  const s = useStore();
  const [m, setM] = useState<'' | 'details' | 'password' | 'bank' | ReqKind>('');
  const [read, setRead] = useState<{ id: TermsId; accept: boolean } | null>(null);
  const setN = (k: NKey, ch: 'email' | 'sms') => { s.setMe(a => ({ ...a, notify: { ...a.notify, [k]: { ...a.notify[k], [ch]: !a.notify[k][ch] } } })); s.toast('Saved'); };
  const bank = s.me.bank; const pend = s.me.bankPending;
  return <>
    <PageHeader crumbs={crumbsFor('account', s.go)} title="Account" action={<MoreMenu items={[
      { label: 'Download my data', icon: <Download size={16} />, onClick: () => { s.log('Asked for a copy of my data', 'Account'); s.toast('Request sent. LSP will email your data.'); } },
      { label: 'Pause my account', icon: <PauseCircle size={16} />, onClick: () => setM('Pause my account') },
      { label: 'Stop working with LSP', icon: <XCircle size={16} />, onClick: () => setM('Stop working with LSP'), danger: true },
    ]} />} />
    <div className="grid g2">
      <Card title="Your business" action={<Btn sm kind="ghost" icon={<Pencil size={14} />} onClick={() => setM('details')}>Edit</Btn>}>
        <div className="flex"><Avatar name={s.me.name} size="lg" /><div className="stack grow"><b style={{ fontSize: 15 }}>{s.me.name}</b><span className="caption">{s.me.trade} · since {s.me.joined}</span></div><Chip tone={s.me.status === 'Active' ? 'ok' : 'err'}>{s.me.status}</Chip></div>
        <Facts items={[['Main contact', s.me.contact], ['Mobile', s.me.phone], ['Email', <span key="e">{s.me.email}<InfoTip>This is your login. To change it, send a request from Messages. LSP checks it first.</InfoTip></span>], ['Address', s.me.address], ['Company number', s.me.companyNo ?? '—'], ['VAT', s.me.vatNo ?? 'Not registered']]} />
      </Card>
      <Card title={<span className="clean-h">Rate and areas<InfoTip>LSP prices jobs with your hourly rate. Fixed-price jobs show the price on the job. Rates are reviewed every January.</InfoTip></span>}
        action={<MoreMenu label="Change" items={[{ label: 'Ask to change my rate', icon: <Send size={16} />, onClick: () => setM('Hourly rate') }, { label: 'Change my areas', icon: <MapPin size={16} />, onClick: () => setM('Areas I cover') }]} />}>
        <span className="bigline">{money(s.me.rate)} <span className="small" style={{ fontWeight: 600 }}>an hour</span></span>
        <div className="flex wrap" style={{ gap: 6 }}>{s.me.areas.map(a => <Chip key={a} tone="neutral" dot={false}>{a}</Chip>)}</div>
      </Card>
    </div>
    <div className="grid g2">
      <Card title={<span className="clean-h">Bank details<InfoTip>LSP pays approved invoices into this account every Friday. Every new account is checked by phone before it is used. LSP never asks for bank changes by email.</InfoTip></span>}
        action={bank ? <Chip tone="ok">Checked</Chip> : pend ? <Chip tone="info">LSP checking</Chip> : <Chip tone="warn">Not added</Chip>}>
        {bank && <Facts items={[['Account name', bank.name], ['Sort code', bank.sort], ['Account', `···· ${bank.last4}`]]} />}
        {!bank && !pend && <Note tone="warn">Add your bank details so LSP can pay you.</Note>}
        {pend && <><Facts items={[['New account', `${pend.name} · ···· ${pend.last4}`], ['Sent', pend.at], ['Next', `LSP calls ${s.me.phone}`]]} />
          <DemoAnswer><Btn sm kind="outline" onClick={() => { s.setMe(x => ({ ...x, bank: { name: pend.name, sort: pend.sort, last4: pend.last4 }, bankPending: undefined })); lspSays(s, 'Bank details checked', `We called you to check. Payments now go to the account ending ${pend.last4}.`, 'LSP Accounts'); s.log(`LSP checked the bank account ending ${pend.last4} by phone`, 'Account', 'LSP Accounts'); s.toast('Bank details checked'); }}>LSP checks it by phone</Btn></DemoAnswer></>}
        {!pend && <div><Btn kind={bank ? 'outline' : 'primary'} icon={bank ? <Pencil size={16} /> : <Plus size={16} />} onClick={() => setM('bank')}>{bank ? 'Change bank details' : 'Add bank details'}</Btn></div>}
      </Card>
      <Card title={<span className="clean-h">Agreement and rules<InfoTip>LSP writes these. When LSP updates one, you read and accept the new version here.</InfoTip></span>}>
        <div>{(['agreement', 'rules'] as TermsId[]).map(id => { const d = s.terms[id]; const acc = s.me.accepted[id]; const due = (acc?.version ?? 0) < d.version; return <div key={id} className="rowlink" style={{ cursor: 'default' }}>
          <span className="tile t-brand" style={{ width: 34, height: 34 }}><ScrollText size={16} /></span>
          <div className="stack grow"><b>{d.title}</b><span className="caption">Version {d.version} · {due ? `updated ${dayOf(d.published)}` : `accepted ${acc?.at.split(',')[0]}`}</span></div>
          {due ? <Btn sm onClick={() => setRead({ id, accept: true })}>Read and accept</Btn> : <Btn sm kind="ghost" icon={<FileText size={14} />} onClick={() => setRead({ id, accept: false })}>Read</Btn>}
        </div>; })}</div>
        <DemoAnswer note="In the live product the Supervisor publishes a new version from Settings in the Supervisor portal."><Btn sm kind="outline" onClick={() => { s.setTerms(t => ({ ...t, agreement: { ...t.agreement, version: t.agreement.version + 1, published: nowStamp(), change: 'Parts over £50 need a receipt with the invoice.', sections: t.agreement.sections.map(x => x.h === 'Invoices' ? { ...x, t: x.t + ' Parts over £50 need a receipt.' } : x), history: [{ version: t.agreement.version, published: t.agreement.published, by: t.agreement.by, change: t.agreement.change }, ...t.agreement.history] } })); lspSays(s, 'Contractor agreement updated', 'We updated the contractor agreement. Please read and accept the new version in your portal.', 'Sarah Khan'); s.toast('LSP published a new version'); }}>LSP publishes a new agreement</Btn></DemoAnswer>
      </Card>
    </div>
    <div className="grid g2">
      <Card title={<span className="clean-h">Notifications<InfoTip>Emergency jobs always come by text and a phone call.</InfoTip></span>}>
        <div className="tablewrap"><table className="t"><thead><tr><th>When</th><th>Email</th><th>Text</th></tr></thead><tbody>
          {(Object.keys(s.me.notify) as NKey[]).map(k => <tr key={k} style={{ cursor: 'default' }}><td><b className="strong">{k}</b></td>
            {(['email', 'sms'] as const).map(ch => <td key={ch}><label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" aria-label={`${k} by ${ch === 'sms' ? 'text' : 'email'}`} checked={s.me.notify[k][ch]} onChange={() => setN(k, ch)} /></label></td>)}</tr>)}
        </tbody></table></div>
      </Card>
      <Card title={<span className="clean-h">Sign-in and security<InfoTip>Five wrong codes lock the account. Call {LSP_PHONE} to unlock it.</InfoTip></span>}>
        <Facts items={[['Sign-in email', s.me.email], ['Password', 'Changed 4 Jan 2026'], ['Security code', `Phone ending ${s.me.phone.slice(-4)}`]]} />
        <div className="flex wrap"><Btn sm kind="outline" icon={<KeyRound size={14} />} onClick={() => setM('password')}>Change password</Btn><Btn sm kind="ghost" icon={<LogOut size={14} />} onClick={() => { s.log('Signed out of all other devices', 'Account'); s.toast('Signed out of all other devices'); }}>Sign out other devices</Btn></div>
      </Card>
    </div>
    {m === 'details' && <DetailsModal onClose={() => setM('')} />}
    {m === 'bank' && <BankModal onClose={() => setM('')} />}
    {(['Hourly rate', 'Areas I cover', 'Pause my account', 'Stop working with LSP', 'Email or phone'] as string[]).includes(m) && <RequestModal kind={m as ReqKind} onClose={() => setM('')} onSent={() => s.go('messages', 'requests')} />}
    {m === 'password' && <Modal title="Change password" sub="At least 10 characters, with a number and a capital letter." onClose={() => setM('')} footer={<><Btn kind="outline" onClick={() => setM('')}>Cancel</Btn><Btn onClick={() => { s.log('Changed the password', 'Account'); s.toast('Password changed'); setM(''); }}>Save</Btn></>}>
      <Field label="Current password"><input className="input" type="password" defaultValue="••••••••••" /></Field><Field label="New password"><input className="input" type="password" /></Field><Field label="Type it again"><input className="input" type="password" /></Field></Modal>}
    {read && <TermsModal doc={s.terms[read.id]} onClose={() => setRead(null)} onAccept={read.accept ? () => { const id = read.id; s.setMe(x => ({ ...x, accepted: { ...x.accepted, [id]: { version: s.terms[id].version, at: nowStamp() } } })); s.log(`Accepted the ${s.terms[id].title.toLowerCase()} version ${s.terms[id].version}`, 'Account'); s.toast('Accepted'); setRead(null); } : undefined} />}
  </>;
}

function DetailsModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const [f, setF] = useState({ contact: s.me.contact, phone: s.me.phone, address: s.me.address });
  return <Modal title="Edit your details" onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn disabled={!f.contact.trim() || !f.phone.trim()} onClick={() => { s.setMe(a => ({ ...a, ...f })); s.log('Updated your business details', 'Account'); s.toast('Saved'); onClose(); }}>Save</Btn></>}>
    <Field label="Main contact"><Text value={f.contact} onChange={v => setF({ ...f, contact: v })} /></Field>
    <Field label="Mobile"><Text value={f.phone} onChange={v => setF({ ...f, phone: v })} /></Field>
    <Field label="Address"><Text value={f.address} onChange={v => setF({ ...f, address: v })} /></Field>
  </Modal>;
}

/** Add or change bank details: a security code to the phone, then LSP calls to check before it is used. */
function BankModal({ onClose }: { onClose: () => void }) {
  const s = useStore(); const add = !s.me.bank;
  const [f, setF] = useState({ name: s.me.bank?.name ?? s.me.name, sort: '', acc: '' }); const [step, setStep] = useState<'form' | 'code'>('form'); const [code, setCode] = useState('');
  const ok = f.name.trim() && /^\d{2}-?\d{2}-?\d{2}$/.test(f.sort.trim()) && /^\d{8}$/.test(f.acc.trim());
  return <Modal title={add ? 'Add bank details' : 'Change bank details'} sub="LSP checks every account by phone before using it." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn>{step === 'form' ? <Btn disabled={!ok} onClick={() => setStep('code')}>Continue</Btn> : <Btn icon={<Send size={16} />} disabled={code !== '123456'} onClick={() => {
      s.setMe(x => ({ ...x, bankPending: { name: f.name.trim(), sort: f.sort.trim(), last4: f.acc.slice(-4), at: nowStamp() } }));
      s.log(`${add ? 'Added' : 'Asked to change to'} the bank account ending ${f.acc.slice(-4)}`, 'Account'); s.toast('Sent. LSP will call you to check it.'); onClose();
    }}>Send to LSP</Btn>}</>}>
    {step === 'form' ? <>
      <Field label="Account name"><Text value={f.name} onChange={v => setF({ ...f, name: v })} /></Field>
      <div className="grid g2"><Field label="Sort code"><Text value={f.sort} onChange={v => setF({ ...f, sort: v })} placeholder="20-41-06" /></Field><Field label="Account number"><Text value={f.acc} onChange={v => setF({ ...f, acc: v.replace(/\D/g, '').slice(0, 8) })} placeholder="8 digits" /></Field></div>
    </> : <>
      <p className="small" style={{ margin: 0 }}>We texted a 6-digit code to the phone ending {s.me.phone.slice(-4)}. For this demo, use <b>123456</b>.</p>
      <Field label="Security code"><Text value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" /></Field>
    </>}
  </Modal>;
}

