# Safe Solutions Smart Attendance System — Backend

A complete Node.js + Express + PostgreSQL REST API built to sit behind the
existing frontend (`index.html` / `style.css` / `script.js`) without changing
any HTML id, class, or JS function name. The frontend currently talks to
`localStorage` / IndexedDB through its `API` object — swap those calls for
`fetch()` calls to this backend and everything keeps working.

## Tech Stack

- Node.js 18+ / Express.js
- PostgreSQL (raw SQL via `pg`, no ORM)
- JWT authentication (access + refresh tokens)
- bcrypt password hashing
- Multer for image uploads (employee photos, selfies, site photos)
- MVC folder structure (routes → controllers → models)
- PDFKit / ExcelJS for report exports

## Project Structure

```
backend/
  src/
    config/       env.js, db.js, seed.js
    middleware/    auth.js, role.js, upload.js, validate.js, errorHandler.js
    models/        userModel, employeeModel, attendanceModel, notificationModel,
                    settingsModel, siteModel, auditModel
    controllers/    authController, employeeController, attendanceController,
                    reportController, dashboardController, notificationController,
                    settingsController, siteController, qrController, uploadController
    routes/        one file per resource + index.js
    app.js         express app wiring
    server.js      entry point
  sql/
    schema.sql     tables, enums, indexes, triggers
    seed.sql       settings + demo sites
  uploads/         employees/ selfies/ site/  (multer destinations)
  .env.example
  package.json
```

## 1. Installation

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your PostgreSQL credentials and real JWT secrets
```

## 2. Database Setup

Create an empty PostgreSQL database matching your `.env` (`DB_NAME`), then run:

```bash
npm run seed
```

This will:
1. Execute `sql/schema.sql` (creates all tables/enums/indexes/triggers, idempotent).
2. Execute `sql/seed.sql` (settings row + 3 demo site locations).
3. Insert the 12 default employees + user logins with bcrypt-hashed passwords,
   **identical to the frontend's built-in `Seed.init()`**:

   | Role       | Name                  | Username (login)  | Password  |
   |------------|-----------------------|--------------------|-----------|
   | Controller | M. Husnain Farooq     | 03468760963        | Safe@123  |
   | Boss       | Asif                  | 03216684665        | Safe@123  |
   | Manager    | Samaira Mubashar      | 03006646124        | Safe@123  |
   | Manager    | Shahbaz Ahmed         | 03237684200        | Safe@123  |
   | Employee   | Engr Shahzaib Ahmad   | 03007684761        | Safe@123  |
   | Employee   | Adnan Ali             | 03217684400        | Safe@123  |
   | Employee   | Adnan Tahir           | 03237864100        | Safe@123  |
   | Employee   | Rehan Ali             | 03237674000        | Safe@123  |
   | Employee   | M. Soulat Raza        | 03397684700        | Safe@123  |
   | Employee   | Muneeb Ahmad          | 03077684400         | Safe@123  |
   | Employee   | M. Zahid              | 03079682902        | Safe@123  |
   | Employee   | Tajammul Mushtaq      | 03217684500        | Safe@123  |

   Re-running `npm run seed` is safe — existing usernames are skipped.

## 3. Run the server

```bash
npm run dev     # nodemon, auto-restart
# or
npm start        # plain node
```

Server starts on `http://localhost:5000` by default (`PORT` in `.env`).
Health check: `GET /api/health`.

## 4. Connecting the existing frontend

The frontend's `API` object (in `script.js`) currently reads/writes
`localStorage`/IndexedDB directly. Point it at this backend instead by
replacing the body of each `API.*` method with a `fetch()` call to the
matching endpoint below — the function **names stay the same**, so nothing
else in `script.js`, `index.html`, or `style.css` needs to change.

| Frontend `API` method     | Backend endpoint                              |
|----------------------------|------------------------------------------------|
| `API.login`                 | `POST /api/auth/login`                          |
| `API.logout`                | `POST /api/auth/logout`                         |
| `API.getSession`            | `GET /api/auth/me`                              |
| `API.changePassword`        | `POST /api/auth/change-password`                |
| `API.getEmployees`          | `GET /api/employees`                            |
| `API.getEmployeeById`       | `GET /api/employees/:id`                        |
| `API.saveEmployee`          | `POST /api/employees`                           |
| `API.updateEmployee`        | `PUT /api/employees/:id`                        |
| `API.deleteEmployee`        | `DELETE /api/employees/:id`                     |
| `API.saveAttendance`        | `POST /api/attendance/check-in` (or `POST /api/attendance` for manual entry) |
| `API.updateAttendance`      | `POST /api/attendance/check-out` (or `PUT /api/attendance/:id`) |
| `API.getAttendance`         | `GET /api/attendance?employeeId=&date=&type=&approvalStatus=&fromDate=&toDate=` |
| `API.approveAttendance`     | `POST /api/attendance/:id/approve`              |
| `API.rejectAttendance`      | `POST /api/attendance/:id/reject`               |
| `API.deleteAttendance`      | `DELETE /api/attendance/:id`                    |
| `API.getReports`            | `GET /api/reports?...`                          |
| Notifications.push/getAll   | `GET /api/notifications`, `POST /api/notifications/mark-all-read` |
| Dashboard stat cards        | `GET /api/dashboard/stats`, `GET /api/dashboard/weekly-attendance` |
| Report export buttons       | `GET /api/reports/export/pdf`, `GET /api/reports/export/excel` |
| History export button       | `GET /api/reports/export/history/excel`         |
| Employee photo upload       | `POST /api/uploads/employee-photo` (field name `photo`) |
| Camera selfie               | sent as `multipart/form-data` field `selfie` on `POST /api/attendance/check-in` |
| Site photo on check-out     | sent as field `sitePhoto` on `POST /api/attendance/check-out` |
| Site dropdown                | `GET /api/sites`                               |
| Forgot password              | `POST /api/auth/forgot-password` → `POST /api/auth/reset-password` |
| Office QR (single, permanent)| `GET /api/qr/office` (Controller), `POST /api/qr/verify` (Employees scanning) |

All endpoints except `POST /api/auth/login`, `/refresh`, `/forgot-password`,
`/reset-password` and `GET /api/health` require:

```
Authorization: Bearer <accessToken>
```

`accessToken` is returned by `/api/auth/login` and expires per `JWT_EXPIRES_IN`
(8h by default); use `/api/auth/refresh` with the stored `refreshToken` to
get a new one without forcing re-login.

## 5. Roles & permissions

Mirrors the frontend's `Auth.can()` permission table:

- **Boss** — full access to every endpoint.
- **Controller** — employee CRUD, approvals, reports, attendance, settings.
- **Manager** — approvals, reports, attendance (no employee CRUD, no settings).
- **Employee** — own check-in/check-out, own profile, dashboard/notifications.

Enforced server-side via `requireRole()` middleware — the frontend's client-side
permission checks are a UX convenience only, not a security boundary.

## 6. GPS verification

`POST /api/attendance/check-in` accepts optional `latitude`/`longitude`. For
`type: "office"` check-ins, the server computes the Haversine distance to
`settings.office_lat` / `office_lng` and stores `within_geofence` (true/false)
on the record — the same formula as `Utils.distanceMeters()` in the frontend.
If the browser denies location permission, simply omit `latitude`/`longitude`;
the check-in still succeeds with `within_geofence = null` so the app degrades
gracefully.

## 7. QR code flow (v1: single permanent office QR)

Version 1 uses exactly **one** permanent QR code for the whole office —
value `SAFE-SOLUTIONS-HQ-001` — created once by the seeder and stored in
PostgreSQL (`office_qr` table, single row). There are no per-employee QR
codes and no vehicle QR codes in this version.

| Endpoint                          | Who                    | What it does |
|------------------------------------|-------------------------|----------------|
| `GET /api/qr/office`               | Controller (Boss too)   | Returns the office QR image — JSON with a `data:image/png;base64,...` URL by default, or the raw PNG with `?format=png` (e.g. for printing). |
| `POST /api/qr/office/regenerate`   | Controller (Boss too)   | Re-renders the PNG (e.g. if the printed poster is damaged/lost). The **value never changes** — this does not mint a new code. |
| `POST /api/qr/verify`              | Any logged-in user (this is the endpoint employees hit when scanning) | Body `{ "value": "<scanned text>" }`. Returns `{ success, valid, code }` on a match, or `400 { success:false, valid:false }` otherwise. |

Employees scan the printed office QR with the existing client-side
`html5-qrcode` camera flow and POST the decoded text to `/api/qr/verify`
before (or as part of) calling `POST /api/attendance/check-in` — employees
never generate or view the master QR image themselves.

## 8. Image uploads

- `assets/images/*.jpeg` (logo, hero slides, seeded employee headshots) are
  static frontend assets and are served as-is by whatever serves `index.html`.
- New/changed employee photos, live selfies, and site check-out photos are
  uploaded via `multipart/form-data` to this backend and stored under
  `uploads/employees`, `uploads/selfies`, `uploads/site` respectively, then
  served back at `/uploads/<folder>/<filename>`. If an employee has no custom
  photo, keep pointing `<img>` at `assets/images/default-avatar.jpeg` exactly
  as the frontend already does (`Utils.onImgError`) — the backend does not
  need to know about that fallback.

## 9. Error format

All error responses are JSON:

```json
{ "success": false, "message": "Human-readable reason.", "errors": [ { "field": "...", "message": "..." } ] }
```

## 10. Production checklist

- Set strong, unique `JWT_SECRET` / `JWT_REFRESH_SECRET` in `.env`.
- Put this behind HTTPS (e.g. a reverse proxy / load balancer) — cookies and
  bearer tokens are not encrypted in transit otherwise.
- Set `NODE_ENV=production` (disables the `forgot-password` response
  echoing the reset token, and stack traces in error responses).
- Restrict `CLIENT_ORIGIN` to your real frontend origin.
- Take regular backups of the `attendance` and `employees` tables.