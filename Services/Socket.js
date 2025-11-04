const socketIO = require("socket.io");

let io;

function initSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Example hello/test events
    socket.emit("hello", "Welcome to the server!");
    socket.emit("test", { message: "You are connected!" });

    // 🔹 Join room by owner/customer IDs
    socket.on("join_owner_room", (ownerId) => {
      socket.join(`owner_${ownerId}`);
      console.log(`✅ Owner joined room: owner_${ownerId}`);
    });

    socket.on("join_customer_room", (customerId) => {
      socket.join(`customer_${customerId}`);
      console.log(`✅ Customer joined room: customer_${customerId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
}

function getSocketIO() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}

module.exports = { initSocket, getSocketIO };
