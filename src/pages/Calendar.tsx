import { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Palmtree, Trash2, CalendarDays, Receipt, MapPin } from 'lucide-react';
import { useStore, useLookups, money } from '../store';
import { TODAY, DAYS, MONTHS, fmtDate, parseDate, nowStamp, daysFrom } from '../data';
import { Btn, Card, Chip, Empty, Field, Modal, Note, Select, Area, Confirm } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { jobView, timeOf, dayOf, todo, sendMsg, JobIcon } from './lib';

/** The contractor's visits day by day, pay days, and time off (so LSP doesn't book them then). */
export function Calendar() {
  const s = useStore(); const L = useLookups();
  const [start, setStart] = useState(0); const [add, setAdd] = useState(false); const [del, setDel] = useState('');
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(TODAY); d.setDate(d.getDate() + start + i); return d; });
  const visits = s.jobs.filter(j => j.status !== 'Cancelled');
  return <>
    <PageHeader crumbs={crumbsFor('calendar', s.go)} title="Calendar" action={<Btn icon={<Plus size={18} />} onClick={() => setAdd(true)}>Add time off</Btn>} />
    <div className="dgrid">
      <div className="col">
        <Card title={`${days[0].getDate()} ${MONTHS[days[0].getMonth()]} to ${days[13].getDate()} ${MONTHS[days[13].getMonth()]} ${days[13].getFullYear()}`} sub="Your visits, pay days and time off, day by day."
          action={<div className="flex"><Btn sm kind="outline" icon={<ChevronLeft size={14} />} onClick={() => setStart(x => x - 14)}>Earlier</Btn>{start !== 0 && <Btn sm kind="ghost" onClick={() => setStart(0)}>Today</Btn>}<Btn sm kind="outline" onClick={() => setStart(x => x + 14)}>Later <ChevronRight size={14} /></Btn></div>}>
          <div className="divlist">{days.map(d => {
            const dl = fmtDate(d); const js = visits.filter(j => dayOf(j.visit) === dl).sort((a, b) => parseDate(a.visit).getTime() - parseDate(b.visit).getTime());
            const off = s.timeOff.find(t => d.getTime() >= parseDate(t.from).getTime() && d.getTime() <= parseDate(t.to).getTime());
            const pay = s.bills.filter(b => b.payRun === dl);
            const isToday = daysFrom(dl) === 0; const weekend = d.getDay() === 0 || d.getDay() === 6;
            return <div key={dl} className="lrow" style={{ alignItems: 'flex-start', opacity: weekend && !js.length && !off ? .6 : 1 }}>
              <span className={`datetile ${isToday ? 't-brand' : off ? 't-neutral' : 't-info'}`}><b>{d.getDate()}</b><span>{DAYS[d.getDay()].toUpperCase()}</span></span>
              <div className="col grow" style={{ gap: 6 }}>
                {isToday && <b className="caption" style={{ color: 'var(--text-brand)' }}>TODAY</b>}
                {off && <span className="flex small" style={{ gap: 6 }}><Palmtree size={14} /> Time off · {off.why}</span>}
                {js.map(j => { const v = jobView(s, j); const p = L.prop(j.property); return <button key={j.id} className="item click" style={{ padding: 0 }} onClick={() => s.go('jobs', j.id)}>
                  <JobIcon j={j} size={30} /><div className="stack grow"><b>{timeOf(j.visit)} · {j.title}</b><span className="caption"><MapPin size={11} style={{ verticalAlign: -1 }} /> {p?.address}, {p?.postcode} · {money(j.pay.amount)}</span></div>
                  {off && j.status === 'Assigned' && <Chip tone="err">In your time off</Chip>}<Chip tone={v.tone}>{todo(j) ?? v.label}</Chip></button>; })}
                {pay.map(b => <button key={b.id} className="item click" style={{ padding: 0 }} onClick={() => s.go('payments')}><span className="tile t-ok" style={{ width: 30, height: 30 }}><Receipt size={14} /></span><div className="stack grow"><b>Pay day · {money(b.amount)}</b><span className="caption">Invoice {b.no}{b.paid ? ' · paid' : ''}</span></div></button>)}
                {!js.length && !off && !pay.length && <span className="caption" style={{ paddingTop: 8 }}>Nothing booked</span>}
              </div>
            </div>;
          })}</div>
        </Card>
      </div>
      <div className="col">
        <Card title="Time off" sub="LSP won't book you on these days." action={<Btn sm kind="ghost" icon={<Plus size={14} />} onClick={() => setAdd(true)}>Add</Btn>}>
          {s.timeOff.length ? <div className="divlist">{s.timeOff.map(t => <div key={t.id} className="lrow"><span className="tile t-neutral" style={{ width: 32, height: 32 }}><Palmtree size={15} /></span><div className="stack grow"><b>{t.from === t.to ? t.from : `${t.from} to ${t.to}`}</b><span className="caption">{t.why} · added {t.added}</span></div>{daysFrom(t.to) >= 0 && <Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => setDel(t.id)}>Remove</Btn>}</div>)}</div> : <Empty icon={<Palmtree size={22} />}>No time off booked.</Empty>}
        </Card>
        <Card title="How booking works"><span className="small" style={{ lineHeight: 1.6 }}>LSP books each visit and tells you here, by email and by text. Confirm it on the job. If the time doesn't work, ask for another one there. Emergencies are booked for the same day.</span>
          <Btn kind="outline" icon={<CalendarDays size={16} />} onClick={() => s.go('jobs')}>My Jobs</Btn></Card>
      </div>
    </div>
    {add && <TimeOffModal onClose={() => setAdd(false)} />}
    {del && <Confirm title="Remove this time off?" sub="LSP can book you on these days again." cta="Remove" danger onClose={() => setDel('')} onConfirm={() => { const t = s.timeOff.find(x => x.id === del)!; s.setTimeOff(ts => ts.filter(x => x.id !== del)); s.log(`Removed time off: ${t.from} to ${t.to}`, 'Calendar'); s.toast('Time off removed'); setDel(''); }} />}
  </>;
}

function TimeOffModal({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [from, setFrom] = useState('2026-11-16'); const [to, setTo] = useState('2026-11-16'); const [why, setWhy] = useState('Holiday'); const [note, setNote] = useState('');
  const lab = (v: string) => { const d = new Date(v + 'T00:00'); return isNaN(d.getTime()) ? '' : fmtDate(d); };
  const f = lab(from), t = lab(to); const ok = f && t && new Date(to) >= new Date(from) && new Date(from + 'T00:00') >= TODAY;
  const clash = ok ? s.jobs.filter(j => j.status === 'Assigned' && parseDate(dayOf(j.visit)).getTime() >= parseDate(f).getTime() && parseDate(dayOf(j.visit)).getTime() <= parseDate(t).getTime()) : [];
  return <Modal title="Add time off" sub="LSP won't book you on these days. Already booked visits need moving." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Palmtree size={16} />} disabled={!ok} onClick={() => {
      s.setTimeOff(ts => [...ts, { id: 'TO' + Date.now(), from: f, to: t, why: why + (note.trim() ? ` · ${note.trim()}` : ''), added: nowStamp() }].sort((a, b) => parseDate(a.from).getTime() - parseDate(b.from).getTime()));
      if (clash.length) sendMsg(s, 'Please move my visits', `I'm off from ${f} to ${t}. Please move: ${clash.map(j => `${j.title} (${j.visit})`).join(', ')}.`);
      s.log(`Added time off: ${f} to ${t} (${why})`, 'Calendar'); s.toast(clash.length ? 'Time off added. LSP asked to move your visits.' : 'Time off added'); onClose();
    }}>Add time off</Btn></>}>
    <div className="grid g2"><Field label="From"><input className="input" type="date" value={from} onChange={e => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} /></Field><Field label="To"><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></Field></div>
    <Field label="Why"><Select value={why} onChange={setWhy} options={['Holiday', 'Training', 'Not well', 'Van off the road', 'Other'].map(x => ({ value: x, label: x }))} /></Field>
    <Field label="Note for LSP (optional)"><Area value={note} onChange={setNote} placeholder="e.g. Back on the Monday" /></Field>
    {!ok && from && <Note tone="warn">Choose dates from today on, with the end on or after the start.</Note>}
    {clash.length > 0 && <Note tone="warn">You have {clash.length} visit{clash.length > 1 ? 's' : ''} booked then: {clash.map(j => `${j.title}, ${j.visit}`).join('; ')}. LSP is asked to move {clash.length > 1 ? 'them' : 'it'}.</Note>}
  </Modal>;
}
