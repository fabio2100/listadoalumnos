import { MongoClient, type Db } from "mongodb";

const connectionString = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? "alumnos_db";

if (!connectionString) {
  throw new Error("Missing MONGODB_URI in environment variables.");
}

const mongoUri = connectionString;
let client: MongoClient | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!client) {
    client = new MongoClient(mongoUri);
  }

  await client.connect();
  const db = client.db(DB_NAME);

  return { client, db };
}
