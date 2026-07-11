# GradePath — CGPA Calculator API

A RESTful backend for computing, tracking, and predicting student GPA/CGPA across Nigerian universities. Built with NestJS, Prisma, and PostgreSQL (Neon).

**Live:** https://cgpa-calculator-backend-6ht2.onrender.com  
**Frontend:** https://gradepath.vercel.app

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [GPA Engine](#gpa-engine)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Grading Scales](#grading-scales)
- [Degree Classification](#degree-classification)
- [Deployment](#deployment)

---

## Overview

GradePath lets students:

- Get an automatic guest account on first visit — no sign-up form required
- Claim their account with email + password to access grades from any device
- Submit semester grades and have their CGPA automatically computed
- Predict the GPA needed in remaining semesters to reach a target class
- Generate a personalised weekly study plan based on their course load and CGPA gap
- Browse a crowd-sourced course database (all courses auto-verified on contribution)

The platform supports both the **5-point** (most Nigerian universities) and **4-point** grading scales, configured per school.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Database | PostgreSQL via Neon (serverless) |
| Auth | JWT access + refresh tokens, Passport |
| Hashing | bcryptjs |
| Validation | class-validator / class-transformer |
| Runtime | Node.js ≥ 18 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon recommended)

### Installation

```bash
git clone https://github.com/Emperooid/cgpa-calculator-backend
cd cgpa-calculator-backend
npm install
```

### Database Setup

```bash
# Apply migrations
npx prisma migrate deploy

# (Development) Create and apply a new migration
npx prisma migrate dev --name your_migration_name

# Inspect the database
npx prisma studio
```

### Running

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001/api`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=verify-full"

JWT_SECRET="your-access-token-secret"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=3001

# Comma-separated list of allowed frontend origins
FRONTEND_URL="http://localhost:3000,https://gradepath.vercel.app"
```

CORS is pre-configured to allow `localhost:3000–3003`, any `*.vercel.app` subdomain, and any origins listed in `FRONTEND_URL`. Never commit `.env` to version control.

---

## Database Schema

```
School
  └── Faculty[]
        └── Department[]
              ├── Level[]
              │     └── Semester[]
              │           └── Course[]
              │                 └── CourseRating[]
              └── Student[]

User
  └── Student
        ├── SemesterRecord[]
        │     └── GradeRecord[]
        └── StudyPlan[]
```

### Key models

**User** — authentication identity. Anonymous users have a placeholder email (`anon_<uuid>@gradepath.local`). Email and password can be updated later via `POST /auth/claim`.

**Student** — academic profile linked one-to-one with a User. Holds school, department, current level, target grade, and CGPA history. Created at registration or separately for anonymous users via `POST /students/profile`.

**Course** — belongs to a Semester → Level → Department chain. All courses are created with `isVerified: true` so they appear immediately in the calculator.

**SemesterRecord** — one record per student per level/semester/year combination (unique constraint). Stores the computed GPA and total units. Deleting a record cascades to its GradeRecords and triggers a CGPA recompute.

### Enums

| Enum | Values |
|---|---|
| `GradingScale` | `FIVE_POINT`, `FOUR_POINT` |
| `Role` | `STUDENT`, `ADMIN`, `CONTRIBUTOR` |
| `ContributionStatus` | `PENDING`, `APPROVED`, `REJECTED` |

---

## GPA Engine

All computation is in `src/gpa/gpa.service.ts`.

### GPA

```
GPA = Σ(gradePoint × units) / Σ(units)
```

### CGPA

Weighted average across all `SemesterRecord` rows for a student:

```
CGPA = Σ(semesterGPA × semesterUnits) / Σ(semesterUnits)
```

CGPA is recomputed and stored on the `Student` record every time a semester is submitted or deleted.

### CGPA Prediction

```
requiredGPA = (targetCgpa × totalUnits − currentCgpa × unitsDone) / remainingUnits
```

If `requiredGPA > maxGradePoint`, the target is flagged as not achievable and the maximum possible CGPA (assuming all A's in remaining units) is returned instead.

---

## API Reference

All routes are prefixed with `/api`. Authenticated routes require `Authorization: Bearer <accessToken>`.

---

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Wakeup ping — used by frontend to pre-warm Render's free tier |

**Response:**
```json
{ "status": "ok", "ts": 1720000000000 }
```

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register with name, email, password, school, department, level |
| `POST` | `/auth/login` | No | Login — returns access + refresh tokens |
| `POST` | `/auth/anonymous` | No | Create a silent guest account |
| `POST` | `/auth/claim` | Yes | Attach email + password to a guest account |
| `POST` | `/auth/refresh` | No | Rotate access token using a refresh token |
| `POST` | `/auth/logout` | Yes | Invalidate the refresh token |
| `GET` | `/auth/me` | Yes | Get current user with full student profile |

#### `POST /auth/register`

```json
{
  "email": "student@example.com",
  "password": "secret123",
  "name": "Ada Okafor",
  "schoolId": "cuid_of_school",
  "departmentId": "cuid_of_department",
  "currentLevel": 200,
  "matricYear": 2022
}
```

**Response:** `{ user, accessToken, refreshToken }`

#### `POST /auth/anonymous`

No body required. Creates a user with a placeholder email (`anon_<uuid>@gradepath.local`) and a random password. The student visits the app and gets a fully functional account without filling any form.

**Response:** `{ user, accessToken, refreshToken }`

#### `POST /auth/claim`

Upgrades a guest account to a permanent one. All existing grade history is preserved.

```json
{
  "email": "student@example.com",
  "password": "secret123"
}
```

**Response:** Updated user object (sanitized — no password or refreshToken fields).

#### `POST /auth/login`

```json
{ "email": "student@example.com", "password": "secret123" }
```

**Response:** `{ user, accessToken, refreshToken }`

#### `POST /auth/refresh`

```json
{ "refreshToken": "eyJ..." }
```

**Response:** `{ accessToken, refreshToken }`

---

### Schools

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/schools?search=` | No | Search schools by name |
| `GET` | `/schools/:id` | No | Get a school by ID with full structure |
| `POST` | `/schools` | No | Create a school |
| `GET` | `/schools/:id/structure?departmentId=&level=&semester=` | No | Get semester structure for a dept |

#### `POST /schools`

```json
{
  "name": "University of Lagos",
  "shortName": "UNILAG",
  "country": "Nigeria",
  "gradingScale": "FIVE_POINT"
}
```

---

### Faculties

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/faculties?schoolId=` | No | List faculties for a school |
| `POST` | `/faculties` | No | Create a faculty |

#### `POST /faculties`

```json
{ "name": "Faculty of Science", "schoolId": "cuid_of_school" }
```

---

### Departments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/departments?facultyId=` | No | List departments for a faculty |
| `GET` | `/departments/:id` | No | Get a department by ID |
| `POST` | `/departments` | No | Create a department |

#### `POST /departments`

```json
{ "name": "Computer Science", "facultyId": "cuid_of_faculty" }
```

---

### Courses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/courses?departmentId=&level=&semester=` | No | Get courses for a semester |
| `POST` | `/courses` | Yes | Add a single course |
| `POST` | `/courses/bulk` | Yes | Bulk-add courses for a semester |
| `GET` | `/courses/:id/stats` | No | Get average difficulty/quality ratings |
| `POST` | `/courses/:id/rate` | Yes | Submit a course rating |

#### `POST /courses`

```json
{
  "code": "CSC201",
  "title": "Data Structures",
  "units": 3,
  "isCompulsory": true,
  "departmentId": "cuid_of_department",
  "level": 200,
  "semester": 1
}
```

All courses are created with `isVerified: true` and appear immediately in the calculator.

#### `POST /courses/bulk`

```json
{
  "departmentId": "cuid",
  "level": 200,
  "semester": 1,
  "courses": [
    { "code": "CSC201", "title": "Data Structures", "units": 3 },
    { "code": "CSC203", "title": "Algorithms", "units": 3 }
  ]
}
```

#### `POST /courses/:id/rate`

```json
{ "difficulty": 4.2, "quality": 3.8, "tips": "Focus on recursion." }
```

---

### Students

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/students/profile` | Yes | Create student profile for a guest account |
| `GET` | `/students/profile` | Yes | Get the student's full profile |
| `PATCH` | `/students/profile` | Yes | Update name, level, or target |
| `GET` | `/students/history` | Yes | Get complete grade history by semester |

#### `POST /students/profile`

Used by guest accounts that registered anonymously and need to set their academic details before using the calculator.

```json
{
  "name": "Ada Okafor",
  "schoolId": "cuid_of_school",
  "departmentId": "cuid_of_department",
  "currentLevel": 200,
  "matricYear": 2022
}
```

#### `PATCH /students/profile`

```json
{
  "name": "Ada Okafor",
  "currentLevel": 300,
  "targetGrade": "First Class",
  "targetCgpa": 4.5
}
```

---

### GPA

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/gpa/calculate` | No | Stateless GPA calculation — no account needed |
| `POST` | `/gpa/submit-semester` | Yes | Submit grades and persist semester record |
| `GET` | `/gpa/analytics` | Yes | Full CGPA analytics and trends |
| `DELETE` | `/gpa/semester/:id` | Yes | Delete a semester record and recompute CGPA |
| `GET` | `/gpa/predict` | Yes | Predict required GPA from stored record |
| `POST` | `/gpa/predict/quick` | No | Stateless CGPA prediction — no account needed |

#### `POST /gpa/calculate`

```json
{
  "scale": "FIVE_POINT",
  "courses": [
    { "units": 3, "grade": "A" },
    { "units": 2, "grade": "B" }
  ]
}
```

**Response:** `{ gpa, totalUnits, qualityPoints }`

#### `POST /gpa/submit-semester`

Saves grades and recomputes the student's overall CGPA. Re-submitting the same level/semester/year upserts the record.

```json
{
  "level": 200,
  "semester": 1,
  "year": 2024,
  "grades": [
    { "courseId": "cuid_of_course", "grade": "A" },
    { "courseId": "cuid_of_course_2", "grade": "B" }
  ]
}
```

**Response:** `{ gpa, cgpa, totalUnits, semesterRecordId }`

#### `GET /gpa/analytics`

**Response:**
```json
{
  "cgpa": 3.90,
  "currentClass": "Second Class Upper",
  "semesterTrend": [
    { "label": "100L S1", "gpa": 3.50, "totalUnits": 18 }
  ],
  "gradeDistribution": { "A": 8, "B": 5, "C": 2, "D": 1, "E": 0, "F": 0 },
  "strongestCourse": "Data Structures",
  "weakestCourse": "Technical Drawing",
  "totalUnitsCompleted": 74,
  "chances": [{ "class": "First Class", "possible": true }]
}
```

#### `DELETE /gpa/semester/:id`

Deletes the semester record and all its grade records, then recomputes CGPA. Returns 404 if the record doesn't belong to the authenticated student.

**Response:** `{ deleted: true, newCgpa: 3.75 }`

#### `POST /gpa/predict/quick`

No login required. All values supplied manually.

```json
{
  "currentCgpa": 3.5,
  "totalUnitsDone": 60,
  "targetCgpa": 4.5,
  "remainingUnits": 60,
  "scale": "FIVE_POINT"
}
```

**Response:**
```json
{
  "currentCgpa": 3.5,
  "targetCgpa": 4.5,
  "requiredGPA": 5.50,
  "maxAchievableCgpa": 4.25,
  "isPossible": false,
  "currentClass": "Second Class Upper",
  "targetClass": "First Class",
  "message": "Even with all A's, the maximum CGPA you can achieve is 4.25..."
}
```

---

### Study Plans

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/study-plans/generate` | Yes | Generate and save a weekly study plan |
| `GET` | `/study-plans/active` | Yes | Get the current active plan |

#### `POST /study-plans/generate`

The plan is generated algorithmically based on the CGPA gap (target − current) and the number and weight of semester courses. No external AI API is used.

```json
{
  "targetGrade": "First Class",
  "targetCgpa": 4.5,
  "semesterCourses": [
    { "code": "CSC301", "title": "Operating Systems", "units": 3 },
    { "code": "MTH301", "title": "Numerical Analysis", "units": 2 }
  ]
}
```

**Response includes:**
- `plan.weekly` — day-by-day task list (Mon–Sun)
- `plan.studyHoursPerDay` — 3h (gap ≤ 0.5), 4h (gap ≤ 1.0), or 6h (gap > 1.0)
- `plan.totalWeeklyHours`
- `plan.tips` — contextual advice based on the gap
- `currentCgpa` — the student's CGPA at the time of generation

---

## Authentication

### Token flow

1. `POST /auth/register`, `POST /auth/login`, or `POST /auth/anonymous` → `accessToken` (15 min) + `refreshToken` (7 days)
2. Include `Authorization: Bearer <accessToken>` on every protected request
3. On 401 → `POST /auth/refresh` with the refresh token → new token pair
4. `POST /auth/logout` → refresh token invalidated server-side (set to `null` in DB)

### Token security

Refresh tokens are stored as bcrypt hashes in the database. The raw token is never persisted. On refresh, the submitted token is compared against the hash — if it doesn't match (e.g. already rotated), the request is rejected.

### Request logging

Every HTTP request is logged to stdout in this format:

```
GET /api/auth/me 200 +12ms  origin:https://gradepath.vercel.app
```

This makes Render logs useful for debugging production issues.

---

## Grading Scales

### 5-Point (default)

| Grade | Points |
|---|---|
| A | 5 |
| B | 4 |
| C | 3 |
| D | 2 |
| E | 1 |
| F | 0 |

### 4-Point

| Grade | Points |
|---|---|
| A | 4 |
| B | 3 |
| C | 2 |
| D | 1 |
| F | 0 |

The scale is set per school and applied automatically to all GPA calculations for students in that school.

---

## Degree Classification

| Class | Min CGPA (5-point) |
|---|---|
| First Class | 4.50 |
| Second Class Upper (2:1) | 3.50 |
| Second Class Lower (2:2) | 2.40 |
| Third Class | 1.50 |
| Pass | 1.00 |
| Fail | Below 1.00 |

---

## Deployment

Hosted on [Render](https://render.com) free tier.

**Build command:**
```bash
npm install && npm run build
```

**Start command:**
```bash
npx prisma migrate deploy && node dist/main
```

Render runs `prisma migrate deploy` on every deploy to apply pending migrations before starting the server.

### Free tier cold starts

Render's free tier spins down after 15 minutes of inactivity. The first request after a spin-down takes ~50 seconds. The frontend mitigates this by firing a `GET /health` ping on page load before the user triggers any authenticated request.

### Required environment variables on Render

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`) |
| `FRONTEND_URL` | Comma-separated allowed origins for CORS |
| `PORT` | Set automatically by Render — can omit |
