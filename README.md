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
  - [Complete API Routes](#complete-api-routes)
  - [Authentication](#authentication)
  - [Tests](#tests)
  - [Courses](#courses)
  - [Question Banks](#question-banks)
  - [Students](#students)
  - [Notifications](#notification-api)
  - [System Settings](#system-settings-api)
  - [Controller Exports](#controller-exports-summary)
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

### Admin change user password

http
PATCH /api/auth/change-user-password/:userId

**Params**

- `username` (string, required)

**Body**

```json
{
  "newPassword": "newPass123",
  "confirmPassword": "newPass123"
}
```

**Auth:** Required (Bearer token)
**Roles:** ADMIN only

**Response**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Admin delete user

http
DELETE /api/auth/delete-user/:userid

**Params**

- `userid` (number, required)

**Auth:** Required (Bearer token)
**Roles:** ADMIN only

**Response**

```json
{
  "success": true,
  "message": "User Seyi West deleted successfully"
}
```

### Dashboard

#### fetch dashboard details

\`\`\`http
GET /api/dashboard
\`\`\`

Response:

```json
{
  "success": true,
  "message": "dashboard fetched successfully",
  "data": {}
}
```

### Class Management

#### Create Class (Admin only)

```http
POST /api/class
```

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

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

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
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 20,
    "pages": 2
  }
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

# Teachers

## Get All Teachers (Admin Only)

```http
GET /api/teachers
```

Fetch all teachers in the system. Accessible only by users with the ADMIN role.

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

**Response:**

```json
{
  "success": true,
  "message": "Teachers fetched successfully",
  "data": [
    {
      "id": 1,
      "firstname": "John",
      "lastname": "Doe",
      "username": "johndoe",
      "role": "TEACHER",
      "createdAt": "2025-10-30T10:00:00.000Z"
    },
    {
      "id": 2,
      "firstname": "Jane",
      "lastname": "Smith",
      "username": "janesmith",
      "role": "TEACHER",
      "createdAt": "2025-10-30T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

**Example Errors:**

```json
{
  "success": false,
  "message": "You are not authorized to perform this action"
}
```

```json
{
  "success": false,
  "message": "Unable to fetch teachers"
}
```

## Assign Class Teacher (Admin Only)

```http
PATCH /api/teachers/:classId/assign-class-teacher
```

Assigns a teacher to a specific class. Accessible only by users with the ADMIN role.

**Request Params:**

```json
{
  "classId": 2
}
```

**Request Body:**

```json
{
  "teacherId": 5
}
```

**Response:**

```json
{
  "success": true,
  "message": "Teacher assigned to class",
  "data": {
    "id": 2,
    "className": "Grade 10 - A",
    "teacher": {
      "id": 5,
      "firstname": "Jane",
      "lastname": "Smith"
    }
  }
}
```

**Example Errors:**

```json
{
  "success": false,
  "message": "You are not authorized to perform this action"
}
```

```json
{
  "success": false,
  "message": "Invalid teacher or class ID"
}
```

**Validation Rules:**

- **Params:**
  - `classId` — integer, positive, required.
- **Body:**
  - `teacherId` — integer, positive, required.

**Authorization:**

Only ADMIN users can access these endpoints.

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

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

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
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "pages": 2
  }
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

```http
POST /api/tests
```

Create a new test.
Accessible by users with the **TEACHER** or **ADMIN** role.

### Request Body

```json
{
  "title": "Midterm Exam",
  "type": "EXAM",
  "testState": "scheduled",
  "startTime": "2025-11-01T09:00:00Z",
  "endTime": "2025-11-01T11:00:00Z",
  "duration": 120,
  "courseId": 1,
  "bankId": 1,
  "attemptsAllowed": 1,
  "passMark": 50
}
```

### Validation Rules

- `title` — string, required.
- `type` — "TEST" or "EXAM", required.
- `testState` — "active", "inactive", "scheduled", or "completed", required.
- `startTime` — ISO date, must be in the future.
- `endTime` — ISO date, must be after `startTime`.
- `duration` — number of minutes, between 1 and 180.
- `courseId` — number, required.
- `bankId` — number, required.
- `attemptsAllowed` — integer, 1–10, default 1.
- `passMark` — integer, 0–100, required.

### Response

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

### Example Errors

```json
{
  "success": false,
  "message": "Test title is required"
}
```

```json
{
  "success": false,
  "message": "Start time must be in the future"
}
```

```json
{
  "success": false,
  "message": "End time must be after start time"
}
```

#### Delete Test (Teacher/Admin)

```http
DELETE /api/tests/:testId
```

Delete an existing test. Accessible by the test's creator (teacher) or an ADMIN.

**Params**

- `testId` (number, required)

**Auth:** Required (Bearer token)
**Roles:** `TEACHER`, `ADMIN`

**Response (Success)**

```json
{
  "success": true,
  "message": "Test deleted successfully"
}
```

#### Get Tests

\`\`\`http
GET /api/tests
\`\`\`

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

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
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

### Get Test by ID

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

#### Question bank

## Create Question Bank (Teacher/Admin)

```http
POST /api/question-banks
```

**Request Body**

```json
{
  "questionBankName": "Mathematics Questions",
  "description": "Basic Math Questions",
  "courseId": 1
}
```

**Response**

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

## Get All Question Banks (Teacher/Admin)

```http
GET /api/question-banks
```

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

**Response**

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
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "pages": 1
  }
}
```

## Get Question Bank by ID

```http
GET /api/question-banks/:bankId
```

**Params**

- `bankId` (number, required)

**Response**

```json
{
  "success": true,
  "message": "Question bank fetched successfully",
  "data": {
    "id": 1,
    "questionBankName": "Mathematics Questions",
    "description": "Basic Math Questions",
    "courseId": 1,
    "createdBy": 1,
    "questions": [
      {
        "id": 10,
        "text": "What is 2 + 2?",
        "marks": 1
      }
    ]
  }
}
```

## Update Question Bank (Teacher/Admin)

```http
PATCH /api/question-banks/:bankId
```

**Params**

- `bankId` (number, required)

**Request Body**

```json
{
  "questionBankName": "Updated Name",
  "description": "Updated Description",
  "courseId": 2
}
```

**Response**

```json
{
  "success": true,
  "message": "Question bank updated successfully",
  "data": {
    "id": 1,
    "questionBankName": "Updated Name",
    "description": "Updated Description",
    "courseId": 2
  }
}
```

## Delete Question Bank (Teacher/Admin)

```http
DELETE /api/question-banks/:bankId
```

**Response**

```json
{
  "success": true,
  "message": "Question bank deleted successfully"
}
```

## Get Questions in a Question Bank

```http
GET /api/question-banks/:bankId/questions
```

**Response**

```json
{
  "success": true,
  "message": "Questions fetched successfully",
  "data": [
    {
      "id": 101,
      "text": "What is 5 × 5?",
      "options": ["10", "20", "25", "30"],
      "answer": "25",
      "marks": 1
    }
  ]
}
```

#### 📘 Questions

## Create Question (Single or Multiple)

```http
POST /api/questions
```

**Request Body (Single Question)**

```json
{
  "text": "What is 2 + 2?",
  "options": ["3", "4", "5", "6"],
  "answer": "4",
  "marks": 1,
  "bankId": 1
}
```

**Request Body (Multiple Questions)**

```json
[
  {
    "text": "What is 10 / 2?",
    "options": ["2", "5", "10"],
    "answer": "5",
    "marks": 1,
    "bankId": 1
  },
  {
    "text": "What is 3 × 3?",
    "options": ["6", "9", "12"],
    "answer": "9",
    "marks": 1,
    "bankId": 1
  }
]
```

**Response (Single)**

```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "id": 1,
    "text": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "answer": "4",
    "marks": 1,
    "bankId": 1
  }
}
```

**Response (Multiple)**

```json
{
  "success": true,
  "message": "2 questions created successfully",
  "data": [
    {
      "id": 1,
      "text": "What is 10 / 2?",
      "options": ["2", "5", "10"],
      "answer": "5",
      "marks": 1,
      "bankId": 1
    },
    {
      "id": 2,
      "text": "What is 3 × 3?",
      "options": ["6", "9", "12"],
      "answer": "9",
      "marks": 1,
      "bankId": 1
    }
  ]
}
```

---

## Get Question by ID

```http
GET /api/questions/:questionId
```

**Response**

```json
{
  "success": true,
  "message": "Question fetched successfully",
  "data": {
    "id": 1,
    "text": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "answer": "4",
    "marks": 1,
    "bankId": 1
  }
}
```

---

## Update Question

```http
PATCH /api/questions/:questionId
```

**Request Body**

```json
{
  "text": "Updated question text",
  "options": ["Option A", "Option B"],
  "answer": "Option A",
  "marks": 2
}
```

**Response**

```json
{
  "success": true,
  "message": "Question updated successfully",
  "data": {
    "id": 1,
    "text": "Updated question text",
    "options": ["Option A", "Option B"],
    "answer": "Option A",
    "marks": 2
  }
}
```

---

## Delete Question

```http
DELETE /api/questions/:questionId
```

**Response**

```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

---

## Upload Questions via CSV

```http
POST /api/questions/upload
```

**Form Data**
| Field | Type | Description |
|-------|--------|-------------|
| questions | file (CSV) | CSV file containing questions |
| bankId | number | ID of the question bank |

**Response**

```json
{
  "success": true,
  "message": "Successfully uploaded 10 questions",
  "data": [
    {
      "id": 1,
      "text": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "answer": "4",
      "marks": 1
    }
  ]
}
```

---

## Download CSV Upload Template

```http
GET /api/questions/upload/template
```

**Response**

- Downloads a CSV with headers:

```
text,options,answer,marks
```

### Test Sessions

#### Start Test Session

```http
POST /api/sessions
```

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

```http
POST /api/sessions/:sessionId/answers
```

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

```http
POST /api/sessions/:sessionId/submit
```

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

#### End All Sessions

```http
POST /api/sessions/end-all-sessions
```

Response:

```json
{
  "success": true,
  "message": "All sessions ended successfully",
  "data": null
}
```

#### Profile

# 📘 Profile API

## Get Logged-in User Profile

```http
GET /api/profile
```

**Auth:** Required (Bearer token)

**Response**

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": "65f1...",
    "firstname": "John",
    "lastname": "Doe",
    "username": "johnny",
    "email": "john@example.com",
    "phoneNumber": "387878343",
    "role": "student"
  }
}
```

## Update Profile

```http
PATCH /api/profile
```

**Auth:** Required (Bearer token)

**Request Body** (at least one field required)

```json
{
  "firstname": "Olatunde",
  "lastname": "Sleek",
  "username": "sleek01",
  "email": "test@test.com",
  "phoneNumber": "38783733"
}
```

**Response**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "firstname": "Olatunde",
    "lastname": "Sleek",
    "username": "sleek01"
  }
}
```

## Update Password

```http
PATCH /api/profile/password
```

**Auth:** Required (Bearer token)

**Request Body**

```json
{
  "currentPassword": "oldPass123",
  "newPassword": "newPass456",
  "confirmPassword": "newPass456"
}
```

**Response**

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

#### Students

# 📘 Students API

## List Students

```http
GET /api/students
```

**Auth:** Required (Bearer token)
**Roles:** ADMIN → all students, TEACHER → students in teacher's classes

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

**Response**

```json
{
  "success": true,
  "message": "Students fetched successfully",
  "data": [
    {
      "id": 1,
      "firstname": "Olatunde",
      "lastname": "Sleek",
      "username": "sleek01",
      "email": "olatunde@example.com",
      "class": {
        "id": 101,
        "name": "JSS1"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Get Single Student by Username

```http
GET /api/students/:username
```

**Params**

- `username` (string, required)

**Auth:** Required (Bearer token)
**Roles:** ADMIN, TEACHER (if student in their class), or the student themself

**Response**

```json
{
  "success": true,
  "message": "Student fetched successfully",
  "data": {
    "id": 1,
    "firstname": "Olatunde",
    "lastname": "Sleek",
    "username": "sleek01",
    "email": "olatunde@example.com",
    "class": {
      "id": 101,
      "name": "JSS1"
    }
  }
}
```

---

## Assign Student to Class

```http
POST /api/students/:studentId/assign-class
```

**Params**

- `studentId` (number, required)

**Body**

```json
{
  "classId": 101
}
```

**Auth:** Required (Bearer token)
**Roles:** ADMIN only

**Response**

```json
{
  "success": true,
  "message": "Student assigned to class",
  "data": {
    "id": 1,
    "firstname": "Olatunde",
    "lastname": "Sleek",
    "username": "sleek01",
    "class": {
      "id": 101,
      "name": "JSS1"
    }
  }
}
```

### Result

---

## 1. Get Test Results (Teacher/Admin)

Retrieve a paginated list of all session results for a specific test.

**Endpoint:** `GET /api/results/test/:testId`

**Access:** ADMIN, TEACHER

**URL Parameters:**

| Parameter | Type     | Description    |
| :-------- | :------- | :------------- |
| `testId`  | `Number` | ID of the test |

**Query Parameters (optional):**

| Parameter | Type     | Default  | Description                                  |
| :-------- | :------- | :------- | :------------------------------------------- |
| `page`    | `Number` | `1`      | Page number for pagination                   |
| `limit`   | `Number` | `10`     | Number of results per page (max 100)         |
| `sort`    | `String` | `"date"` | Field to sort by: `score`, `date`, `student` |
| `order`   | `String` | `"desc"` | Sort order: `asc` or `desc`                  |

**Response Example:**

```json
{
  "success": true,
  "message": "Test results retrieved successfully",
  "data": {
    "id": 1,
    "title": "Midterm Exam",
    "course": {
      "id": 101,
      "title": "Mathematics 101"
    },
    "sessions": [
      {
        "id": 1,
        "student": {
          "id": 201,
          "firstname": "John",
          "lastname": "Doe"
        },
        "score": 85,
        "status": "COMPLETED",
        "startedAt": "2025-10-30T10:00:00.000Z",
        "endedAt": "2025-10-30T11:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalPages": 2,
      "totalResults": 12
    }
  }
}
```

**Notes:**

- Teachers can only see results for tests in courses they are assigned to.
- Admins can see results for all tests.

---

## 2. Get Single Session Result (Admin only)

Retrieve details for a specific test session result.

**Endpoint:** `GET /api/results/test/:sessionId`

**Access:** ADMIN

**URL Parameters:**

| Parameter   | Type     | Description       |
| :---------- | :------- | :---------------- |
| `sessionId` | `Number` | ID of the session |

**Response Example:**

```json
{
  "success": true,
  "message": "Result retrieved successfully",
  "data": {
    "id": 1,
    "test": {
      "id": 101,
      "title": "Midterm Exam"
    },
    "student": {
      "id": 201,
      "firstname": "John",
      "lastname": "Doe"
    },
    "score": 85,
    "status": "COMPLETED",
    "startedAt": "2025-10-30T10:00:00.000Z",
    "endedAt": "2025-10-30T11:00:00.000Z"
  }
}
```

---

# 📘 GET /results — Admin & Teacher Results API Documentation

Retrieve filtered, searchable, paginated student test results.

---

## Authorization

| Role        | Access                                                                   |
| :---------- | :----------------------------------------------------------------------- |
| **ADMIN**   | Full access                                                              |
| **TEACHER** | Restricted to only results for tests belonging to their assigned courses |

**Authentication:** Bearer Token

**Header example:**

`Authorization: Bearer <token>`

## Query Parameters

### Filtering

| Parameter   | Type           | Description                               |
| :---------- | :------------- | :---------------------------------------- |
| `testId`    | `number`       | Filter by specific test ID                |
| `courseId`  | `number`       | Filter by course                          |
| `classId`   | `number`       | Filter by class                           |
| `studentId` | `number`       | Filter a single student                   |
| `testType`  | `string`       | Filter by test type: `Exam`, `Test`,      |
| `startDate` | `string (ISO)` | Start of date range                       |
| `endDate`   | `string (ISO)` | End of date range (must be ≥ `startDate`) |
| `search`    | `string`       | Search student firstname or lastname      |

### 📄 Pagination

| Parameter | Type     | Default |
| :-------- | :------- | :------ |
| `page`    | `number` | `1`     |
| `limit`   | `number` | `10`    |

### 📊 Sorting

| Parameter | Type     | Allowed                              | Default |
| :-------- | :------- | :----------------------------------- | :------ |
| `sort`    | `string` | `score`, `date`, `student`, `course` | `date`  |
| `order`   | `string` | `asc`, `desc`                        | `desc`  |

---

## Sample Request

`GET /results?classId=3&courseId=2&testType=Exam&search=john&sort=score&order=desc&page=1&limit=10`

---

## Sample Successful Response

```json
{
  "success": true,
  "message": "Results retrieved successfully",
  "data": {
    "sessions": [
      {
        "id": 1021,
        "score": 85,
        "total": 100,
        "percentage": 85,
        "endedAt": "2025-10-25T10:20:00.000Z",
        "testId": 8,
        "studentId": 55,
        "test": {
          "id": 8,
          "type": "Exam",
          "courseId": 2,
          "course": {
            "id": 2,
            "title": "Physics"
          }
        },
        "student": {
          "id": 55,
          "firstname": "John",
          "lastname": "Doe",
          "class": {
            "id": 3,
            "name": "SS2A"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "pages": 5
    }
  }
}
```

# Download Results API Documentation

## `GET /api/results/download`

This endpoint allows users to download student test results in PDF or Excel format, applying the same filters used for the main results table.

---

## Query Parameters

The download endpoint supports all filtering, sorting, and pagination parameters available on the main results API (`GET /results`).

| Parameter   | Type     | Description                                                                     |
| :---------- | :------- | :------------------------------------------------------------------------------ |
| `format`    | `string` | **File type to download.** Allowed values: `pdf` or `excel`. **Default: `pdf`** |
| `courseId`  | `number` | Filter by specific course ID.                                                   |
| `studentId` | `number` | Filter by specific student ID.                                                  |
| `testType`  | `string` | Filter by test type (e.g., `Exam`, `Test`, `Quiz`, `Assignment`).               |
| `startDate` | `date`   | Filter tests starting from this date (ISO format).                              |
| `endDate`   | `date`   | Filter tests ending before this date (ISO format).                              |
| `page`      | `number` | Pagination page number.                                                         |
| `limit`     | `number` | Number of results per page.                                                     |
| `sort`      | `string` | Sort field: `date`, `score`, `student`, `course`.                               |
| `order`     | `string` | Sort order: `asc` or `desc`.                                                    |
| `search`    | `string` | Search by student first or last name.                                           |

---

## Headers

Authentication is required using a Bearer Token.

| Header          | Example          |
| :-------------- | :--------------- |
| `Authorization` | `Bearer <token>` |

---

## Response

The response is a downloadable file stream, typically handled by the browser.

| Format    | Content Type                                                        | Description                                                                   |
| :-------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------------- |
| **PDF**   | `application/pdf`                                                   | Returns a downloadable PDF file containing the results table.                 |
| **Excel** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Returns a downloadable Excel workbook (`.xlsx`) containing the results table. |

### Downloaded Table Columns

The generated file includes the following data columns:

| Column         | Description                                                       |
| :------------- | :---------------------------------------------------------------- |
| **Student**    | Student full name.                                                |
| **Class**      | Class name the student belongs to.                                |
| **Course**     | Course title for the test.                                        |
| **Test**       | Test title.                                                       |
| **Score**      | Test score (e.g., `85/100`) or "Unreleased" if scores are hidden. |
| **Status**     | Test status (`PASSED`, `FAILED`, `IN_PROGRESS`) or "Unreleased".  |
| **Started At** | Test start timestamp.                                             |
| **Ended At**   | Test end timestamp.                                               |

---

## ⚡ Usage Examples

### Download PDF

---

## 4. Get Student Course Results (Student)

Retrieve aggregated and detailed results for a student across their courses with pagination and sorting support.

**Endpoint:** `GET /api/results/student/courses`

**Access:** STUDENT

**Query Parameters (optional):**

| Parameter   | Type     | Default | Description                                           |
| :---------- | :------- | :------ | :---------------------------------------------------- |
| `courseId`  | `Number` |         | Filter by specific course ID                          |
| `startDate` | `Date`   |         | ISO date string – start of range                      |
| `endDate`   | `Date`   |         | ISO date string – end of range                        |
| `testType`  | `String` | `ALL`   | Filter by test type: `TEST`, `EXAM`, `ALL`            |
| `page`      | `Number` | `1`     | Page number for pagination                            |
| `limit`     | `Number` | `10`    | Number of results per page (max 100)                  |
| `sort`      | `String` | `date`  | Field to sort by: `score`, `date`, `course`, `course` |
| `order`     | `String` | `desc`  | Sort order: `asc` or `desc`                           |

**Response Example:**

```json
{
  "success": true,
  "message": "Course results retrieved successfully",
  "data": {
    "student": {
      "id": 201,
      "name": "John Doe",
      "class": {
        "id": 10,
        "className": "Grade 10A"
      }
    },
    "courses": [
      {
        "course": {
          "id": 101,
          "title": "Mathematics 101",
          "description": "Basic Math concepts"
        },
        "stats": {
          "totalTests": 2,
          "completedTests": 2,
          "averageScore": 88
        },
        "tests": [
          {
            "id": 1,
            "title": "Midterm Exam",
            "type": "EXAM",
            "session": {
              "id": 5,
              "score": 85,
              "status": "COMPLETED",
              "startedAt": "2025-10-30T10:00:00.000Z",
              "endedAt": "2025-10-30T11:00:00.000Z"
            }
          }
        ]
      }
    ],
    "overallStats": {
      "totalCourses": 1,
      "totalTests": 2,
      "testsCompleted": 2,
      "averageScore": 88
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}
```

**Notes:**

- Results are sorted by latest date first (most recent tests appear at the top) by default
- The response includes pagination metadata for managing large result sets
- Students can only see results for tests in courses they are enrolled in
- Test scores and status may be hidden (show as "unreleased") depending on test settings

## Create Notification

**Endpoint:** `POST /api/notification`
**Access:** Admin only

**Request Body (JSON or Form-Data):**

```json
{
  "title": "Exam Reminder",
  "message": "Your Math exam is tomorrow at 9 AM.",
  "type": "CLASS",
  "classId": 3
}
```

**Notes:**

- If type is `CLASS`, `classId` is required.
- If type is `COURSE`, `courseId` is required.
- For `GENERAL`, `STUDENT`, `TEACHER` types, neither `classId` nor `courseId` is required.

**Response (Success):**

```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "id": 1,
    "title": "Exam Reminder",
    "message": "Your Math exam is tomorrow at 9 AM.",
    "type": "CLASS",
    "classId": 3,
    "courseId": null,
    "createdById": 1,
    "createdAt": "2025-11-19T10:00:00.000Z"
  }
}
```

**Error Response Example:**

```json
{
  "success": false,
  "message": "Validation error",
  "details": "\"classId\" is required when type is CLASS",
  "status": 400
}
```

---

## Update Notification

**Endpoint:** `PATCH /api/notification/:notificationId`
**Access:** Admin only

**Request Body (JSON):**

```json
{
  "title": "Updated Exam Reminder",
  "message": "Your Math exam is tomorrow at 10 AM."
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Notification updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Exam Reminder",
    "message": "Your Math exam is tomorrow at 10 AM.",
    "type": "CLASS",
    "classId": 3,
    "courseId": null,
    "createdById": 1,
    "createdAt": "2025-11-19T10:00:00.000Z"
  }
}
```

---

## Delete Notification

**Endpoint:** `DELETE /api/notification/:notificationId`
**Access:** Admin only

**Response (Success):**

```json
{
  "success": true,
  "message": "Notification deleted successfully",
  "data": null
}
```

---

## Get Notifications for Logged-in User

**Endpoint:** `GET /api/notification`
**Access:** Any authenticated user

**Query Parameters:**

- `page` (integer, optional) - Page number for pagination. Default: `1`
- `limit` (integer, optional) - Number of records per page. Default: `10`
- `sort` (string, optional) - Field to sort by. Default: `createdAt`
- `order` (string, optional) - Sort order: `asc` or `desc`. Default: `desc`

**Response Example (Admin sees all):**

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": [
    {
      "id": 1,
      "title": "Exam Reminder",
      "message": "Your Math exam is tomorrow at 10 AM.",
      "type": "GENERAL",
      "classId": null,
      "courseId": null,
      "createdById": 1,
      "createdAt": "2025-11-19T10:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Staff Meeting",
      "message": "Teacher meeting at 2 PM.",
      "type": "TEACHER",
      "classId": null,
      "courseId": null,
      "createdById": 1,
      "createdAt": "2025-11-19T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

**Response Example (Student sees relevant notifications only):**

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": [
    {
      "id": 1,
      "title": "Exam Reminder",
      "message": "Your Math exam is tomorrow at 10 AM.",
      "type": "GENERAL",
      "classId": null,
      "courseId": null,
      "createdById": 1,
      "createdAt": "2025-11-19T10:00:00.000Z"
    },
    {
      "id": 3,
      "title": "Class Activity",
      "message": "Your class 3 has a new activity.",
      "type": "CLASS",
      "classId": 3,
      "courseId": null,
      "createdById": 1,
      "createdAt": "2025-11-19T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 20,
    "pages": 2
  }
}
```

# System Settings API Documentation

This API allows administrators to retrieve and update system settings for the CBT platform. It supports file uploads (logo, favicon, loginBanner) and saves them to Cloudinary or local storage.

---

## Base URL

`/api/system-settings`

---

# 🔹 GET — Fetch System Settings

**Endpoint:**
`GET /api/system-settings`

### Success Response

```json
{
  "success": true,
  "message": "system settings fetched successfully",
  "data": {
    "appName": "CBT Portal",
    "institutionName": "Florintech Computer College",
    "shortName": "FCC",
    "primaryColor": "#0000ff",
    "supportEmail": "support@florintech.com",
    "systemStatus": "ACTIVE",
    "logoUrl": "https://res.cloudinary.com/.../cbt/logo.png",
    "faviconUrl": "https://res.cloudinary.com/.../cbt/favicon.png",
    "loginBannerUrl": "https://res.cloudinary.com/.../cbt/loginBanner.png"
  }
}
```

---

# 🔹 PATCH — Update System Settings

**Endpoint:**
`PATCH /api/system-settings`

**Auth:** Required (Admin role only)

### Request Body (multipart/form-data)

**Text Fields:**

```json
{
  "appName": "New App Name",
  "institutionName": "New Institution",
  "shortName": "NI",
  "primaryColor": "#ff0000",
  "supportEmail": "newemail@example.com",
  "systemStatus": "ACTIVE"
}
```

**File Fields:**

- `logo` (optional) - Image file for logo
- `favicon` (optional) - Image file for favicon
- `loginBanner` (optional) - Image file for login banner

### Image Operations

**1. Update with new image:**
Upload the image file with field name `logo`, `favicon`, or `loginBanner`

**2. Clear an image (set to null):**
Send in JSON body:

```json
{
  "logo": null,
  "favicon": null,
  "loginBanner": null
}
```

**3. Keep existing image:**
Don't include the field in the request

### Example Requests

**Update app name and upload new logo:**

```
POST /api/system-settings
Content-Type: multipart/form-data

appName=New App Name
logo=[image file]
```

**Clear logo (set to null):**

```
PATCH /api/system-settings
Content-Type: application/json

{
  "logo": null
}
```

**Update institution name without touching images:**

```
PATCH /api/system-settings
Content-Type: application/json

{
  "institutionName": "New Institution Name"
}
```

### Success Response

```json
{
  "success": true,
  "message": "System settings updated successfully",
  "data": {
    "id": 1,
    "appName": "New App Name",
    "institutionName": "New Institution",
    "shortName": "NI",
    "primaryColor": "#ff0000",
    "supportEmail": "newemail@example.com",
    "systemStatus": "ACTIVE",
    "logoUrl": "https://res.cloudinary.com/.../cbt/logo.png",
    "faviconUrl": null,
    "loginBannerUrl": "https://res.cloudinary.com/.../cbt/loginBanner.png",
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-12-05T15:30:00Z"
  }
}
```

### Validation Rules

- `appName` - string, min 2, max 200 characters
- `institutionName` - string, min 2, max 200 characters
- `shortName` - string, max 50 characters
- `primaryColor` - string (hex color code)
- `supportEmail` - valid email format
- `systemStatus` - "ACTIVE" or "MAINTENANCE"
- `logo`, `favicon`, `loginBanner` - Image file (MIME type starting with `image/`) or `null`

### Error Responses

**Invalid image file:**

```json
{
  "success": false,
  "message": "Validation Error",
  "error": {
    "details": ["logo must be an image file or null"]
  }
}
```

**Unauthorized:**

```json
{
  "success": false,
  "message": "You are not authorized to perform this action"
}
```

### Error Handling

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
