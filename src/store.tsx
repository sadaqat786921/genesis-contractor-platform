import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as D from './data';
import { seedRooms, type Room } from './rooms';
import { useLocation, useNavigate } from 'react-router-dom';

/* Contractor portal: one contractor firm (HeatRight Ltd, signed in as Gary Holt).
   Only the jobs LSP gave them, the homes those jobs are at, and what LSP pays them are loaded. */

export type Route = 'home' | 'messages' | 'jobs' | 'calendar' | 'payments' | 'compliance' | 'documents' | 'activity' | 'account';
export const ROUTES: Route[] = ['home', 'messages', 'jobs', 'calendar', 'payments', 'compliance', 'documents', 'activity', 'account'];
type Setter<T> = (fn: (prev: T[]) => T[]) => void;

const JOBS = D.JOBS;
const PIDS = new Set(JOBS.map(j => j.property));
export const SCOPE = { properties: D.PROPERTIES.filter(p => PIDS.has(p.id)), jobs: JOBS };

interface Store {
  route: Route; detail: string | null; go: (r: Route, detail?: string | null) => void;
  toast: (msg: string) => void; toasts: { id: number; msg: string }[];
  log: (what: string, area: string, who?: string) => void; activity: D.Activity[];
  me: D.Contractor; setMe: (fn: (a: D.Contractor) => D.Contractor) => void;
  properties: D.Property[]; staff: D.Staff[];
  jobs: D.Job[]; setJobs: Setter<D.Job>;
  bills: D.Bill[]; setBills: Setter<D.Bill>;
  timeOff: D.TimeOff[]; setTimeOff: Setter<D.TimeOff>;
  /** Rooms of the homes the contractor visits (view only). */ rooms: Room[]; setRooms: Setter<Room>;
  requests: D.CReq[]; setRequests: Setter<D.CReq>;
  /** Message ids from LSP that the contractor has opened. */ read: string[]; markRead: (ids: string[]) => void;
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

function useList<T>(init: T[]): [T[], Setter<T>] {
  const [v, setV] = useState<T[]>(init);
  return [v, useCallback((fn: (prev: T[]) => T[]) => setV(prev => fn(prev)), [])];
}

/** Messages from LSP before this date count as read. */
const SEEN_BEFORE = D.parseDate('14 Oct 2026, 12:00').getTime();

export function StoreProvider({ children }: { children: ReactNode }) {
  const loc = useLocation(); const nav = useNavigate();
  const parts = loc.pathname.split('/').filter(Boolean);
  const route = (ROUTES.includes(parts[0] as Route) ? parts[0] : 'home') as Route;
  const detail = parts[1] ? decodeURIComponent(parts[1]) : null;
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [activity, setActivity] = useState<D.Activity[]>(D.ACTIVITY);
  const [me, setMeState] = useState<D.Contractor>(D.CONTRACTOR);
  const [jobs, setJobs] = useList(SCOPE.jobs);
  const [bills, setBills] = useList(D.BILLS);
  const [timeOff, setTimeOff] = useList(D.TIME_OFF);
  const [requests, setRequests] = useList(D.REQUESTS);
  const [rooms, setRooms] = useList(seedRooms(SCOPE.properties));
  const [read, setRead] = useState<string[]>(D.CONTRACTOR.comms.filter(c => c.by !== D.ME_NAME && D.parseDate(c.at).getTime() < SEEN_BEFORE).map(c => c.id));

  const go = useCallback((r: Route, d: string | null = null) => { nav('/' + r + (d ? '/' + encodeURIComponent(d) : '')); window.scrollTo({ top: 0 }); }, [nav]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  const log = useCallback((what: string, area: string, who: string = D.ME_NAME) => {
    setActivity(a => [{ id: 'H' + Date.now() + Math.random(), at: D.nowStamp(), who, what, area }, ...a]);
  }, []);
  const setMe = useCallback((fn: (a: D.Contractor) => D.Contractor) => setMeState(a => fn(a)), []);
  const markRead = useCallback((ids: string[]) => setRead(r => [...new Set([...r, ...ids])]), []);

  const value = useMemo(() => ({
    route, detail, go, toast, toasts, log, activity, me, setMe,
    properties: SCOPE.properties, staff: D.STAFF, jobs, setJobs, bills, setBills, timeOff, setTimeOff, rooms, setRooms, requests, setRequests, read, markRead,
  }), [route, detail, go, toast, toasts, log, activity, me, setMe, jobs, setJobs, bills, setBills, timeOff, setTimeOff, rooms, setRooms, requests, setRequests, read, markRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------- lookups ----------
export const staff = (id?: string) => D.STAFF.find(s => s.id === id);
export const money = (n: number): string => n < 0 ? '−' + money(-n) : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
export function useLookups() {
  const s = useStore();
  return { prop: (id?: string) => s.properties.find(p => p.id === id) };
}
export type Lookups = ReturnType<typeof useLookups>;
