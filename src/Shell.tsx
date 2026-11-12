import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, MessageSquare, Wrench, Receipt, FolderOpen, History, Settings, CalendarRange, BadgeCheck, Home,
  PanelLeft, LogOut, Search, Bell, CalendarDays, ChevronRight, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldAlert, KeyRound, Check, ShieldCheck, Camera, Flame,
} from 'lucide-react';
import { useStore, useLookups, money, type Route } from './store';
import { daysFrom, LSP_PHONE } from './data';
import { Btn, IBtn, Note, Avatar } from './ui';
import { needsMe, todo, docsDue, docView, unreadOf, moneyOf, whenLabel, timeOf, dayOf } from './pages/lib';

export const NAV: { group: string; items: { id: Route; label: string; icon: typeof Home }[] }[] = [
  { group: 'Overview', items: [{ id: 'home', label: 'My Day', icon: LayoutDashboard }, { id: 'messages', label: 'Messages', icon: MessageSquare }] },
  { group: 'Work', items: [{ id: 'jobs', label: 'My Jobs', icon: Wrench }, { id: 'calendar', label: 'Calendar', icon: CalendarRange }] },
  { group: 'Money', items: [{ id: 'payments', label: 'Invoices & Payments', icon: Receipt }] },
  { group: 'Compliance', items: [{ id: 'compliance', label: 'Insurance & Certificates', icon: BadgeCheck }] },
  { group: 'Records', items: [{ id: 'documents', label: 'Documents', icon: FolderOpen }, { id: 'activity', label: 'Activity', icon: History }, { id: 'account', label: 'Account', icon: Settings }] },
];
export const LABEL: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, i.label]))) as Record<Route, string>;
const GROUP: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, g.group]))) as Record<Route, string>;

export function useCounts() {
  const s = useStore();
  return {
    messages: unreadOf(s).length,
    jobs: s.jobs.filter(needsMe).length,
    calendar: s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) === 0).length,
    payments: moneyOf(s).checking.length,
    compliance: docsDue(s).length,
  } as Partial<Record<Route, number>>;
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const s = useStore(); const counts = useCounts();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className="sidebar" style={collapsed ? { width: 76 } : undefined} aria-label="Main menu">
      <div className="sb-logo">{!collapsed && <img src="images/logo.svg" alt="Landlord Service Plans" />}<button onClick={() => setCollapsed(c => !c)} aria-label="Collapse menu"><PanelLeft size={18} strokeWidth={1.8} /></button></div>
      <nav className="sb-nav">
        {NAV.map((g, gi) => <div key={g.group} className={gi > 0 ? 'sb-group' : undefined}>
          {g.items.map(it => { const Ic = it.icon; const n = counts[it.id]; return (
            <button key={it.id} className={`nav${s.route === it.id ? ' on' : ''}`} onClick={() => s.go(it.id)} title={it.label} aria-current={s.route === it.id ? 'page' : undefined}>
              <Ic size={20} strokeWidth={1.8} />{!collapsed && <span>{it.label}</span>}{!collapsed && !!n && <span className="count">{n}</span>}
            </button>); })}
        </div>)}
      </nav>
      <div className="sb-user"><Avatar name={s.me.contact} photo="images/av2.jpg" size="md" />{!collapsed && <button className="stack" style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => s.go('account')}><b style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.me.contact}</b><span className="caption">{s.me.trade} · {s.me.name}</span></button>}<button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={18} strokeWidth={1.8} /></button></div>
    </aside>
  );
}

export function PageHeader({ title, action, crumbs, back }: { title: ReactNode; action?: ReactNode; crumbs?: { label: string; onClick?: () => void }[]; back?: () => void }) {
  const s = useStore(); const L = useLookups();
  const [q, setQ] = useState('');
  const [pop, setPop] = useState<'' | 'bell' | 'cal'>('');
  const ref = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const r: { label: string; sub: string; go: () => void }[] = [];
    s.jobs.filter(x => (x.title + ' ' + x.id + ' ' + x.category + ' ' + (x.cInvoice?.no ?? '') + ' ' + (L.prop(x.property)?.address ?? '') + ' ' + (L.prop(x.property)?.postcode ?? '')).toLowerCase().includes(t)).forEach(x => r.push({ label: x.title, sub: `Job ${x.id} · ${L.prop(x.property)?.address ?? ''}`, go: () => s.go('jobs', x.id) }));
    s.jobs.filter(x => x.cInvoice && x.cInvoice.no.toLowerCase().includes(t)).forEach(x => r.push({ label: x.cInvoice!.no, sub: `Your invoice · ${money(x.cInvoice!.amount)}`, go: () => s.go('payments', x.id) }));
    s.me.docs.filter(d => d.name.toLowerCase().includes(t)).forEach(d => r.push({ label: d.name, sub: 'Insurance & certificates', go: () => s.go('compliance') }));
    return r.slice(0, 8);
  }, [q, s, L]);
  const notes = [
    ...s.jobs.filter(needsMe).map(j => ({ t: `${todo(j)}: ${j.title}`, d: `${L.prop(j.property)?.address} · ${whenLabel(j.visit)} ${timeOf(j.visit)}`, r: 'jobs' as Route, id: j.id as string | null, tone: j.status === 'Sent back' || j.urgent ? 'err' : 'warn' })),
    ...s.jobs.filter(j => j.followReq?.status === 'Asked').map(j => ({ t: `Follow-up work waiting for LSP`, d: `${j.followReq!.title} · ${money(j.followReq!.amount)}`, r: 'jobs' as Route, id: j.id as string | null, tone: 'info' })),
    ...s.bills.filter(b => !b.paid).map(b => ({ t: `Invoice ${b.no} approved`, d: `${money(b.amount)} paid on ${b.payRun}`, r: 'payments' as Route, id: b.job as string | null, tone: 'ok' })),
    ...docsDue(s).map(d => ({ t: `${d.name}: ${docView(d).label}`, d: 'Upload the new one to keep getting work', r: 'compliance' as Route, id: null as string | null, tone: docView(d).tone })),
    ...unreadOf(s).map(c => ({ t: 'New message from LSP', d: c.subject ?? c.text.slice(0, 60), r: 'messages' as Route, id: null as string | null, tone: 'info' })),
  ];
  const cal = [
    ...s.jobs.filter(j => ['Assigned', 'In progress'].includes(j.status) && daysFrom(j.visit) >= 0).map(j => ({ d: dayOf(j.visit), t: `${j.title} · ${timeOf(j.visit)}`, p: L.prop(j.property)?.address ?? '', r: 'jobs' as Route, id: j.id as string | null })),
    ...s.bills.filter(b => !b.paid).map(b => ({ d: b.payRun, t: `Pay day · ${money(b.amount)}`, p: `Invoice ${b.no}`, r: 'payments' as Route, id: b.job as string | null })),
    ...s.timeOff.filter(t => daysFrom(t.to) >= 0).map(t => ({ d: t.from, t: `Time off to ${t.to}`, p: t.why, r: 'calendar' as Route, id: null as string | null })),
  ].sort((a, c) => daysFrom(a.d) - daysFrom(c.d)).slice(0, 7);
  return (
    <header className="header">
      {back && <IBtn icon={<ArrowLeft size={18} />} onClick={back} label="Back" />}
      <div className="grow">
        {crumbs && <div className="crumbs">{crumbs.map((c, i) => <span key={i} className="flex" style={{ gap: 6 }}>{i > 0 && <ChevronRight size={12} />}{c.onClick ? <button onClick={c.onClick}>{c.label}</button> : <span>{c.label}</span>}</span>)}</div>}
        <h1 className="h1">{title}</h1>
      </div>
      <div className="searchwrap">
        <label className="search"><Search size={18} strokeWidth={1.8} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search jobs, addresses, invoices" aria-label="Search everything" /><span className="kbd">⌘K</span></label>
        {results.length > 0 && <div className="pop" style={{ left: 0, right: 'auto', width: 300 }}>{results.map((r, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setQ(''); r.go(); }}><div className="stack"><b style={{ fontSize: 12.5 }}>{r.label}</b><span className="caption">{r.sub}</span></div></button>)}</div>}
      </div>
      <div style={{ position: 'relative' }} ref={ref}>
        <div className="flex" style={{ gap: 12 }}>
          <button className="ibtn" onClick={() => setPop(p => p === 'bell' ? '' : 'bell')} aria-label="Alerts"><Bell size={20} strokeWidth={1.8} />{notes.length > 0 && <span className="dot" />}</button>
          <button className="ibtn" onClick={() => setPop(p => p === 'cal' ? '' : 'cal')} aria-label="Calendar"><CalendarDays size={20} strokeWidth={1.8} /></button>
        </div>
        {pop === 'bell' && <div className="pop"><div className="flex between" style={{ padding: '2px 4px 6px' }}><b className="h2">Alerts</b><span className="caption">{notes.length} new</span></div>
          {notes.map((n, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(n.r, n.id); }}><span className={`tile t-${n.tone}`} style={{ width: 30, height: 30 }}><Bell size={15} /></span><div className="stack grow"><b style={{ fontSize: 12.5 }}>{n.t}</b><span className="caption">{n.d}</span></div><ArrowRight size={14} color="#98A2B3" /></button>)}
          {!notes.length && <div className="empty">You are all caught up.</div>}</div>}
        {pop === 'cal' && <div className="pop"><b className="h2" style={{ padding: '2px 4px 6px' }}>Coming up</b>
          {cal.map((c, i) => { const [dd, mm] = c.d.split(' '); return <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(c.r, c.id); }}><span className="datetile t-info" style={{ width: 40, height: 42 }}><b style={{ fontSize: 14 }}>{dd}</b><span>{(mm || '').toUpperCase()}</span></span><div className="stack"><b style={{ fontSize: 12.5 }}>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
          {!cal.length && <div className="empty">Nothing coming up.</div>}
          <button className="btn ghost sm" onClick={() => { setPop(''); s.go('calendar'); }}>Open calendar</button></div>}
      </div>
      {action}
    </header>
  );
}

export const crumbsFor = (r: Route, go: (r: Route) => void, extra?: string) => {
  const c: { label: string; onClick?: () => void }[] = [{ label: GROUP[r] }, { label: LABEL[r], onClick: extra ? () => go(r) : undefined }];
  if (extra) c.push({ label: extra });
  return c;
};

/** Sign in (email, password, then a 6-digit code). First time: set a password from the welcome email LSP sent from Outlook. */
export function Login({ onDone, onJoin, start = 'in', startEmail }: { onDone: () => void; onJoin?: () => void; start?: 'in' | 'welcome'; startEmail?: string }) {
  const [step, setStep] = useState<'in' | 'welcome' | 'code' | 'locked' | 'forgot'>(start);
  const [email, setEmail] = useState(startEmail ?? 'gary@heatright.co.uk');
  const [pw, setPw] = useState('••••••••••');
  const [np, setNp] = useState(''); const [np2, setNp2] = useState(''); const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [wrong, setWrong] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const rules = [['At least 10 characters', np.length >= 10], ['A number', /\d/.test(np)], ['A capital letter', /[A-Z]/.test(np)], ['Both passwords match', !!np && np === np2]] as [string, boolean][];
  const verify = () => {
    if (code.join('') === '123456') return onDone();
    const w = wrong + 1; setWrong(w); setCode(['', '', '', '', '', '']); refs.current[0]?.focus();
    if (w >= 5) setStep('locked');
  };
  return (
    <div className="login">
      <aside className="login-art">
        <img src="images/logo-white.svg" alt="Landlord Service Plans" style={{ width: 250 }} />
        <h2 style={{ fontSize: 38, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-.02em', marginTop: 64, maxWidth: 460 }}>Your jobs, <span style={{ color: '#8FD64A' }}>sorted and paid.</span></h2>
        <p style={{ color: '#C3CDE4', fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>See the jobs LSP gives you, confirm visits, send photos, certificates and your invoice from the job, and see when you get paid.</p>
        <div className="photo" style={{ height: 236, marginTop: 36, backgroundImage: 'url(images/home1.jpg)', boxShadow: '0 24px 48px rgba(0,0,0,.35)' }} />
        <div className="flex" style={{ gap: 24, marginTop: 'auto', color: '#DCE3F2', fontWeight: 600 }}><span className="flex"><Wrench size={16} color="#8FD64A" />Jobs</span><span className="flex"><Camera size={16} color="#8FD64A" />Photo proof</span><span className="flex"><Flame size={16} color="#8FD64A" />Certificates</span><span className="flex"><Receipt size={16} color="#8FD64A" />Payments</span></div>
      </aside>
      <main className="login-form"><div>
        {step === 'in' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Welcome back</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>Contractor portal. Sign in with the email LSP has for you.</p>
          <label className="field"><span>Email</span><input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <label className="field"><span>Password</span><div style={{ position: 'relative' }}><input className="input" value={pw} onChange={e => setPw(e.target.value)} type={show ? 'text' : 'password'} /><button type="button" onClick={() => setShow(v => !v)} aria-label="Show password" style={{ position: 'absolute', right: 10, top: 11, border: 0, background: 'none', color: '#667085' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <Btn type="submit">Sign in <ArrowRight size={18} /></Btn>
          <div className="flex between"><button type="button" className="link small" onClick={() => setStep('welcome')}>First time? Set your password</button><button type="button" className="link small" onClick={() => setStep('forgot')}>Forgot password?</button></div>
          <Note>LSP sets up your account once your ID, insurance and trade certificates are checked, and sends the login email from Outlook. You only see the jobs LSP gives you.</Note>
          {onJoin && <div className="joincta"><div className="stack grow"><b>New to LSP?</b><span className="caption">Apply to get repair and safety work in North London.</span></div><button type="button" className="btn line sm" onClick={onJoin}>Join as a contractor <ArrowRight size={14} /></button></div>}
        </form>}
        {step === 'welcome' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><KeyRound size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Set your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>You opened the link in your welcome email from LSP. Choose a password for <b style={{ color: '#0F1828' }}>{email}</b>.</p>
          <label className="field"><span>New password</span><input className="input" type="password" value={np} onChange={e => setNp(e.target.value)} /></label>
          <label className="field"><span>Type it again</span><input className="input" type="password" value={np2} onChange={e => setNp2(e.target.value)} /></label>
          <div className="col" style={{ gap: 6 }}>{rules.map(([t, ok]) => <span key={t} className="flex small" style={{ gap: 8, color: ok ? 'var(--ok)' : 'var(--text-tertiary)' }}><Check size={14} />{t}</span>)}</div>
          <label className="check" style={{ cursor: 'pointer' }}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I agree to the portal terms and LSP's privacy notice</label>
          <Btn type="submit" disabled={!rules.every(r => r[1]) || !agree}>Save and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'forgot' && <form onSubmit={e => { e.preventDefault(); setStep('in'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Reset your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We'll email a reset link to the address LSP has for you.</p>
          <label className="field"><span>Email</span><input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <Btn type="submit">Send reset link</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'code' && <form onSubmit={e => { e.preventDefault(); verify(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><ShieldCheck size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Enter your security code</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We sent a 6-digit code to your phone ending in <b style={{ color: '#0F1828' }}>4001</b>. For this demo, use <b style={{ color: '#0F1828' }}>123456</b>.</p>
          <div className="otp">{code.map((c, i) => <input key={i} ref={el => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} value={c} aria-label={`Digit ${i + 1}`} autoFocus={i === 0}
            onChange={e => { const v = e.target.value.replace(/\D/g, ''); const n = [...code]; n[i] = v; setCode(n); if (v && i < 5) refs.current[i + 1]?.focus(); }}
            onKeyDown={e => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus(); }} />)}</div>
          {wrong > 0 && <Note tone="err">That code is not right. {5 - wrong} {5 - wrong === 1 ? 'try' : 'tries'} left before the account locks.</Note>}
          <Btn type="submit" disabled={code.join('').length < 6}>Verify and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'locked' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-err"><ShieldAlert size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Your account is locked</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>There were too many wrong security codes, so the account is locked to keep it safe. Call LSP on {LSP_PHONE} to unlock it.</p>
          <Btn onClick={() => { setStep('in'); setWrong(0); }}>Back to sign in</Btn>
        </div>}
      </div></main>
    </div>
  );
}
