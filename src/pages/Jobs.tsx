import { useRef, useState } from 'react';
import { Wrench, Clock, CheckCircle2, MessageSquare, FileText, Upload, ArrowRight, Image as ImageIcon, CalendarDays, XCircle, KeyRound, Phone, Download, FileCheck2, Play, Send, DoorClosed, Navigation, Camera, Flame, Receipt } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { LSP_PHONE, nowStamp, daysFrom, type Job, type FollowReq } from '../data';
import { ActionCard, Btn, Card, Chip, DetailHead, Empty, Field, HSteps, Note, Select, Tabs, Text, Area, Timeline, FilterBar, applyFlt, useFlt, yearsOf, When, Reason, Modal, Avatar, PageTabs, InfoTip, MoreMenu, PhotoTile, Facts } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { RoomsCard } from './Rooms';
import { DONE_JOB, jobView, needsMe, todo, isOpen, STEPS, stepAt, adminName, adminOf, JobReportModal, RemittanceModal, AskModal, homeType, jobEvent, lspSays, sendMsg, DemoAnswer, JobIcon, payText, billOf, invView, nextPayDay, offOn, whenLabel, timeOf, dayOf, r2, downloadPdf, last4 } from './lib';

const wl = (at: string) => { const w = whenLabel(at); return ['Today', 'Tomorrow', 'Yesterday'].includes(w) ? w.toLowerCase() : w; };

export function Jobs() {
  const s = useStore();
  if (s.detail && s.jobs.some(j => j.id === s.detail)) return <JobPage id={s.detail} />;
  return <JobList />;
}

/** The job table: search, type of work and year. */
export function JobTable({ list: all }: { list: Job[] }) {
  const s = useStore(); const L = useLookups(); const [f, setF] = useFlt();
  const list = applyFlt(all, f, { text: j => `${j.id} ${j.title} ${j.category} ${j.area ?? ''} ${j.cInvoice?.no ?? ''} ${L.prop(j.property)?.address ?? ''} ${L.prop(j.property)?.postcode ?? ''} ${jobView(s, j).label}`, type: j => j.category, date: j => j.visit });
  return <>{all.length > 2 && <FilterBar f={f} set={setF} placeholder="Search jobs, addresses, postcodes, invoices" types={[...new Set(all.map(j => j.category))].sort()} typeLabel="All types of work" years={yearsOf(all, j => j.visit)} shown={list.length} total={all.length} />}
    <div className="tablewrap"><table className="t"><thead><tr><th>Job</th><th>Home</th><th>Visit</th><th>You get</th><th>Status</th><th /></tr></thead><tbody>
      {list.map(j => { const v = jobView(s, j); const p = L.prop(j.property); const t = todo(j); return <tr key={j.id} onClick={() => s.go('jobs', j.id)}>
        <td><span className="cell"><JobIcon j={j} /><span className="stack"><b className="strong">{j.title}</b><span className="caption">{j.category}{j.area ? ' · ' + j.area : ''}</span></span></span></td>
        <td><span className="stack"><b>{p?.address}</b><span className="caption">{p?.postcode}</span></span></td>
        <td><When at={j.visit} /></td>
        <td><b>{money(j.pay.amount)}</b></td>
        <td><Chip tone={v.tone}>{v.label}</Chip></td>
        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>{t ? <Btn sm kind={j.status === 'Sent back' || j.urgent ? 'danger' : 'primary'} onClick={() => s.go('jobs', j.id)}>{t}</Btn> : <ArrowRight size={16} color="#98A2B3" />}</td></tr>; })}
    </tbody></table>{!list.length && <Empty icon={<Wrench size={22} />}>No jobs here.</Empty>}</div></>;
}

function JobList() {
  const s = useStore(); const J = s.jobs;
  const [tab, setTab] = useState<'todo' | 'booked' | 'checking' | 'done' | 'all'>('todo');
  const booked = J.filter(j => j.status === 'Assigned' && j.visitOk && daysFrom(j.visit) > 0);
  const list = J.filter(j => tab === 'all' ? true : tab === 'todo' ? needsMe(j) : tab === 'booked' ? booked.includes(j) : tab === 'checking' ? j.status === 'Proof uploaded' : DONE_JOB.includes(j.status))
    .sort((a, b) => (tab === 'done' || tab === 'all' ? -1 : 1) * (+new Date(a.visit.replace(',', '')) - +new Date(b.visit.replace(',', ''))));
  return <>
    <PageHeader crumbs={crumbsFor('jobs', s.go)} title="My Jobs" action={<Btn kind="outline" icon={<CalendarDays size={18} />} onClick={() => s.go('calendar')}>Calendar</Btn>} />
    {s.me.status === 'Paused' && <Note tone="err">You're paused: {s.me.pausedWhy}. <button className="link" onClick={() => s.go('compliance')}>Fix it</button></Note>}
    <PageTabs value={tab} onChange={setTab} items={[{ id: 'todo', label: 'To do', count: J.filter(needsMe).length }, { id: 'booked', label: 'Booked', count: booked.length }, { id: 'checking', label: 'LSP checking', count: J.filter(j => j.status === 'Proof uploaded').length }, { id: 'done', label: 'Done' }, { id: 'all', label: 'All' }]} />
    <Card><JobTable list={list} /></Card>
  </>;
}

/* ---------------- one job ---------------- */
type M = '' | 'report' | 'ask' | 'time' | 'cant' | 'confirm' | 'noaccess' | 'finish' | 'remit' | 'late';
function JobPage({ id }: { id: string }) {
  const s = useStore(); const L = useLookups(); const j = s.jobs.find(x => x.id === id)!;
  const p = L.prop(j.property)!; const lsp = adminName(s, j.admin); const adm = adminOf(s, j.admin);
  const [m, setM] = useState<M>(''); const [tab, setTab] = useState<'details' | 'proof' | 'history' | 'rooms'>(j.status === 'Sent back' ? 'proof' : 'details');
  const v = jobView(s, j); const b = billOf(s, j); const off = offOn(s, j.visit);
  const ev = (text: string, patch: Partial<Job> = {}, by?: string) => jobEvent(s, id, text, patch, by);
  const paused = s.me.status === 'Paused';
  const today = daysFrom(j.visit) <= 0;
  const cert = j.safety ? ' and the certificate' : '';
  const when = `${whenLabel(j.visit)} · ${timeOf(j.visit)}`;
  const start = () => { ev('Work started', { status: 'In progress' }); s.log(`Started ${j.title} at ${p.address}`, 'Jobs'); s.toast('Work started'); };
  const action = (() => {
    switch (j.status) {
      case 'Assigned':
        if (j.askedTime) return <ActionCard tone="neutral" title="Waiting for LSP to rebook" text={`You asked for: ${j.askedTime}`} />;
        if (!j.visitOk) return <ActionCard tone="warn" title="Confirm the visit" text={<span className="bigline">{when}</span>}>
          <Btn block icon={<CheckCircle2 size={16} />} disabled={paused} onClick={() => setM('confirm')}>Confirm the visit</Btn>
          <Btn block kind="outline" icon={<CalendarDays size={16} />} onClick={() => setM('time')}>Ask for another time</Btn></ActionCard>;
        if (today) return <ActionCard tone="brand" title={j.noAccess?.length ? 'LSP is rebooking' : 'Visit today'} text={<span className="bigline">{timeOf(j.visit)}</span>}>
          <Btn block icon={<Play size={16} />} disabled={paused} onClick={start}>Start work</Btn>
          <Btn block kind="outline" icon={<DoorClosed size={16} />} onClick={() => setM('noaccess')}>I couldn't get in</Btn></ActionCard>;
        return <ActionCard tone="brand" title="Visit booked" text={<span className="bigline">{when}</span>} />;
      case 'In progress': return <ActionCard tone="brand" title="Work in progress" text={`Finish with photos${cert} and your invoice.`}>
        <Btn block icon={<Upload size={16} />} onClick={() => setM('finish')}>Finish the job</Btn></ActionCard>;
      case 'Sent back': return <ActionCard tone="warn" title="Put it right" text={j.sentBack}>
        <Btn block icon={<Camera size={16} />} onClick={() => setM('finish')}>Send new photos</Btn></ActionCard>;
      case 'Proof uploaded': return <ActionCard tone="neutral" title="LSP checking" text="Usually within 1 working day." />;
      case 'Approved': return <ActionCard tone="ok" title={b?.paid ? 'Paid' : 'Approved'} text={<span className="bigline">{b ? money(b.amount) : '—'}</span>}>
        <span className="small">{b?.paid ? `Paid ${b.paid} · ${b.remit}` : b ? `Paid on ${b.payRun}` : 'Record locked'}</span>
        {b?.remit && <Btn block kind="outline" icon={<Receipt size={16} />} onClick={() => setM('remit')}>View remittance</Btn>}</ActionCard>;
      default: return <ActionCard tone="neutral" title="Cancelled" text={j.cancelled ?? 'Cancelled.'} />;
    }
  })();
  const demo = (() => {
    const out = [];
    if (j.status === 'Assigned' && (j.askedTime || j.noAccess?.length)) out.push(<Btn key="rb" sm kind="outline" onClick={() => { const nv = '21 Oct 2026, 10:00'; ev(`Rebooked for ${nv}. ${j.contact?.name ?? 'The tenant'} told`, { visit: nv, visitOk: undefined, askedTime: undefined }, lsp); lspSays(s, `New visit time · ${j.title}`, `${p.address} is now booked for ${nv}. Please confirm.`, lsp); s.toast('LSP rebooked the visit'); }}>LSP rebooks the visit</Btn>);
    if (j.status === 'Assigned' && j.visitOk && !today) out.push(<Btn key="day" sm kind="outline" onClick={() => { const nv = `15 Oct 2026, ${timeOf(j.visit)}`; ev('Prototype: moved to today to show the visit day', { visit: nv }, 'Prototype'); s.toast('It is now the visit day'); }}>It's the visit day</Btn>);
    if (j.status === 'Proof uploaded') out.push(
      <Btn key="ok" sm kind="outline" onClick={() => {
        const bid = `B-${312 + s.bills.filter(x => !x.paid).length + s.jobs.filter(x => x.status === 'Approved').length}`; const run = nextPayDay(new Date(2026, 9, 16));
        s.setBills(bs => [{ id: bid, job: j.id, no: j.cInvoice!.no, amount: j.cInvoice!.amount, approved: nowStamp(), payRun: run }, ...bs]);
        ev(`Checked the photos${cert}. Work approved and record locked. Invoice ${j.cInvoice!.no} approved for payment on ${run}.`, { status: 'Approved' }, lsp);
        lspSays(s, `Approved · ${j.title}`, `Thanks Gary. ${j.title} at ${p.address} is approved. Invoice ${j.cInvoice!.no} (${money(j.cInvoice!.amount)}) is paid on ${run}.`, lsp); s.toast('LSP approved the work');
      }}>LSP approves the work</Btn>,
      <Btn key="back" sm kind="ghost" onClick={() => { const r = 'The after photo is blurred. Please send a clear photo of the finished work.'; ev(`Sent back: ${r}`, { status: 'Sent back', sentBack: r }, lsp); lspSays(s, `Sent back · ${j.title}`, r, lsp); s.toast('LSP sent it back'); }}>LSP sends it back</Btn>);
    if (j.followReq?.status === 'Asked') out.push(
      <Btn key="fy" sm kind="outline" onClick={() => {
        const fr = j.followReq!; const nid = `J${40 + s.jobs.length}`; const at = nowStamp(); const visit = '22 Oct 2026, 09:00';
        const nj: Job = { id: nid, title: fr.title, property: j.property, status: 'Assigned', category: j.category, given: at, from: 'Your follow-up', admin: j.admin, note: fr.note, area: j.area, photos: fr.photos, visit, access: j.access, contact: j.contact,
          pay: { kind: 'Hourly', hours: fr.hours, rate: s.me.rate, parts: r2(fr.amount - fr.hours * s.me.rate) || undefined, amount: fr.amount }, followOf: j.id,
          events: [{ at, by: lsp, text: `Follow-up work from job ${j.id} approved. Job given to ${s.me.name}: ${money(fr.amount)}. Visit ${visit}.` }] };
        s.setJobs(js => [nj, ...js.map(x => x.id === id ? { ...x, followReq: { ...fr, status: 'Approved' as const, job: nid }, events: [...x.events, { at, by: lsp, text: `Follow-up work approved as new job ${nid}` }] } : x)]);
        lspSays(s, `Follow-up approved · ${fr.title}`, `Your follow-up work is approved as job ${nid}: ${money(fr.amount)}. Visit ${visit}. Please confirm.`, lsp); s.toast(`Follow-up approved as job ${nid}`);
      }}>LSP approves the follow-up</Btn>,
      <Btn key="fn" sm kind="ghost" onClick={() => { const r = 'The landlord will get the gutter done by their own roofer.'; ev(`Follow-up work declined: ${r}`, { followReq: { ...j.followReq!, status: 'Declined', reason: r } }, lsp); lspSays(s, `Follow-up declined · ${j.followReq!.title}`, r, lsp); s.toast('LSP declined the follow-up'); }}>LSP declines it</Btn>);
    if (j.status === 'Approved' && b && !b.paid) out.push(<Btn key="pay" sm kind="outline" disabled={!s.me.bank} onClick={() => {
      const rid = `R-0${420 + s.bills.filter(x => x.paid).length}`;
      s.setBills(bs => bs.map(x => x.id === b.id ? { ...x, paid: b.payRun, remit: rid } : x));
      ev(`Paid ${money(b.amount)} (remittance ${rid})`, {}, 'LSP Accounts'); lspSays(s, `Remittance ${rid}`, `Payment of ${money(b.amount)} sent to your account ending ${last4(s)}.`, 'LSP Accounts'); s.log(`LSP paid ${money(b.amount)} for invoice ${b.no}`, 'Payments', 'LSP Accounts'); s.toast('LSP paid the invoice');
    }}>LSP pays on {b.payRun.replace(' 2026', '')}</Btn>);
    return out;
  })();
  const open = isOpen(j);
  const proofCount = (j.proof?.length ?? 0) + (j.cert ? 1 : 0) + (j.cInvoice ? 1 : 0);
  return <>
    <PageHeader crumbs={crumbsFor('jobs', s.go, j.title)} back={() => s.go('jobs')} title={j.title}
      action={<MoreMenu items={[
        { label: `Message ${lsp.split(' ')[0]}`, icon: <MessageSquare size={16} />, onClick: () => setM('ask') },
        { label: 'Directions', icon: <Navigation size={16} />, onClick: () => { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.address}, ${p.postcode}`)}`, '_blank'); } },
        (!!j.proof?.length || DONE_JOB.includes(j.status)) && { label: 'Job report (PDF)', icon: <FileText size={16} />, onClick: () => setM('report') },
        j.status === 'Assigned' && !!j.visitOk && { label: 'Ask for another time', icon: <CalendarDays size={16} />, onClick: () => setM('time') },
        j.status === 'Assigned' && today && !!j.visitOk && { label: "I'm running late", icon: <Clock size={16} />, onClick: () => setM('late') },
        j.status === 'Assigned' && { label: "I can't do this job", icon: <XCircle size={16} />, onClick: () => setM('cant'), danger: true },
      ]} />} />
    {paused && open && <Note tone="err">You're paused: {s.me.pausedWhy}. <button className="link" onClick={() => s.go('compliance')}>Fix it</button></Note>}
    {j.urgent && open && <Note tone="err"><Phone size={13} style={{ verticalAlign: -2 }} /> Emergency. Can't make it? Call LSP on {LSP_PHONE}.</Note>}
    <DetailHead media={<JobIcon j={j} size={56} />} title={j.title}
      chips={<><Chip tone={v.tone}>{v.label}</Chip>{j.urgent && <Chip tone="err">Emergency</Chip>}{j.followOf && <Chip tone="info" dot={false}>Follow-up</Chip>}</>}
      meta={[['Home', `${p.address}, ${p.postcode}`], ['Visit', j.visit], ['You get', <span key="g">{money(j.pay.amount)}<InfoTip>{payText(j)}. Agreed before you start. Extra work is only paid when LSP agrees it first.</InfoTip></span>], ['Job', j.id]]} />
    <Card><HSteps items={STEPS} at={stepAt(s, j)} stopped={j.status === 'Cancelled' ? 'Cancelled' : j.status === 'Sent back' ? 'Sent back' : undefined} /></Card>
    <div className="dgrid">
      <div className="col">
        <PageTabs value={tab} onChange={setTab} items={[{ id: 'details', label: 'Details' }, { id: 'proof', label: 'Photos & invoice', count: proofCount || undefined }, { id: 'history', label: 'History' }, { id: 'rooms', label: 'Rooms' }]} />
        {tab === 'details' && <>
          <Card title="What's needed">
            <p style={{ margin: 0, lineHeight: 1.6 }}>{j.note}</p>
            {j.photos?.length ? <div className="photos">{j.photos.map(x => <PhotoTile key={x} name={x} />)}</div> : null}
            <Facts items={[['Room or area', j.area ?? '—'], ['Type of work', j.category], ['Reported by', j.from], ['Given by', lsp]]} />
          </Card>
          {j.followReq && <FollowCard fr={j.followReq} />}
        </>}
        {tab === 'proof' && <>
          {j.status === 'Sent back' && <Note tone="err">{j.sentBack}</Note>}
          {j.proof?.length ? <Card title="Photos" action={<Chip tone={j.status === 'Proof uploaded' ? 'info' : j.status === 'Sent back' ? 'err' : 'ok'}>{j.status === 'Proof uploaded' ? 'LSP checking' : j.status === 'Sent back' ? 'Needs better photos' : 'Checked'}</Chip>}>
            <div className="photos">{j.proof.map((x, i) => <PhotoTile key={x + i} name={x} />)}</div>
            {j.workNote && <Facts items={[['Your notes', j.workNote]]} />}</Card> : null}
          {j.cert && <Card title="Certificate" action={<Chip tone={j.cert.result === 'Pass' ? 'ok' : 'err'}>{j.cert.result}</Chip>}><div className="lrow"><FileCheck2 size={18} color={j.cert.result === 'Pass' ? 'var(--ok)' : 'var(--err)'} /><div className="stack grow"><b>{j.cert.name}</b><span className="caption">Valid until {j.cert.expires}</span></div><Btn sm kind="ghost" icon={<Download size={14} />} onClick={() => { s.log(`Downloaded ${j.cert!.name} for ${p.address}`, 'Documents'); downloadPdf(s, j.cert!.name); }}>Download</Btn></div></Card>}
          {j.cInvoice && <Card title="Your invoice" action={<Chip tone={invView(s, j).tone}>{invView(s, j).label}</Chip>}><Facts items={[['Number', j.cInvoice.no], ['Amount', money(j.cInvoice.amount)], ['Sent', j.cInvoice.at], ...(b ? [['LSP ref', b.id] as [string, string]] : [])]} />{j.cInvoice.why && <Note>More than agreed: {j.cInvoice.why}</Note>}</Card>}
          {!proofCount && <Empty icon={<Camera size={22} />}>Your photos{cert} and invoice go here when you finish.</Empty>}
        </>}
        {tab === 'history' && <Card><Timeline items={[...j.events].reverse().map(e => ({ at: e.at, text: e.text, by: e.by }))} /></Card>}
        {tab === 'rooms' && <RoomsCard p={p} title="Rooms" compact />}
      </div>
      <div className="col">
        {action}
        {demo.length > 0 && <DemoAnswer>{demo}</DemoAnswer>}
        <Card title="Getting in" action={<InfoTip>Only use the tenant's number for this visit. Return any keys the same day.</InfoTip>}>
          <span className="small" style={{ color: 'var(--text-primary)', fontWeight: 600 }}><KeyRound size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--icon-muted)' }} />{j.access}</span>
          {j.contact ? <div className="lrow"><Avatar name={j.contact.name} /><div className="stack grow"><b>{j.contact.name}</b><span className="caption">{j.contact.room ? `${j.contact.room} · ` : ''}{j.contact.phone}</span></div><a className="ibtn" href={`tel:${j.contact.phone.replace(/\s/g, '')}`} aria-label={`Call ${j.contact.name}`}><Phone size={16} /></a></div> : <span className="caption">No one living there. Use the key.</span>}
          {off && open && <Note tone="warn">This is in your time off ({off.from} to {off.to}).</Note>}
          {j.noAccess?.length ? <span className="caption">No access: {j.noAccess.join(' · ')}</span> : null}
        </Card>
        <Card><div className="flex"><span className="photo" style={{ width: 64, height: 48, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} /><div className="stack grow"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.postcode}</span></div></div></Card>
        <Card><div className="flex"><Avatar id={j.admin} size="md" /><div className="stack grow"><b>{lsp}</b><span className="caption">LSP {adm?.role}</span></div><Btn sm kind="outline" icon={<MessageSquare size={14} />} onClick={() => setM('ask')}>Message</Btn></div></Card>
      </div>
    </div>
    {m === 'report' && <JobReportModal j={j} onClose={() => setM('')} />}
    {m === 'remit' && b?.remit && <RemittanceModal id={b.remit} onClose={() => setM('')} />}
    {m === 'ask' && <AskModal title={`Message ${lsp}`} about={`${j.title} at ${p.address}`} onClose={() => setM('')} onSent={t => ev(`Sent a message: ${t}`)} />}
    {m === 'late' && <AskModal title="I'm running late" about={`Running late · ${j.title}`} sub={`${lsp} tells ${j.contact?.name ?? 'the tenant'}.`} label="New arrival time" placeholder="e.g. There by 12:40, stuck in traffic" onClose={() => setM('')} onSent={t => ev(`Running late: ${t}`)} />}
    {m === 'time' && <AskModal title="Ask for another time" about={`New visit time · ${j.title}`} sub={`Booked for ${j.visit}.`} label="Days and times that work" placeholder="e.g. Wednesday or Thursday morning" onClose={() => setM('')} onSent={t => { ev(`Asked for another visit time: ${t}`, { askedTime: t, visitOk: undefined }); s.log(`Asked for another visit time for ${j.title}`, 'Jobs'); }} />}
    {m === 'confirm' && <Modal title="Confirm the visit" sub={`${lsp} tells ${j.contact?.name ?? 'the people living there'} you're coming.`} onClose={() => setM('')}
      footer={<><Btn kind="outline" onClick={() => setM('')}>Cancel</Btn><Btn icon={<CheckCircle2 size={16} />} onClick={() => { ev('Confirmed the visit', { visitOk: nowStamp() }); sendMsg(s, `Visit confirmed · ${p.address}`, `Confirmed ${j.title} on ${j.visit}.`); s.log(`Confirmed the visit at ${p.address} on ${j.visit}`, 'Jobs'); s.toast('Visit confirmed'); setM(''); }}>Confirm</Btn></>}>
      <Facts items={[['When', `${whenLabel(j.visit)} · ${timeOf(j.visit)}`], ['Home', `${p.address}, ${p.postcode}`], ['You get', money(j.pay.amount)]]} />
      {off && <Note tone="warn">This is in your time off ({off.from} to {off.to}). Ask for another time instead.</Note>}
      {j.urgent && <Note tone="err">Emergency. Please be on time.</Note>}
    </Modal>}
    {m === 'cant' && <Reason danger title="I can't do this job" sub="LSP gives it to someone else. Nothing is paid." cta="Hand it back" label="Why" options={['Not free on that day', 'Not my trade', 'Too far away', 'Needs two engineers', 'Other']} onClose={() => setM('')} onDone={r => { ev(`Handed the job back: ${r}`, { status: 'Cancelled', cancelled: `You handed it back on ${nowStamp()}: ${r}` }); sendMsg(s, `Can't do · ${j.title}`, `Sorry, I can't do ${j.title} at ${p.address}. ${r}`); s.log(`Handed back ${j.title} at ${p.address}`, 'Jobs'); s.toast('Handed back to LSP'); setM(''); }} />}
    {m === 'noaccess' && <NoAccess onClose={() => setM('')} onSave={(what, note) => { const at = nowStamp(); ev(`Couldn't get in: ${what}${note ? `. ${note}` : ''}`, { noAccess: [...(j.noAccess ?? []), at] }); sendMsg(s, `No access · ${p.address}`, `I couldn't get in at ${at}: ${what}. ${note}`); s.log(`Couldn't get in at ${p.address}`, 'Jobs'); s.toast(`Sent to ${lsp}. They rebook it.`); setM(''); }} />}
    {m === 'finish' && <FinishModal id={id} onClose={() => setM('')} />}
  </>;
}

function FollowCard({ fr }: { fr: FollowReq }) {
  const s = useStore();
  const st = fr.status === 'Asked' ? { t: 'Waiting for LSP', tone: 'info' as const } : fr.status === 'Approved' ? { t: 'Approved', tone: 'ok' as const } : { t: 'Declined', tone: 'neutral' as const };
  return <Card title={<span className="clean-h">Follow-up work<InfoTip>LSP decides. If it says yes, it becomes a new job for you. Don't start it before then.</InfoTip></span>} action={<Chip tone={st.tone}>{st.t}</Chip>}>
    <b>{fr.title}</b><span className="small">{fr.note}</span>
    <Facts items={[['Time', `${fr.hours} hours`], ['You asked for', money(fr.amount)], ['Asked', dayOf(fr.at)], ...(fr.reason ? [['LSP said', fr.reason] as [string, string]] : [])]} />
    {fr.job && <Btn sm kind="outline" icon={<ArrowRight size={14} />} onClick={() => s.go('jobs', fr.job)}>Open job {fr.job}</Btn>}
  </Card>;
}

function NoAccess({ onClose, onSave }: { onClose: () => void; onSave: (what: string, note: string) => void }) {
  const [what, setWhat] = useState('No one was home'); const [note, setNote] = useState(''); const [ph, setPh] = useState(''); const ref = useRef<HTMLInputElement>(null);
  return <Modal title="I couldn't get in" sub="LSP calls the tenant and rebooks it. The time you tried is saved with the job." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} onClick={() => onSave(what, [note.trim(), ph ? `Photo: ${ph}` : ''].filter(Boolean).join(' · '))}>Send to LSP</Btn></>}>
    <Field label="What happened"><Select value={what} onChange={setWhat} options={['No one was home', 'The tenant would not let me in', 'Key safe code did not work', 'Key was not at LSP', 'Other'].map(x => ({ value: x, label: x }))} /></Field>
    <Field label="Anything else (optional)"><Area value={note} onChange={setNote} placeholder="e.g. Called the tenant twice, no answer. Waited 20 minutes." /></Field>
    <Field label="Photo of the door (optional)"><div className="flex wrap">{ph && <Chip tone="neutral" dot={false}>{ph}</Chip>}<Btn sm kind="outline" icon={<Camera size={14} />} onClick={() => ref.current?.click()}>{ph ? 'Change photo' : 'Add photo'}</Btn></div></Field>
    <input ref={ref} type="file" accept="image/*" hidden aria-label="Door photo" onChange={e => setPh(e.target.files?.[0]?.name.replace(/\.[^.]+$/, '') ?? '')} />
  </Modal>;
}

/* ---------------- finish the job: photos, certificate, invoice, follow-up ---------------- */
function PhotoField({ label, list, set, hint }: { label: string; list: string[]; set: (f: (x: string[]) => string[]) => void; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return <Field label={label} hint={hint}><div className="flex wrap">{list.map(x => <span key={x} className="chip neutral nodot">{x}<button className="link" style={{ marginLeft: 6 }} aria-label={`Remove ${x}`} onClick={() => set(l => l.filter(y => y !== x))}>×</button></span>)}<Btn sm kind="outline" icon={<ImageIcon size={14} />} onClick={() => ref.current?.click()}>Add photos</Btn></div>
    <input ref={ref} type="file" accept="image/*" multiple hidden aria-label={label} onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) set(ps => [...ps, ...fs.map(f => f.name.replace(/\.[^.]+$/, ''))]); e.target.value = ''; }} /></Field>;
}
function FileField({ label, value, set, hint }: { label: string; value: string; set: (v: string) => void; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return <Field label={label} hint={hint}><button type="button" className="dropzone" style={{ minHeight: 70 }} onClick={() => ref.current?.click()}><Upload size={18} />{value ? <b>{value}</b> : <span className="caption">Choose a PDF or photo</span>}</button>
    <input ref={ref} type="file" accept=".pdf,image/*" hidden aria-label={label} onChange={e => set(e.target.files?.[0]?.name ?? '')} /></Field>;
}
function FinishModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore(); const L = useLookups(); const j = s.jobs.find(x => x.id === id)!; const p = L.prop(j.property)!;
  const redo = j.status === 'Sent back';
  const [before, setBefore] = useState<string[]>([]); const [after, setAfter] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [cFile, setCFile] = useState(''); const [result, setResult] = useState<'Pass' | 'At risk' | 'Immediately dangerous'>('Pass'); const [exp, setExp] = useState('2027-10-15');
  const lastNo = Math.max(2231, ...s.jobs.map(x => +(x.cInvoice?.no.replace(/\D/g, '') ?? 0)));
  const [no, setNo] = useState(`HR-${lastNo + 1}`); const [amount, setAmount] = useState(String(j.pay.amount)); const [iFile, setIFile] = useState(''); const [why, setWhy] = useState('');
  const [follow, setFollow] = useState(false); const [ft, setFt] = useState(''); const [fn, setFn] = useState(''); const [fh, setFh] = useState(''); const [fa, setFa] = useState(''); const [fp, setFp] = useState<string[]>([]);
  const [tick, setTick] = useState(false);
  const fAmount = fa || (+fh ? String(r2(+fh * s.me.rate)) : '');
  const more = +amount > j.pay.amount;
  const ok = (redo ? after.length > 0 : before.length > 0 && after.length > 0) && tick
    && (redo || (!j.safety || cFile) && no.trim() && +amount > 0 && iFile && (!more || why.trim()))
    && (!follow || (ft.trim() && +fAmount > 0));
  const expLabel = (() => { const d = new Date(exp); return isNaN(d.getTime()) ? exp : `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}`; })();
  const save = () => {
    const at = nowStamp();
    const proof = redo ? [...(j.proof ?? []), ...after.map(x => `Fixed · ${x}`)] : [...before.map(x => `Before · ${x}`), ...after.map(x => `After · ${x}`)];
    const patch: Partial<Job> = { status: 'Proof uploaded', proof, sentBack: undefined, workNote: note.trim() || j.workNote };
    if (!redo) {
      patch.cInvoice = { no: no.trim(), amount: +amount, at, file: iFile, why: more ? why.trim() : undefined };
      if (j.safety) patch.cert = { name: 'Gas safety certificate (CP12)', file: cFile, issued: at, expires: expLabel, result };
    }
    if (follow) patch.followReq = { title: ft.trim(), note: fn.trim(), hours: +fh || 0, amount: +fAmount, at, status: 'Asked', photos: fp };
    jobEvent(s, id, redo ? `Put it right. Sent ${after.length} new photo${after.length > 1 ? 's' : ''}${note.trim() ? `: ${note.trim()}` : ''}` : `Finished. Sent ${proof.length} photos${j.safety ? `, the certificate (${result})` : ''} and invoice ${no.trim()} (${money(+amount)})`, patch);
    if (follow) jobEvent(s, id, `Asked for follow-up work: ${ft.trim()} (${money(+fAmount)})`);
    if (j.safety && !redo && result !== 'Pass') jobEvent(s, id, `Certificate result "${result}". Appliance made safe and the tenant told. LSP alerted.`);
    s.log(redo ? `Sent new photos for ${j.title} at ${p.address}` : `Finished ${j.title} at ${p.address}: photos${j.safety ? ', certificate' : ''} and invoice ${no.trim()}${follow ? ', plus a follow-up request' : ''}`, 'Jobs');
    s.toast(redo ? 'New photos sent to LSP' : 'Sent to LSP to check'); onClose();
  };
  return <Modal wide title={redo ? 'Send new photos' : 'Finish the job'} sub={redo ? `${adminName(s, j.admin)} asked: "${j.sentBack}"` : `${j.title} at ${p.address}. LSP checks everything before your invoice is approved.`} onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={!ok} onClick={save}>{redo ? 'Send new photos' : 'Send to LSP'}</Btn></>}>
    <b className="h2">1 · Photos</b>
    {!redo && <PhotoField label="Before (at least 1)" list={before} set={setBefore} hint="The problem as you found it." />}
    <PhotoField label={redo ? 'New photos (at least 1)' : 'After (at least 1)'} list={after} set={setAfter} hint={redo ? 'Show what LSP asked for.' : 'The finished work, clear and close up.'} />
    <Field label={redo ? 'What you put right (optional)' : 'What you did (optional)'}><Area value={note} onChange={setNote} placeholder="e.g. Replaced the diverter valve, topped up the pressure to 1.4 bar, tested the hot water." /></Field>
    {j.safety && !redo && <><b className="h2">2 · Certificate</b>
      <div className="grid g2"><FileField label="Gas safety certificate (CP12)" value={cFile} set={setCFile} />
        <div className="col" style={{ gap: 12 }}><Field label="Result"><Select value={result} onChange={v => setResult(v as typeof result)} options={['Pass', 'At risk', 'Immediately dangerous'].map(x => ({ value: x, label: x }))} /></Field><Field label="Valid until"><input className="input" type="date" value={exp} onChange={e => setExp(e.target.value)} /></Field></div></div>
      {result !== 'Pass' && <Note tone="err">Make the appliance safe now, label it and tell the tenant. LSP is told straight away and books the repair.</Note>}</>}
    {!redo && <><b className="h2">{j.safety ? '3' : '2'} · Your invoice</b>
      <div className="grid g2"><Field label="Your invoice number"><Text value={no} onChange={setNo} /></Field><Field label="Amount (£)" hint={`Agreed: ${money(j.pay.amount)} (${payText(j)})`}><Text value={amount} onChange={v => setAmount(v.replace(/[^0-9.]/g, ''))} /></Field></div>
      <FileField label="Invoice file" value={iFile} set={setIFile} hint="Your own invoice to Landlord Service Plans Limited." />
      {more && <><Note tone="warn">This is more than the {money(j.pay.amount)} agreed. LSP only pays more if it agrees.</Note><Field label="Why is it more?"><Area value={why} onChange={setWhy} placeholder="e.g. Needed a new pressure relief valve (£22), agreed with Priya on the phone at 12:40" /></Field></>}</>}
    {redo && j.cInvoice && <Note>Your invoice {j.cInvoice.no} ({money(j.cInvoice.amount)}) stays as it is. It is approved when the photos are.</Note>}
    <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} /> I found more work that needs doing (ask for follow-up work)</label>
    {follow && <>
      <Field label="What else needs doing"><Text value={ft} onChange={setFt} placeholder="e.g. Replace the corroded pipe under the sink" /></Field>
      <Field label="Why it is needed"><Area value={fn} onChange={setFn} placeholder="What you found and what happens if it is not done" /></Field>
      <div className="grid g2"><Field label="Hours"><Text value={fh} onChange={v => setFh(v.replace(/[^0-9.]/g, ''))} placeholder="e.g. 2" /></Field><Field label="Total you'd charge (£)" hint={`${money(s.me.rate)} an hour, plus any parts`}><Text value={fAmount} onChange={v => setFa(v.replace(/[^0-9.]/g, ''))} /></Field></div>
      <PhotoField label="Photos of it (optional)" list={fp} set={setFp} />
      <Note>LSP decides. If it says yes it becomes a new job for you. Don't do it until then.</Note>
    </>}
    <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={tick} onChange={e => setTick(e.target.checked)} /> The work is finished and I left the home clean and safe</label>
  </Modal>;
}
