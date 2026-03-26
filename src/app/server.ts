import { createServer, Server } from "node:http";
import app from "./app";
import { envVars } from "./config/env";
import { prisma } from "./lib/prisma";
import { seedAdmin } from "./utils/seed";
import { initializeSocket } from "./lib/socket";

let server: Server;

async function main() {
  try {
    await seedAdmin();
    await prisma.$connect();
    console.log("Database connected successfully.");

    server = createServer(app);

    // Initialize Socket.io
    const io = initializeSocket(server);
    console.log("Socket.io initialized");

    // Make io accessible if needed
    app.set("io", io);

    server.listen(envVars.PORT, () => {
      console.log(`Server is running on port ${envVars.PORT}`);
    });
  } catch (error) {
    console.error("Error during server startup:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// SIGTERM signal handler
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received. Shutting down server...");

  if (server) {
    server.close(() => {
      console.log("Server closed gracefully.");
      process.exit(1);
    });
  }

  process.exit(1);
});

// SIGINT signal handler

process.on("SIGINT", () => {
  console.log("SIGINT signal received. Shutting down server...");

  if (server) {
    server.close(() => {
      console.log("Server closed gracefully.");
      process.exit(1);
    });
  }

  process.exit(1);
});

//uncaught exception handler
process.on("uncaughtException", (error) => {
  console.log("Uncaught Exception Detected... Shutting down server", error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.log("Unhandled Rejection Detected... Shutting down server", error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }

  process.exit(1);
});

//unhandled rejection handler

main();
