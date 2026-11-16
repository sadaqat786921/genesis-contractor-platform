import { useEffect, useState } from 'react';
import { Send, MessageSquare, Mail, Inbox, CheckCircle2, Clock, Plus } from 'lucide-react';
import { useStore } from '../store';
import { ME_NAME, LSP_PHONE, nowStamp, parseDate, type ReqKind } from '../data';
import { Btn, Card, Chip, Empty, Field, Area, Select, Note, PageTabs, When, Avatar, Modal, Text } from '../ui';
import { PageHeader, crumbsFor } from '../Shell';
import { DemoAnswer, lspSays } from './lib';

const TOPICS = ['General', 'A job', 'A visit time', 'An invoice or payment', 'Insurance or certificates', 'My account'];
const KINDS: ReqKind[] = ['Hourly rate', 'Areas I cover', 'Email or phone', 'Pause my account', 'Stop working with LSP', 'Other'];

export function Messages() {
  const s = useStore(); const admin = s.staff.find(x => x.id === 'et');
  const [tab, setTab] = useState<'messages' | 'requests'>(s.detail === 'requests' ? 'requests' : 'messages');
  const [topic, setTopic] = useState(TOPICS[0]); const [text, setText] = useState(''); const [ask, setAsk] = useState(false);
  const all = [...s.me.comms].sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime());
  const mine = (by: string) => by === ME_NAME;
  const unread = all.filter(c => !mine(c.by) && !s.read.includes(c.id)).map(c => c.id);
  useEffect(() => { if (unread.length) { const t = setTimeout(() => s.markRead(unread), 1500); return () => clearTimeout(t); } }, [unread.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => {
    s.setMe(a => ({ ...a, comms: [...a.comms, { id: 'cm' + Date.now(), at: nowStamp(), by: ME_NAME, channel: 'Portal', dir: 'in', subject: topic, text: text.trim() }] }));
    s.log(`Sent a message: ${topic}`, 'Messages'); s.toast('Sent to LSP'); setText('');
  };
  const waiting = s.requests.filter(r => r.status === 'Sent');
  return <>
    <PageHeader crumbs={crumbsFor('messages', s.go)} title="Messages" action={<Btn kind="outline" icon={<Plus size={18} />} onClick={() => setAsk(true)}>New request</Btn>} />
    <PageTabs value={tab} onChange={setTab} items={[{ id: 'messages', label: 'Messages with LSP', count: all.length }, { id: 'requests', label: 'Requests', count: s.requests.length }]} />
    {tab === 'messages' && <div className="dgrid">
      <Card title="Conversation">
        {all.length ? <div className="divlist">{all.map(c => { const me = mine(c.by); const isNew = unread.includes(c.id); return <div key={c.id} className="item" style={{ alignItems: 'flex-start' }}>
          {me ? <Avatar name={c.by} photo="images/av2.jpg" /> : <Avatar name={c.by} photo={s.staff.find(x => x.name === c.by)?.photo} />}
          <div className="stack grow" style={{ gap: 4 }}>
            <div className="flex wrap" style={{ gap: 8 }}><b>{c.by === ME_NAME ? 'You' : c.by}</b><span className="caption">{me ? s.me.name : 'LSP'} · {c.channel === 'Email' ? <><Mail size={11} style={{ verticalAlign: -1 }} /> Email</> : c.channel === 'Call' ? 'Phone call' : 'Portal message'}</span>{isNew && <Chip tone="info">New</Chip>}</div>
            {c.subject && <b className="small" style={{ color: 'var(--text-primary)' }}>{c.subject}</b>}
            <span className="small" style={{ lineHeight: 1.55 }}>{c.text}</span>
          </div>
          <When at={c.at} />
        </div>; })}</div> : <Empty icon={<MessageSquare size={22} />}>No messages yet.</Empty>}
      </Card>
      <div className="col">
        <Card title="Send a message" sub="For a job, message from the job page instead.">
          <Field label="About"><Select value={topic} onChange={setTopic} options={TOPICS.map(t => ({ value: t, label: t }))} /></Field>
          <Field label="Message"><Area value={text} onChange={setText} placeholder="Type your message" /></Field>
          <Btn icon={<Send size={16} />} disabled={!text.trim()} onClick={send}>Send</Btn>
        </Card>
        <Card title="LSP office"><div className="flex"><Avatar name="LSP" photo={admin?.photo} size="md" /><div className="stack grow"><b>Office team</b><span className="caption">Mon to Fri, 8:00 to 18:00 · {LSP_PHONE}</span></div></div><span className="caption">Payments: accounts@lsp.co.uk</span></Card>
        <Note>Can't make an emergency job, or locked out? Call LSP on {LSP_PHONE}, day or night.</Note>
      </div>
    </div>}
    {tab === 'requests' && <div className="dgrid">
      <Card title="Requests" action={<Btn sm icon={<Plus size={14} />} onClick={() => setAsk(true)}>New request</Btn>}>
        {s.requests.length ? <div className="divlist">{[...s.requests].sort((a, b) => parseDate(b.at).getTime() - parseDate(a.at).getTime()).map(q => <div key={q.id} className="item" style={{ alignItems: 'flex-start' }}>
          <span className={`tile ${q.status === 'Done' ? 't-ok' : q.status === 'Declined' ? 't-neutral' : 't-info'}`} style={{ width: 32, height: 32 }}>{q.status === 'Sent' ? <Clock size={15} /> : q.status === 'Done' ? <CheckCircle2 size={15} /> : <Inbox size={15} />}</span>
          <div className="stack grow" style={{ gap: 4 }}><b>{q.title}</b><span className="caption">{q.kind} · sent {q.at}</span><span className="small">{q.about}</span>{q.reply && <span className="small" style={{ color: 'var(--text-primary)' }}>LSP: {q.reply} <span className="caption">({q.answered})</span></span>}</div>
          <Chip tone={q.status === 'Done' ? 'ok' : q.status === 'Declined' ? 'neutral' : 'info'}>{q.status === 'Sent' ? 'Waiting for LSP' : q.status}</Chip>
        </div>)}</div> : <Empty icon={<Inbox size={22} />}>No requests yet.</Empty>}
      </Card>
      <div className="col">
        <Card title="What you can ask"><div className="flex wrap" style={{ gap: 6 }}>{KINDS.filter(k => k !== 'Other').map(k => <Chip key={k} tone="neutral" dot={false}>{k}</Chip>)}</div><span className="caption">Bank details are changed from Account.</span></Card>
        {waiting.length > 0 && <DemoAnswer note="In the live product the Supervisor or Office Admin answers from the staff portal.">{waiting.map(r => <Btn key={r.id} sm kind="outline" onClick={() => { const reply = r.kind === 'Hourly rate' ? 'Thanks. Rates are reviewed every January. We will look at it then.' : r.kind === 'Bank details' ? 'We called you on 07700 904001 to check it. Your new bank details are saved for the next pay day.' : 'Done. Thanks for letting us know.'; const st = r.kind === 'Hourly rate' ? 'Declined' as const : 'Done' as const; s.setRequests(rs => rs.map(x => x.id === r.id ? { ...x, status: st, reply, answered: nowStamp() } : x)); if (r.kind === 'Bank details') { const m = r.about.match(/sort code ([\d-]+) · account ending (\d{4})/); if (m) s.setMe(x => ({ ...x, bank: { ...x.bank, sort: m[1], last4: m[2] }, docs: x.docs.map(d => d.id === 'D5' ? { ...d, ref: `Barclays · ···· ${m[2]}` } : d) })); } lspSays(s, `Re: ${r.title}`, reply, 'Sarah Khan'); s.toast('LSP answered'); }}>LSP answers “{r.title}”</Btn>)}</DemoAnswer>}
      </div>
    </div>}
    {ask && <RequestModal onClose={() => setAsk(false)} onSent={() => setTab('requests')} />}
  </>;
}

export function RequestModal({ kind = 'Other', onClose, onSent }: { kind?: ReqKind; onClose: () => void; onSent?: () => void }) {
  const s = useStore(); const [k, setK] = useState<ReqKind>(kind); const [title, setTitle] = useState(''); const [about, setAbout] = useState('');
  return <Modal title="New request to LSP" sub="LSP answers here and by email. Nothing changes until they do." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Send size={16} />} disabled={!about.trim()} onClick={() => {
      const t = title.trim() || k; s.setRequests(rs => [{ id: 'R' + Date.now(), kind: k, title: t, about: about.trim(), at: nowStamp(), status: 'Sent' }, ...rs]);
      s.log(`Sent a request: ${t}`, 'Messages'); s.toast('Request sent to LSP'); onSent?.(); onClose();
    }}>Send request</Btn></>}>
    <Field label="What is it about"><Select value={k} onChange={v => setK(v as ReqKind)} options={KINDS.map(x => ({ value: x, label: x }))} /></Field>
    <Field label="Title"><Text value={title} onChange={setTitle} placeholder={k} /></Field>
    <Field label="Details (required)"><Area value={about} onChange={setAbout} placeholder="Tell LSP what you need" /></Field>
  </Modal>;
}
