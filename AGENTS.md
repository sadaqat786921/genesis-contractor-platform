# Genesis · Contractor (Figma Make)

Clickable prototype of the **Contractor** portal: the firms LSP sends repair and safety work to. Signed in as Gary Holt at HeatRight Ltd (gas engineer, `C1`). It uses the same design system as the Supervisor (`sadaqat786921/genesis-supervisor-platform`), Office Admin (`genesis-officeadmin-platform`), Landlord (`genesis-landlord-platform`), Tenant (`genesis-tenant-platform`) and Letting Agent (`genesis-letting-agent-platform`) portals for Landlord Service Plans (LSP): the client-approved design **"Dashboard Variation 04"** (Figma: Genesis page, node 342:2369, and the "Genesis · Design System" section). React 19 + Vite + TypeScript, running inside Figma Make.

## Do not redesign
The client has approved this design. When editing:
- Keep the layout: a 264px white sidebar card on the left (logo, 5 menu groups, live counts, the user at the bottom), with content on the right inside 24px page padding and 20px gaps between blocks.
- Keep the colours, font, radii and shadows listed below. Use the CSS variables in `src/styles/app.css` and never hard-code new colours.
- Keep the existing classes and components (`.card`, `.kpi`, `.chip`, `.btn`, `Drawer`, `Modal`, `Tabs` and so on). Add new screens by reusing them.
- Do not add Tailwind's base reset (preflight). `src/index.css` loads only Tailwind's theme and utilities, on purpose.
- Tailwind utilities are switched on, so never name a custom class after a Tailwind utility (`outline`, `ring`, `shadow`, `border`, `hidden`…). That is why the outline button uses the class `.btn.line` and the dashboard ring uses `.gring`.
- Do not swap the icon set (lucide-react, stroke width 1.8) or the font (Montserrat).
- Images are relative paths under `public/images/` (`images/home1.jpg`). Keep them as normal git files, not LFS.
- Besides React, only two packages are needed: `react-router-dom` and `lucide-react`. If an import fails, add the missing package to package.json — never delete screens or swap libraries.
- Routing uses `HashRouter`. Paths look like `#/landlords/L1`.

## Design tokens (`src/styles/app.css`)
| Token | Value |
|---|---|
| Font | Montserrat 400/500/600/700/800 (self-hosted in `src/fonts`, loaded by `src/styles/fonts.css` — no font package needed) |
| Page background | `#F3F5F9` |
| Surface (cards) | `#FFFFFF`, border `#E9EDF3`, radius 22, padding 20, shadow `0 8px 24px rgba(15,24,40,.04)` |
| Brand navy | `#153D91` (hover `#0F3279`, subtle `#EEF3FC`) |
| Deep navy (hero / inverse) | `#001649` |
| Accent green | `#5BAF00` |
| Text | primary `#0F1828`, secondary `#475467`, tertiary `#667085`, placeholder `#98A2B3` |
| Status | ok `#3C7300` / `#E8F4DB` · warning `#B54708` / `#FEF0C7` · error `#C8102E` / `#FDE8EB` · info `#0B6FB8` / `#E0F2FE` |
| Radius | 6, 8, 10, 12 (buttons and inputs), 14, 20 (sidebar), 22 (cards), 24 (hero), 999 (chips) |
| Type | H1 24/800 · H2 15/700 · metric 26/800 · body 13/500 · small 12.5/500 · caption 11/500 · hero number 56/800 |

## Contractor rules (this portal)
- Signed in as `ME_NAME` = Gary Holt at `ME` = `C1`, HeatRight Ltd (`CONTRACTOR` in `src/data.ts`). Demo login: any email/password, code `123456`. "First time? Set your password" and "Forgot password?" work as in the other portals. 5 wrong codes lock the account. Session key `genesis-ct-signed-in`.
- The store (`src/store.tsx`, `SCOPE`) loads only the jobs LSP gave this contractor and the homes those jobs are at.
- The contractor sees **what LSP pays them** (hours × their hourly rate, or a fixed price, plus agreed parts). They **never** see LSP's price to the landlord or agent, budgets, plans, job limits or who owns the home. Tenants show name, room and phone, for access only.
- Things only LSP does show a dashed "Prototype: LSP's answer" box (`DemoAnswer` in `lib.tsx`) so every step can be clicked through without the staff portals.
- Web only, desktop first (same layout as the staff portals).

## Joining LSP (onboarding and KYC)
- `src/pages/Join.tsx`, route `#/join`, opened from **"Join as a contractor"** on the login page (before sign-in). Steps (`HSteps`): Your business → Your work → Your documents → Agree and send → LSP checks.
- **Your business:** type (limited company / sole trader / partnership), name, company number (8 digits for a limited company), contact, mobile, email (their login), address, postcode, VAT. "Fill with example" fills Northside Plumbing & Heating Ltd.
- **Your work:** trade work or site inspections, trades, areas covered (North London), hourly rate, emergency call-outs, team size, years trading.
- **Your documents (KYC):** photo ID, right to work (optional share code), public liability insurance (policy number, end date, cover at least £2 million), the trade registration for each trade (Gas Safe, NICEIC/NAPIT, WaterSafe/CIPHE, CompetentRoofer, MLA, AIIC/ABBE), and a **DBS check** (photo of the front and the back, type, 12-digit certificate number, issue date within the last 3 years; LSP asks for a new one 3 years after it was issued; `DbsUpload` in `Compliance.tsx`). Ended documents can't be uploaded; ones ending within 60 days are flagged. **No bank details at onboarding:** they are added in the portal after joining.
- **Agree and send:** summary with Change links, the **contractor agreement** and the **health, safety and conduct rules** shown as LSP's current version (`TermsModal`, `s.terms`), consent to checks, "everything is true".
- **LSP checks:** application status page (Checking / More info asked / Approved / Not approved) with each document's status and the history. Prototype answers: LSP approves (login email; "Set your password" opens the login's set-password step with their email), asks for more (insurance sent back; re-upload and "Send back to LSP"), or rejects (reason). In the live product the Supervisor answers on the **Sign-Ups** page of the Supervisor portal.

## Agreement and rules (set by LSP)
- `TERMS` in `data.ts` (`s.terms` in the store): the contractor agreement and the health, safety and conduct rules, each with a version, sections, what changed and earlier versions. The Supervisor edits and publishes them in the Supervisor portal (**Settings › Contractor agreement and rules**). `me.accepted` holds the version each contractor accepted.
- When LSP publishes a newer version, My Day, the bell and Account show **"Read and accept"** (`termsDue`, `TermsModal` with a tick). Account › Agreement and rules lists both with the accepted version. Prototype answer: "LSP publishes a new agreement".

## Bank details (added after joining)
- `me.bank` is `null` for a contractor who just joined (the Join flow's "Set your password" sets `NEW_KEY` in sessionStorage). My Day, the bell, Invoices & Payments and Account then show **"Add bank details"**. Adding or changing: account name, sort code, account number → security code to the phone (123456) → `me.bankPending` ("LSP checking") → LSP calls to check (prototype answer "LSP checks it by phone") → `me.bank`. LSP can't pay until bank details are checked.

## Clean layout rules (this portal)
- Short labels and chips instead of sentences; explanations go behind an ⓘ (`InfoTip` in `ui.tsx`). No card sub-lines unless they add something.
- One main action per screen; the rest in a **More** menu (`MoreMenu`). Long detail pages use tabs (`PageTabs`): the job page has Details / Photos & invoice / History / Rooms.
- Short facts use `Facts` (label over value). Alerts are one line with one button (`.alertbar`). Photo placeholders use `PhotoTile` (camera icon and name), not house pictures.

## The job flow (same as the staff job flows, seen from the contractor's side)
Contractor steps (`STEPS` in `lib.tsx`): Job given to you → Visit confirmed → Work started → Photos and invoice sent → Checked by LSP → Paid. Statuses: `Assigned` (with `visitOk` once confirmed) → `In progress` → `Proof uploaded` (or `Sent back`) → `Approved` (their invoice becomes a `Bill`, paid on the next Friday); `Cancelled` when they hand a job back.
- **Assigned:** Confirm the visit; Ask for another time (LSP rebooks, they confirm again); I can't do this job (reason, handed back, nothing paid). On the visit day: Start work, I couldn't get in (reason, optional photo; LSP rebooks), I'm running late.
- **Finish the job** (one form): before and after photos (at least one each), what you did, the **gas safety certificate** for safety checks (file, result Pass / At risk / Immediately dangerous, valid until; not Pass shows the make-safe warning), **your invoice** (number, amount, file; more than agreed needs a reason, LSP only pays more if it agrees), **follow-up work** (what, why, hours, amount at their rate, photos) and a tick that the home is left clean and safe.
- **Sent back:** LSP's note shows; send new photos (the invoice stays and waits).
- **Follow-up work:** LSP approves (a new job for them, tagged "Follow-up · from Jx", `followOf`) or declines. Don't start it before a yes.
- Job page also has: what's needed with the tenant's photos, what you get paid, visit and access, home, LSP contact, directions, rooms in the home (view only, `Rooms.tsx` + `src/rooms.ts` shared with every portal), history with date and time, job report PDF.

## Money
- LSP pays approved invoices **every Friday** by bank transfer. `Bill` = an approved invoice (`payRun`, `paid`, `remit`). Bills paid on one day make a **remittance** (LSP paper, PDF).
- Bank details are added or changed from Account (see "Bank details" above). LSP checks every account by phone before paying into it.

## Compliance
- LSP holds Photo ID, right to work, public liability insurance, Gas Safe registration and the DBS check (`docs`; the DBS check has a photo of both sides). Insurance, the trade registration and the DBS check must stay in date (reminders 60 and 30 days before). If one runs out the contractor is **Paused**: no new jobs and they can't confirm or start booked ones. Uploading a new one goes to "LSP checking"; when LSP checks it they are active again. Earlier versions are kept.

## Screens (`src/pages/`)
- `Join.tsx`: contractor onboarding and KYC (see above).
- `Home.tsx` (**My Day**): one-line alerts only when needed (paused, add bank details, new agreement to accept, document ending), to-be-paid hero (pay day, to do, booked, with LSP), Today's visits, Needs you, Coming up.
- `Jobs.tsx` (**My Jobs**): list (tabs to do, booked, LSP checking, done, all; search, type, year) and the job page (summary, steps, tabs Details / Photos & invoice / History / Rooms, next-step card, getting in, home, LSP contact, More menu), the finish form and the prototype answers.
- `Calendar.tsx`: 14 days of visits, pay days and time off (earlier / later); **Add time off** (warns about booked visits and asks LSP to move them), remove time off.
- `Payments.tsx` (**Invoices & Payments**): your invoices (checking, approved, paid), invoice drawer with what happened, remittances, how you get paid, bank account.
- `Compliance.tsx` (**Insurance & Certificates**): documents, upload a new one, earlier versions, the rules, paused state.
- `Documents.tsx`: certificates you issued, job reports, your invoices, remittances, insurance and ID, agreement (search, type, year).
- `Messages.tsx`: conversation with LSP and **Requests** (hourly rate, areas covered, bank details, email or phone, pause, stop working with LSP) with LSP's answers.
- `Activity.tsx`; `Account.tsx`: business details, rate and areas, where LSP pays you, notifications (email / text), sign-in and security, agreement and data.
- `lib.tsx`: status wording (`jobView`, `todo`, `invView`, `docView`), money (`moneyOf`, `remittances`, `nextPayDay`), the LSP paper template (`DocSheet`), job report and remittance pop-ups, `AskModal`, `DemoAnswer`.
