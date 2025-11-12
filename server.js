import app from "./src/app.js";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";
import { setIo } from "./src/utils/socket.js";

// Load env file dynamically based on NODE_ENV
if (process.env.NODE_ENV !== "production") {
  const envFile = `.env.${process.env.NODE_ENV || "development"}`;
  dotenv.config({ path: envFile });
}

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// =========================
// CORS Origins
// =========================
const allowedOrigins = [
  "http://localhost:3000",
  "http://cbt.local:3000",
  "http://0.0.0.0",
  "http://192.168.1.117",
  "http://127.0.0.1:3000",
  "http://192.168.1.120",
  "http://192.168.1.120:3000",
  "https://escrow-rouge.vercel.app",
];

const isProduction = process.env.NODE_ENV === "production";

// =========================
// Socket.IO Initialization
// =========================
const io = new IOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // ✅ Allow everything when not in production
      if (!isProduction) {
        return callback(null, true);
      }

      // ✅ In production, apply whitelist rules
      if (
        !origin || // allow curl, mobile apps
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible globally
setIo(io);

// =========================
// Socket.IO Events
// =========================
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_session", (sessionId) => {
    try {
      socket.join(`session_${sessionId}`);
    } catch (e) {}
  });

  socket.on("leave_session", (sessionId) => {
    try {
      socket.leave(`session_${sessionId}`);
    } catch (e) {}
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
