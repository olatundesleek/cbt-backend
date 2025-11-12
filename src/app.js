import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import testRoutes from "./routes/test.routes.js";
import questionRoutes from "./routes/question.routes.js";
import questionBankRoutes from "./routes/questionBank.routes.js";
import sessionRoutes from "./routes/testSession.routes.js";
import classRoutes from "./routes/class.routes.js";
import resultRoutes from "./routes/result.routes.js";
import studentRoutes from "./routes/student.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.1.120",
  "http://cbt.local:3000",
  "http://192.168.1.120:3000",
  "https://escrow-rouge.vercel.app",
];

const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: function (origin, callback) {
      // ✅ Allow all origins in dev/local
      if (!isProduction) {
        return callback(null, true);
      }

      // ✅ Restrict in production
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());
app.use(cookieParser());

// =========================
// Routes
// =========================
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/class", classRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/question-banks", questionBankRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/teachers", teacherRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

export default app;
