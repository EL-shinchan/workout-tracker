const express = require("express");
const multer = require("multer");
const {
  createQueuedDraftJob,
  ensureQueueDirs,
  listDraftJobs,
  publicJob,
  deleteDraftJob,
  uploadDir
} = require("../services/photoDraftQueue");

const router = express.Router();

ensureQueueDirs();

function buildUpload({ expectedType, sizeMb }) {
  return multer({
    dest: uploadDir,
    limits: {
      fileSize: sizeMb * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype || !file.mimetype.startsWith(`${expectedType}/`)) {
        const label = expectedType === "video" ? "video file" : "image file";
        return callback(new Error(`Upload a ${label}.`));
      }

      return callback(null, true);
    }
  });
}

const imageUpload = buildUpload({ expectedType: "image", sizeMb: 5 });
const videoUpload = buildUpload({ expectedType: "video", sizeMb: 200 });

function clarificationFromBody(body) {
  return {
    quickNote: body.quickNote,
    exercise: body.exercise,
    weight: body.weight,
    reps: body.reps,
    setNumber: body.setNumber,
    bodyWeight: body.bodyWeight
  };
}

function multerErrorMessage(error, mediaType) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return mediaType === "video"
      ? "Video is too large. Keep it under 200MB."
      : "Image is too large. Keep it under 5MB.";
  }

  return error.message || `Could not read ${mediaType} upload.`;
}

router.get("/", (req, res) => {
  const status = String(req.query.status || "").trim();
  const jobs = listDraftJobs()
    .filter((job) => !status || job.status === status)
    .map(publicJob);

  res.json({ jobs });
});

router.delete("/:id", (req, res) => {
  try {
    const deleted = deleteDraftJob(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Draft not found." });
    }

    return res.json({ message: "Draft deleted." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not delete draft." });
  }
});

router.post("/workout", (req, res) => {
  imageUpload.single("photo")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: multerErrorMessage(error, "image") });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Choose a workout photo first." });
    }

    try {
      const job = createQueuedDraftJob(req.file, clarificationFromBody(req.body), "image");
      return res.status(202).json({
        job: publicJob(job),
        message: "Photo queued. Shinoske will process it at the configured time."
      });
    } catch (queueError) {
      return res.status(500).json({ message: queueError.message || "Could not queue workout photo." });
    }
  });
});

router.post("/video", (req, res) => {
  videoUpload.single("video")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: multerErrorMessage(error, "video") });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Choose an exercise video first." });
    }

    try {
      const job = createQueuedDraftJob(req.file, clarificationFromBody(req.body), "video");
      return res.status(202).json({
        job: publicJob(job),
        message: "Video queued. Shinoske will process it at the configured time."
      });
    } catch (queueError) {
      return res.status(500).json({ message: queueError.message || "Could not queue workout video." });
    }
  });
});

module.exports = router;
