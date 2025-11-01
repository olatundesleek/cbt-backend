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

// Initialize Socket.IO and expose via util
const io = new IOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

setIo(io);

io.on("connection", (socket) => {
  // clients can join session rooms
  socket.on("join_session", (sessionId) => {
    try {
      socket.join(`session_${sessionId}`);
    } catch (e) {
      // ignore
    }
  });

  socket.on("leave_session", (sessionId) => {
    try {
      socket.leave(`session_${sessionId}`);
    } catch (e) {}
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
