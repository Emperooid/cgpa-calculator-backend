# GradePath — CGPA Calculator API

A RESTful backend for computing, tracking, and predicting student GPA/CGPA across Nigerian universities. Built with NestJS, Prisma, and PostgreSQL.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [GPA Engine](#gpa-engine)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Schools](#schools)
  - [Faculties](#faculties)
  - [Departments](#departments)
  - [Courses](#courses)
  - [Students](#students)
  - [GPA](#gpa)
  - [Study Plans](#study-plans)
- [Authentication](#authentication)
- [Grading Scales](#grading-scales)
- [Degree Classification](#degree-classification)
- [Deployment](#deployment)

---

## Overview

GradePath lets students:

- Register under their specific school, faculty, and department
- Submit semester grades and have their CGPA automatically computed
- Predict the GPA they need in remaining semesters to hit a target CGPA
- Generate a personalised weekly study plan
- Browse a crowd-sourced course database with difficulty/quality ratings

The platform supports both the **5-point** (most Nigerian universities) and **4-point** grading scales, auto-detected per school.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT (access + refresh) + Passport |
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
# Run all pending migrations
npx prisma migrate deploy

# (Development) Create and apply a new migration
npx prisma migrate dev --name init

# Inspect the database in Prisma Studio
npx prisma studio
```

### Running

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run start:prod

# One-off start
npm run start
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
```

> **Important:** Never commit `.env` to version control. It is listed in `.gitignore`.

---

## Database Schema

### Models

```
School
  ├── Faculty[]
  │     └── Department[]
  │           ├── Level[]
  │           │     └── Semester[]
  │           │           └── Course[]
  │           │                 ├── CourseOutline
  │           │                 └── CourseRating[]
  │           └── Student[]
  └── Student[]

User
  └── Student
        ├── SemesterRecord[]
        │     └── GradeRecord[]
        ├── GradeRecord[]
        └── StudyPlan[]
```

### Key Enums

| Enum | Values |
|---|---|
| `GradingScale` | `FIVE_POINT`, `FOUR_POINT` |
| `Role` | `STUDENT`, `ADMIN`, `CONTRIBUTOR` |
| `ContributionStatus` | `PENDING`, `APPROVED`, `REJECTED` |

---

## GPA Engine

All computation lives in `src/gpa/gpa.service.ts`.

### GPA Calculation

```
GPA = Σ(gradePoint × units) / Σ(units)
```

Grade points are looked up from the school's grading scale (see [Grading Scales](#grading-scales)).

### CGPA Calculation

CGPA is computed as a weighted average across all `SemesterRecord` entries:

```
CGPA = Σ(semesterGPA × semesterUnits) / Σ(semesterUnits)
```

### CGPA Prediction

Given a target CGPA, current CGPA, units already completed, and remaining units:

```
requiredGPA = (targetCgpa × totalUnits - currentCgpa × unitsDone) / remainingUnits
```

If `requiredGPA > maxGradePoint`, the target is flagged as unachievable and the maximum possible CGPA is returned instead.

---

## API Reference

All routes are prefixed with `/api`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register a new student account |
| `POST` | `/auth/login` | No | Login and receive tokens |
| `POST` | `/auth/refresh` | No | Rotate access token using a refresh token |
| `POST` | `/auth/logout` | Yes | Invalidate refresh token |
| `GET` | `/auth/me` | Yes | Get the current authenticated user |

#### `POST /auth/register`

```json
{
  "email": "student@example.com",
  "password": "secret123",
  "name": "Ada Okafor",
  "schoolId": "cuid_of_school",
  "departmentId": "cuid_of_department",
  "matricYear": 2022,
  "currentLevel": 200
}
```

**Response:**
```json
{
  "user": { "id": "...", "email": "...", "student": { ... } },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### `POST /auth/login`

```json
{
  "email": "student@example.com",
  "password": "secret123"
}
```

#### `POST /auth/refresh`

```json
{
  "refreshToken": "eyJ..."
}
```

---

### Schools

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/schools` | No | List all schools |
| `GET` | `/schools/:id` | No | Get a school by ID |
| `POST` | `/schools` | No | Create a school |
| `GET` | `/schools/:id/structure` | No | Get full faculty/department tree |

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
| `GET` | `/faculties` | No | List faculties (filter by `?schoolId=`) |
| `POST` | `/faculties` | No | Create a faculty |

#### `POST /faculties`

```json
{
  "name": "Faculty of Science",
  "shortName": "SCI",
  "schoolId": "cuid_of_school"
}
```

---

### Departments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/departments` | No | List departments (filter by `?facultyId=`) |
| `GET` | `/departments/:id` | No | Get a department by ID |
| `POST` | `/departments` | No | Create a department |

#### `POST /departments`

```json
{
  "name": "Computer Science",
  "shortName": "CSC",
  "facultyId": "cuid_of_faculty"
}
```

---

### Courses

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/courses` | No | List courses by semester (`?departmentId=&level=&semester=`) |
| `POST` | `/courses` | No | Add a single course |
| `POST` | `/courses/bulk` | No | Add multiple courses at once |
| `GET` | `/courses/:id/stats` | No | Get average difficulty/quality ratings |
| `POST` | `/courses/:id/rate` | No | Submit a course rating |

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

#### `POST /courses/bulk`

```json
{
  "departmentId": "cuid_of_department",
  "level": 200,
  "semester": 1,
  "courses": [
    { "code": "CSC201", "title": "Data Structures", "units": 3 },
    { "code": "CSC203", "title": "Algorithms", "units": 3, "isCompulsory": false }
  ]
}
```

#### `POST /courses/:id/rate`

```json
{
  "difficulty": 4.2,
  "quality": 3.8,
  "tips": "Focus on recursion and time complexity."
}
```

---

### Students

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/students/profile` | Yes | Get the student's full profile |
| `PATCH` | `/students/profile` | Yes | Update name, level, or target CGPA |
| `GET` | `/students/history` | Yes | Get complete grade history by semester |

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
| `POST` | `/gpa/calculate` | No | Stateless GPA calculation |
| `POST` | `/gpa/submit-semester` | Yes | Submit grades and persist to DB |
| `GET` | `/gpa/analytics` | Yes | Full CGPA analytics and trends |
| `GET` | `/gpa/predict` | Yes | Predict required GPA to hit a target CGPA |
| `POST` | `/gpa/predict/quick` | No | Stateless CGPA prediction |

#### `POST /gpa/calculate`

No account needed. Pass courses with grades and get GPA back instantly.

```json
{
  "scale": "FIVE_POINT",
  "courses": [
    { "units": 3, "grade": "A" },
    { "units": 2, "grade": "B" },
    { "units": 3, "grade": "C" }
  ]
}
```

**Response:**
```json
{
  "gpa": 3.75,
  "totalUnits": 8,
  "qualityPoints": 30
}
```

#### `POST /gpa/submit-semester`

Saves grades and updates the student's CGPA in the database.

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

**Response:**
```json
{
  "gpa": 4.25,
  "cgpa": 3.90,
  "totalUnits": 18,
  "semesterRecordId": "cuid_of_record"
}
```

#### `GET /gpa/analytics`

Returns the student's full academic picture.

**Response:**
```json
{
  "cgpa": 3.90,
  "currentClass": "Second Class Upper",
  "semesterTrend": [
    { "label": "100L S1", "gpa": 3.50, "totalUnits": 18 },
    { "label": "100L S2", "gpa": 4.10, "totalUnits": 16 }
  ],
  "gradeDistribution": { "A": 8, "B": 5, "C": 2, "D": 1, "E": 0, "F": 0 },
  "strongestCourse": "Data Structures",
  "weakestCourse": "Technical Drawing",
  "totalUnitsCompleted": 74,
  "chances": [
    { "class": "First Class", "possible": true },
    { "class": "Second Class Upper", "possible": true }
  ]
}
```

#### `GET /gpa/predict?targetCgpa=4.5&totalProgramUnits=120`

| Query Param | Type | Description |
|---|---|---|
| `targetCgpa` | `number` | Your desired final CGPA |
| `totalProgramUnits` | `number` | Total credit units for your programme |

**Response:**
```json
{
  "currentCgpa": 3.90,
  "targetCgpa": 4.50,
  "totalUnitsDone": 74,
  "remainingUnits": 46,
  "requiredGPA": 4.97,
  "maxAchievableCgpa": 4.48,
  "isPossible": false,
  "currentClass": "Second Class Upper",
  "targetClass": "First Class",
  "message": "Even with all A's, the maximum CGPA you can achieve is 4.48. Your target of 4.5 is not achievable."
}
```

#### `POST /gpa/predict/quick`

Stateless prediction — no login required.

```json
{
  "currentCgpa": 3.5,
  "totalUnitsDone": 60,
  "targetCgpa": 4.5,
  "remainingUnits": 60,
  "scale": "FIVE_POINT"
}
```

---

### Study Plans

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/study-plans/generate` | Yes | Generate a weekly study plan |
| `GET` | `/study-plans/active` | Yes | Retrieve the current active plan |

#### `POST /study-plans/generate`

```json
{
  "targetGrade": "First Class",
  "targetCgpa": 4.5,
  "semesterCourses": [
    { "code": "CSC301", "title": "Operating Systems", "units": 3 },
    { "code": "CSC303", "title": "Computer Networks", "units": 3 },
    { "code": "MTH301", "title": "Numerical Analysis", "units": 2 }
  ]
}
```

**Response:**
```json
{
  "id": "...",
  "targetGrade": "First Class",
  "targetCgpa": 4.5,
  "currentCgpa": 3.90,
  "plan": {
    "studyHoursPerDay": 4,
    "totalWeeklyHours": 24,
    "weekly": {
      "Monday": ["CSC301 — Operating Systems (3 units)"],
      "Tuesday": ["CSC303 — Computer Networks (3 units)"],
      "Wednesday": ["Review CSC301"],
      "Thursday": ["MTH301 — Numerical Analysis (2 units)"],
      "Friday": ["Review CSC303"],
      "Saturday": ["Past Questions & Mock Tests"],
      "Sunday": ["Rest & Light Revision"]
    },
    "tips": [
      "Study at least 4 hours per day to reach your target.",
      "Prioritize high-unit courses — they impact your GPA the most.",
      "You are close! Stay consistent and push for As in your core courses."
    ]
  }
}
```

---

## Authentication

Protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

**Token flow:**

1. `POST /auth/register` or `POST /auth/login` → receive `accessToken` (15 min) + `refreshToken` (7 days)
2. When the access token expires → `POST /auth/refresh` with the refresh token to get new tokens
3. `POST /auth/logout` → invalidates the refresh token server-side

Refresh tokens are stored as bcrypt hashes in the database — the raw token is never persisted.

---

## Grading Scales

### 5-Point Scale (default — most Nigerian universities)

| Grade | Points |
|---|---|
| A | 5 |
| B | 4 |
| C | 3 |
| D | 2 |
| E | 1 |
| F | 0 |

### 4-Point Scale

| Grade | Points |
|---|---|
| A | 4 |
| B | 3 |
| C | 2 |
| D | 1 |
| F | 0 |

The scale is configured per school and applied automatically to all GPA calculations for students in that school.

---

## Degree Classification

| Class | Minimum CGPA (5-point) |
|---|---|
| First Class | 4.50 |
| Second Class Upper | 3.50 |
| Second Class Lower | 2.40 |
| Third Class | 1.50 |
| Pass | 1.00 |
| Fail | Below 1.00 |

---

## Deployment

The project is configured for deployment on [Render](https://render.com).

**Build command:**
```bash
npm install; npm run build
```

**Start command (in `package.json`):**
```bash
prisma migrate deploy && node dist/main
```

Render will run `prisma migrate deploy` on each deploy to apply any new migrations before starting the server.

### Required environment variables on Render

Set these in the Render dashboard under **Environment**:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `PORT` (Render sets this automatically — you can omit it)
