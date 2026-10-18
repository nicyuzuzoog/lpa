# School Management & Accounting System

A production-focused web application for managing a private school: students, fees, payments &
receipts, balances, inventory, uniform distribution, reports (PDF/Excel), notifications, audit
trail, and role-based access control.

- **Frontend:** React (Vite) + Tailwind CSS 4 + React Router
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Auth:** JWT (HTTP-only via Bearer header, stored in `localStorage` as `sms_token`) + bcrypt
- **Roles:** `SUPER_ADMIN`, `ACCOUNTANT`, `BIG_BOSS`, `TEACHER` (permissions are enforced **server-side**)

```
┌─ frontend/  React SPA (Vite) ── /api proxy ─┐
└─ backend/   Express REST API ───────────────┴─ MongoDB
```

---

## Requirements

- Node.js **20+** (tested on v24)
- MongoDB **7+** (local or Atlas)

## 1. Backend setup

```bash
cd backend
cp .env.example .env        # then edit values
npm install
npm run seed                # creates default users, classes, fee structures, items
npm run dev                 # http://localhost:5000
```

### Environment variables (`backend/.env`)

| Variable         | Default                              | Description                                  |
| ---------------- | ------------------------------------ | -------------------------------------------- |
| `PORT`           | `5000`                               | API port                                     |
| `MONGODB_URI`    | *(required)*                         | Mongo connection string                      |
| `JWT_SECRET`     | *(required)*                         | Signing secret — keep it private in prod     |
| `JWT_EXPIRES_IN` | `1d`                                 | Token lifetime                               |
| `CORS_ORIGIN`    | `http://localhost:5173`              | Comma-separated allowed origins              |

### Default login (after `npm run seed`)

| Username   | Password      | Role          |
| ---------- | ------------- | ------------- |
| `admin`    | `admin12345`  | SUPER_ADMIN   |
| `accountant` | `account12345` | ACCOUNTANT  |
| `boss`     | `boss123456`  | BIG_BOSS      |
| `teacher.alice` | `teacher12345` | TEACHER (class-reader P5) |
| `teacher.jean` | `teacher12345` | TEACHER (class-reader P1) |

> Change these after first login (Profile → Change Password).

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api → localhost:5000)
```

For production build: `npm run build` → `dist/`.

If the API is hosted elsewhere, set `VITE_API_URL` to its base URL (without `/api`), e.g.
`VITE_API_URL=https://api.yourschool.com` — the client appends `/api`.

## 3. Key workflows

1. **Enroll** → Students module (pick class + academic year + term). Student ID auto-generates
   (`STU-2026-####`).
2. **Fees** → Fees module: structures define `SCHOOL_FEES` / `MATERIALS` / `UNIFORM` amounts per
   class/term; fee items are the uniform/material "menu".
3. **Pay** → Payments module. Receipt numbers auto-generate (`RCT-2026-000001`). Payments can be
   **corrected**, **reversed** (refund), or **voided** — never deleted — with a required reason.
   The audit trail records every change.
4. **Balances** → per-student required/paid/balance, filterable by class.
5. **Uniforms** → record stock receipts; students get entitlements automatically once they pay
   the uniform fee; then issue items from stock. Verify who paid vs. received per student.
6. **Inventory** → stock in/out/adjustment with low-stock alerts.
7. **Reports** → collections, breakdown, outstanding balances, student statements, inventory,
   uniforms, fee structures — all exportable to PDF and Excel.
8. **Receipts** → printable shareable receipt, plus jsPDF export.
9. **Teaching (Teachers)** → created by the Super Admin (Users module → role **Teacher**). Each
   teacher is the **class reader** of exactly one class, but may teach many class/subject
   combinations (KIN, KIS, ENG, FRA, MAT, SRS, SET).
   - **Attendance** → daily roster for the teacher's class-reader class only. Any student marked
     `ABSENT` **must** have a reason; future dates are rejected.
   - **Assessments** → create an assessment (e.g. 40 marks) for a subject the teacher teaches,
     enter marks for the class roster, then generate a report. Every mark is validated as a whole
     number within `0 … total` (zero tolerance for "worked"/out-of-range marks).
   - **Performance Report** → overall pass/fail/percentage/position across all of a class's
     assessments (pass mark defaults to 50%).

## 4. API overview

`/api/...` — see `backend/src/routes/`. Highlights:

| Method & Path | Permission | Description |
|---|---|---|
| `POST /auth/login` | public | login → JWT |
| `POST /auth/change-password` | auth | change own password |
| `GET/POST /students` | `students:read/create` | list / enroll |
| `GET /students/:id` | `students:read` | detail + fee summary + payments |
| `GET /classes`, `GET /academic-years` | `classes:read` / `academicYears:read` | master data |
| `GET/POST /fees/structures` | `fees:read/manageStructures` | fee structures |
| `POST /payments` | `payments:create` | record payment |
| `PUT /payments/:id` | `payments:update` | correct payment (reason required) |
| `POST /payments/:id/reverse` · `/void` | `payments:reverse` | reverse / void |
| `GET /payments/balances` | `payments:read` | student balances |
| `GET /payments/:id/receipt` | `payments:read` | receipt payload |
| `GET/POST /inventory/...` · `GET/POST /uniforms/...` | `inventory:*` / `uniforms:*` | stock & distribution |
| `GET /uniforms/verification/:id` | `uniforms:read` | paid vs issued per student |
| `GET /reports/*` | `reports:read` | all reports |
| `GET /notifications` | `notifications:read` | inbox |
| `GET /audit-logs` | `audit:read` | immutable audit trail |
| `GET/PUT /users` | `users:read/manage` | manage users (SUPER_ADMIN only) |
| `GET/PUT /settings` | `settings:read/manage` | school settings / receipt details |

## 5. Roles & permissions

| Permission | SUPER_ADMIN | ACCOUNTANT | BIG_BOSS |
| --- | :-: | :-: | :-: |
| dashboard, students (read), classes (read), fees (read), payments (read), inventory (read), uniforms (read), reports, notifications, audit, settings (read) | ✅ | ✅ | ✅ |
| students (create/update), payments (create/correct/reverse), fees items, inventory & uniforms manage/issue | ✅ | ✅ | ❌ |
| classes & academic years manage, fee structures, users, settings | ✅ | ❌ | ❌ |

Roles can only change through the Super Admin (no self-promotion).

## 6. Data-safety rules built in

- Payments are **never deleted**: corrected / reversed / voided, each recorded with a reason.
- Reversals suspend or destroy the uniform entitlements the payment created.
- Stock movements are append-only transactions with running balances.
- Class / year / fee-structure retirement is soft (INACTIVE) — no destructive deletes.
- The audit log cannot be cleared through the interface.

## 7. Deployment notes

**Frontend (Vercel / Netlify):** build with `npm run build`, root `dist/`; set
`VITE_API_URL` to the backend origin. SPA rewrites: route `/*` → `/index.html`.

**Backend (Render / Railway / any Node host):** run `npm start`, provide `MONGODB_URI` +
`JWT_SECRET`, and add the frontend domain to `CORS_ORIGIN`. Use MongoDB Atlas for the database.
Enable `NODE_ENV=production` (adds helmet CSP/rate limits and disables morgan).

```bash
# production run
NODE_ENV=production PORT=5000 MONGODB_URI=mongodb+srv://... JWT_SECRET=... npm start
# first time only:
NODE_ENV=production ... npm run seed
```

> Run `npm run seed` once on the production DB before going live.

## 8. Scripts

| Where | Script | What |
|---|---|---|
| `backend` | `npm run dev` | dev server with auto-reload (`node --watch`) |
| `backend` | `npm run start` | run server |
| `backend` | `npm run seed` | idempotent seed (defaults skipped if present) |
| `frontend` | `npm run dev` | Vite dev server (proxy `/api`) |
| `frontend` | `npm run build` | production build → `dist/` |
| `frontend` | `npm run preview` | preview the built app |