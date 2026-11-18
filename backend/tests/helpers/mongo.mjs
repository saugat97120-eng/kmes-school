import fs from "node:fs";
import net from "node:net";

// Test database provider: MongoMemoryServer by default, or any MongoDB-compatible
// server when TEST_MONGODB_URI is set (each call gets its own database name).

function checkTcpPort(host, port, timeout = 300) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function makeUniqueUri(baseUri) {
  const base = baseUri.replace(/\/[^/?]*(\?.*)?$/, "");
  const query = (baseUri.match(/\?.*$/) || [""])[0];
  return `${base}/kmes_t_${Date.now()}_${Math.floor(Math.random() * 1e6)}${query}`;
}

export async function createMongo() {
  if (process.env.TEST_MONGODB_URI) {
    const uri = makeUniqueUri(process.env.TEST_MONGODB_URI);
    return { getUri: () => uri, stop: async () => {} };
  }

  // Check if system mongod binary exists to avoid network download in offline/sandboxed environments
  const possiblePaths = [
    process.env.MONGOMS_SYSTEM_BINARY,
    "/usr/bin/mongod",
    "/usr/local/bin/mongod",
    "/opt/homebrew/bin/mongod",
  ].filter(Boolean);

  for (const binPath of possiblePaths) {
    if (fs.existsSync(binPath)) {
      process.env.MONGOMS_SYSTEM_BINARY = binPath;
      break;
    }
  }

  if (process.env.MONGOMS_PREFER_GLOBAL_PATH === undefined) {
    process.env.MONGOMS_PREFER_GLOBAL_PATH = "true";
  }

  try {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    return await MongoMemoryServer.create();
  } catch (err) {
    // If MongoMemoryServer failed to download because network is unavailable in CI/sandbox,
    // fallback to running local MongoDB instance if available on 127.0.0.1:27017
    if (await checkTcpPort("127.0.0.1", 27017)) {
      const uri = makeUniqueUri("mongodb://127.0.0.1:27017/kmes_test");
      return { getUri: () => uri, stop: async () => {} };
    }
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes("cluster0")) {
      const uri = makeUniqueUri(process.env.MONGODB_URI);
      return { getUri: () => uri, stop: async () => {} };
    }
    throw err;
  }
}
