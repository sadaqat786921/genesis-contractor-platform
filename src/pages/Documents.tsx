import { useState } from 'react';
import { FileText, FileCheck2, Receipt, Download, FolderOpen, ScrollText, Landmark, BadgeCheck } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { parseDate } from '../data';
import { Btn, Card, Chip, Empty, Kpi, FilterBar, applyFlt, useFlt, yearsOf, When } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { JobReportModal, RemittanceModal, invView, downloadPdf, remittances, docView } from './lib';

type Kind = 'Certificate' | 'Job report' | 'My invoice' | 'Remittance' | 'Insurance & ID' | 'Agreement';
interface Doc { id: string; name: string; kind: Kind; home: string; date: string; note: string; open: () => void; tone?: string }

/** Every document for the contractor: certificates they issued, job reports, their invoices, remittances, their own documents and the agreement with LSP. */
export function Documents() {
  const s = useStore(); const L = useLookups(); const [f, setF] = useFlt();
  const [m, setM] = useState('');
  const home = (id: string) => L.prop(id)?.address ?? '';
  const docs: Doc[] = [
    ...s.jobs.filter(j => j.cert).map(j => ({ id: 'c' + j.id, name: `${j.cert!.name} · ${j.cert!.result}`, kind: 'Certificate' as Kind, home: home(j.property), date: j.cert!.issued, note: `${j.cert!.file} · valid until ${j.cert!.expires}${j.status === 'Proof uploaded' ? ' · LSP checking' : ''}`, open: () => { s.log(`Downloaded ${j.cert!.name} for ${home(j.property)}`, 'Documents'); downloadPdf(s, j.cert!.name); } })),
    ...s.jobs.filter(j => j.proof?.length).map(j => ({ id: 'r' + j.id, name: `Job report · ${j.title}`, kind: 'Job report' as Kind, home: home(j.property), date: j.events[j.events.length - 1].at, note: `${j.proof!.length} photos · every step with date and time`, open: () => setM('rep:' + j.id) })),
    ...s.jobs.filter(j => j.cInvoice).map(j => ({ id: 'i' + j.id, name: `Invoice ${j.cInvoice!.no}`, kind: 'My invoice' as Kind, home: home(j.property), date: j.cInvoice!.at, note: `${money(j.cInvoice!.amount)} · ${j.title} · ${invView(s, j).label}`, open: () => s.go('payments', j.id) })),
    ...remittances(s).map(r => ({ id: 'm' + r.id, name: `Remittance ${r.id}`, kind: 'Remittance' as Kind, home: `${r.bills.length} invoice${r.bills.length > 1 ? 's' : ''}`, date: r.date, note: `${money(r.total)} paid by bank transfer`, open: () => setM('rem:' + r.id) })),
    ...s.me.docs.map(d => ({ id: 'd' + d.id, name: d.name, kind: 'Insurance & ID' as Kind, home: 'Your account', date: d.uploaded, note: `${d.file} · ${docView(d).label}${d.expires ? ` · until ${d.expires}` : ''}`, open: () => { s.log(`Downloaded ${d.name}`, 'Documents'); downloadPdf(s, d.name); } })),
    { id: 'ag', name: 'Contractor agreement with LSP', kind: 'Agreement' as Kind, home: 'Your account', date: s.me.joined + ', 10:30', note: `Signed when ${s.me.name} joined · rate ${money(s.me.rate)} an hour · paid every Friday`, open: () => { s.log('Downloaded the contractor agreement', 'Documents'); downloadPdf(s, 'Contractor agreement'); } },
    { id: 'hs', name: 'LSP health, safety and conduct rules', kind: 'Agreement' as Kind, home: 'Your account', date: s.me.joined + ', 10:30', note: 'Keys, tenants, photos, waste and making safe', open: () => { s.log('Downloaded the health and safety rules', 'Documents'); downloadPdf(s, 'Health, safety and conduct rules'); } },
  ].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  const list = applyFlt(docs, f, { text: d => `${d.name} ${d.home} ${d.note}`, type: d => d.kind, date: d => d.date });
  const icon = (k: Kind) => k === 'Certificate' ? <FileCheck2 size={15} /> : k === 'My invoice' ? <Receipt size={15} /> : k === 'Remittance' ? <Landmark size={15} /> : k === 'Insurance & ID' ? <BadgeCheck size={15} /> : k === 'Agreement' ? <ScrollText size={15} /> : <FileText size={15} />;
  const tone = (k: Kind) => k === 'Certificate' || k === 'Remittance' ? 't-ok' : k === 'My invoice' ? 't-warn' : 't-brand';
  const n = (k: Kind) => docs.filter(d => d.kind === k).length;
  return <>
    <PageHeader crumbs={crumbsFor('documents', s.go)} title="Documents" />
    <div className="grid g4">
      <Kpi icon={<FileCheck2 size={18} />} tone="ok" label="Certificates you issued" value={n('Certificate')} caption="gas safety (CP12)" onClick={() => setF({ ...f, type: 'Certificate' })} active={f.type === 'Certificate'} />
      <Kpi icon={<FileText size={18} />} tone="brand" label="Job reports" value={n('Job report')} caption="with your photos" onClick={() => setF({ ...f, type: 'Job report' })} active={f.type === 'Job report'} />
      <Kpi icon={<Receipt size={18} />} tone="warn" label="Your invoices" value={n('My invoice')} caption="sent to LSP" onClick={() => setF({ ...f, type: 'My invoice' })} active={f.type === 'My invoice'} />
      <Kpi icon={<Landmark size={18} />} tone="ok" label="Remittances" value={n('Remittance')} caption="what LSP paid you" onClick={() => setF({ ...f, type: 'Remittance' })} active={f.type === 'Remittance'} />
    </div>
    <Card title="All documents" sub="Search by name, address or number. Filter by type and year.">
      <FilterBar f={f} set={setF} placeholder="Search documents" types={['Certificate', 'Job report', 'My invoice', 'Remittance', 'Insurance & ID', 'Agreement']} typeLabel="All types" years={yearsOf(docs, d => d.date)} shown={list.length} total={docs.length} />
      <div className="tablewrap"><table className="t"><thead><tr><th>Document</th><th>Type</th><th>Home</th><th>Date</th><th /></tr></thead><tbody>
        {list.map(d => <tr key={d.id} onClick={d.open}>
          <td><span className="cell"><span className={`tile ${tone(d.kind)}`} style={{ width: 32, height: 32 }}>{icon(d.kind)}</span><span className="stack"><b className="strong">{d.name}</b><span className="caption">{d.note}</span></span></span></td>
          <td><Chip tone="neutral" dot={false}>{d.kind}</Chip></td><td>{d.home}</td><td><When at={d.date} /></td>
          <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}><Btn sm kind="ghost" icon={<Download size={14} />} onClick={d.open}>{['Certificate', 'Insurance & ID', 'Agreement'].includes(d.kind) ? 'Download' : 'Open'}</Btn></td></tr>)}
      </tbody></table>{!list.length && <Empty icon={<FolderOpen size={22} />}>No documents match.</Empty>}</div>
    </Card>
    {m.startsWith('rep:') && <JobReportModal j={s.jobs.find(j => j.id === m.slice(4))!} onClose={() => setM('')} />}
    {m.startsWith('rem:') && <RemittanceModal id={m.slice(4)} onClose={() => setM('')} />}
  </>;
}
