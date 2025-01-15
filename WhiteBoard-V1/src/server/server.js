/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store session data and drawing states
const sessions = new Map();

io.on("connection", (socket) => {
  console.log("A user connected");

  // Join a session/room
  socket.on("joinSession", ({ sessionId }) => {
    socket.join(sessionId);
    console.log(`User joined session: ${sessionId}`);

    // Initialize session data if it doesn't exist
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        actions: [],
        undoStack: [],
        redoStack: [],
      });
    }

    // Send the full canvas state to the new user
    const session = sessions.get(sessionId);
    socket.emit("loadCanvas", session.actions);
  });

  // Handle drawing event (scoped to session)
  socket.on("draw", ({ sessionId, xPercent, yPercent, color, size, type }) => {
    console.log(`Draw in session ${sessionId} by ${socket.id}`);
    const action = { xPercent, yPercent, color, size, type };
    
    // Store the action in the session
    const session = sessions.get(sessionId);
    if (session) {
      session.actions.push(action); // Save action
      session.undoStack.push(action); // Save to undo stack
    }

    // Broadcast the drawing action to other users in the session
    socket.to(sessionId).emit("draw", action);
  });

  // Handle begin path event (scoped to session)
  socket.on("beginPath", ({ sessionId }) => {
    socket.to(sessionId).emit("beginPath");
  });

  // Handle clear event (scoped to session)
  socket.on("clear", ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.actions = []; // Clear actions
      session.undoStack = []; // Clear undo stack
      session.redoStack = []; // Clear redo stack
    }
    socket.to(sessionId).emit("clear");
  });

  // Handle undo event (scoped to session)
  socket.on("undo", ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session && session.undoStack.length > 0) {
      const action = session.undoStack.pop(); // Pop the last action
      session.redoStack.push(action); // Push to redo stack
      socket.to(sessionId).emit("updateDrawingState", { undoStack: session.undoStack });
    }
  });

  // Handle redo event (scoped to session)
  socket.on("redo", ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session && session.redoStack.length > 0) {
      const action = session.redoStack.pop(); // Pop the last redo action
      session.undoStack.push(action); // Push to undo stack
      socket.to(sessionId).emit("updateDrawingState", { undoStack: session.undoStack });
    }
  });

  // Handle message sending in chat
  socket.on("sendMessage", ({ sessionId, message }) => {
    io.to(sessionId).emit("receiveMessage", { message });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("Backend server is listening on port 4000");
});
