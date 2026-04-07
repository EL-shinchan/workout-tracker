document.addEventListener("DOMContentLoaded", async function () {
  const totalWorkouts = document.getElementById("totalWorkouts");
  const totalExercises = document.getElementById("totalExercises");
  const totalSets = document.getElementById("totalSets");
  const totalPrs = document.getElementById("totalPrs");
  const lastWorkoutDate = document.getElementById("lastWorkoutDate");
  const recentWorkouts = document.getElementById("recentWorkouts");
  const recentPrs = document.getElementById("recentPrs");

  try {
    const [workoutData, exerciseData, prData] = await Promise.all([
      window.appUtils.getJSON("/api/workouts"),
      window.appUtils.getJSON("/api/exercises"),
      window.appUtils.getJSON("/api/prs/recent?limit=5")
    ]);

    const workouts = workoutData.workouts || [];
    const exercises = exerciseData.exercises || [];
    const prs = prData.recentPrs || [];
    const setCount = workouts.reduce(function (total, workout) {
      return total + Number(workout.setCount || 0);
    }, 0);

    totalWorkouts.textContent = workouts.length;
    totalExercises.textContent = exercises.length;
    totalSets.textContent = window.appUtils.formatNumber(setCount);
    totalPrs.textContent = prData.totalPrs || 0;
    lastWorkoutDate.textContent = workouts.length > 0 ? window.appUtils.formatDate(workouts[0].workoutDate) : "No data yet";

    if (workouts.length === 0) {
      recentWorkouts.innerHTML = "No workouts yet. Start with your first session.";
    } else {
      recentWorkouts.innerHTML = workouts.slice(0, 5).map(function (workout) {
        return `
          <article class="history-card">
            <div class="history-card-top">
              <div>
                <p class="mini-label">${window.appUtils.formatDate(workout.workoutDate)}</p>
                <h3>${window.appUtils.escapeHtml(workout.title)}</h3>
              </div>
              <a class="button button-ghost" href="history.html?workout=${workout.id}">Open</a>
            </div>
            <div class="metric-row">
              <span class="metric-pill">${workout.exerciseCount} exercises</span>
              <span class="metric-pill">${workout.setCount} sets</span>
              <span class="metric-pill">${window.appUtils.formatNumber(workout.totalVolume)} total volume</span>
            </div>
          </article>
        `;
      }).join("");
    }

    if (prs.length === 0) {
      recentPrs.innerHTML = "No PRs yet. Keep logging.";
    } else {
      recentPrs.innerHTML = prs.map(function (pr) {
        return `
          <article class="pr-card">
            <div class="history-card-top">
              <div>
                <p class="mini-label">${window.appUtils.formatDate(pr.workoutDate)}</p>
                <h3>${window.appUtils.escapeHtml(pr.exerciseName)}</h3>
              </div>
              <span class="pr-badge">New PR</span>
            </div>
            <div class="metric-row">
              <span class="metric-pill pr-pill">${window.appUtils.formatNumber(pr.weight)} kg</span>
              <span class="metric-pill">${window.appUtils.escapeHtml(pr.title)}</span>
            </div>
          </article>
        `;
      }).join("");
    }
  } catch (error) {
    recentWorkouts.textContent = error.message;
    recentPrs.textContent = error.message;
  }
});
