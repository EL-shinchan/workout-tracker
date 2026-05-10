const express = require("express");
const path = require("path");
require("./db/database");

const exercisesRouter = require("./routes/exercises");
const workoutsRouter = require("./routes/workouts");
const progressRouter = require("./routes/progress");
const prsRouter = require("./routes/prs");
const photoDraftsRouter = require("./routes/photoDrafts");
const configRouter = require("./routes/config");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const { ensureAuthSchema, getRequestSession, requireAuth } = require("./services/authStore");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "../public");
const publicPages = new Set(["/login.html"]);
const publicAssets = [/^\/styles\//, /^\/scripts\//, /^\/icons\//, /^\/manifest\.webmanifest$/, /^\/sw\.js$/];

ensureAuthSchema();

app.use(express.json());

app.use((req, res, next) => {
  if (req.path === "/") {
    return getRequestSession(req) ? next() : res.redirect("/login.html");
  }

  if (req.path.startsWith("/api/auth") || req.path === "/api/health") {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return requireAuth(req, res, next);
  }

  if (publicPages.has(req.path) || publicAssets.some((pattern) => pattern.test(req.path))) {
    return next();
  }

  if (req.path.endsWith(".html")) {
    return getRequestSession(req) ? next() : res.redirect(`/login.html?next=${encodeURIComponent(req.path.slice(1))}`);
  }

  return next();
});

app.use(express.static(publicDir));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/prs", prsRouter);
app.use("/api/photo-drafts", photoDraftsRouter);
app.use("/api/config", configRouter);
app.use("/api/users", usersRouter);

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Server error." });
});

app.listen(PORT, "0.0.0.0", () => {                                                                
   console.log(`Workout Tracker running at http://0.0.0.0:${PORT}`);                                  
   });
