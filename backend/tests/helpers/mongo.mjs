// Test database provider: MongoMemoryServer by default, or any MongoDB-compatible
// server when TEST_MONGODB_URI is set (each call gets its own database name).
export async function createMongo() {
  if (process.env.TEST_MONGODB_URI) {
    const base = process.env.TEST_MONGODB_URI.replace(/\/[^/?]*(\?.*)?$/, "");
    const query = (process.env.TEST_MONGODB_URI.match(/\?.*$/) || [""])[0];
    const uri = `${base}/kmes_t_${Date.now()}_${Math.floor(Math.random() * 1e6)}${query}`;
    return { getUri: () => uri, stop: async () => {} };
  }
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  return MongoMemoryServer.create();
}
