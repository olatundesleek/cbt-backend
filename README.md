# CBT Backend (Prisma + Express)

This is a starter CBT backend with:
- PostgreSQL + Prisma
- Express.js
- JWT auth
- Role-based access (Admin, Teacher, Student)
- TestSession + Answer flow (question-by-question submission)

Copy `.env.example` to `.env` and update values.  
Run:
```
npm install
npx prisma generate
npx prisma migrate dev --name init
npm start
```
