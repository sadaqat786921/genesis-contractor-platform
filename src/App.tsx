import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useStore, NEW_KEY } from './store';
import { CONTRACTOR } from './data';
import { Sidebar, Login } from './Shell';
import { Toasts } from './ui';
import HomePage from './pages/Home';
import { Messages } from './pages/Messages';
import { Jobs } from './pages/Jobs';
import { Calendar } from './pages/Calendar';
import { Payments } from './pages/Payments';
import { Compliance } from './pages/Compliance';
import { Documents } from './pages/Documents';
import { Activity } from './pages/Activity';
import { Account } from './pages/Account';
import { Join } from './pages/Join';
import { useLocation } from 'react-router-dom';

const PAGES = { home: HomePage, messages: Messages, jobs: Jobs, calendar: Calendar, payments: Payments, compliance: Compliance, documents: Documents, activity: Activity, account: Account };

const KEY = 'genesis-ct-signed-in';
const read = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = (v: boolean) => { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

function Platform({ onLogout }: { onLogout: () => void }) {
  const s = useStore();
  const Page = PAGES[s.route];
  return <div className="app">
    <Sidebar onLogout={onLogout} />
    <main className="content" key={s.route + (s.detail ?? '')}><Page /></main>
  </div>;
}

export default function App() {
  const [auth, setAuth] = useState(read); const st = useStore();
  const nav = useNavigate(); const loc = useLocation();
  const [first, setFirst] = useState<{ email: string } | null>(null);
  const signIn = () => { write(true); setAuth(true); const h = location.hash.replace('#', ''); if (!h || h === '/' || h === '/login') nav('/home', { replace: true }); };
  if (!auth && loc.pathname.startsWith('/join')) return <><Join onSignIn={() => nav('/login')} onSetPassword={email => { setFirst({ email }); try { sessionStorage.setItem(NEW_KEY, '1'); } catch { /* ignore */ } st.setMe(m => ({ ...m, bank: null, bankPending: undefined })); nav('/login'); }} /><Toasts /></>;
  if (!auth) return <><Login key={first?.email ?? 'in'} onDone={signIn} onJoin={() => { window.scrollTo({ top: 0 }); nav('/join'); }} start={first ? 'welcome' : 'in'} startEmail={first?.email} /><Toasts /></>;
  return <>
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Navigate to="/home" replace />} />
      <Route path="/join" element={<Navigate to="/home" replace />} />
      <Route path="/*" element={<Platform onLogout={() => { write(false); try { sessionStorage.removeItem(NEW_KEY); } catch { /* ignore */ } st.setMe(m => ({ ...m, bank: m.bank ?? CONTRACTOR.bank })); setFirst(null); setAuth(false); nav('/login', { replace: true }); }} />} />
    </Routes>
    <Toasts />
  </>;
}
