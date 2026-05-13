document.addEventListener("DOMContentLoaded", function () {
  const SAVED_WORKOUT_PLANS_KEY = "ironLogSavedWorkoutPlans";
  const WORKOUT_PLAN_DRAFT_KEY = "ironLogCoachWorkoutPlanDraft";
  const savedPlanCount = document.getElementById("savedPlanCount");
  const savedPlansList = document.getElementById("savedPlansList");

  function readSavedPlans() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVED_WORKOUT_PLANS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      savedPlansList.classList.add("empty-message");
      savedPlansList.textContent = "Saved plans were unreadable. Delete browser data or ask Coach Fox to save a new plan.";
      return [];
    }
  }

  function writeSavedPlans(plans) {
    localStorage.setItem(SAVED_WORKOUT_PLANS_KEY, JSON.stringify(plans));
  }

  function formatDate(value) {
    if (!value) {
      return "unknown date";
    }
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatSection(title, items) {
    if (!Array.isArray(items) || items.length === 0) {
      return "";
    }

    return `
      <div class="saved-plan-section">
        <h4>${window.appUtils.escapeHtml(title)}</h4>
        <ul>
          ${items.map(function (item) {
            const detail = item.duration || `${item.sets}×${item.reps}`;
            return `<li><span>${window.appUtils.escapeHtml(item.name || "Exercise")}</span><strong>${window.appUtils.escapeHtml(detail)}</strong></li>`;
          }).join("")}
        </ul>
      </div>
    `;
  }

  function startPlan(plan) {
    localStorage.setItem(WORKOUT_PLAN_DRAFT_KEY, JSON.stringify({
      ...plan,
      source: "coach-fox",
      createdAt: new Date().toISOString()
    }));
    window.location.href = "workout.html?planDraft=coach-fox";
  }

  function deletePlan(planId) {
    const confirmed = window.confirm("Delete this saved workout plan?");
    if (!confirmed) {
      return;
    }

    const nextPlans = readSavedPlans().filter((plan) => plan.id !== planId);
    writeSavedPlans(nextPlans);
    render();
  }

  function render() {
    const plans = readSavedPlans();
    savedPlanCount.textContent = plans.length;

    if (plans.length === 0) {
      savedPlansList.className = "saved-plans-list empty-message";
      savedPlansList.textContent = "No saved workout plans yet. Ask Coach Fox for a workout plan, then save it here.";
      return;
    }

    savedPlansList.className = "saved-plans-list";
    savedPlansList.innerHTML = plans.map(function (plan) {
      const exerciseCount = Array.isArray(plan.exercises) ? plan.exercises.length : 0;
      return `
        <article class="saved-plan-card" data-plan-id="${window.appUtils.escapeHtml(plan.id)}">
          <div class="saved-plan-card-top">
            <div>
              <p class="mini-label">${window.appUtils.escapeHtml(plan.target || "workout")} · ${exerciseCount} exercises · saved ${window.appUtils.escapeHtml(formatDate(plan.savedAt))}</p>
              <h3>${window.appUtils.escapeHtml(plan.title || "Workout plan")}</h3>
            </div>
            <div class="saved-plan-actions">
              <button type="button" class="button button-primary start-saved-plan-button">Start this workout</button>
              <button type="button" class="button button-danger delete-saved-plan-button">Delete</button>
            </div>
          </div>
          <details class="saved-plan-details">
            <summary>View plan details</summary>
            <div class="saved-plan-sections">
              ${formatSection("Warm-up", plan.warmup)}
              ${formatSection("Workout", plan.exercises)}
              ${formatSection("Cooldown", plan.cooldown)}
              ${plan.restGuidance ? `<div class="saved-plan-rest"><h4>Rest</h4><p>${window.appUtils.escapeHtml(plan.restGuidance)}</p></div>` : ""}
            </div>
          </details>
        </article>
      `;
    }).join("");

    savedPlansList.querySelectorAll(".saved-plan-card").forEach(function (card) {
      const plan = plans.find((candidate) => candidate.id === card.dataset.planId);
      card.querySelector(".start-saved-plan-button").addEventListener("click", function () {
        startPlan(plan);
      });
      card.querySelector(".delete-saved-plan-button").addEventListener("click", function () {
        deletePlan(plan.id);
      });
    });
  }

  render();
});
