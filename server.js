import app from "./src/app.js";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";
import { setIo } from "./src/utils/socket.js";

if (process.env.NODE_ENV !== "production") {
  const envFile = `.env.${process.env.NODE_ENV || "development"}`;
  dotenv.config({ path: envFile });
}

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Allowed origins for Socket.IO and Express CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.120",
  "http://192.168.1.120:3000",
  "https://escrow-rouge.vercel.app",
];

// =========================
// Socket.IO Initialization
// =========================
const io = new IOServer(server, {
  cors: {
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);

      // allow listed origins or *.vercel.app
      if (
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

// Make io accessible in your app
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
