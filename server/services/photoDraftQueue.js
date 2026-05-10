const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const queueRoot = path.join(__dirname, "../../data/photo-drafts");
const uploadDir = path.join(queueRoot, "uploads");
const jobDir = path.join(queueRoot, "jobs");

function ensureQueueDirs() {
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(jobDir, { recursive: true });
}

function createJobId() {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}`;
}

function jobPathForId(id) {
  return path.join(jobDir, `${id}.json`);
}

function readJob(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJob(job) {
  ensureQueueDirs();
  fs.writeFileSync(jobPathForId(job.id), `${JSON.stringify(job, null, 2)}\n`);
  return job;
}

function cleanText(value) {
  return String(value || "").trim();
}

function createQueuedDraftJob(file, clarification = {}, mediaType = "image") {
  ensureQueueDirs();
  const id = createJobId();
  const extension = path.extname(file.originalname || "").toLowerCase() || (mediaType === "video" ? ".mov" : ".jpg");
  const mediaPath = path.join(uploadDir, `${id}${extension}`);

  fs.renameSync(file.path, mediaPath);

  const job = {
    id,
    status: "pending",
    mediaType,
    uploadedAt: new Date().toISOString(),
    originalName: file.originalname || (mediaType === "video" ? "workout-video" : "workout-photo"),
    mimeType: file.mimetype,
    imagePath: mediaType === "image" ? mediaPath : null,
    videoPath: mediaType === "video" ? mediaPath : null,
    clarification: {
      quickNote: cleanText(clarification.quickNote),
      exercise: cleanText(clarification.exercise),
      weight: cleanText(clarification.weight),
      reps: cleanText(clarification.reps),
      setNumber: cleanText(clarification.setNumber),
      bodyWeight: cleanText(clarification.bodyWeight)
    },
    draft: null,
    error: null,
    processedAt: null
  };

  return writeJob(job);
}

function safeDeleteMedia(mediaPath) {
  if (!mediaPath) {
    return;
  }

  const resolvedMediaPath = path.resolve(mediaPath);
  const resolvedUploadDir = path.resolve(uploadDir);

  if (!resolvedMediaPath.startsWith(`${resolvedUploadDir}${path.sep}`)) {
    throw new Error("Refusing to delete media outside the upload queue.");
  }

  if (fs.existsSync(resolvedMediaPath)) {
    fs.unlinkSync(resolvedMediaPath);
  }
}

function deleteDraftJob(id) {
  ensureQueueDirs();

  if (!/^[\w:-]+$/.test(String(id || ""))) {
    throw new Error("Invalid draft id.");
  }

  const filePath = jobPathForId(id);
  const resolvedJobPath = path.resolve(filePath);
  const resolvedJobDir = path.resolve(jobDir);

  if (!resolvedJobPath.startsWith(`${resolvedJobDir}${path.sep}`)) {
    throw new Error("Refusing to delete job outside the queue.");
  }

  if (!fs.existsSync(resolvedJobPath)) {
    return false;
  }

  const job = readJob(resolvedJobPath);
  safeDeleteMedia(job.imagePath);
  safeDeleteMedia(job.videoPath);
  fs.unlinkSync(resolvedJobPath);
  return true;
}

function listDraftJobs() {
  ensureQueueDirs();
  return fs
    .readdirSync(jobDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => readJob(path.join(jobDir, fileName)))
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    uploadedAt: job.uploadedAt,
    mediaType: job.mediaType || (job.videoPath ? "video" : "image"),
    originalName: job.originalName,
    source: job.source || null,
    sourceAlbum: job.sourceAlbum || null,
    clarification: job.clarification || null,
    draft: job.draft,
    error: job.error,
    processedAt: job.processedAt
  };
}

module.exports = {
  ensureQueueDirs,
  createQueuedDraftJob,
  listDraftJobs,
  publicJob,
  deleteDraftJob,
  queueRoot,
  uploadDir,
  jobDir
};
