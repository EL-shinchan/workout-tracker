const crypto = require("crypto");
const db = require("../db/database");
const { ensureUserSchema, setActiveUserId } = require("./userStore");

const SESSION_COOKIE = "iron_log_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function ensureAuthSchema() {
  ensureUserSchema();

  const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
  const hasPasswordHash = userColumns.some((column) => column.name === "password_hash");
  const hasPasswordSalt = userColumns.some((column) => column.name === "password_salt");

  if (!hasPasswordHash) {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  }

  if (!hasPasswordSalt) {
    db.exec(`ALTER TABLE users ADD COLUMN password_salt TEXT`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);
  `);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function setUserPassword(name, password) {
  ensureAuthSchema();
  const user = db.prepare(`SELECT id, name FROM users WHERE name = ? COLLATE NOCASE`).get(String(name || "").trim());
  if (!user) {
    throw new Error(`User not found: ${name}`);
  }

  const hashed = hashPassword(password);
  db.prepare(`UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?`).run(hashed.hash, hashed.salt, user.id);
  return user;
}

function verifyUserPassword(name, password) {
  ensureAuthSchema();
  const user = db
    .prepare(`SELECT id, name, password_hash AS passwordHash, password_salt AS passwordSalt FROM users WHERE name = ? COLLATE NOCASE`)
    .get(String(name || "").trim());

  if (!user || !user.passwordHash || !user.passwordSalt) {
    return null;
  }

  const hashed = hashPassword(password, user.passwordSalt);
  return timingSafeEqual(hashed.hash, user.passwordHash) ? user : null;
}

function createSession(userId) {
  ensureAuthSchema();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();
  db.prepare(`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`).run(tokenHash(token), userId, expiresAt);
  setActiveUserId(userId);
  return { token, expiresAt };
}

function getSession(token) {
  ensureAuthSchema();
  if (!token) {
    return null;
  }

  const session = db
    .prepare(
      `SELECT
         s.id,
         s.expires_at AS expiresAt,
         u.id AS userId,
         u.name
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash(token));

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.prepare(`DELETE FROM auth_sessions WHERE id = ?`).run(session.id);
    return null;
  }

  return {
    user: {
      id: session.userId,
      name: session.name
    },
    expiresAt: session.expiresAt
  };
}

function deleteSession(token) {
  ensureAuthSchema();
  if (token) {
    db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(tokenHash(token));
  }
}

function readCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function cookieOptions() {
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

function getRequestSession(req) {
  const cookies = readCookies(req);
  return getSession(cookies[SESSION_COOKIE]);
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions()}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function requireAuth(req, res, next) {
  const session = getRequestSession(req);
  if (!session) {
    return res.status(401).json({ message: "Login required." });
  }

  req.authUser = session.user;
  setActiveUserId(session.user.id);
  return next();
}

module.exports = {
  SESSION_COOKIE,
  ensureAuthSchema,
  setUserPassword,
  verifyUserPassword,
  createSession,
  getRequestSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth
};
