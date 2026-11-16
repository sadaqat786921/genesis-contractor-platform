import { useState, type ReactNode } from 'react';
import { CalendarDays, CheckCircle2, MapPin, Landmark, ScrollText, BadgeCheck, ArrowRight } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { daysFrom, ME_NAME, parseDate } from '../data';
import { Btn, Card, Chip, Empty } from '../ui';
import { PageHeader } from '../Shell';
import { needsMe, todo, moneyOf, firstName, docView, docsDue, timeOf, dayOf, whenLabel, JobIcon, termsDue, TermsModal } from './lib';
import type { TermsId } from '../data';

const SHORT: Record<string, string> = { 'Confirm the visit': 'Confirm', 'Start work': 'Start', 'Finish and send photos': 'Finish', 'Put it right': 'Fix' };

/** My Day: what to do now, today's visits, what's coming and what LSP will pay. */
export default function HomePage() {
  const s = useStore(); const L = useLookups(); const mo = moneyOf(s);
  const [terms, setTerms] = useState<TermsId | ''>('');
  const todayV = s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) === 0).sort((a, b) => parseDate(a.visit).getTime() - parseDate(b.visit).getTime());
  const due = s.jobs.filter(needsMe).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || parseDate(a.visit).getTime() - parseDate(b.visit).getTime());
  const week = s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) > 0 && daysFrom(j.visit) <= 7);
  const tDue = termsDue(s); const dDue = docsDue(s);
  const coming = [
    ...s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) > 0).map(j => ({ d: dayOf(j.visit), t: j.title, p: `${timeOf(j.visit)} · ${L.prop(j.property)?.address ?? ''}`, go: () => s.go('jobs', j.id), c: j.visitOk ? 't-brand' : 't-warn' })),
    ...mo.approved.map(b => ({ d: b.payRun, t: `Pay day · ${money(b.amount)}`, p: `Invoice ${b.no}`, go: () => s.go('payments'), c: 't-ok' })),
    ...s.timeOff.filter(t => daysFrom(t.to) >= 0).map(t => ({ d: t.from, t: 'Time off', p: `${t.why.split(' · ')[0]} · to ${t.to}`, go: () => s.go('calendar'), c: 't-neutral' })),
  ].sort((a, c) => daysFrom(a.d) - daysFrom(c.d)).slice(0, 5);
  return <>
    <PageHeader title={`Good morning, ${firstName(ME_NAME)}`} action={<Btn kind="outline" icon={<CalendarDays size={18} />} onClick={() => s.go('calendar')}>Calendar</Btn>} />
    {s.me.status === 'Paused' && <Alert tone="err" icon={<BadgeCheck size={18} />} text={`You're paused: ${s.me.pausedWhy}`} cta="Fix it" onClick={() => s.go('compliance')} />}
    {!s.me.bank && <Alert tone="warn" icon={<Landmark size={18} />} text={s.me.bankPending ? 'LSP is checking your bank details by phone' : 'Add your bank details so LSP can pay you'} cta={s.me.bankPending ? 'View' : 'Add bank details'} onClick={() => s.go('account')} />}
    {tDue.map(id => <Alert key={id} tone="info" icon={<ScrollText size={18} />} text={`LSP updated the ${s.terms[id].title.toLowerCase()} (version ${s.terms[id].version})`} cta="Read and accept" onClick={() => setTerms(id)} />)}
    {dDue.map(d => <Alert key={d.id} tone={docView(d).tone === 'err' ? 'err' : 'warn'} icon={<BadgeCheck size={18} />} text={`${d.name}: ${docView(d).label.toLowerCase()}`} cta="Upload new" onClick={() => s.go('compliance')} />)}
    <div className="row">
      <div className="hero grow">
        <div className="col grow" style={{ gap: 14 }}>
          <span className="chip-dark" style={{ alignSelf: 'flex-start' }}>To be paid by LSP</span>
          <div className="flex" style={{ alignItems: 'flex-end', gap: 10 }}><span className="big">{money(mo.toCome)}</span><span className="chip accent nodot" style={{ marginBottom: 12 }}>Pay day {mo.next.replace(' 2026', '')}</span></div>
          <div className="flex" style={{ gap: 12 }}>{[[String(due.length), 'To do now'], [String(week.length), 'Booked this week'], [money(mo.checkingAmt), 'With LSP to check']].map(([v, l]) => <div className="mtile" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        </div>
      </div>
      <Card title="Today" action={<Chip tone={todayV.length ? 'brand' : 'ok'} dot={false}>{todayV.length} visit{todayV.length === 1 ? '' : 's'}</Chip>} style={{ width: 400, flex: 'none' }}>
        {todayV.map(j => { const p = L.prop(j.property); const t = todo(j); return <div className="lrow" key={j.id}>
          <span className="datetile t-brand" style={{ width: 52 }}><b style={{ fontSize: 13 }}>{timeOf(j.visit)}</b></span>
          <button className="stack grow" style={{ border: 0, background: 'none', textAlign: 'left', padding: 0, minWidth: 0, cursor: 'pointer' }} onClick={() => s.go('jobs', j.id)}><b className="ellip">{j.title}</b><span className="caption ellip"><MapPin size={11} style={{ verticalAlign: -1 }} /> {p?.address}</span></button>
          <Btn sm kind={j.urgent ? 'danger' : 'primary'} onClick={() => s.go('jobs', j.id)}>{t ? SHORT[t] ?? t : 'Open'}</Btn>
        </div>; })}
        {!todayV.length && <Empty icon={<CheckCircle2 size={22} />}>No visits today.</Empty>}
      </Card>
    </div>
    <div className="row">
      <Card title="Needs you" className="grow" action={<Btn sm kind="ghost" onClick={() => s.go('jobs')}>All jobs</Btn>}>
        {due.length ? <div>{due.map(j => <button key={j.id} className="rowlink" onClick={() => s.go('jobs', j.id)}><JobIcon j={j} /><div className="stack grow"><b>{j.title}</b><span className="caption">{L.prop(j.property)?.address} · {whenLabel(j.visit)} {timeOf(j.visit)}</span></div><b>{money(j.pay.amount)}</b><Chip tone={j.status === 'Sent back' || j.urgent ? 'err' : 'warn'}>{todo(j)}</Chip></button>)}</div>
          : <Empty icon={<CheckCircle2 size={22} />}>Nothing waiting for you.</Empty>}
      </Card>
      <Card title="Coming up" style={{ width: 360, flex: 'none' }}>
        {coming.map(c => { const [d, m] = c.d.split(' '); return <button key={c.t + c.d} className="item click" style={{ padding: 0 }} onClick={c.go}><span className={`datetile ${c.c}`}><b>{d}</b><span>{m.toUpperCase()}</span></span><div className="stack grow" style={{ minWidth: 0 }}><b className="ellip">{c.t}</b><span className="caption ellip">{c.p}</span></div><ArrowRight size={14} color="#98A2B3" /></button>; })}
        {!coming.length && <span className="caption">Nothing booked.</span>}
      </Card>
    </div>
    {terms && <TermsModal doc={s.terms[terms]} onClose={() => setTerms('')} onAccept={() => { const at = new Date(); const stamp = `15 Oct 2026, ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`; s.setMe(m => ({ ...m, accepted: { ...m.accepted, [terms]: { version: s.terms[terms].version, at: stamp } } })); s.log(`Accepted the ${s.terms[terms].title.toLowerCase()} version ${s.terms[terms].version}`, 'Account'); s.toast('Accepted'); setTerms(''); }} />}
  </>;
}

/** One-line alert with a single action. Only shown when something needs the contractor. */
function Alert({ tone, icon, text, cta, onClick }: { tone: 'err' | 'warn' | 'info'; icon: ReactNode; text: string; cta: string; onClick: () => void }) {
  return <div className={`alertbar a-${tone}`}><span className={`tile t-${tone}`} style={{ width: 32, height: 32 }}>{icon}</span><b className="grow">{text}</b><Btn sm kind="outline" onClick={onClick}>{cta}</Btn></div>;
}
