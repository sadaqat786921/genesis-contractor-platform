import { Wrench, MessageSquare, Receipt, Clock, CalendarDays, ArrowRight, CheckCircle2, BadgeCheck, Phone, MapPin, KeyRound } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { daysFrom, ME_NAME, LSP_PHONE, parseDate } from '../data';
import { Btn, Card, Chip, Kpi, Note, Empty, Avatar } from '../ui';
import { PageHeader } from '../Shell';
import { needsMe, todo, MiniJobList, moneyOf, firstName, docView, docsDue, unreadOf, timeOf, dayOf, whenLabel, JobIcon, adminName, homeType } from './lib';

export default function HomePage() {
  const s = useStore(); const L = useLookups(); const mo = moneyOf(s);
  const todayV = s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) === 0).sort((a, b) => parseDate(a.visit).getTime() - parseDate(b.visit).getTime());
  const due = s.jobs.filter(needsMe).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || parseDate(a.visit).getTime() - parseDate(b.visit).getTime());
  const week = s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) > 0 && daysFrom(j.visit) <= 7);
  const oct = s.jobs.filter(j => j.given.includes('Oct 2026') && j.status !== 'Cancelled'); const octDone = oct.filter(j => ['Proof uploaded', 'Approved'].includes(j.status)).length;
  const unread = unreadOf(s).length;
  const contacts = [...new Set(s.jobs.filter(j => j.status !== 'Cancelled' && daysFrom(j.given) > -40).map(j => j.admin))];
  const coming = [
    ...s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) > 0).map(j => ({ d: dayOf(j.visit), t: `${j.title} · ${timeOf(j.visit)}`, p: L.prop(j.property)?.address ?? '', go: () => s.go('jobs', j.id), c: j.visitOk ? 't-brand' : 't-warn' })),
    ...mo.approved.map(b => ({ d: b.payRun, t: `Pay day · ${money(b.amount)}`, p: `Invoice ${b.no}`, go: () => s.go('payments'), c: 't-ok' })),
    ...s.timeOff.filter(t => daysFrom(t.to) >= 0).map(t => ({ d: t.from, t: `Time off to ${t.to}`, p: t.why, go: () => s.go('calendar'), c: 't-neutral' })),
    ...s.me.docs.filter(d => d.expires && daysFrom(d.expires) >= 0 && daysFrom(d.expires) <= 120).map(d => ({ d: d.expires!, t: `${d.name} ends`, p: 'Upload the new one before then', go: () => s.go('compliance'), c: 't-warn' })),
  ].sort((a, c) => daysFrom(a.d) - daysFrom(c.d)).slice(0, 6);
  return <>
    <PageHeader title={`Good morning, ${firstName(ME_NAME)}`} action={<div className="flex"><Btn kind="outline" icon={<MessageSquare size={18} />} onClick={() => s.go('messages')}>{unread ? `Messages · ${unread} new` : 'Message LSP'}</Btn><Btn icon={<CalendarDays size={18} />} onClick={() => s.go('calendar')}>My calendar</Btn></div>} />
    {s.me.status === 'Paused' && <Note tone="err">Your account is paused: {s.me.pausedWhy}. LSP can't give you new jobs until it's fixed. <button className="link" onClick={() => s.go('compliance')}>Upload it now</button></Note>}
    <div className="row">
      <div className="hero grow">
        <div className="col grow" style={{ gap: 14 }}>
          <span className="chip-dark" style={{ alignSelf: 'flex-start' }}>{s.me.name} · to be paid by LSP</span>
          <div className="flex" style={{ alignItems: 'flex-end', gap: 10 }}><span className="big">{money(mo.toCome)}</span><span className="chip accent nodot" style={{ marginBottom: 12 }}>Pay day {whenLabel(mo.next) === 'Tomorrow' ? 'tomorrow' : mo.next.replace(' 2026', '')}</span></div>
          <p style={{ margin: 0, color: '#C3CDE4', fontSize: 13, fontWeight: 500, maxWidth: 470 }}>Approved invoices, paid by bank transfer to the account ending {s.me.bank.last4}. {money(mo.checkingAmt)} more is with LSP to check, and {money(mo.bookedAmt)} of booked work is still to do.</p>
          <div className="flex" style={{ gap: 12 }}>{[[String(todayV.length), 'Visits today'], [String(due.length), 'To do now'], [String(week.length), 'Booked this week']].map(([v, l]) => <div className="mtile" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        </div>
        <div className="gring"><svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="80" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="14" /><circle cx="88" cy="88" r="80" fill="none" stroke="#5BAF00" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 80 * (oct.length ? octDone / oct.length : 0)} 999`} transform="rotate(-90 88 88)" /></svg>
          <div className="stack" style={{ alignItems: 'center' }}><CheckCircle2 size={22} color="#5BAF00" /><b style={{ fontSize: 13 }}>{octDone} of {oct.length} done</b><span style={{ fontSize: 10.5, color: '#AEBBDA' }}>jobs in October</span></div></div>
      </div>
      <Card title="Today" sub="Thursday 15 October" action={<Chip tone={todayV.length ? 'brand' : 'ok'}>{todayV.length} visit{todayV.length === 1 ? '' : 's'}</Chip>} style={{ width: 400, flex: 'none' }}>
        {todayV.map(j => { const p = L.prop(j.property); const t = todo(j); return <div className="lrow" key={j.id}>
          <span className="datetile t-brand" style={{ width: 48 }}><b style={{ fontSize: 13 }}>{timeOf(j.visit)}</b></span>
          <button className="stack grow" style={{ border: 0, background: 'none', textAlign: 'left', padding: 0, minWidth: 0 }} onClick={() => s.go('jobs', j.id)}><span className="flex" style={{ gap: 6 }}><b className="ellip">{j.title}</b>{j.urgent && <Chip tone="err">Emergency</Chip>}</span><span className="caption ellip"><MapPin size={11} style={{ verticalAlign: -1 }} /> {p?.address}, {p?.postcode}</span></button>
          <Btn sm kind={j.urgent ? 'danger' : 'primary'} onClick={() => s.go('jobs', j.id)}>{t ? ({ 'Confirm the visit': 'Confirm', 'Start work': 'Start', 'Finish and send photos': 'Finish', 'Put it right': 'Fix' } as Record<string, string>)[t] ?? t : 'Open'}</Btn>
        </div>; })}
        {!todayV.length && <Note tone="ok">No visits today.</Note>}
        <button className="btn ghost sm" onClick={() => s.go('calendar')}>Open calendar</button>
      </Card>
    </div>
    <div className="grid g4">
      <Kpi icon={<Wrench size={18} />} tone="warn" label="To do now" value={due.length} caption={`${s.jobs.filter(j => j.status === 'Assigned' && !j.visitOk).length} visits to confirm`} onClick={() => s.go('jobs')} />
      <Kpi icon={<Clock size={18} />} tone="info" label="LSP checking" value={money(mo.checkingAmt)} caption={`${mo.checking.length} invoice${mo.checking.length === 1 ? '' : 's'} with photos`} onClick={() => s.go('payments')} />
      <Kpi icon={<Receipt size={18} />} tone="ok" label="Approved to pay" value={money(mo.toCome)} caption={`paid ${mo.next.replace(' 2026', '')}`} onClick={() => s.go('payments')} />
      <Kpi icon={<CheckCircle2 size={18} />} tone="brand" label="Paid this year" value={money(mo.paidYear)} caption={`${s.bills.filter(b => b.paid).length} invoices`} onClick={() => s.go('payments')} />
    </div>
    <div className="row">
      <Card title="Needs you" sub="Confirm visits, start on the day, finish with photos and fix anything sent back." className="grow" action={<Btn sm kind="ghost" onClick={() => s.go('jobs')}>All jobs</Btn>}>
        {due.length ? <div className="divlist">{due.map(j => { const p = L.prop(j.property); return <button key={j.id} className="item click" onClick={() => s.go('jobs', j.id)}><JobIcon j={j} /><div className="stack grow"><b>{j.title}</b><span className="caption">{p?.address} · {whenLabel(j.visit)} {timeOf(j.visit)} · {money(j.pay.amount)}</span></div><Btn sm kind={j.status === 'Sent back' || j.urgent ? 'danger' : 'outline'} onClick={() => s.go('jobs', j.id)}>{todo(j)}</Btn></button>; })}</div> : <Empty icon={<CheckCircle2 size={22} />}>Nothing waiting for you.</Empty>}
      </Card>
      <Card title="Coming up" action={<CalendarDays size={18} color="#667085" />} style={{ width: 340, flex: 'none' }}>
        {coming.map(c => { const [d, m] = c.d.split(' '); return <button key={c.t + c.d} className="item click" style={{ padding: 0 }} onClick={c.go}><span className={`datetile ${c.c}`}><b>{d}</b><span>{m.toUpperCase()}</span></span><div className="stack"><b>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
        {!coming.length && <span className="caption">Nothing booked.</span>}
      </Card>
    </div>
    <div className="row">
      <Card title="Waiting for LSP" sub="Photos and invoices you sent. LSP checks them, then approves your invoice for the next Friday." className="grow" action={<Btn sm kind="ghost" onClick={() => s.go('payments')}>Invoices & Payments</Btn>}>
        <MiniJobList jobs={s.jobs.filter(j => j.status === 'Proof uploaded')} empty="Nothing with LSP." />
        {s.jobs.filter(j => j.followReq?.status === 'Asked').map(j => <div key={j.id} className="lrow"><span className="tile t-info" style={{ width: 32, height: 32 }}><Wrench size={15} /></span><div className="stack grow"><b>Follow-up asked: {j.followReq!.title}</b><span className="caption">{L.prop(j.property)?.address} · {money(j.followReq!.amount)} · LSP decides</span></div><Btn sm kind="ghost" onClick={() => s.go('jobs', j.id)}>Open</Btn></div>)}
      </Card>
      <Card title="Insurance & certificates" style={{ width: 340, flex: 'none' }} action={<BadgeCheck size={18} color={docsDue(s).length ? 'var(--warn)' : 'var(--ok)'} />}>
        <div className="divlist">{s.me.docs.filter(d => d.expires).map(d => { const v = docView(d); return <button key={d.id} className="item click" style={{ padding: '6px 0' }} onClick={() => s.go('compliance')}><div className="stack grow"><b>{d.name}</b><span className="caption">Valid until {d.expires}</span></div><Chip tone={v.tone}>{v.label}</Chip></button>; })}</div>
        <span className="caption">If insurance or your Gas Safe registration runs out, LSP pauses you and can't give you jobs.</span>
      </Card>
    </div>
    <div className="row">
      <Card title="Homes you're visiting" className="grow" sub="Getting in and who to call is on each job.">
        <div className="divlist">{[...new Set(s.jobs.filter(j => ['Assigned', 'In progress', 'Sent back'].includes(j.status)).map(j => j.property))].map(pid => { const p = L.prop(pid)!; const js = s.jobs.filter(j => j.property === pid && ['Assigned', 'In progress', 'Sent back'].includes(j.status)); return (
          <button key={pid} className="item click" onClick={() => s.go('jobs', js[0].id)}>
            <span className="photo" style={{ width: 64, height: 48, borderRadius: 10, flex: 'none', backgroundImage: `url(${p.photo})` }} />
            <div className="stack grow"><b>{p.address}</b><span className="caption">{homeType(p)} · {p.area} {p.postcode}</span><span className="caption"><KeyRound size={11} style={{ verticalAlign: -1 }} /> {p.keys}</span></div>
            <Chip tone="brand">{js.length} job{js.length > 1 ? 's' : ''}</Chip><ArrowRight size={16} color="#98A2B3" />
          </button>); })}</div>
      </Card>
      <Card title="Your LSP contacts" style={{ width: 340, flex: 'none' }}>
        {contacts.map(id => { const a = s.staff.find(x => x.id === id); return a ? <div key={id} className="flex"><Avatar id={id} size="md" /><div className="stack grow"><b>{adminName(s, id)}</b><span className="caption">{a.role} · {a.phone}</span></div></div> : null; })}
        <Btn kind="outline" icon={<MessageSquare size={16} />} onClick={() => s.go('messages')}>Send a message</Btn>
        <Note><Phone size={13} style={{ verticalAlign: -2 }} /> Can't make an emergency job or locked out? Call LSP on {LSP_PHONE}.</Note>
      </Card>
    </div>
  </>;
}
