document.addEventListener("DOMContentLoaded", async function () {
  const workoutForm = document.getElementById("workoutForm");
  const workoutDate = document.getElementById("workoutDate");
  const workoutTitle = document.getElementById("workoutTitle");
  const workoutNotes = document.getElementById("workoutNotes");
  const exerciseList = document.getElementById("exerciseList");
  const addExerciseButton = document.getElementById("addExerciseButton");
  const formStatus = document.getElementById("formStatus");
  const workoutPhotoInput = document.getElementById("workoutPhotoInput");
  const workoutVideoInput = document.getElementById("workoutVideoInput");
  const videoPreview = document.getElementById("videoPreview");
  const photoQuickNote = document.getElementById("photoQuickNote");
  const photoClarifyExercise = document.getElementById("photoClarifyExercise");
  const photoClarifyWeight = document.getElementById("photoClarifyWeight");
  const photoClarifyReps = document.getElementById("photoClarifyReps");
  const photoClarifyBodyWeight = document.getElementById("photoClarifyBodyWeight");
  const videoClarifySetNumber = document.getElementById("videoClarifySetNumber");
  const photoPreviewCard = document.getElementById("photoPreviewCard");
  const photoPreview = document.getElementById("photoPreview");
  const extractPhotoButton = document.getElementById("extractPhotoButton");
  const queueVideoButton = document.getElementById("queueVideoButton");
  const refreshDraftsButton = document.getElementById("refreshDraftsButton");
  const discardPhotoDraftButton = document.getElementById("discardPhotoDraftButton");
  const photoStatus = document.getElementById("photoStatus");
  const processedDraftsList = document.getElementById("processedDraftsList");
  const photoDraftReview = document.getElementById("photoDraftReview");
  const exerciseTemplate = document.getElementById("exerciseTemplate");
  const setTemplate = document.getElementById("setTemplate");
  const pageTitle = document.querySelector(".page-intro h1");
  const pageCopy = document.querySelector(".page-intro .hero-copy");
  const submitButton = workoutForm.querySelector('button[type="submit"]');
  const params = new URLSearchParams(window.location.search);
  const editWorkoutId = params.get("edit");
  const draftToLoadId = params.get("draft");

  let exercises = [];
  let activePhotoDraft = null;

  workoutDate.value = new Date().toISOString().slice(0, 10);

  try {
    const data = await window.appUtils.getJSON("/api/exercises");
    exercises = data.exercises || [];
  } catch (error) {
    window.appUtils.setMessage(formStatus, "Could not load exercises yet. You can still create custom ones.", "error");
  }

  function buildExerciseOptions(selectElement) {
    selectElement.innerHTML = [
      '<option value="">Choose an exercise</option>',
      ...exercises.map(function (exercise) {
        return `<option value="${exercise.id}">${window.appUtils.escapeHtml(exercise.name)}</option>`;
      }),
      '<option value="custom">+ Create new exercise</option>'
    ].join("");
  }

  function renumberSets(setList) {
    setList.querySelectorAll(".set-row").forEach(function (row, index) {
      row.querySelector(".set-number").textContent = index + 1;
    });
  }

  function toggleCustomFields(card) {
    const select = card.querySelector(".exercise-select");
    const customGrid = card.querySelector(".custom-exercise-grid");
    const title = card.querySelector(".exercise-title");
    const selectedOption = select.options[select.selectedIndex];

    if (select.value === "custom") {
      customGrid.classList.remove("hidden");
      title.textContent = "Custom exercise";
    } else {
      customGrid.classList.add("hidden");
      title.textContent = selectedOption && selectedOption.text ? selectedOption.text : "Choose an exercise";
    }
  }

  function addSet(card, values) {
    const setRow = setTemplate.content.firstElementChild.cloneNode(true);
    const setList = card.querySelector(".set-list");

    setRow.querySelector(".set-weight").value = values && values.weight ? values.weight : "";
    setRow.querySelector(".set-reps").value = values && values.reps ? values.reps : "";
    setRow.querySelector(".set-notes").value = values && values.notes ? values.notes : "";

    setRow.querySelector(".remove-set-button").addEventListener("click", function () {
      setRow.remove();
      renumberSets(setList);
    });

    setList.appendChild(setRow);
    renumberSets(setList);
  }

  function selectExerciseByName(card, exerciseName) {
    const select = card.querySelector(".exercise-select");
    const customName = card.querySelector(".custom-name");
    const match = exercises.find(function (exercise) {
      return exercise.name.toLowerCase() === String(exerciseName || "").trim().toLowerCase();
    });

    if (match) {
      select.value = String(match.id);
    } else {
      select.value = "custom";
      customName.value = exerciseName || "";
    }

    toggleCustomFields(card);
  }

  function addExerciseCard(values) {
    const card = exerciseTemplate.content.firstElementChild.cloneNode(true);
    const select = card.querySelector(".exercise-select");
    const addSetButton = card.querySelector(".add-set-button");
    const removeExerciseButton = card.querySelector(".remove-exercise-button");

    buildExerciseOptions(select);
    toggleCustomFields(card);
    addSet(card);

    select.addEventListener("change", function () {
      toggleCustomFields(card);
    });

    addSetButton.addEventListener("click", function () {
      addSet(card);
    });

    removeExerciseButton.addEventListener("click", function () {
      card.remove();
    });

    exerciseList.appendChild(card);

    if (values) {
      if (values.exerciseId) {
        select.value = String(values.exerciseId);
        toggleCustomFields(card);
      } else {
        selectExerciseByName(card, values.name);
      }
      card.querySelector(".exercise-notes").value = values.notes || "";
      card.querySelector(".set-list").innerHTML = "";
      (values.sets || []).forEach(function (set) {
        addSet(card, set);
      });

      if (!values.sets || values.sets.length === 0) {
        addSet(card);
      }
    }
  }

  function buildDraftSetRow(set, exerciseIndex, setIndex) {
    return `
      <div class="photo-draft-set" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}">
        <div class="set-badge">Set <span>${setIndex + 1}</span></div>
        <label class="field compact-field">
          <span>Weight</span>
          <input type="number" class="draft-set-weight" min="0" step="0.5" value="${window.appUtils.escapeHtml(String(set.weight || ""))}" />
        </label>
        <label class="field compact-field">
          <span>Reps</span>
          <input type="number" class="draft-set-reps" min="1" step="1" value="${window.appUtils.escapeHtml(String(set.reps || ""))}" />
        </label>
        <label class="field compact-field stretch-field">
          <span>Notes</span>
          <input type="text" class="draft-set-notes" value="${window.appUtils.escapeHtml(set.notes || "")}" />
        </label>
      </div>
    `;
  }

  function renderPhotoDraft(draft) {
    const exercisesHtml = (draft.exercises || []).map(function (exercise, exerciseIndex) {
      const setsHtml = (exercise.sets || []).map(function (set, setIndex) {
        return buildDraftSetRow(set, exerciseIndex, setIndex);
      }).join("");

      return `
        <article class="photo-draft-exercise" data-exercise-index="${exerciseIndex}">
          <div class="exercise-card-header">
            <div>
              <p class="mini-label">Draft exercise ${exerciseIndex + 1}</p>
              <h3>${window.appUtils.escapeHtml(exercise.name || "Unnamed exercise")}</h3>
            </div>
          </div>
          <div class="form-grid">
            <label class="field">
              <span>Exercise name</span>
              <input type="text" class="draft-exercise-name" value="${window.appUtils.escapeHtml(exercise.name || "")}" />
            </label>
            <label class="field">
              <span>Exercise notes</span>
              <input type="text" class="draft-exercise-notes" value="${window.appUtils.escapeHtml(exercise.notes || "")}" />
            </label>
          </div>
          <div class="photo-draft-sets">${setsHtml}</div>
        </article>
      `;
    }).join("");

    photoDraftReview.innerHTML = `
      <div class="photo-draft-header">
        <div>
          <p class="eyebrow">Review before saving</p>
          <h3>Editable workout draft</h3>
        </div>
        <button type="button" class="button button-primary" id="addDraftToWorkoutButton">Add to workout</button>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Body weight</span>
          <input type="number" id="draftBodyWeight" min="0" step="0.1" value="${window.appUtils.escapeHtml(String(draft.bodyWeight || ""))}" />
        </label>
        <label class="field">
          <span>Unit</span>
          <input type="text" id="draftBodyWeightUnit" value="${window.appUtils.escapeHtml(draft.bodyWeightUnit || "kg")}" />
        </label>
      </div>
      <label class="field">
        <span>Draft notes</span>
        <textarea id="draftWorkoutNotes" rows="3">${window.appUtils.escapeHtml(draft.notes || "")}</textarea>
      </label>
      <div class="photo-draft-exercises">${exercisesHtml}</div>
    `;

    photoDraftReview.classList.remove("hidden");
    discardPhotoDraftButton.classList.remove("hidden");
    document.getElementById("addDraftToWorkoutButton").addEventListener("click", addDraftToWorkout);
  }

  function collectPhotoDraftEdits() {
    const draftExercises = Array.from(photoDraftReview.querySelectorAll(".photo-draft-exercise")).map(function (exerciseNode) {
      return {
        name: exerciseNode.querySelector(".draft-exercise-name").value.trim(),
        notes: exerciseNode.querySelector(".draft-exercise-notes").value.trim(),
        sets: Array.from(exerciseNode.querySelectorAll(".photo-draft-set")).map(function (setNode) {
          return {
            weight: Number(setNode.querySelector(".draft-set-weight").value),
            reps: Number(setNode.querySelector(".draft-set-reps").value),
            notes: setNode.querySelector(".draft-set-notes").value.trim()
          };
        })
      };
    });

    return {
      bodyWeight: document.getElementById("draftBodyWeight").value,
      bodyWeightUnit: document.getElementById("draftBodyWeightUnit").value.trim() || "kg",
      notes: document.getElementById("draftWorkoutNotes").value.trim(),
      exercises: draftExercises
    };
  }

  function addDraftToWorkout() {
    const draft = collectPhotoDraftEdits();
    const validExercises = draft.exercises.map(function (exercise) {
      return {
        ...exercise,
        sets: exercise.sets.filter(function (set) {
          return Number(set.weight) > 0 && Number(set.reps) > 0;
        })
      };
    }).filter(function (exercise) {
      return exercise.name && exercise.sets.some(function (set) {
        return Number(set.weight) > 0 && Number(set.reps) > 0;
      });
    });

    if (validExercises.length === 0) {
      window.appUtils.setMessage(photoStatus, "Draft needs at least one exercise with valid weight and reps.", "error");
      return;
    }

    if (exerciseList.children.length === 1) {
      const firstCard = exerciseList.querySelector(".exercise-card");
      const hasEmptyFirstCard = firstCard
        && !firstCard.querySelector(".exercise-select").value
        && Array.from(firstCard.querySelectorAll(".set-weight, .set-reps")).every(function (input) { return !input.value; });

      if (hasEmptyFirstCard) {
        exerciseList.innerHTML = "";
      }
    }

    validExercises.forEach(function (exercise) {
      addExerciseCard(exercise);
    });

    if (!workoutTitle.value.trim()) {
      workoutTitle.value = validExercises.length === 1 ? `${validExercises[0].name} session` : "Imported workout";
    }

    const noteLines = [];
    if (draft.bodyWeight) {
      noteLines.push(`Body weight: ${draft.bodyWeight}${draft.bodyWeightUnit ? " " + draft.bodyWeightUnit : ""}`);
    }
    if (draft.notes) {
      noteLines.push(draft.notes);
    }
    if (noteLines.length > 0) {
      workoutNotes.value = [workoutNotes.value.trim(), noteLines.join("\n")].filter(Boolean).join("\n\n");
    }

    clearPhotoDraft();
    window.appUtils.setMessage(photoStatus, "Draft added to the workout form. Scroll down, review it, then save normally.", "success");

    const newestExercise = exerciseList.lastElementChild;
    if (newestExercise) {
      newestExercise.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function clearPhotoDraft() {
    activePhotoDraft = null;
    photoDraftReview.innerHTML = "";
    photoDraftReview.classList.add("hidden");
    discardPhotoDraftButton.classList.add("hidden");
  }

  function renderProcessedDrafts(jobs) {
    const processedJobs = (jobs || []).filter(function (job) {
      return job.status === "processed" && job.draft;
    });

    if (processedJobs.length === 0) {
      processedDraftsList.classList.add("empty-message");
      processedDraftsList.innerHTML = "No processed photo drafts yet.";
      return;
    }

    processedDraftsList.classList.remove("empty-message");
    processedDraftsList.innerHTML = processedJobs.map(function (job) {
      const exerciseCount = Array.isArray(job.draft.exercises) ? job.draft.exercises.length : 0;
      return `
        <article class="processed-draft-card">
          <div>
            <p class="mini-label">${window.appUtils.escapeHtml(window.appUtils.formatDate(job.processedAt || job.uploadedAt))} • ${window.appUtils.escapeHtml(job.mediaType || "image")}</p>
            <h3>${window.appUtils.escapeHtml(job.originalName || "Workout media")}</h3>
            <p class="highlight-copy">${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"} detected${job.draft.bodyWeight ? ` • body weight ${window.appUtils.escapeHtml(String(job.draft.bodyWeight))}${window.appUtils.escapeHtml(job.draft.bodyWeightUnit || "kg")}` : ""}</p>
          </div>
          <div class="draft-card-actions">
            <button type="button" class="button button-ghost load-processed-draft-button" data-job-id="${window.appUtils.escapeHtml(job.id)}">Review draft</button>
            <button type="button" class="button button-danger delete-draft-button" data-job-id="${window.appUtils.escapeHtml(job.id)}">Delete</button>
          </div>
        </article>
      `;
    }).join("");

    processedDraftsList.querySelectorAll(".load-processed-draft-button").forEach(function (button) {
      button.addEventListener("click", function () {
        const job = processedJobs.find(function (candidate) {
          return candidate.id === button.dataset.jobId;
        });
        loadDraftIntoReview(job);
      });
    });

    processedDraftsList.querySelectorAll(".delete-draft-button").forEach(function (button) {
      button.addEventListener("click", async function () {
        const confirmed = window.confirm("Delete this draft and its uploaded media?");
        if (!confirmed) {
          return;
        }

        try {
          await window.appUtils.deleteJSON(`/api/photo-drafts/${button.dataset.jobId}`);
          clearPhotoDraft();
          window.appUtils.setMessage(photoStatus, "Draft deleted.", "success");
          await loadProcessedDrafts();
        } catch (error) {
          window.appUtils.setMessage(photoStatus, error.message, "error");
        }
      });
    });
  }

  async function loadProcessedDrafts() {
    try {
      const data = await window.appUtils.getJSON("/api/photo-drafts?status=processed");
      const jobs = data.jobs || [];
      renderProcessedDrafts(jobs);
      return jobs;
    } catch (error) {
      processedDraftsList.classList.add("empty-message");
      processedDraftsList.textContent = error.message;
      return [];
    }
  }

  function loadDraftIntoReview(job) {
    if (job && job.draft) {
      activePhotoDraft = job.draft;
      renderPhotoDraft(activePhotoDraft);
      window.appUtils.setMessage(photoStatus, "Processed draft loaded. Review it before adding to workout.", "success");
      photoDraftReview.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function appendClarification(formData) {
    formData.append("quickNote", photoQuickNote.value.trim());
    formData.append("exercise", photoClarifyExercise.value.trim());
    formData.append("weight", photoClarifyWeight.value.trim());
    formData.append("reps", photoClarifyReps.value.trim());
    formData.append("bodyWeight", photoClarifyBodyWeight.value.trim());
    formData.append("setNumber", videoClarifySetNumber.value.trim());
  }

  function collectSets(card, exerciseIndex) {
    const rows = Array.from(card.querySelectorAll(".set-row"));

    if (rows.length === 0) {
      throw new Error(`Exercise ${exerciseIndex + 1} needs at least one set.`);
    }

    return rows.map(function (row, setIndex) {
      const weight = row.querySelector(".set-weight").value;
      const reps = row.querySelector(".set-reps").value;
      const notes = row.querySelector(".set-notes").value.trim();

      if (!weight || Number(weight) <= 0) {
        throw new Error(`Set ${setIndex + 1} in exercise ${exerciseIndex + 1} needs a valid weight.`);
      }

      if (!reps || Number(reps) <= 0) {
        throw new Error(`Set ${setIndex + 1} in exercise ${exerciseIndex + 1} needs valid reps.`);
      }

      return {
        weight: Number(weight),
        reps: Number(reps),
        notes: notes
      };
    });
  }

  function collectExercises() {
    const cards = Array.from(exerciseList.querySelectorAll(".exercise-card"));

    if (cards.length === 0) {
      throw new Error("Add at least one exercise before saving.");
    }

    return cards.map(function (card, exerciseIndex) {
      const exerciseId = card.querySelector(".exercise-select").value;
      const notes = card.querySelector(".exercise-notes").value.trim();
      const customName = card.querySelector(".custom-name").value.trim();
      const customMuscleGroup = card.querySelector(".custom-muscle-group").value.trim();
      const customCategory = card.querySelector(".custom-category").value.trim();
      const sets = collectSets(card, exerciseIndex);

      if (!exerciseId) {
        throw new Error(`Pick an exercise for block ${exerciseIndex + 1}.`);
      }

      if (exerciseId === "custom") {
        if (!customName) {
          throw new Error(`Custom exercise ${exerciseIndex + 1} needs a name.`);
        }

        return {
          name: customName,
          muscleGroup: customMuscleGroup,
          category: customCategory,
          notes: notes,
          sets: sets
        };
      }

      return {
        exerciseId: Number(exerciseId),
        notes: notes,
        sets: sets
      };
    });
  }

  async function loadWorkoutForEdit(workoutId) {
    const data = await window.appUtils.getJSON(`/api/workouts/${workoutId}`);
    const workout = data.workout;

    workoutTitle.value = workout.title || "";
    workoutDate.value = workout.workoutDate || new Date().toISOString().slice(0, 10);
    workoutNotes.value = workout.notes || "";
    exerciseList.innerHTML = "";

    (workout.exercises || []).forEach(function (exercise) {
      addExerciseCard({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        notes: exercise.notes || "",
        sets: exercise.sets || []
      });
    });

    if (pageTitle) {
      pageTitle.textContent = "Edit workout";
    }
    if (pageCopy) {
      pageCopy.textContent = "Fix the saved session, update wrong sets, and save changes without creating a duplicate.";
    }
    if (submitButton) {
      submitButton.textContent = "Save changes";
    }
    window.appUtils.setMessage(formStatus, `Editing ${workout.title}.`, "success");
  }

  function buildPrMessage(newPrs) {
    const items = newPrs.map(function (pr) {
      return `<li><strong>${window.appUtils.escapeHtml(pr.exerciseName)}</strong> — ${window.appUtils.formatNumber(pr.weight)} kg</li>`;
    }).join("");

    return `
      <div class="status-title-row">
        <span class="pr-badge">New PR${newPrs.length > 1 ? "s" : ""}</span>
        <strong>Workout saved.</strong>
      </div>
      <p class="status-copy">You beat your old best on ${newPrs.length} exercise${newPrs.length > 1 ? "s" : ""}.</p>
      <ul class="status-list">${items}</ul>
    `;
  }

  addExerciseButton.addEventListener("click", function () {
    addExerciseCard();
  });

  workoutPhotoInput.addEventListener("change", function () {
    const file = workoutPhotoInput.files && workoutPhotoInput.files[0];
    clearPhotoDraft();

    if (!file) {
      photoPreviewCard.classList.add("hidden");
      photoPreview.removeAttribute("src");
      window.appUtils.setMessage(photoStatus, "No photo selected yet.", null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      photoPreviewCard.classList.add("hidden");
      window.appUtils.setMessage(photoStatus, "Choose an image file, not a document or video.", "error");
      return;
    }

    photoPreview.src = URL.createObjectURL(file);
    photoPreviewCard.classList.remove("hidden");
    window.appUtils.setMessage(photoStatus, `Selected ${file.name}. Queue it when ready.`, "success");
  });

  workoutVideoInput.addEventListener("change", function () {
    const file = workoutVideoInput.files && workoutVideoInput.files[0];
    clearPhotoDraft();

    if (!file) {
      videoPreview.classList.add("hidden");
      videoPreview.removeAttribute("src");
      window.appUtils.setMessage(photoStatus, "No video selected yet.", null);
      return;
    }

    if (!file.type.startsWith("video/")) {
      videoPreview.classList.add("hidden");
      window.appUtils.setMessage(photoStatus, "Choose a video file.", "error");
      return;
    }

    videoPreview.src = URL.createObjectURL(file);
    videoPreview.classList.remove("hidden");
    window.appUtils.setMessage(photoStatus, `Selected ${file.name}. Queue the video when ready.`, "success");
  });

  extractPhotoButton.addEventListener("click", async function () {
    const file = workoutPhotoInput.files && workoutPhotoInput.files[0];

    if (!file) {
      window.appUtils.setMessage(photoStatus, "Choose a workout photo first.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);
    appendClarification(formData);

    try {
      extractPhotoButton.disabled = true;
      window.appUtils.setMessage(photoStatus, "Queueing photo for 22:00 processing...", null);

      const response = await fetch("/api/photo-drafts/workout", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Could not queue workout photo.");
      }

      clearPhotoDraft();
      window.appUtils.setMessage(photoStatus, payload.message || "Photo queued. Shinoske will process it at 22:00.", "success");
      await loadProcessedDrafts();
    } catch (error) {
      clearPhotoDraft();
      window.appUtils.setMessage(photoStatus, error.message, "error");
    } finally {
      extractPhotoButton.disabled = false;
    }
  });

  queueVideoButton.addEventListener("click", async function () {
    const file = workoutVideoInput.files && workoutVideoInput.files[0];

    if (!file) {
      window.appUtils.setMessage(photoStatus, "Choose an exercise video first.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);
    appendClarification(formData);

    try {
      queueVideoButton.disabled = true;
      window.appUtils.setMessage(photoStatus, "Queueing video for scheduled processing...", null);

      const response = await fetch("/api/photo-drafts/video", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Could not queue workout video.");
      }

      clearPhotoDraft();
      window.appUtils.setMessage(photoStatus, payload.message || "Video queued. Shinoske will process it at the configured time.", "success");
      await loadProcessedDrafts();
    } catch (error) {
      clearPhotoDraft();
      window.appUtils.setMessage(photoStatus, error.message, "error");
    } finally {
      queueVideoButton.disabled = false;
    }
  });

  discardPhotoDraftButton.addEventListener("click", function () {
    clearPhotoDraft();
    window.appUtils.setMessage(photoStatus, "Draft discarded. You can load another processed draft or queue a new photo.", null);
  });

  refreshDraftsButton.addEventListener("click", async function () {
    await loadProcessedDrafts();
    window.appUtils.setMessage(photoStatus, "Processed drafts refreshed.", "success");
  });

  workoutForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const payload = {
        title: workoutTitle.value.trim(),
        workoutDate: workoutDate.value,
        notes: workoutNotes.value.trim(),
        exercises: collectExercises()
      };

      if (!payload.title) {
        throw new Error("Workout title is required.");
      }

      if (!payload.workoutDate) {
        throw new Error("Workout date is required.");
      }

      if (editWorkoutId) {
        window.appUtils.setMessage(formStatus, "Saving changes...", null);
        await window.appUtils.putJSON(`/api/workouts/${editWorkoutId}`, payload);
        window.appUtils.setMessage(formStatus, "Workout updated. Progress and PRs will recalculate from the edited sets.", "success");
        return;
      }

      window.appUtils.setMessage(formStatus, "Saving workout...", null);
      const response = await window.appUtils.postJSON("/api/workouts", payload);
      const newPrs = Array.isArray(response.newPrs) ? response.newPrs : [];

      if (newPrs.length > 0) {
        window.appUtils.setMessage(formStatus, buildPrMessage(newPrs), "pr-celebration", true);
      } else {
        window.appUtils.setMessage(formStatus, "Workout saved. Nice. Keep stacking those sessions.", "success");
      }

      workoutForm.reset();
      workoutDate.value = new Date().toISOString().slice(0, 10);
      exerciseList.innerHTML = "";
      addExerciseCard();
    } catch (error) {
      window.appUtils.setMessage(formStatus, error.message, "error");
    }
  });

  if (editWorkoutId) {
    try {
      await loadWorkoutForEdit(editWorkoutId);
    } catch (error) {
      window.appUtils.setMessage(formStatus, error.message, "error");
      addExerciseCard();
    }
  } else {
    addExerciseCard();
  }

  const processedJobs = await loadProcessedDrafts();
  if (draftToLoadId) {
    const draftJob = processedJobs.find(function (job) {
      return job.id === draftToLoadId;
    });
    if (draftJob) {
      loadDraftIntoReview(draftJob);
    } else {
      window.appUtils.setMessage(photoStatus, "That processed draft was not found. It may have been deleted or already imported.", "error");
    }
  }
});
