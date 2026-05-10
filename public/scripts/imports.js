document.addEventListener("DOMContentLoaded", async function () {
  const readyCount = document.getElementById("readyCount");
  const pendingCount = document.getElementById("pendingCount");
  const failedCount = document.getElementById("failedCount");
  const lastImportActivity = document.getElementById("lastImportActivity");
  const automationState = document.getElementById("automationState");
  const importerTime = document.getElementById("importerTime");
  const processorTime = document.getElementById("processorTime");
  const importsStatus = document.getElementById("importsStatus");
  const readyJobs = document.getElementById("readyJobs");
  const pendingJobs = document.getElementById("pendingJobs");
  const failedJobs = document.getElementById("failedJobs");

  function timeMinusMinutes(time, minutesToSubtract) {
    const parts = String(time || "00:00").split(":").map(Number);
    const totalMinutes = (parts[0] * 60 + parts[1] - minutesToSubtract + 24 * 60) % (24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function summarizeDraft(job) {
    const draft = job.draft || {};
    const exercise = Array.isArray(draft.exercises) && draft.exercises.length > 0 ? draft.exercises[0] : null;
    const firstSet = exercise && Array.isArray(exercise.sets) && exercise.sets.length > 0 ? exercise.sets[0] : null;

    if (!exercise) {
      return "Processed draft ready for review.";
    }

    const setSummary = firstSet
      ? `${window.appUtils.formatNumber(firstSet.weight)}kg × ${window.appUtils.formatNumber(firstSet.reps)}`
      : `${exercise.sets ? exercise.sets.length : 0} set${exercise.sets && exercise.sets.length === 1 ? "" : "s"}`;

    return `${exercise.name || "Workout"} • ${setSummary}`;
  }

  function jobSource(job) {
    if (job.sourceAlbum) {
      return `${job.mediaType || "media"} from ${job.sourceAlbum}`;
    }
    return `${job.mediaType || "media"} upload`;
  }

  function renderJobCard(job, type) {
    const statusLabel = type === "ready" ? "Ready to import" : job.status;
    const date = window.appUtils.formatDate(job.processedAt || job.uploadedAt);
    const summary = type === "ready" ? summarizeDraft(job) : window.appUtils.escapeHtml(job.error || jobSource(job));
    const reviewAction = type === "ready"
      ? `<a class="button button-primary" href="workout.html?draft=${window.appUtils.escapeHtml(job.id)}">Review draft</a>`
      : "";
    const deleteAction = `<button type="button" class="button button-danger delete-import-button" data-job-id="${window.appUtils.escapeHtml(job.id)}">Delete</button>`;

    return `
      <article class="import-job-card ${type}-job">
        <div class="import-job-main">
          <div class="import-job-kicker">
            <span class="status-chip ${type}-chip">${window.appUtils.escapeHtml(statusLabel)}</span>
            <span>${window.appUtils.escapeHtml(date)} • ${window.appUtils.escapeHtml(jobSource(job))}</span>
          </div>
          <h3>${window.appUtils.escapeHtml(job.originalName || "Workout media")}</h3>
          <p>${summary}</p>
        </div>
        <div class="draft-card-actions import-card-actions">
          ${reviewAction}
          ${deleteAction}
        </div>
      </article>
    `;
  }

  function renderGroup(element, jobs, type, emptyText) {
    if (jobs.length === 0) {
      element.classList.add("empty-message");
      element.innerHTML = emptyText;
      return;
    }

    element.classList.remove("empty-message");
    element.innerHTML = jobs.map(function (job) {
      return renderJobCard(job, type);
    }).join("");
  }

  function attachDeleteHandlers() {
    document.querySelectorAll(".delete-import-button").forEach(function (button) {
      button.addEventListener("click", async function () {
        const confirmed = window.confirm("Delete this queued media and draft?");
        if (!confirmed) {
          return;
        }

        try {
          await window.appUtils.deleteJSON(`/api/photo-drafts/${button.dataset.jobId}`);
          window.appUtils.setMessage(importsStatus, "Import job deleted.", "success");
          await loadImports();
        } catch (error) {
          window.appUtils.setMessage(importsStatus, error.message, "error");
        }
      });
    });
  }

  function updateCounts(jobs) {
    const ready = jobs.filter(function (job) { return job.status === "processed" && job.draft; });
    const pending = jobs.filter(function (job) { return job.status === "pending"; });
    const failed = jobs.filter(function (job) { return job.status === "failed"; });
    const latest = jobs.slice().sort(function (a, b) {
      return String(b.processedAt || b.uploadedAt).localeCompare(String(a.processedAt || a.uploadedAt));
    })[0];

    readyCount.textContent = ready.length;
    pendingCount.textContent = pending.length;
    failedCount.textContent = failed.length;
    lastImportActivity.textContent = latest ? window.appUtils.formatDate(latest.processedAt || latest.uploadedAt) : "No queue yet";

    renderGroup(readyJobs, ready, "ready", "No ready drafts.");
    renderGroup(pendingJobs, pending, "pending", "Nothing pending.");
    renderGroup(failedJobs, failed, "failed", "No failed jobs.");
    attachDeleteHandlers();
  }

  async function loadAutomation() {
    try {
      const data = await window.appUtils.getJSON("/api/config");
      const processor = data.config && data.config.photoProcessor ? data.config.photoProcessor : null;
      if (!processor) {
        throw new Error("Missing processor config.");
      }

      const importAt = timeMinusMinutes(processor.time, 5);
      automationState.textContent = processor.enabled ? "Enabled" : "Paused";
      importerTime.textContent = `${importAt} ${processor.timezone}`;
      processorTime.textContent = `${processor.time} ${processor.timezone}`;
    } catch (error) {
      automationState.textContent = "Unavailable";
      importerTime.textContent = "Could not load";
      processorTime.textContent = "Could not load";
    }
  }

  async function loadImports() {
    try {
      const data = await window.appUtils.getJSON("/api/photo-drafts");
      const jobs = data.jobs || [];
      updateCounts(jobs);
      window.appUtils.setMessage(importsStatus, "Import monitor loaded.", "success");
    } catch (error) {
      window.appUtils.setMessage(importsStatus, error.message, "error");
    }
  }

  await Promise.all([loadAutomation(), loadImports()]);
});
