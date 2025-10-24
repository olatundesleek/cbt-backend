import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import testRoutes from "./routes/test.routes.js";
import sessionRoutes from "./routes/testSession.routes.js";
import classRoutes from "./routes/class.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import cookieParser from "cookie-parser";
const app = express();
app.use(cors());
app.use(express.json());

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/class", classRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

export default app;
