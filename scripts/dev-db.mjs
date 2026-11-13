// Local development MongoDB (no install needed).
// Runs a real mongod on 127.0.0.1:27017 and keeps data in ./.data/mongo.
// In production, set MONGODB_URI to your MongoDB Atlas connection string instead.
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), ".data", "mongo");
fs.mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
});

console.log(`[dev-db] MongoDB ready at ${server.getUri()} (data: ${dbPath})`);

const stop = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
