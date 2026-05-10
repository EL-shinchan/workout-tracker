const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../db/database");
const { ensureUserSchema, setActiveUserId } = require("./userStore");

const SESSION_COOKIE = "iron_log_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const authDir = process.env.IRON_LOG_AUTH_DIR || "/Users/psyphix/.openclaw/workspace/local-progress/workout-tracker/auth";
const usersPath = path.join(authDir, "users.json");
const sessionsPath = path.join(authDir, "sessions.json");

function ensureAuthDir() {
  fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
}

function readJson(filePath, fallback) {
  ensureAuthDir();
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, fallback);
    return structuredClone(fallback);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  ensureAuthDir();
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
}

function readAuthUsers() {
  return readJson(usersPath, { users: [] });
}

function writeAuthUsers(data) {
  writeJson(usersPath, data);
}

function readSessions() {
  return readJson(sessionsPath, { sessions: [] });
}

function writeSessions(data) {
  writeJson(sessionsPath, data);
}

function ensureAuthSchema() {
  ensureUserSchema();
  ensureAuthDir();
  readAuthUsers();
  readSessions();
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

function publicUser(user) {
  return user ? { id: user.id, name: user.name } : null;
}

function findAuthUserByName(name) {
  const cleanName = String(name || "").trim();
  return readAuthUsers().users.find((user) => user.name.toLowerCase() === cleanName.toLowerCase()) || null;
}

function ensureDbUser(name) {
  ensureUserSchema();
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new Error("Username is required.");
  }

  const existing = db.prepare(`SELECT id, name FROM users WHERE name = ? COLLATE NOCASE`).get(cleanName);
  if (existing) {
    return existing;
  }

  const result = db.prepare(`INSERT INTO users (name) VALUES (?)`).run(cleanName);
  return { id: Number(result.lastInsertRowid), name: cleanName };
}

function createAccount(name, password) {
  ensureAuthSchema();
  const cleanName = String(name || "").trim();
  const cleanPassword = String(password || "");

  if (!/^[A-Za-z0-9 _.-]{2,32}$/.test(cleanName)) {
    throw new Error("Username must be 2-32 letters/numbers/spaces/dots/dashes.");
  }

  if (cleanPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (findAuthUserByName(cleanName)) {
    throw new Error("That username already exists.");
  }

  const dbUser = ensureDbUser(cleanName);
  const hashed = hashPassword(cleanPassword);
  const data = readAuthUsers();
  data.users.push({
    id: dbUser.id,
    name: dbUser.name,
    passwordHash: hashed.hash,
    passwordSalt: hashed.salt,
    createdAt: new Date().toISOString()
  });
  writeAuthUsers(data);
  return publicUser(dbUser);
}

function setUserPassword(name, password) {
  ensureAuthSchema();
  const dbUser = ensureDbUser(name);
  const hashed = hashPassword(password);
  const data = readAuthUsers();
  const existing = data.users.find((user) => Number(user.id) === Number(dbUser.id) || user.name.toLowerCase() === dbUser.name.toLowerCase());

  if (existing) {
    existing.id = dbUser.id;
    existing.name = dbUser.name;
    existing.passwordHash = hashed.hash;
    existing.passwordSalt = hashed.salt;
    existing.updatedAt = new Date().toISOString();
  } else {
    data.users.push({
      id: dbUser.id,
      name: dbUser.name,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      createdAt: new Date().toISOString()
    });
  }

  writeAuthUsers(data);
  return dbUser;
}

function verifyUserPassword(name, password) {
  ensureAuthSchema();
  const authUser = findAuthUserByName(name);
  if (!authUser || !authUser.passwordHash || !authUser.passwordSalt) {
    return null;
  }

  const hashed = hashPassword(password, authUser.passwordSalt);
  if (!timingSafeEqual(hashed.hash, authUser.passwordHash)) {
    return null;
  }

  const dbUser = ensureDbUser(authUser.name);
  if (Number(authUser.id) !== Number(dbUser.id)) {
    authUser.id = dbUser.id;
    writeAuthUsers(readAuthUsers());
  }

  return dbUser;
}

function createSession(userId) {
  ensureAuthSchema();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();
  const data = readSessions();
  data.sessions = data.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
  data.sessions.push({ tokenHash: tokenHash(token), userId: Number(userId), createdAt: new Date().toISOString(), expiresAt });
  writeSessions(data);
  setActiveUserId(userId);
  return { token, expiresAt };
}

function getSession(token) {
  ensureAuthSchema();
  if (!token) {
    return null;
  }

  const data = readSessions();
  const hashedToken = tokenHash(token);
  const session = data.sessions.find((entry) => entry.tokenHash === hashedToken);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    data.sessions = data.sessions.filter((entry) => entry.tokenHash !== hashedToken);
    writeSessions(data);
    return null;
  }

  const user = db.prepare(`SELECT id, name FROM users WHERE id = ?`).get(Number(session.userId));
  if (!user) {
    return null;
  }

  return { user: publicUser(user), expiresAt: session.expiresAt };
}

function deleteSession(token) {
  ensureAuthSchema();
  if (!token) {
    return;
  }

  const data = readSessions();
  data.sessions = data.sessions.filter((entry) => entry.tokenHash !== tokenHash(token));
  writeSessions(data);
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
  authDir,
  usersPath,
  sessionsPath,
  ensureAuthSchema,
  createAccount,
  setUserPassword,
  verifyUserPassword,
  createSession,
  getRequestSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth
};
