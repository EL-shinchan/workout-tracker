document.addEventListener("DOMContentLoaded", function () {
  const nutritionDate = document.getElementById("nutritionDate");
  const macroGrid = document.getElementById("macroGrid");
  const goalsForm = document.getElementById("goalsForm");
  const goalsStatus = document.getElementById("goalsStatus");
  const entryForm = document.getElementById("entryForm");
  const entryStatus = document.getElementById("entryStatus");
  const entriesList = document.getElementById("entriesList");
  const entryCount = document.getElementById("entryCount");
  const estimateDescription = document.getElementById("estimateDescription");
  const estimateButton = document.getElementById("estimateButton");
  const estimateStatus = document.getElementById("estimateStatus");
  const clearEntryButton = document.getElementById("clearEntryButton");

  const fields = {
    mealType: document.getElementById("mealType"),
    foodName: document.getElementById("foodName"),
    calories: document.getElementById("calories"),
    protein: document.getElementById("protein"),
    carbs: document.getElementById("carbs"),
    fat: document.getElementById("fat"),
    notes: document.getElementById("nutritionNotes"),
    caloriesGoal: document.getElementById("caloriesGoal"),
    proteinGoal: document.getElementById("proteinGoal"),
    carbsGoal: document.getElementById("carbsGoal"),
    fatGoal: document.getElementById("fatGoal")
  };

  const macros = [
    { key: "calories", goalKey: "caloriesGoal", label: "Calories", unit: "kcal", accent: "orange" },
    { key: "protein", goalKey: "proteinGoal", label: "Protein", unit: "g", accent: "green" },
    { key: "carbs", goalKey: "carbsGoal", label: "Carbs", unit: "g", accent: "blue" },
    { key: "fat", goalKey: "fatGoal", label: "Fat", unit: "g", accent: "pink" }
  ];

  let currentDay = null;

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function numberValue(element) {
    const value = Number(element.value || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function formatMacro(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function renderMacros(day) {
    const goals = day.goals || {};
    const totals = day.totals || {};
    const remaining = day.remaining || {};

    macroGrid.innerHTML = macros.map(function (macro) {
      const total = Number(totals[macro.key] || 0);
      const goal = Number(goals[macro.goalKey] || 0);
      const remain = Number(remaining[macro.key] || 0);
      const percent = goal > 0 ? Math.min(120, Math.round((total / goal) * 100)) : 0;
      const remainingLabel = goal > 0
        ? (remain >= 0 ? `${formatMacro(remain)} ${macro.unit} remaining` : `${formatMacro(Math.abs(remain))} ${macro.unit} over goal`)
        : "Set a goal to track progress";

      return `
        <article class="macro-card ${macro.accent}">
          <div class="macro-card-top">
            <span>${macro.label}</span>
            <strong>${formatMacro(total)}<small>${macro.unit}</small></strong>
          </div>
          <div class="macro-progress"><span style="width:${percent}%"></span></div>
          <p>${goal > 0 ? `${formatMacro(total)} / ${formatMacro(goal)} ${macro.unit}` : `No ${macro.label.toLowerCase()} goal`}</p>
          <small>${remainingLabel}</small>
        </article>
      `;
    }).join("");
  }

  function renderGoals(goals) {
    fields.caloriesGoal.value = goals.caloriesGoal || "";
    fields.proteinGoal.value = goals.proteinGoal || "";
    fields.carbsGoal.value = goals.carbsGoal || "";
    fields.fatGoal.value = goals.fatGoal || "";
  }

  function renderEntries(entries) {
    entryCount.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

    if (!entries.length) {
      entriesList.className = "nutrition-entries empty-message";
      entriesList.textContent = "No food logged for this day yet.";
      return;
    }

    entriesList.className = "nutrition-entries";
    entriesList.innerHTML = entries.map(function (entry) {
      return `
        <article class="nutrition-entry-card" data-entry-id="${entry.id}">
          <div>
            <div class="entry-meta-row">
              <span class="meal-pill">${window.appUtils.escapeHtml(entry.mealType)}</span>
              ${entry.isEstimate ? '<span class="estimate-pill">Estimate</span>' : ''}
            </div>
            <h3>${window.appUtils.escapeHtml(entry.foodName)}</h3>
            ${entry.notes ? `<p>${window.appUtils.escapeHtml(entry.notes)}</p>` : ""}
          </div>
          <div class="entry-macros">
            <span>${formatMacro(entry.calories)} kcal</span>
            <span>${formatMacro(entry.protein)}g protein</span>
            <span>${formatMacro(entry.carbs)}g carbs</span>
            <span>${formatMacro(entry.fat)}g fat</span>
          </div>
          <button type="button" class="icon-button delete-entry-button" aria-label="Delete food entry">×</button>
        </article>
      `;
    }).join("");

    entriesList.querySelectorAll(".delete-entry-button").forEach(function (button) {
      button.addEventListener("click", async function () {
        const card = button.closest(".nutrition-entry-card");
        const id = card.dataset.entryId;
        try {
          await window.appUtils.requestJSON(`/api/nutrition/entries/${id}`, { method: "DELETE" });
          await loadDay();
        } catch (error) {
          window.appUtils.setMessage(entryStatus, error.message, "error");
        }
      });
    });
  }

  function renderDay(day) {
    currentDay = day;
    renderMacros(day);
    renderGoals(day.goals || {});
    renderEntries(day.entries || []);
  }

  async function loadDay() {
    const date = nutritionDate.value || todayString();
    const day = await window.appUtils.getJSON(`/api/nutrition/day?date=${encodeURIComponent(date)}`);
    renderDay(day);
    window.appUtils.setMessage(goalsStatus, "Goals loaded.", "success");
  }

  function clearEntryForm() {
    fields.mealType.value = "breakfast";
    fields.foodName.value = "";
    fields.calories.value = "";
    fields.protein.value = "";
    fields.carbs.value = "";
    fields.fat.value = "";
    fields.notes.value = "";
  }

  goalsForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      window.appUtils.setMessage(goalsStatus, "Saving goals...", null);
      await window.appUtils.putJSON("/api/nutrition/goals", {
        caloriesGoal: numberValue(fields.caloriesGoal),
        proteinGoal: numberValue(fields.proteinGoal),
        carbsGoal: numberValue(fields.carbsGoal),
        fatGoal: numberValue(fields.fatGoal)
      });
      await loadDay();
      window.appUtils.setMessage(goalsStatus, "Goals saved.", "success");
    } catch (error) {
      window.appUtils.setMessage(goalsStatus, error.message, "error");
    }
  });

  entryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      window.appUtils.setMessage(entryStatus, "Saving food...", null);
      await window.appUtils.postJSON("/api/nutrition/entries", {
        entryDate: nutritionDate.value,
        mealType: fields.mealType.value,
        foodName: fields.foodName.value,
        calories: numberValue(fields.calories),
        protein: numberValue(fields.protein),
        carbs: numberValue(fields.carbs),
        fat: numberValue(fields.fat),
        notes: fields.notes.value,
        isEstimate: fields.notes.value.toLowerCase().includes("estimate")
      });
      clearEntryForm();
      await loadDay();
      window.appUtils.setMessage(entryStatus, "Food saved.", "success");
    } catch (error) {
      window.appUtils.setMessage(entryStatus, error.message, "error");
    }
  });

  estimateButton.addEventListener("click", async function () {
    const description = estimateDescription.value.trim();
    if (!description) {
      window.appUtils.setMessage(estimateStatus, "Describe the food first.", "error");
      return;
    }

    try {
      window.appUtils.setMessage(estimateStatus, "Coach Fox is estimating...", null);
      const estimate = await window.appUtils.postJSON("/api/nutrition/estimate", { description });
      fields.foodName.value = estimate.foodName || description;
      fields.calories.value = estimate.calories || "";
      fields.protein.value = estimate.protein || "";
      fields.carbs.value = estimate.carbs || "";
      fields.fat.value = estimate.fat || "";
      fields.notes.value = estimate.note || "Estimate only. Check labels when possible.";
      window.appUtils.setMessage(estimateStatus, "Estimate filled. Edit before saving.", "success");
    } catch (error) {
      window.appUtils.setMessage(estimateStatus, error.message, "error");
    }
  });

  clearEntryButton.addEventListener("click", function () {
    clearEntryForm();
    window.appUtils.setMessage(entryStatus, "Cleared.", null);
  });

  nutritionDate.addEventListener("change", function () {
    loadDay().catch(function (error) {
      window.appUtils.setMessage(entryStatus, error.message, "error");
    });
  });

  nutritionDate.value = todayString();
  loadDay().catch(function (error) {
    window.appUtils.setMessage(entryStatus, error.message, "error");
    window.appUtils.setMessage(goalsStatus, error.message, "error");
  });
});
