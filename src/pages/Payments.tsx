import { useState } from 'react';
import { Receipt, Clock, CheckCircle2, CalendarDays, Landmark, Download, ArrowRight, MessageSquare, Wrench } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { parseDate } from '../data';
import { Btn, Card, Chip, Drawer, Empty, KV, Kpi, Note, Tabs, Timeline, FilterBar, applyFlt, useFlt, yearsOf, When } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { moneyOf, billOf, invView, remittances, RemittanceModal, AskModal, downloadPdf, bankLine, JobIcon } from './lib';

/** The contractor's invoices to LSP and the payments LSP made. LSP pays approved invoices every Friday. */
export function Payments() {
  const s = useStore(); const L = useLookups(); const mo = moneyOf(s);
  const [tab, setTab] = useState<'all' | 'checking' | 'approved' | 'paid' | 'remit'>('all');
  const [remit, setRemit] = useState(''); const [f, setF] = useFlt();
  const sent = s.jobs.filter(j => j.cInvoice).sort((a, b) => parseDate(b.cInvoice!.at).getTime() - parseDate(a.cInvoice!.at).getTime());
  const pick = sent.filter(j => { const b = billOf(s, j); return tab === 'all' ? true : tab === 'checking' ? !b : tab === 'approved' ? b && !b.paid : !!b?.paid; });
  const list = applyFlt(pick, f, { text: j => `${j.cInvoice!.no} ${j.title} ${j.id} ${L.prop(j.property)?.address ?? ''}`, date: j => j.cInvoice!.at });
  const open = s.detail ? s.jobs.find(j => j.id === s.detail && j.cInvoice) : undefined;
  const rs = remittances(s);
  return <>
    <PageHeader crumbs={crumbsFor('payments', s.go)} title="Invoices & Payments" action={<Btn kind="outline" icon={<Download size={18} />} onClick={() => { s.log('Downloaded the payments list', 'Payments'); s.toast('Payments list downloaded as Excel'); }}>Download list</Btn>} />
    <div className="grid g4">
      <Kpi icon={<Receipt size={18} />} tone="ok" label="Approved, to be paid" value={money(mo.toCome)} caption={`${mo.approved.length} invoice${mo.approved.length === 1 ? '' : 's'}`} active={tab === 'approved'} onClick={() => setTab('approved')} />
      <Kpi icon={<Clock size={18} />} tone="info" label="LSP checking" value={money(mo.checkingAmt)} caption={`${mo.checking.length} with photos`} active={tab === 'checking'} onClick={() => setTab('checking')} />
      <Kpi icon={<CalendarDays size={18} />} tone="brand" label="Next pay day" value={mo.next.replace(' 2026', '')} caption="every Friday by bank transfer" />
      <Kpi icon={<CheckCircle2 size={18} />} tone="ok" label="Paid this year" value={money(mo.paidYear)} caption={`${s.bills.filter(b => b.paid).length} invoices`} active={tab === 'paid'} onClick={() => setTab('paid')} />
    </div>
    <div className="dgrid">
      <div className="col">
        <Card title={tab === 'remit' ? 'Remittances' : 'Your invoices to LSP'} sub={tab === 'remit' ? 'What LSP paid on each pay day.' : 'Each invoice is sent from the job with the photos. LSP approves it when the work is checked.'}
          action={<Tabs value={tab} onChange={setTab} items={[{ id: 'all', label: 'All', count: sent.length }, { id: 'checking', label: 'Checking' }, { id: 'approved', label: 'Approved' }, { id: 'paid', label: 'Paid' }, { id: 'remit', label: 'Remittances', count: rs.length }]} />}>
          {tab !== 'remit' ? <>
            {pick.length > 2 && <FilterBar f={f} set={setF} placeholder="Search invoice number, job or address" years={yearsOf(pick, j => j.cInvoice!.at)} shown={list.length} total={pick.length} />}
            <div className="tablewrap"><table className="t"><thead><tr><th>Your invoice</th><th>Job</th><th>Sent</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>
              {list.map(j => { const v = invView(s, j); return <tr key={j.id} onClick={() => s.go('payments', j.id)}>
                <td><b className="strong">{j.cInvoice!.no}</b></td>
                <td><span className="cell"><JobIcon j={j} size={28} /><span className="stack"><b>{j.title}</b><span className="caption">{j.id} · {L.prop(j.property)?.address}</span></span></span></td>
                <td><When at={j.cInvoice!.at} /></td><td><b>{money(j.cInvoice!.amount)}</b></td>
                <td><Chip tone={v.tone}>{v.label}</Chip></td><td style={{ textAlign: 'right' }}><ArrowRight size={16} color="#98A2B3" /></td></tr>; })}
            </tbody></table>{!list.length && <Empty icon={<Receipt size={22} />}>No invoices here.</Empty>}</div></>
            : rs.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Remittance</th><th>Paid on</th><th>Invoices</th><th>Total</th><th /></tr></thead><tbody>
              {rs.map(r => <tr key={r.id} onClick={() => setRemit(r.id)}><td><b className="strong">{r.id}</b></td><td>{r.date}</td><td>{r.bills.map(b => b.no).join(', ')}</td><td><b>{money(r.total)}</b></td><td style={{ textAlign: 'right' }}><Btn sm kind="ghost" onClick={() => setRemit(r.id)}>View</Btn></td></tr>)}
            </tbody></table></div> : <Empty icon={<Landmark size={22} />}>No payments yet.</Empty>}
        </Card>
      </div>
      <div className="col">
        <Card title="How you get paid">
          <div className="col" style={{ gap: 8 }}>{['Finish the job and send your invoice with the photos.', 'LSP checks the work, usually within 1 working day.', 'Approved invoices are paid every Friday by bank transfer.', 'The remittance shows here and comes by email.'].map((t, i) => <span key={i} className="flex small" style={{ gap: 10, alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 24, height: 24, fontSize: 12, fontWeight: 700 }}>{i + 1}</span>{t}</span>)}</div>
          <Note>Invoice Landlord Service Plans Limited, 1 Upper Street, London N1 0PQ. Put the job number on it. Only the agreed amount is paid unless LSP agrees more.</Note>
        </Card>
        <Card title="Paid into" action={<Landmark size={18} color="#667085" />}><b>{bankLine(s)}</b><span className="caption">To change it, ask from Account. LSP checks the change by phone first.</span><Btn kind="outline" onClick={() => s.go('account')}>Change bank details</Btn></Card>
      </div>
    </div>
    {open && <InvoiceDrawer id={open.id} onClose={() => s.go('payments')} onRemit={setRemit} />}
    {remit && <RemittanceModal id={remit} onClose={() => setRemit('')} />}
  </>;
}

function InvoiceDrawer({ id, onClose, onRemit }: { id: string; onClose: () => void; onRemit: (r: string) => void }) {
  const s = useStore(); const L = useLookups(); const j = s.jobs.find(x => x.id === id)!; const i = j.cInvoice!; const b = billOf(s, j); const v = invView(s, j);
  const [ask, setAsk] = useState(false);
  const steps = [{ at: i.at, text: `Sent invoice ${i.no} with the photos (${money(i.amount)})`, by: 'You' }, ...(j.status === 'Sent back' ? [{ at: [...j.events].reverse().find(e => e.text.startsWith('Sent back'))?.at ?? '', text: 'On hold: the job was sent back to put right', by: 'LSP' }] : []), ...(b ? [{ at: b.approved, text: `Approved for payment on ${b.payRun} (LSP ref ${b.id})`, by: 'LSP' }] : []), ...(b?.paid ? [{ at: b.paid, text: `Paid by bank transfer (remittance ${b.remit})`, by: 'LSP Accounts' }] : [])].reverse();
  return <Drawer title={`Invoice ${i.no}`} sub={`${j.title} · ${L.prop(j.property)?.address}`} icon={<span className="tile t-brand"><Receipt size={18} /></span>} onClose={onClose}
    footer={<><Btn kind="ghost" icon={<MessageSquare size={16} />} onClick={() => setAsk(true)}>Ask about it</Btn><Btn kind="outline" icon={<Download size={16} />} onClick={() => { s.log(`Downloaded invoice ${i.no}`, 'Payments'); downloadPdf(s, `Invoice ${i.no}`); }}>Download</Btn>{b?.remit && <Btn icon={<Landmark size={16} />} onClick={() => onRemit(b.remit!)}>Remittance</Btn>}</>}>
    <div className="flex wrap" style={{ gap: 8 }}><Chip tone={v.tone}>{v.label}</Chip></div>
    <Card><KV rows={[['Amount', money(i.amount)], ['Agreed for the job', money(j.pay.amount)], ['Sent', i.at], ['File', i.file], ['Job', `${j.id} · ${j.title}`], ['Home', `${L.prop(j.property)?.address}, ${L.prop(j.property)?.postcode}`], ['Pay day', b ? b.payRun : 'After LSP approves the work'], ['Paid into', bankLine(s)]]} />
      {i.why && <Note>You said: {i.why}</Note>}</Card>
    {j.status === 'Sent back' && <Note tone="err">This invoice waits until you put the job right: {j.sentBack}</Note>}
    <Card title="What happened"><Timeline items={steps} /></Card>
    <Btn kind="outline" icon={<Wrench size={16} />} onClick={() => s.go('jobs', j.id)}>Open the job</Btn>
    {ask && <AskModal title={`Ask about invoice ${i.no}`} about={`Invoice ${i.no} · ${money(i.amount)}`} sub="Goes to LSP Accounts. You see the reply in Messages." onClose={() => setAsk(false)} />}
  </Drawer>;
}
