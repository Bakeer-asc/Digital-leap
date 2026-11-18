# Digital LEAP Internship Management System — Frontend

React 18 + TypeScript + Vite + Tailwind + React Router + TanStack Query + React Hook Form + Zod + Recharts + Lucide.

## Run
```
npm install
npm run dev      # http://localhost:5173
npm test         # 53 automated tests
npm run build    # type-check + production build (dist/)
```

## Demo accounts (demo data only)
coordinator@, supervisor@, supervisor2@, host@ (Salone Tech Ltd), host2@ (Freetown Media House), management@, student1@ (confirmed placement), student2@ (incomplete profile) — all `@leap.demo`.
Demo password: `Demo@12345`. Replace before any real use.

## Architecture
- `src/services/api.ts`: the only data layer. Every business rule and permission check lives here (e.g. `visibleStudentIds`, 3-attempt lock, logbook date rule, result approval chain).
- `src/services/store.ts`: temporary local adapter (browser storage + seed). **Replace with calls to the PHP/XAMPP backend** keeping the same function signatures; pages will not change. Server-side authorisation must be re-implemented in PHP — frontend guards are convenience only.
- `src/lib/grade.ts`: grade validation/calculation. `src/pages/*`: one file per module. `src/components/ui`: shared components.

## Assumptions needing university confirmation
1. Weights supplied: Logbook 50 / Form D 40 / Self Evaluation 10 (Practical Internship); Report 75 / Career Fair 25.
2. **How Practical Internship combines with Report + Career Fair is not stated** — left empty; overall grades cannot be computed until the Coordinator enters approved group weights.
3. **No grade bands supplied** — none seeded; Coordinator must enter approved bands.
4. Mark owners: Logbook & Report = Academic Supervisor; Form D = Host Supervisor; Self Evaluation = Student; Career Fair = Coordinator.
5. Internship progress = share of placement period elapsed (no fixed number of weeks was given).

## Not built yet (be honest in the demo)
PHP backend & database, real email, file attachments/uploads, report filters (semester/date/etc.), password-reset email flow (currently notifies the Coordinator), rate limiting, audit-log viewer, browser screenshots.

## Test results (executed 53, passed 53)
| # | Test | Result |
|---|---|---|
| 1 | AUTH T01 valid login | Pass |
| 2 | AUTH T02 invalid login shows remaining attempts | Pass |
| 3 | AUTH T03 three failed logins lock the account, even with the right password afterwards | Pass |
| 4 | AUTH T04 coordinator can unlock | Pass |
| 5 | AUTH T05 unauthenticated calls are rejected | Pass |
| 6 | AUTH T06 deactivated account cannot sign in | Pass |
| 7 | AUTH T07 registration rejects duplicate email and stores a hash, not the password | Pass |
| 8 | AUTH T08 password change requires current password | Pass |
| 9 | PLACEMENT T10 incomplete profile cannot apply | Pass |
| 10 | PLACEMENT T11 complete application is stored as Pending | Pass |
| 11 | PLACEMENT T12 duplicate live application blocked | Pass |
| 12 | PLACEMENT T13 coordinator approves match → awaiting host, generates letter | Pass |
| 13 | PLACEMENT T14 coordinator rejection requires a reason | Pass |
| 14 | PLACEMENT T15 host accepts → Confirmed, capacity used | Pass |
| 15 | PLACEMENT T16 host decline needs reason, then Coordinator rematches | Pass |
| 16 | PLACEMENT T17 unverified host or full vacancy cannot be matched | Pass |
| 17 | PLACEMENT T18 only the addressed host can answer | Pass |
| 18 | LOGBOOK T20 valid submission by confirmed student | Pass |
| 19 | LOGBOOK T21 missing required fields rejected | Pass |
| 20 | LOGBOOK T22 date outside placement period rejected | Pass |
| 21 | LOGBOOK T23 student without confirmed placement cannot submit | Pass |
| 22 | LOGBOOK T24 supervisor approves | Pass |
| 23 | LOGBOOK T25 revision needs a comment; student resubmits | Pass |
| 24 | LOGBOOK T26 unassigned supervisor cannot review | Pass |
| 25 | ASSESSMENT T30 grade math (50/40/10, 75/25, groups 50/50) | Pass |
| 26 | ASSESSMENT T31 missing components blocks computation | Pass |
| 27 | ASSESSMENT T32 invalid configurations flagged | Pass |
| 28 | ASSESSMENT T33 no invented grading: default config cannot compute | Pass |
| 29 | ASSESSMENT T34 only the right role can enter each mark | Pass |
| 30 | ASSESSMENT T35 marks outside 0–100 rejected | Pass |
| 31 | ASSESSMENT T36 Form D draft blocks computation | Pass |
| 32 | ASSESSMENT T37 full workflow: compute → verify → management approve → publish → student sees result | Pass |
| 33 | ASSESSMENT T38 student cannot see computed grade before publication | Pass |
| 34 | ASSESSMENT T39 coordinator cannot approve or publish; management can return with reason | Pass |
| 35 | ASSESSMENT T40 results are locked while awaiting approval | Pass |
| 36 | ASSESSMENT T41 invalid grade config cannot be saved | Pass |
| 37 | ACCESS CONTROL T50 student sees only own record | Pass |
| 38 | ACCESS CONTROL T51 supervisor sees only assigned students | Pass |
| 39 | ACCESS CONTROL T52 host sees only own organisation | Pass |
| 40 | ACCESS CONTROL T53 host sees intern of own org only | Pass |
| 41 | ACCESS CONTROL T54 student cannot read another student’s letter | Pass |
| 42 | ACCESS CONTROL T55 coordinator cannot perform management actions or host responses | Pass |
| 43 | ACCESS CONTROL T56 management cannot change grade settings or review placements | Pass |
| 44 | ACCESS CONTROL T57 visits: schedule needs allocated supervisor; report by assigned supervisor only | Pass |
| 45 | UI student: all navigation pages | Pass |
| 46 | UI coordinator: all navigation pages | Pass |
| 47 | UI supervisor: all navigation pages | Pass |
| 48 | UI host: all navigation pages | Pass |
| 49 | UI management: all navigation pages | Pass |
| 50 | UI login form validates and signs in through the UI; wrong password shows error | Pass |
| 51 | UI route guard: student cannot open coordinator page | Pass |
| 52 | UI student submits a logbook through the form | Pass |
| 53 | UI logbook form shows validation and rule errors | Pass |
