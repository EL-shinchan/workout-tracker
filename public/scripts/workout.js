document.addEventListener("DOMContentLoaded", async function () {
  const workoutForm = document.getElementById("workoutForm");
  const workoutDate = document.getElementById("workoutDate");
  const workoutTitle = document.getElementById("workoutTitle");
  const workoutNotes = document.getElementById("workoutNotes");
  const exerciseList = document.getElementById("exerciseList");
  const addExerciseButton = document.getElementById("addExerciseButton");
  const formStatus = document.getElementById("formStatus");
  const exerciseTemplate = document.getElementById("exerciseTemplate");
  const setTemplate = document.getElementById("setTemplate");

  let exercises = [];

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

  function addExerciseCard() {
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

  addExerciseCard();
});
