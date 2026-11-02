# CBT Backend

A Node.js/Express backend for a computer-based testing (CBT) platform. It is built for schools, colleges, and assessment administrators who need to manage courses, classes, question banks, tests, student sessions, grading, and reporting from a single API.

This project provides the server-side foundation for a CBT system with role-based access control, secure authentication, file uploads, real-time session updates, and PostgreSQL-backed persistence using Prisma.

## Features

- JWT-based authentication with cookie support
- Role-based access control for admin, teacher, and student users
- User management and profile handling
- Course and class administration
- Question bank and exam question management
- Test creation, scheduling, and lifecycle management
- Real-time CBT session tracking via Socket.IO
- Result processing, analytics, and dashboard summaries
- CSV/Excel-based question import support
- File upload support for profile images and question bank assets
- Backup and restore tooling for PostgreSQL
- Notification and system settings APIs

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Socket.IO
- JWT / cookie-based auth
- Joi validation
- Multer for uploads
- Cloudinary for media hosting
- ExcelJS and CSV parsers

## Project Structure

```text
cbt-backend/
├── src/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validations/
│   └── validators/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── uploads/
├── backups/
├── docs/
├── server.js
├── render.yaml
├── package.json
├── README.md
├── .env.example
└── .gitignore
```

## Requirements

- Node.js 18+ (recommended LTS)
- PostgreSQL 14+
- npm
- A configured database and JWT secret

## Quick Start

1. Clone the repository

```bash
git clone https://github.com/yourusername/cbt-backend.git
cd cbt-backend
```

2. Install dependencies

```bash
npm install
```

3. Create an environment file

This project loads environment variables from a file named like `.env.development` when `NODE_ENV` is not `production`.

```bash
copy .env.example .env.development
```

If you are running in production mode, create a `.env.production` file instead or export the values directly in your environment.

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
PG_DUMP_PATH="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe"
PG_RESTORE_PATH="C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe"
```

5. Generate Prisma client

```bash
npx prisma generate
```

6. Run database migrations

```bash
npx prisma migrate dev
```

7. Start the backend

```bash
npm run dev
```

For production:

```bash
npm start
```

The app runs on port `4000` by default unless you override it with `PORT`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Sets the environment mode (`development`, `production`, etc.) |
| `PORT` | No | HTTP server port; defaults to `4000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used for signing JWT tokens |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `PG_DUMP_PATH` | No | Optional path to PostgreSQL `pg_dump` for backup creation |
| `PG_RESTORE_PATH` | No | Optional path to PostgreSQL `pg_restore` for restore operations |

## Database Setup

This project uses Prisma with PostgreSQL.

Common commands:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma generate
npx prisma studio
```

If the schema changes, create a migration before restarting the app:

```bash
npx prisma migrate dev --name <migration-name>
```

## API Overview

The backend exposes a grouped API under `/api`.

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

The main app also serves uploads from:

```text
/uploads
```

## Authentication and Authorization

Authentication is handled through JWT tokens and cookie-based session tracking. The server uses `reqtoken` and browser session cookies for login enforcement and concurrent session protection. Access control is enforced by role middleware for protected routes.

Supported roles typically include:

- `ADMIN`
- `TEACHER`
- `STUDENT`

## Real-Time Functionality

The server initializes a Socket.IO instance and exposes session-based communication for test activities and updates. Clients can join a session room and receive server events related to real-time CBT interactions.

## Backup and Restore

The project supports PostgreSQL backup/restore operations through `pg_dump` and `pg_restore`.

The backup flow is designed to work with the `backups/` folder and a valid `DATABASE_URL`.

Typical setup:

```bash
# verify Postgres tools are in PATH
pg_dump --version
pg_restore --version
```

If they are not available, point to the binaries using `PG_DUMP_PATH` and `PG_RESTORE_PATH`.

## Deployment

A basic Render deployment file is included in `render.yaml`.

```yaml
services:
  - type: web
    name: your-service
    env: node
    buildCommand: "npm ci"
    startCommand: "node server.js"
```

For deployment, ensure that all required environment variables are set in your hosting environment and that PostgreSQL connectivity is configured correctly.

## Notes

- The server also serves uploaded files from the `uploads/` directory.
- CORS is enabled for local development and a small set of known production origins.
- The application uses `express.json()` and `cookie-parser` by default for API body parsing and cookies.

## License

This project is provided under the MIT license unless otherwise stated in the repository.
