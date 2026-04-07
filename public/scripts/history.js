document.addEventListener("DOMContentLoaded", async function () {
  const historyList = document.getElementById("historyList");
  const historyDetail = document.getElementById("historyDetail");
  const detailTitle = document.getElementById("detailTitle");
  const deleteWorkoutButton = document.getElementById("deleteWorkoutButton");
  const params = new URLSearchParams(window.location.search);

  let workouts = [];
  let currentWorkoutId = null;

  async function loadWorkouts(selectedId) {
    const data = await window.appUtils.getJSON("/api/workouts");
    workouts = data.workouts || [];

    if (workouts.length === 0) {
      historyList.textContent = "No workouts yet.";
      historyDetail.textContent = "Nothing to inspect yet.";
      detailTitle.textContent = "Pick a workout";
      deleteWorkoutButton.classList.add("hidden");
      return;
    }

    renderWorkoutList();

    const targetId = selectedId || params.get("workout") || workouts[0].id;
    await loadWorkoutDetail(targetId);
  }

  function renderWorkoutList() {
    historyList.innerHTML = workouts.map(function (workout) {
      return `
        <article class="history-card ${Number(workout.id) === Number(currentWorkoutId) ? "active" : ""}" data-workout-id="${workout.id}">
          <div class="history-card-top">
            <div>
              <p class="mini-label">${window.appUtils.formatDate(workout.workoutDate)}</p>
              <h3>${workout.title}</h3>
            </div>
            <span class="metric-pill">${workout.exerciseCount} exercises</span>
          </div>
          <div class="metric-row">
            <span class="metric-pill">${workout.setCount} sets</span>
            <span class="metric-pill">${window.appUtils.formatNumber(workout.totalVolume)} volume</span>
          </div>
        </article>
      `;
    }).join("");

    historyList.querySelectorAll(".history-card").forEach(function (card) {
      card.addEventListener("click", function () {
        loadWorkoutDetail(card.dataset.workoutId);
      });
    });
  }

  async function loadWorkoutDetail(workoutId) {
    const data = await window.appUtils.getJSON(`/api/workouts/${workoutId}`);
    const workout = data.workout;
    currentWorkoutId = workout.id;
    detailTitle.textContent = workout.title;
    deleteWorkoutButton.classList.remove("hidden");
    deleteWorkoutButton.dataset.workoutId = workout.id;

    renderWorkoutList();

    historyDetail.innerHTML = `
      <article class="detail-card">
        <div class="tag-row">
          <span class="info-pill">${window.appUtils.formatDate(workout.workoutDate)}</span>
          <span class="info-pill">${workout.exercises.length} exercises</span>
        </div>
        <p>${workout.notes ? workout.notes : "No session notes."}</p>
        <div class="stack-list">
          ${workout.exercises.map(function (exercise) {
            return `
              <section class="detail-exercise">
                <div class="history-card-top">
                  <div>
                    <p class="mini-label">${exercise.category || "Exercise"}</p>
                    <h3>${exercise.name}</h3>
                  </div>
                  <span class="metric-pill">${exercise.muscleGroup || "No muscle group"}</span>
                </div>
                ${exercise.notes ? `<p>${exercise.notes}</p>` : ""}
                <div class="detail-set-list">
                  ${exercise.sets.map(function (set) {
                    return `
                      <div class="detail-set-item">
                        <strong>Set ${set.setNumber}</strong>
                        <span>${window.appUtils.formatNumber(set.weight)} × ${set.reps}</span>
                        <span>${set.notes || "No notes"}</span>
                      </div>
                    `;
                  }).join("")}
                </div>
                <div class="form-actions">
                  <a class="button button-ghost" href="progress.html?exercise=${exercise.exerciseId}">Open progress for ${exercise.name}</a>
                </div>
              </section>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }

  deleteWorkoutButton.addEventListener("click", async function () {
    const workoutId = deleteWorkoutButton.dataset.workoutId;
    if (!workoutId) {
      return;
    }

    const confirmed = window.confirm("Delete this workout and all its logged sets?");
    if (!confirmed) {
      return;
    }

    try {
      await window.appUtils.deleteJSON(`/api/workouts/${workoutId}`);
      currentWorkoutId = null;
      await loadWorkouts();
    } catch (error) {
      historyDetail.textContent = error.message;
    }
  });

  try {
    await loadWorkouts();
  } catch (error) {
    historyList.textContent = error.message;
  }
});
