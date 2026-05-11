document.addEventListener("DOMContentLoaded", async function () {
  const totalWorkouts = document.getElementById("totalWorkouts");
  const totalExercises = document.getElementById("totalExercises");
  const totalSets = document.getElementById("totalSets");
  const totalPrs = document.getElementById("totalPrs");
  const heroLastWorkout = document.getElementById("heroLastWorkout");
  const todayLabel = document.getElementById("todayLabel");
  const heroNutritionState = document.getElementById("heroNutritionState");
  const dashboardMacroList = document.getElementById("dashboardMacroList");
  const recentWorkouts = document.getElementById("recentWorkouts");
  const recentPrs = document.getElementById("recentPrs");
  const dashboardAskForm = document.getElementById("dashboardAskForm");
  const dashboardAskInput = document.getElementById("dashboardAskInput");

  const macros = [
    { key: "calories", goalKey: "caloriesGoal", label: "Calories", unit: "kcal" },
    { key: "protein", goalKey: "proteinGoal", label: "Protein", unit: "g" },
    { key: "carbs", goalKey: "carbsGoal", label: "Carbs", unit: "g" },
    { key: "fat", goalKey: "fatGoal", label: "Fat", unit: "g" }
  ];

  function todayString() {
    const now = new Date();
    return now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  function formatMacro(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function renderNutrition(day) {
    const goals = day.goals || {};
    const totals = day.totals || {};
    const hasAnyGoal = macros.some((macro) => Number(goals[macro.goalKey] || 0) > 0);

    if (!hasAnyGoal) {
      heroNutritionState.textContent = "Set goals";
      dashboardMacroList.className = "dashboard-macro-list empty-message";
      dashboardMacroList.innerHTML = `Set nutrition goals to track today. <a class="text-link" href="nutrition.html">Set goals</a>`;
      return;
    }

    const caloriesGoal = Number(goals.caloriesGoal || 0);
    const caloriesTotal = Number(totals.calories || 0);
    heroNutritionState.textContent = caloriesGoal > 0
      ? `${Math.round((caloriesTotal / caloriesGoal) * 100)}% calories`
      : "Goals active";

    dashboardMacroList.className = "dashboard-macro-list";
    dashboardMacroList.innerHTML = macros.map(function (macro) {
      const total = Number(totals[macro.key] || 0);
      const goal = Number(goals[macro.goalKey] || 0);
      const percent = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
      const remaining = goal - total;
      const remainingText = goal > 0
        ? (remaining >= 0 ? `${formatMacro(remaining)} ${macro.unit} left` : `${formatMacro(Math.abs(remaining))} ${macro.unit} over`)
        : "No goal";

      return `
        <div class="dashboard-macro-row">
          <div class="dashboard-macro-label">
            <strong>${macro.label}</strong>
            <span>${formatMacro(total)} / ${formatMacro(goal)} ${macro.unit}</span>
          </div>
          <div class="dashboard-macro-progress"><span style="width:${percent}%"></span></div>
          <small>${remainingText}</small>
        </div>
      `;
    }).join("");
  }

  function renderWorkouts(workouts) {
    const setCount = workouts.reduce(function (total, workout) {
      return total + Number(workout.setCount || 0);
    }, 0);

    totalWorkouts.textContent = workouts.length;
    totalSets.textContent = window.appUtils.formatNumber(setCount);
    heroLastWorkout.textContent = workouts.length > 0 ? window.appUtils.formatDate(workouts[0].workoutDate) : "No workout yet";

    if (workouts.length === 0) {
      recentWorkouts.classList.add("empty-message");
      recentWorkouts.innerHTML = "No workouts yet. Start with your first session.";
      return;
    }

    recentWorkouts.classList.remove("empty-message");
    recentWorkouts.innerHTML = workouts.slice(0, 3).map(function (workout) {
      return `
        <article class="history-card dashboard-compact-card">
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
            <span class="metric-pill">${window.appUtils.formatNumber(workout.totalVolume)} volume</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderPrs(prData) {
    const prs = prData.recentPrs || [];
    totalPrs.textContent = prData.totalPrs || 0;

    if (prs.length === 0) {
      recentPrs.classList.add("empty-message");
      recentPrs.innerHTML = "No PRs yet. Keep logging.";
      return;
    }

    recentPrs.classList.remove("empty-message");
    recentPrs.innerHTML = prs.slice(0, 3).map(function (pr) {
      return `
        <article class="pr-card dashboard-compact-card">
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

  dashboardAskForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const question = dashboardAskInput.value.trim();
    window.location.href = question ? `chat.html?ask=${encodeURIComponent(question)}` : "chat.html";
  });

  todayLabel.textContent = todayString();

  try {
    const [workoutData, exerciseData, prData, nutritionData] = await Promise.all([
      window.appUtils.getJSON("/api/workouts"),
      window.appUtils.getJSON("/api/exercises"),
      window.appUtils.getJSON("/api/prs/recent?limit=3"),
      window.appUtils.getJSON("/api/nutrition/day")
    ]);

    totalExercises.textContent = (exerciseData.exercises || []).length;
    renderWorkouts(workoutData.workouts || []);
    renderPrs(prData);
    renderNutrition(nutritionData);
  } catch (error) {
    recentWorkouts.textContent = error.message;
    recentPrs.textContent = error.message;
    dashboardMacroList.textContent = error.message;
  }
});
