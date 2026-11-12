// Sample data for the Genesis Contractor portal prototype. All names and figures are examples.
// Demo "today" is Thursday 15 Oct 2026.

export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'neutral' | 'brand';

/* ---------- who is signed in ---------- */
/** This portal is for one contractor firm that LSP sends work to. They only see the jobs LSP gave them,
    what LSP pays them, and never LSP's price, the landlord's budget or plan. */
export const PORTAL: 'supervisor' | 'oa' | 'landlord' | 'tenant' | 'agent' | 'contractor' = 'contractor';
export const ME = 'C1';
export const ME_NAME = 'Gary Holt';
/** LSP's main phone line, shown for emergencies and lock-outs. */
export const LSP_PHONE = '020 7946 0000';

/* ---------- dates ---------- */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const TODAY = new Date(2026, 9, 15);
export const TODAY_LABEL = '15 Oct 2026';
/** "21 Oct 2026" or "21 Oct 2026, 10:30" → Date */
export function parseDate(s: string): Date {
  const [datePart, time] = s.split(',');
  const [d, m, y] = datePart.trim().split(' ');
  const out = new Date(+(y || 2026), MONTHS.indexOf(m), +d);
  if (time) { const [h, mi] = time.trim().split(':'); out.setHours(+h, +mi); }
  return out;
}
export const fmtDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const daysFrom = (s: string) => Math.round((new Date(parseDate(s).toDateString()).getTime() - TODAY.getTime()) / 864e5);
/** Real clock time on the demo date, e.g. "15 Oct 2026, 14:05" */
export function nowStamp() { const n = new Date(); return `${TODAY_LABEL}, ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; }

/* ---------- shared shapes ---------- */
export type Channel = 'Email' | 'Call' | 'Note' | 'Portal' | 'System' | 'SMS';
export interface Comm { id: string; at: string; by: string; channel: Channel; text: string; subject?: string; dir?: 'in' | 'out' }
export type DocStatus = 'Missing' | 'Uploaded' | 'Verified' | 'Rejected' | 'Expired';
let cid = 0;
const c = (at: string, by: string, channel: Channel, text: string, dir: 'in' | 'out' = 'out', subject?: string): Comm => ({ id: 'cm' + ++cid, at, by, channel, text, dir, subject });

/* ---------- LSP staff (who gives the contractor work) ---------- */
export interface Staff { id: string; name: string; role: 'Supervisor' | 'Office Admin'; photo?: string; initials: string; color: string; email: string; phone: string }
export const STAFF: Staff[] = [
  { id: 'sk', name: 'Sarah Khan', role: 'Supervisor', photo: 'images/sarah.jpg', initials: 'SK', color: '#153D91', email: 's.khan@lsp.co.uk', phone: '020 7946 0001' },
  { id: 'et', name: 'Emma Thompson', role: 'Office Admin', photo: 'images/av3.jpg', initials: 'ET', color: '#099FFD', email: 'e.thompson@lsp.co.uk', phone: '020 7946 0011' },
  { id: 'jc', name: 'James Carter', role: 'Office Admin', photo: 'images/av1.jpg', initials: 'JC', color: '#5BAF00', email: 'j.carter@lsp.co.uk', phone: '020 7946 0012' },
  { id: 'ps', name: 'Priya Shah', role: 'Office Admin', initials: 'PS', color: '#153D91', email: 'p.shah@lsp.co.uk', phone: '020 7946 0013' },
  { id: 'lm', name: 'Liam Murphy', role: 'Office Admin', photo: 'images/av5.jpg', initials: 'LM', color: '#0B6FB8', email: 'l.murphy@lsp.co.uk', phone: '020 7946 0014' },
];

/* ---------- the contractor ---------- */
/** Documents LSP needs before it gives a contractor work. If insurance or the trade certificate runs out, the contractor is paused. */
export interface CDoc { id: string; name: string; status: DocStatus; file: string; uploaded: string; expires?: string; ref?: string; note?: string; history: { file: string; uploaded: string; expires?: string }[]; needed: 'Always' | 'Keep in date' }
export interface Contractor {
  id: string; name: string; trade: string; contact: string; email: string; phone: string; address: string; companyNo?: string; vatNo?: string;
  /** Areas the contractor covers. */ areas: string[]; joined: string; status: 'Active' | 'Paused'; pausedWhy?: string;
  /** Hourly rate LSP agreed when the contractor joined. LSP prices jobs with it. */ rate: number;
  /** Where LSP pays them. Only the last 4 digits are shown. */ bank: { name: string; sort: string; last4: string };
  docs: CDoc[]; comms: Comm[];
  notify: Record<'New job' | 'Visit changes' | 'Sent back' | 'Payments' | 'Expiry reminders', { email: boolean; sms: boolean }>;
}
export const CONTRACTOR: Contractor = {
  id: 'C1', name: 'HeatRight Ltd', trade: 'Gas engineer', contact: 'Gary Holt', email: 'gary@heatright.co.uk', phone: '07700 904001', address: '6 Elland Road, London N11 2DL', companyNo: '12044817',
  areas: ['Islington', 'Highbury', 'Holloway', 'Camden', 'Tottenham', 'Crouch End'], joined: '4 Jan 2026', status: 'Active', rate: 60,
  bank: { name: 'HeatRight Ltd', sort: '20-41-06', last4: '4417' },
  docs: [
    { id: 'D1', name: 'Photo ID', status: 'Verified', file: 'gary-holt-passport.pdf', uploaded: '4 Jan 2026, 10:12', needed: 'Always', history: [] },
    { id: 'D2', name: 'Right to work', status: 'Verified', file: 'right-to-work.pdf', uploaded: '4 Jan 2026, 10:14', needed: 'Always', history: [] },
    { id: 'D3', name: 'Public liability insurance', status: 'Verified', file: 'heatright-insurance-2026.pdf', uploaded: '28 Jan 2026, 09:30', expires: '1 Feb 2027', ref: 'Cover £2,000,000 · Policy PL-77102', needed: 'Keep in date', history: [{ file: 'heatright-insurance-2025.pdf', uploaded: '4 Jan 2026, 10:16', expires: '1 Feb 2026' }] },
    { id: 'D4', name: 'Gas Safe registration', status: 'Verified', file: 'gas-safe-card.pdf', uploaded: '4 Jan 2026, 10:18', expires: '12 Aug 2027', ref: 'Gas Safe No. 548221', needed: 'Keep in date', history: [] },
    { id: 'D5', name: 'Bank details', status: 'Verified', file: 'bank-letter.pdf', uploaded: '4 Jan 2026, 10:20', ref: 'Barclays · ···· 4417', needed: 'Always', history: [] },
  ],
  notify: { 'New job': { email: true, sms: true }, 'Visit changes': { email: true, sms: true }, 'Sent back': { email: true, sms: true }, Payments: { email: true, sms: false }, 'Expiry reminders': { email: true, sms: false } },
  comms: [
    c('2 Oct 2026, 16:00', 'LSP Accounts', 'Email', 'Payment of £85 sent to your Barclays account ending 4417. Remittance R-0412 is in the portal.', 'out', 'Remittance R-0412'),
    c('9 Oct 2026, 14:05', 'Emma Thompson', 'Email', 'New job for you: Damp survey at 5 Mill Lane, Room 4. 3 hours at £60. Megan Price will let you in.', 'out', 'New job · Damp survey'),
    c('13 Oct 2026, 11:05', 'Gary Holt', 'Portal', 'Confirmed King Street for Tuesday 20 Oct at 10:30.', 'in', 'Visit confirmed · Flat 3, 8 King Street'),
    c('14 Oct 2026, 16:02', 'Priya Shah', 'Email', 'Gas safety check at 3 Park Road on Fri 17 Oct at 09:00. The certificate ran out on 2 Oct, so please confirm the time today.', 'out', 'New job · 3 Park Road'),
    c('14 Oct 2026, 17:20', 'Emma Thompson', 'Email', 'Radiators at 12 Oak Street: the after photo does not show them working. Please add the photos so I can sign it off.', 'out', 'Sent back · 12 Oak Street'),
    c('15 Oct 2026, 08:20', 'Priya Shah', 'Call', 'Emergency at 3 Park Road: no heating for five tenants. Asked you to go at 12:00 today. Key safe code is in the job.', 'out', 'Emergency · 3 Park Road'),
  ],
};

/* ---------- homes the contractor visits (address and access only) ---------- */
export interface Property { id: string; address: string; area: string; postcode: string; type: 'House' | 'Flat' | 'HMO'; rooms?: number; beds: number; baths: number; photo: string; added: string; keys: string; gas: boolean }
export const PROPERTIES: Property[] = [
  { id: 'P1', address: '12 Oak Street', area: 'Islington, London', postcode: 'N1 2QS', type: 'House', beds: 3, baths: 1, photo: 'images/home1.jpg', added: '1 Apr 2026', keys: 'The tenant lets you in. If no one is home, LSP has a key (tag 1).', gas: true },
  { id: 'P2', address: '22 Oak Avenue', area: 'Highbury, London', postcode: 'N5 1HL', type: 'House', beds: 4, baths: 2, photo: 'images/home2.jpg', added: '15 Jan 2026', keys: 'The tenant lets you in.', gas: true },
  { id: 'P4', address: '31 Ash Grove', area: 'Highbury, London', postcode: 'N5 2AW', type: 'House', beds: 3, baths: 1, photo: 'images/home1.jpg', added: '2 Mar 2026', keys: 'Empty home. Collect the key from LSP (tag 4) and bring it back the same day.', gas: true },
  { id: 'P5', address: '5 Mill Lane (HMO)', area: 'Tottenham, London', postcode: 'N17 9PE', type: 'HMO', rooms: 6, beds: 6, baths: 3, photo: 'images/home2.jpg', added: '20 Feb 2026', keys: 'Key safe by the front door. LSP gives the code on the day.', gas: true },
  { id: 'P6', address: '14 Elm Road', area: 'Islington, London', postcode: 'N1 8RT', type: 'House', beds: 3, baths: 1, photo: 'images/home3.jpg', added: '5 May 2026', keys: 'The tenant lets you in.', gas: true },
  { id: 'P7', address: 'Flat 3, 8 King Street', area: 'Camden, London', postcode: 'NW1 0JE', type: 'Flat', beds: 2, baths: 1, photo: 'images/home1.jpg', added: '12 Sep 2026', keys: 'Ring flat 3. The tenant lets you in.', gas: true },
  { id: 'P8', address: '3 Park Road (HMO)', area: 'Holloway, London', postcode: 'N7 6LP', type: 'HMO', rooms: 5, beds: 5, baths: 2, photo: 'images/home2.jpg', added: '15 Jan 2026', keys: 'Key safe by the front door, code 4471. Put the key back after.', gas: true },
  { id: 'P9', address: '27 Grange Avenue', area: 'Crouch End, London', postcode: 'N8 9JT', type: 'House', beds: 3, baths: 1, photo: 'images/home3.jpg', added: '10 Feb 2026', keys: 'Key safe by the side gate. LSP gives the code on the day.', gas: true },
  { id: 'P15', address: '6 Rosebery Gardens', area: 'Crouch End, London', postcode: 'N8 8SH', type: 'House', beds: 4, baths: 2, photo: 'images/home2.jpg', added: '1 May 2026', keys: 'The tenants let you in.', gas: true },
  { id: 'P17', address: 'Flat 1, 45 Holloway Road', area: 'Holloway, London', postcode: 'N7 8JL', type: 'Flat', beds: 2, baths: 1, photo: 'images/home2.jpg', added: '1 Jun 2026', keys: 'The tenant lets you in.', gas: true },
];

/* ---------- jobs ---------- */
/** What the contractor sees. LSP gives the job (Assigned), the contractor confirms the visit, starts, then sends photos and their invoice.
    LSP checks it: approved (their invoice is approved for payment) or sent back to put right. */
export const JOB_STATUS = ['Assigned', 'In progress', 'Proof uploaded', 'Sent back', 'Approved', 'Cancelled'] as const;
export type JobStatus = typeof JOB_STATUS[number];
export type Category = 'Heating' | 'Gas safety' | 'Plumbing' | 'Damp' | 'General';
export const CATEGORIES: Category[] = ['Heating', 'Gas safety', 'Plumbing', 'Damp', 'General'];
export interface JobEvent { at: string; by: string; text: string }
/** Extra work the contractor finds while on a job. LSP decides; if yes it becomes a new job for them. */
export interface FollowReq { title: string; note: string; hours: number; amount: number; at: string; status: 'Asked' | 'Approved' | 'Declined'; job?: string; reason?: string; photos?: string[] }
/** What LSP pays the contractor for the job. Hourly: agreed hours at their rate. Fixed: an agreed price. */
export interface Pay { kind: 'Hourly' | 'Fixed'; hours?: number; rate?: number; parts?: number; amount: number }
export interface Job {
  id: string; title: string; property: string; status: JobStatus; category: Category; urgent?: boolean;
  /** Gas safety checks need the certificate uploaded with the photos. */ safety?: boolean;
  /** When LSP gave the job to the contractor. */ given: string; /** Who reported it (shown without contact details). */ from: string; admin: string;
  note: string; area?: string; photos?: string[];
  visit: string; /** The contractor confirmed the visit time. */ visitOk?: string; access: string; contact?: { name: string; phone: string; room?: string }; preferred?: string;
  pay: Pay;
  proof?: string[]; cert?: { name: string; file: string; issued: string; expires: string; result: 'Pass' | 'At risk' | 'Immediately dangerous' };
  /** The contractor's own invoice to LSP. */ cInvoice?: { no: string; amount: number; at: string; file: string; why?: string };
  followReq?: FollowReq; /** Set on a follow-up job: the job it came from. */ followOf?: string;
  sentBack?: string; /** Visits where no one let them in. */ noAccess?: string[]; cancelled?: string; askedTime?: string;
  /** Notes the contractor left for LSP when finishing. */ workNote?: string;
  events: JobEvent[];
}
const ev = (at: string, by: string, text: string): JobEvent => ({ at, by, text });
const ME_CO = 'HeatRight Ltd';
export const JOBS: Job[] = [
  { id: 'J7', title: 'No heating (emergency)', property: 'P8', status: 'Assigned', category: 'Heating', urgent: true, given: '15 Oct 2026, 08:20', from: 'Tenant', admin: 'ps',
    note: 'The whole house has no heating or hot water. Five tenants affected. The boiler screen shows fault E119 (low pressure).', area: 'Boiler cupboard, kitchen', photos: ['Boiler screen E119', 'Pressure gauge'],
    visit: '15 Oct 2026, 12:00', access: 'Key safe by the front door, code 4471. Put the key back after.', contact: { name: 'Ella Novak', phone: '07700 903009', room: 'Room 3' },
    pay: { kind: 'Hourly', hours: 2, rate: 60, amount: 120 },
    events: [ev('15 Oct 2026, 07:50', 'Tenant', 'Reported from the tenant portal as an emergency'), ev('15 Oct 2026, 08:20', 'Priya Shah', 'Job given to HeatRight Ltd: 2 hours at £60. Visit today at 12:00.')] },
  { id: 'J21', title: 'Gas safety check (CP12)', property: 'P17', status: 'In progress', category: 'Gas safety', safety: true, given: '10 Oct 2026, 09:15', from: 'Letting agent', admin: 'et',
    note: 'Yearly gas safety check: 1 boiler and 1 hob. The current certificate ends on 30 Oct.', area: 'Kitchen',
    visit: '15 Oct 2026, 09:00', visitOk: '10 Oct 2026, 10:02', access: 'The tenant lets you in.', contact: { name: 'Priya Nair', phone: '07700 905103' },
    pay: { kind: 'Fixed', amount: 60 },
    events: [ev('10 Oct 2026, 09:15', 'Emma Thompson', 'Job given to HeatRight Ltd: £60 fixed. Visit 15 Oct 2026 at 09:00.'), ev('10 Oct 2026, 10:02', ME_CO, 'Confirmed the visit'), ev('15 Oct 2026, 09:05', ME_CO, 'Work started')] },
  { id: 'J34', title: 'Gas safety check (CP12)', property: 'P8', status: 'Assigned', category: 'Gas safety', safety: true, given: '14 Oct 2026, 16:00', from: 'LSP', admin: 'ps',
    note: 'The gas certificate ran out on 2 Oct. Check the boiler and both kitchen hobs. The same house has the no-heating job (J7).', area: 'Kitchen and boiler cupboard',
    visit: '17 Oct 2026, 09:00', access: 'Key safe by the front door, code 4471. Put the key back after.', contact: { name: 'Aisha Khan', phone: '07700 903012', room: 'Room 1' },
    pay: { kind: 'Fixed', amount: 70 },
    events: [ev('14 Oct 2026, 16:00', 'Priya Shah', 'Job given to HeatRight Ltd: £70 fixed. Visit 17 Oct 2026 at 09:00. Please confirm.')] },
  { id: 'J35', title: 'Gas safety check (CP12)', property: 'P7', status: 'Assigned', category: 'Gas safety', safety: true, given: '13 Oct 2026, 10:40', from: 'LSP', admin: 'jc',
    note: 'The certificate ends on 21 Oct 2026. Boiler and gas cooker.', area: 'Kitchen',
    visit: '20 Oct 2026, 10:30', visitOk: '13 Oct 2026, 11:02', access: 'Ring flat 3. The tenant lets you in.', contact: { name: 'Rob Hughes', phone: '07700 903005' },
    pay: { kind: 'Fixed', amount: 60 },
    events: [ev('13 Oct 2026, 10:40', 'James Carter', 'Job given to HeatRight Ltd: £60 fixed. Visit 20 Oct 2026 at 10:30.'), ev('13 Oct 2026, 11:02', ME_CO, 'Confirmed the visit')] },
  { id: 'J30', title: 'Radiators cold at the top', property: 'P1', status: 'Sent back', category: 'Heating', given: '13 Oct 2026, 09:00', from: 'Tenant', admin: 'et',
    note: 'Two radiators upstairs are cold at the top and the boiler pressure keeps dropping.', area: 'Bedroom 1 and Bedroom 2',
    visit: '14 Oct 2026, 10:00', visitOk: '13 Oct 2026, 09:40', access: 'The tenant lets you in.', contact: { name: 'Michael Okafor', phone: '07700 903001' },
    pay: { kind: 'Hourly', hours: 1.5, rate: 60, amount: 90 }, proof: ['Before · radiator', 'After · bleed valve'],
    cInvoice: { no: 'HR-2229', amount: 90, at: '14 Oct 2026, 12:30', file: 'HR-2229.pdf' },
    sentBack: 'The after photo does not show the radiators working. Please add a photo of each radiator warm at the top and the boiler pressure gauge.',
    events: [ev('13 Oct 2026, 09:00', 'Emma Thompson', 'Job given to HeatRight Ltd: 1.5 hours at £60. Visit 14 Oct 2026 at 10:00.'), ev('13 Oct 2026, 09:40', ME_CO, 'Confirmed the visit'), ev('14 Oct 2026, 10:05', ME_CO, 'Work started'), ev('14 Oct 2026, 12:30', ME_CO, 'Finished. Sent 2 photos and invoice HR-2229 (£90)'), ev('14 Oct 2026, 17:20', 'Emma Thompson', 'Sent back: the after photo does not show the radiators working')] },
  { id: 'J4', title: 'Damp survey', property: 'P5', status: 'Proof uploaded', category: 'Damp', given: '9 Oct 2026, 14:00', from: 'Inspection', admin: 'et',
    note: 'Damp patch on the outside wall of Room 4, found at the routine inspection. Find the cause and take moisture readings.', area: 'Room 4',
    visit: '11 Oct 2026, 10:00', visitOk: '9 Oct 2026, 15:10', access: 'Key safe by the front door. LSP gives the code on the day.', contact: { name: 'Megan Price', phone: '07700 903010', room: 'Room 4' },
    pay: { kind: 'Hourly', hours: 3, rate: 60, amount: 180 }, proof: ['Before · wall', 'After · wall', 'Meter reading', 'Report page'],
    cInvoice: { no: 'HR-2231', amount: 180, at: '14 Oct 2026, 16:10', file: 'HR-2231.pdf' },
    followReq: { title: 'Clear gutter and treat damp wall', note: 'The damp comes from a blocked gutter above the bedroom. Clear the gutter, treat the wall and repaint it.', hours: 4, amount: 260, at: '14 Oct 2026, 16:12', status: 'Asked', photos: ['Blocked gutter'] },
    workNote: 'Readings 28% on the outside wall, 12% elsewhere. Cause is the blocked gutter above.',
    events: [ev('9 Oct 2026, 14:00', 'Emma Thompson', 'Job given to HeatRight Ltd: 3 hours at £60. Visit 11 Oct 2026 at 10:00.'), ev('9 Oct 2026, 15:10', ME_CO, 'Confirmed the visit'), ev('11 Oct 2026, 10:00', ME_CO, 'Work started'), ev('14 Oct 2026, 16:10', ME_CO, 'Finished. Sent 4 photos and invoice HR-2231 (£180)'), ev('14 Oct 2026, 16:12', ME_CO, 'Asked for follow-up work: Clear gutter and treat damp wall (£260)')] },
  { id: 'J36', title: 'Gas safety check (CP12)', property: 'P4', status: 'Proof uploaded', category: 'Gas safety', safety: true, given: '7 Oct 2026, 11:00', from: 'LSP', admin: 'lm',
    note: 'Yearly gas safety check before the home is let. Boiler and hob.', area: 'Kitchen',
    visit: '14 Oct 2026, 14:30', visitOk: '7 Oct 2026, 12:15', access: 'Empty home. Collect the key from LSP (tag 4) and bring it back the same day.',
    pay: { kind: 'Fixed', amount: 60 }, proof: ['Boiler', 'Flue', 'Hob'],
    cert: { name: 'Gas safety certificate (CP12)', file: 'CP12-31-Ash-Grove-2026.pdf', issued: '14 Oct 2026, 15:40', expires: '14 Oct 2027', result: 'Pass' },
    cInvoice: { no: 'HR-2230', amount: 60, at: '14 Oct 2026, 15:55', file: 'HR-2230.pdf' },
    events: [ev('7 Oct 2026, 11:00', 'Liam Murphy', 'Job given to HeatRight Ltd: £60 fixed. Visit 14 Oct 2026 at 14:30.'), ev('7 Oct 2026, 12:15', ME_CO, 'Confirmed the visit'), ev('14 Oct 2026, 14:35', ME_CO, 'Work started'), ev('14 Oct 2026, 15:55', ME_CO, 'Finished. Sent 3 photos, the certificate (Pass) and invoice HR-2230 (£60)')] },
  { id: 'J32', title: 'Boiler losing pressure', property: 'P2', status: 'Approved', category: 'Heating', given: '6 Oct 2026, 10:00', from: 'Tenant', admin: 'ps',
    note: 'Boiler pressure drops to zero every two days.', area: 'Kitchen',
    visit: '8 Oct 2026, 13:00', visitOk: '6 Oct 2026, 10:30', access: 'The tenant lets you in.', contact: { name: 'Jay Patel', phone: '07700 903002' },
    pay: { kind: 'Hourly', hours: 3, rate: 60, parts: 10, amount: 190 }, proof: ['Before · pressure 0', 'New relief valve', 'After · pressure 1.4'],
    cInvoice: { no: 'HR-2226', amount: 190, at: '8 Oct 2026, 16:20', file: 'HR-2226.pdf' },
    events: [ev('6 Oct 2026, 10:00', 'Priya Shah', 'Job given to HeatRight Ltd: 3 hours at £60 plus £10 parts. Visit 8 Oct 2026 at 13:00.'), ev('6 Oct 2026, 10:30', ME_CO, 'Confirmed the visit'), ev('8 Oct 2026, 13:05', ME_CO, 'Work started'), ev('8 Oct 2026, 16:20', ME_CO, 'Finished. Sent 3 photos and invoice HR-2226 (£190)'), ev('10 Oct 2026, 09:30', 'Priya Shah', 'Checked the photos. Work approved and record locked. Invoice HR-2226 approved for payment on 16 Oct.')] },
  { id: 'J31', title: 'Replace room thermostat', property: 'P6', status: 'Approved', category: 'Heating', given: '25 Sep 2026, 09:00', from: 'Tenant', admin: 'ps',
    note: 'The thermostat screen is blank and the heating will not turn on.', area: 'Hallway',
    visit: '29 Sep 2026, 11:00', visitOk: '25 Sep 2026, 09:30', access: 'The tenant lets you in.', contact: { name: 'Sam Ahmed', phone: '07700 903007' },
    pay: { kind: 'Fixed', amount: 85 }, proof: ['Old thermostat', 'New thermostat', 'Heating on'],
    cInvoice: { no: 'HR-2214', amount: 85, at: '29 Sep 2026, 12:40', file: 'HR-2214.pdf' },
    events: [ev('25 Sep 2026, 09:00', 'Priya Shah', 'Job given to HeatRight Ltd: £85 fixed, thermostat included. Visit 29 Sep 2026 at 11:00.'), ev('25 Sep 2026, 09:30', ME_CO, 'Confirmed the visit'), ev('29 Sep 2026, 12:40', ME_CO, 'Finished. Sent 3 photos and invoice HR-2214 (£85)'), ev('30 Sep 2026, 10:00', 'Priya Shah', 'Work approved and record locked. Invoice approved for payment on 2 Oct.'), ev('2 Oct 2026, 16:00', 'LSP Accounts', 'Paid £85 (remittance R-0412)')] },
  { id: 'J19', title: 'Boiler service', property: 'P9', status: 'Approved', category: 'Heating', given: '18 Aug 2026, 14:00', from: 'Letting agent', admin: 'et',
    note: 'Yearly boiler service.', area: 'Kitchen',
    visit: '27 Aug 2026, 09:00', visitOk: '18 Aug 2026, 15:00', access: 'Key safe by the side gate. LSP gives the code on the day.', contact: { name: 'Hannah Lee', phone: '07700 905101' },
    pay: { kind: 'Fixed', amount: 95 }, proof: ['Boiler service sheet', 'Flue check'],
    cInvoice: { no: 'HR-2188', amount: 95, at: '27 Aug 2026, 11:00', file: 'HR-2188.pdf' },
    events: [ev('18 Aug 2026, 14:00', 'Emma Thompson', 'Job given to HeatRight Ltd: £95 fixed. Visit 27 Aug 2026 at 09:00.'), ev('27 Aug 2026, 11:00', ME_CO, 'Finished. Sent 2 photos and invoice HR-2188 (£95)'), ev('28 Aug 2026, 10:00', 'Emma Thompson', 'Work approved and record locked'), ev('4 Sep 2026, 16:00', 'LSP Accounts', 'Paid £95 (remittance R-0398)')] },
  { id: 'J37', title: 'Gas safety check (CP12)', property: 'P15', status: 'Approved', category: 'Gas safety', safety: true, given: '20 May 2026, 10:00', from: 'LSP', admin: 'et',
    note: 'Gas safety check before LSP takes on the lease.', area: 'Kitchen and utility room',
    visit: '28 May 2026, 10:00', visitOk: '20 May 2026, 11:00', access: 'The tenants let you in.',
    pay: { kind: 'Fixed', amount: 60 }, proof: ['Boiler', 'Hob'],
    cert: { name: 'Gas safety certificate (CP12)', file: 'CP12-6-Rosebery-Gardens-2026.pdf', issued: '28 May 2026, 10:00', expires: '28 May 2027', result: 'Pass' },
    cInvoice: { no: 'HR-2150', amount: 60, at: '28 May 2026, 11:10', file: 'HR-2150.pdf' },
    events: [ev('20 May 2026, 10:00', 'Emma Thompson', 'Job given to HeatRight Ltd: £60 fixed.'), ev('28 May 2026, 11:10', ME_CO, 'Finished. Sent 2 photos, the certificate (Pass) and invoice HR-2150'), ev('29 May 2026, 09:00', 'Emma Thompson', 'Work approved and record locked'), ev('5 Jun 2026, 16:00', 'LSP Accounts', 'Paid £60 (remittance R-0322)')] },
  { id: 'J38', title: 'Gas safety check (CP12)', property: 'P1', status: 'Approved', category: 'Gas safety', safety: true, given: '27 Mar 2026, 09:00', from: 'LSP', admin: 'et',
    note: 'Yearly gas safety check.', area: 'Kitchen',
    visit: '3 Apr 2026, 10:00', visitOk: '27 Mar 2026, 10:00', access: 'The tenant lets you in.',
    pay: { kind: 'Fixed', amount: 60 }, proof: ['Boiler', 'Hob'],
    cert: { name: 'Gas safety certificate (CP12)', file: 'CP12-12-Oak-Street-2026.pdf', issued: '3 Apr 2026, 10:20', expires: '3 Apr 2027', result: 'Pass' },
    cInvoice: { no: 'HR-2104', amount: 60, at: '3 Apr 2026, 11:00', file: 'HR-2104.pdf' },
    events: [ev('27 Mar 2026, 09:00', 'Emma Thompson', 'Job given to HeatRight Ltd: £60 fixed.'), ev('3 Apr 2026, 11:00', ME_CO, 'Finished. Sent 2 photos, the certificate (Pass) and invoice HR-2104'), ev('6 Apr 2026, 09:00', 'Emma Thompson', 'Work approved and record locked'), ev('10 Apr 2026, 16:00', 'LSP Accounts', 'Paid £60 (remittance R-0270)')] },
];

/* ---------- payments ---------- */
/** LSP pays approved invoices every Friday by bank transfer. A remittance lists what was paid. */
export interface Bill { id: string; job: string; no: string; amount: number; approved: string; payRun: string; paid?: string; remit?: string }
export const BILLS: Bill[] = [
  { id: 'B-311', job: 'J32', no: 'HR-2226', amount: 190, approved: '10 Oct 2026, 09:30', payRun: '16 Oct 2026' },
  { id: 'B-290', job: 'J31', no: 'HR-2214', amount: 85, approved: '30 Sep 2026, 10:00', payRun: '2 Oct 2026', paid: '2 Oct 2026', remit: 'R-0412' },
  { id: 'B-262', job: 'J19', no: 'HR-2188', amount: 95, approved: '28 Aug 2026, 10:00', payRun: '4 Sep 2026', paid: '4 Sep 2026', remit: 'R-0398' },
  { id: 'B-201', job: 'J37', no: 'HR-2150', amount: 60, approved: '29 May 2026, 09:00', payRun: '5 Jun 2026', paid: '5 Jun 2026', remit: 'R-0322' },
  { id: 'B-158', job: 'J38', no: 'HR-2104', amount: 60, approved: '6 Apr 2026, 09:00', payRun: '10 Apr 2026', paid: '10 Apr 2026', remit: 'R-0270' },
];
export const PAY_DAY = 'Friday';

/* ---------- time off ---------- */
export interface TimeOff { id: string; from: string; to: string; why: string; added: string }
export const TIME_OFF: TimeOff[] = [{ id: 'TO1', from: '2 Nov 2026', to: '6 Nov 2026', why: 'Holiday', added: '1 Oct 2026, 18:00' }];

/* ---------- requests the contractor sends to LSP ---------- */
export type ReqKind = 'Hourly rate' | 'Areas I cover' | 'Bank details' | 'Email or phone' | 'Pause my account' | 'Stop working with LSP' | 'Other';
export interface CReq { id: string; kind: ReqKind; title: string; about: string; at: string; status: 'Sent' | 'Done' | 'Declined'; reply?: string; answered?: string }
export const REQUESTS: CReq[] = [
  { id: 'R1', kind: 'Areas I cover', title: 'Add Crouch End to my areas', about: 'I can cover Crouch End (N8) as well now.', at: '12 Aug 2026, 09:00', status: 'Done', reply: 'Done. Crouch End is on your areas from today.', answered: '12 Aug 2026, 11:30' },
  { id: 'R2', kind: 'Hourly rate', title: 'Hourly rate from £60 to £65', about: 'Parts and fuel costs went up. Could the rate go to £65 an hour from November?', at: '1 Oct 2026, 08:45', status: 'Declined', reply: 'Thanks Gary. We keep the rate at £60 until the yearly review in January. Parts are still paid on top when agreed.', answered: '2 Oct 2026, 12:00' },
];

/* ---------- activity ---------- */
export interface Activity { id: string; at: string; who: string; what: string; area: string }
let hid = 0; const h = (at: string, who: string, what: string, area: string): Activity => ({ id: 'H' + ++hid, at, who, what, area });
export const ACTIVITY: Activity[] = [
  h('15 Oct 2026, 09:05', 'Gary Holt', 'Started the gas safety check at Flat 1, 45 Holloway Road', 'Jobs'),
  h('15 Oct 2026, 08:20', 'Priya Shah', 'Gave you an emergency job: No heating at 3 Park Road, today at 12:00', 'Jobs'),
  h('14 Oct 2026, 17:20', 'Emma Thompson', 'Sent back Radiators cold at the top: more photos needed', 'Jobs'),
  h('14 Oct 2026, 16:12', 'Gary Holt', 'Asked for follow-up work at 5 Mill Lane: Clear gutter and treat damp wall (£260)', 'Jobs'),
  h('14 Oct 2026, 16:10', 'Gary Holt', 'Sent photos and invoice HR-2231 (£180) for the damp survey', 'Invoices'),
  h('14 Oct 2026, 16:00', 'Priya Shah', 'Gave you a job: Gas safety check at 3 Park Road on 17 Oct at 09:00', 'Jobs'),
  h('14 Oct 2026, 15:55', 'Gary Holt', 'Uploaded the gas safety certificate for 31 Ash Grove (Pass)', 'Certificates'),
  h('13 Oct 2026, 11:02', 'Gary Holt', 'Confirmed the visit at Flat 3, 8 King Street on 20 Oct at 10:30', 'Jobs'),
  h('10 Oct 2026, 09:30', 'Priya Shah', 'Approved invoice HR-2226 (£190) for payment on 16 Oct', 'Invoices'),
  h('2 Oct 2026, 16:00', 'LSP Accounts', 'Paid £85 (remittance R-0412)', 'Payments'),
  h('2 Oct 2026, 12:00', 'Sarah Khan', 'Answered your request: Hourly rate from £60 to £65 (declined)', 'Requests'),
  h('1 Oct 2026, 18:00', 'Gary Holt', 'Added time off: 2 Nov to 6 Nov 2026 (Holiday)', 'Calendar'),
];
