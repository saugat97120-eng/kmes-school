import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn(
      "MONGODB_URI is not set. API will run, but database routes will fail and /api/health will report the database as unavailable until it's configured."
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    // Predictable startup failure: we do NOT silently retry here (that would
    // mask configuration errors with an indefinite reconnect loop). The process
    // exits so deployment platforms can restart with correct configuration, and
    // /api/health would otherwise only ever report ready once connected.
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

// Graceful shutdown: close the MongoDB connection cleanly so in-flight work is
// settled and the driver does not leak handles. Safe to call more than once.
let shuttingDown = false;
export function registerGracefulShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    } catch (err) {
      console.error("Error closing MongoDB connection:", err.message);
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
