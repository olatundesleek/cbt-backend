# CBT Backend

A production-ready Node.js backend for a computer-based testing (CBT) platform. It powers exam workflows for schools and institutions by handling authentication, user management, course and class administration, question banks, assessments, result processing, notifications, and media uploads.

This repository is designed to serve a CBT front-end application and exposes a structured REST API backed by PostgreSQL and Prisma.

## Features

- JWT-based authentication with cookie-session support
- Role-based access control for admin, teacher, and student users
- User profile management and account workflows
- Course and class administration
- Question bank and question management
- Test creation, exam lifecycle handling, and session tracking
- Student participation and CBT session flow
- Result generation and dashboard summaries
- File upload support for profile pictures and assessment-related assets
- PostgreSQL backup and restore tooling
- Notification and system settings endpoints
- Socket.IO real-time communication for exam/test activity
- CSV and Excel processing for imports and exports

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Socket.IO
- JWT + cookie-parser
- Joi validation
- Multer for uploads
- Cloudinary for media hosting
- ExcelJS and CSV parsing
- Nodemon for local development

## Project Structure

```text
cbt-backend/
+-- src/
¦   +-- app.js
¦   +-- config/
¦   +-- controllers/
¦   +-- middleware/
¦   +-- routes/
¦   +-- services/
¦   +-- utils/
¦   +-- validations/
¦   +-- validators/
+-- prisma/
¦   +-- schema.prisma
¦   +-- seed.js
¦   +-- migrations/
+-- uploads/
+-- backups/
+-- docs/
+-- server.js
+-- render.yaml
+-- package.json
+-- README.md
+-- .env.example
+-- .env.development
+-- .env
+-- .gitignore
```

## Prerequisites

- Node.js 18 or later
- PostgreSQL 14 or later
- npm
- A configured database instance
- A valid JWT secret and optional Cloudinary credentials

## Quick Start

1. Clone the repository

```bash
git clone https://github.com/olatundesleek/cbt-backend.git
cd cbt-backend
```

2. Install dependencies

```bash
npm install
```

3. Create your environment file

This project reads environment variables from `.env.development` in local development and `.env.production` in production.

```bash
copy .env.example .env.development
```

On Linux/macOS:

```bash
cp .env.example .env.development
```

4. Configure environment variables

Example values:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cbt"
JWT_SECRET="replace-this-with-a-long-random-secret"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
PG_DUMP_PATH="C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
PG_RESTORE_PATH="C:\Program Files\PostgreSQL\16\bin\pg_restore.exe"
```

5. Generate Prisma client

```bash
npx prisma generate
```

6. Run database migrations

```bash
npx prisma migrate dev
```

7. Start the app

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The app listens on port `4000` by default unless `PORT` is overridden.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Runtime mode such as `development` or `production` |
| `PORT` | No | HTTP server port; defaults to `4000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `PG_DUMP_PATH` | No | Optional path to PostgreSQL `pg_dump` |
| `PG_RESTORE_PATH` | No | Optional path to PostgreSQL `pg_restore` |

## Database Setup

This project uses Prisma with PostgreSQL.

Common commands:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma generate
npx prisma studio
```

To create a new migration when the schema changes:

```bash
npx prisma migrate dev --name <migration-name>
```

## API Overview

The backend exposes its REST API under `/api` with routes such as:

```text
/api/auth
/api/courses
/api/tests
/api/class
/api/question
/api/question-banks
/api/sessions
/api/students
/api/profile
/api/dashboard
/api/results
/api/teachers
/api/notification
/api/system-settings
/api/backup-restore
```

Static files are served from:

```text
/uploads
```

## Authentication and Authorization

Authentication is handled with JWT tokens and cookie-based session tracking. Protected routes are guarded by role-aware middleware so access is restricted according to the user's role.

Typical roles supported by the platform include:

- `ADMIN`
- `TEACHER`
- `STUDENT`

## Real-Time Features

The server boots a Socket.IO instance and enables session-based communication for exam-related updates. Clients can subscribe to session rooms and receive live events for test activity and related state changes.

## Backup and Restore

The project supports PostgreSQL dumps and restores through `pg_dump` and `pg_restore` for database backup and recovery flows.

Typical verification commands:

```bash
pg_dump --version
pg_restore --version
```

If those binaries are not available on your system PATH, set `PG_DUMP_PATH` and `PG_RESTORE_PATH` in your environment.

## Deployment

A basic Render configuration is included in `render.yaml`.

```yaml
services:
  - type: web
    name: cbt-backend
    env: node
    buildCommand: "npm ci"
    startCommand: "node server.js"
```

Make sure required environment variables are configured in the deployment environment and that your PostgreSQL database is reachable.

## Notes

- Uploaded media is served from the `uploads/` directory.
- CORS is configured for local development and a small set of trusted production origins.
- The application uses `express.json()` and `cookie-parser` to handle JSON request bodies and cookies.
- The API is built to work alongside a front-end client such as a React or Next.js application.

## License

This project is provided under the MIT license unless otherwise stated in the repository.
