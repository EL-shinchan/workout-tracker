const db = require("../db/database");
const { readConfig, writeConfig } = require("./configStore");

function ensureUserSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const columns = db.prepare(`PRAGMA table_info(workout_sessions)`).all();
  const hasUserId = columns.some((column) => column.name === "user_id");

  if (!hasUserId) {
    db.exec(`ALTER TABLE workout_sessions ADD COLUMN user_id INTEGER`);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, workout_date DESC)`);
}

function listUsers() {
  ensureUserSchema();
  return db
    .prepare(
      `SELECT
         u.id,
         u.name,
         u.created_at AS createdAt,
         COUNT(ws.id) AS workoutCount
       FROM users u
       LEFT JOIN workout_sessions ws ON ws.user_id = u.id
       GROUP BY u.id
       ORDER BY u.id ASC`
    )
    .all();
}

function getActiveUserId() {
  ensureUserSchema();
  const config = readConfig();
  const users = listUsers();
  const configuredId = Number(config.activeUserId || 0);
  const exists = users.some((user) => Number(user.id) === configuredId);

  if (exists) {
    return configuredId;
  }

  if (users.length > 0) {
    setActiveUserId(users[0].id);
    return Number(users[0].id);
  }

  return null;
}

function getActiveUser() {
  const activeUserId = getActiveUserId();
  if (!activeUserId) {
    return null;
  }

  return db
    .prepare(`SELECT id, name, created_at AS createdAt FROM users WHERE id = ?`)
    .get(activeUserId);
}

function setActiveUserId(userId) {
  ensureUserSchema();
  const user = db.prepare(`SELECT id, name, created_at AS createdAt FROM users WHERE id = ?`).get(Number(userId));
  if (!user) {
    throw new Error("User not found.");
  }

  const config = readConfig();
  writeConfig({ ...config, activeUserId: Number(user.id) });
  return user;
}

module.exports = {
  ensureUserSchema,
  listUsers,
  getActiveUserId,
  getActiveUser,
  setActiveUserId
};
