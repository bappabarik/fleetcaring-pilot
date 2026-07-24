import * as SQLite from "expo-sqlite";

let dbInstance: SQLite.SQLiteDatabase | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS action_queue (
  id TEXT PRIMARY KEY NOT NULL,
  actionType TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  errorMessage TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photo_queue (
  id TEXT PRIMARY KEY NOT NULL,
  localUri TEXT NOT NULL,
  contentType TEXT NOT NULL,
  purpose TEXT NOT NULL,
  remoteKey TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  errorMessage TEXT,
  createdAt TEXT NOT NULL
);
`;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  const db = await SQLite.openDatabaseAsync("fleetcaring-pilot.db");
  await db.execAsync(SCHEMA);
  dbInstance = db;
  return db;
}