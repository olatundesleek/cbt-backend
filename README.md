# CBT Backend (Computer-Based Testing System)

A robust backend system for managing computer-based tests, built with Express.js and Prisma.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Tests](#tests)
  - [Courses](#courses)
  - [Question Banks](#question-banks)
  - [Students](#students)
- [Error Handling](#error-handling)

## Features

- 🔐 JWT-based authentication
- 👥 Role-based access control (Admin, Teacher, Student)
- 📚 Course and class management
- 📝 Test creation and management
- 🏦 Question bank system
- 📊 Real-time test sessions
- 📈 Answer tracking and scoring
- 📑 CSV question upload support
- 🔍 Comprehensive input validation

## Tech Stack

- **Node.js & Express.js** - Server framework
- **PostgreSQL** - Database
- **Prisma** - ORM
- **JSON Web Tokens** - Authentication
- **Joi** - Input validation
- **CSV Parse/Stringify** - CSV handling

## Getting Started

### Prerequisites

- Node.js (v14+)
- PostgreSQL
- npm/yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/cbt-backend.git
   cd cbt-backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

4. Initialize the database:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Environment Variables

| Variable     | Description               | Example                                   |
| ------------ | ------------------------- | ----------------------------------------- |
| DATABASE_URL | PostgreSQL connection URL | postgresql://user:pass@localhost:5432/cbt |
| JWT_SECRET   | Secret for JWT signing    | your-secret-key                           |
| PORT         | Server port (optional)    | 3000                                      |

## API Documentation

### Authentication

#### Register User (Admin only)

\`\`\`http
POST /api/auth/register
\`\`\`

Request body:

```json
{
  "firstname": "John",
  "lastname": "Doe",
  "username": "johndoe",
  "password": "password123",
  "role": "TEACHER"
}
```

Response:

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": 1,
    "username": "johndoe",
    "firstname": "John",
    "lastname": "Doe",
    "role": "TEACHER"
  }
}
```

#### Login

\`\`\`http
POST /api/auth/login
\`\`\`

Request body:

```json
{
  "username": "teacher1",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "teacher1",
      "role": "TEACHER"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Class Management

#### Create Class (Admin only)

\`\`\`http
POST /api/classes
\`\`\`

Request body:

```json
{
  "className": "Class 1A",
  "teacherId": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Class created successfully",
  "data": {
    "id": 1,
    "className": "Class 1A",
    "teacherId": 1,
    "createdAt": "2025-10-30T10:00:00.000Z"
  }
}
```

#### Get All Classes

\`\`\`http
GET /api/classes
\`\`\`

Response:

```json
{
  "success": true,
  "message": "Classes fetched successfully",
  "data": [
    {
      "id": 1,
      "className": "Class 1A",
      "teacher": {
        "id": 1,
        "firstname": "John",
        "lastname": "Doe"
      },
      "_count": {
        "students": 25
      }
    }
  ]
}
```

#### Update Class (Admin only)

\`\`\`http
PATCH /api/classes/:classId
\`\`\`

Request body:

```json
{
  "className": "Class 1B",
  "teacherId": 2
}
```

Response:

```json
{
  "success": true,
  "message": "Class updated successfully",
  "data": {
    "id": 1,
    "className": "Class 1B",
    "teacherId": 2
  }
}
```

#### Delete Class (Admin only)

\`\`\`http
DELETE /api/classes/:classId
\`\`\`

Response:

```json
{
  "success": true,
  "message": "Class deleted successfully"
}
```

### Course Management

#### Create Course (Admin only)

\`\`\`http
POST /api/courses
\`\`\`

Request body:

```json
{
  "title": "Mathematics 101",
  "description": "Introduction to Basic Mathematics",
  "teacherId": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "title": "Mathematics 101",
    "description": "Introduction to Basic Mathematics",
    "teacherId": 1,
    "createdAt": "2025-10-30T10:00:00.000Z"
  }
}
```

#### Get All Courses

\`\`\`http
GET /api/courses
\`\`\`

Response:

```json
{
  "success": true,
  "message": "Courses fetched successfully",
  "data": [
    {
      "id": 1,
      "title": "Mathematics 101",
      "description": "Introduction to Basic Mathematics",
      "teacher": {
        "id": 1,
        "firstname": "John",
        "lastname": "Doe"
      },
      "_count": {
        "tests": 5,
        "classes": 3
      }
    }
  ]
}
```

#### Update Course (Admin only)

\`\`\`http
PATCH /api/courses/:courseId
\`\`\`

Request body:

```json
{
  "title": "Advanced Mathematics",
  "description": "Advanced Mathematical Concepts",
  "teacherId": 2
}
```

Response:

```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "id": 1,
    "title": "Advanced Mathematics",
    "description": "Advanced Mathematical Concepts",
    "teacherId": 2
  }
}
```

#### Delete Course (Admin only)

\`\`\`http
DELETE /api/courses/:courseId
\`\`\`

Response:

```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

### Tests

#### Create Test

\`\`\`http
POST /api/tests
\`\`\`

Request body:

```json
{
  "title": "Midterm Exam",
  "type": "EXAM",
  "courseId": 1,
  "bankId": 1,
  "startTime": "2025-11-01T09:00:00Z",
  "endTime": "2025-11-01T11:00:00Z"
}
```

Response:

```json
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "id": 1,
    "title": "Midterm Exam",
    "type": "EXAM",
    "isActive": true,
    "startTime": "2025-11-01T09:00:00.000Z",
    "endTime": "2025-11-01T11:00:00.000Z",
    "course": {
      "title": "Mathematics 101"
    }
  }
}
```

#### Get Tests

\`\`\`http
GET /api/tests
\`\`\`

Response (Teacher):

```json
{
  "success": true,
  "message": "Tests fetched successfully",
  "data": [
    {
      "id": 1,
      "title": "Midterm Exam",
      "type": "EXAM",
      "isActive": true,
      "course": {
        "title": "Mathematics 101",
        "classes": [
          {
            "className": "Class A",
            "_count": {
              "students": 30
            }
          }
        ]
      },
      "_count": {
        "sessions": 25
      }
    }
  ]
}
```

#### Get Test by ID

\`\`\`http
GET /api/tests/:testId
\`\`\`

Response varies by role:

Teacher/Admin:

```json
{
  "success": true,
  "message": "Test fetched successfully",
  "data": {
    "id": 1,
    "title": "Midterm Exam",
    "type": "EXAM",
    "isActive": true,
    "course": {
      "title": "Mathematics 101",
      "classes": [
        {
          "className": "Class A",
          "_count": {
            "students": 30
          }
        }
      ]
    },
    "bank": {
      "questionBankName": "Math Questions",
      "_count": {
        "questions": 50
      }
    },
    "_count": {
      "sessions": 25
    }
  }
}
```

Student:

```json
{
  "success": true,
  "message": "Test fetched successfully",
  "data": {
    "id": 1,
    "title": "Midterm Exam",
    "type": "EXAM",
    "isActive": true,
    "startTime": "2025-11-01T09:00:00.000Z",
    "endTime": "2025-11-01T11:00:00.000Z",
    "course": {
      "title": "Mathematics 101"
    }
  }
}
```

### Question Banks

#### Create Question Bank (Teacher/Admin)

\`\`\`http
POST /api/questionBanks
\`\`\`

Request body:

```json
{
  "questionBankName": "Mathematics Questions",
  "description": "Basic Math Questions",
  "courseId": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Question bank created successfully",
  "data": {
    "id": 1,
    "questionBankName": "Mathematics Questions",
    "description": "Basic Math Questions",
    "courseId": 1,
    "createdBy": 1
  }
}
```

#### Get Question Banks

\`\`\`http
GET /api/questionBanks
\`\`\`

Response:

```json
{
  "success": true,
  "message": "Question banks fetched successfully",
  "data": [
    {
      "id": 1,
      "questionBankName": "Mathematics Questions",
      "description": "Basic Math Questions",
      "course": {
        "title": "Mathematics 101"
      },
      "_count": {
        "questions": 50
      }
    }
  ]
}
```

### Questions

#### Create Question

\`\`\`http
POST /api/questions
\`\`\`

Request body:

```json
{
  "text": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "answer": "1",
  "marks": 1,
  "bankId": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "id": 1,
    "text": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "marks": 1,
    "bankId": 1
  }
}
```

#### Upload Questions via CSV

\`\`\`http
POST /api/questions/upload
\`\`\`

Request body (multipart/form-data):

- questions: CSV file
- bankId: number

Response:

```json
{
  "success": true,
  "message": "Successfully uploaded 10 questions",
  "data": [
    {
      "id": 1,
      "text": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "marks": 1
    }
  ]
}
```

#### Get Upload Template

\`\`\`http
GET /api/questions/upload/template
\`\`\`

Response:

- CSV file download with headers: text, options, answer, marks

### Test Sessions

#### Start Test Session

\`\`\`http
POST /api/testSessions
\`\`\`

Request body:

```json
{
  "testId": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Test session started successfully",
  "data": {
    "id": 1,
    "testId": 1,
    "status": "IN_PROGRESS",
    "startedAt": "2025-10-30T10:00:00.000Z"
  }
}
```

#### Submit Answer

\`\`\`http
POST /api/testSessions/:sessionId/answers
\`\`\`

Request body:

```json
{
  "questionId": 1,
  "selectedOption": "1"
}
```

Response:

```json
{
  "success": true,
  "message": "Answer submitted successfully",
  "data": {
    "id": 1,
    "questionId": 1,
    "selectedOption": "1",
    "isCorrect": true
  }
}
```

#### End Test Session

\`\`\`http
POST /api/testSessions/:sessionId/submit
\`\`\`

Response:

```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "id": 1,
    "score": 85,
    "status": "SUBMITTED",
    "endedAt": "2025-10-30T11:00:00.000Z"
  }
}
```

## Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "message": "Error message here",
  "error": {
    "details": ["Specific error details if available"]
  }
}
```

Common HTTP Status Codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## License

MIT © [Olatunde Sleek]
