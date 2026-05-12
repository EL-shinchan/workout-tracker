document.addEventListener("DOMContentLoaded", function () {
  const nutritionDate = document.getElementById("nutritionDate");
  const fuelDayLabel = document.getElementById("fuelDayLabel");
  const fuelCaloriesMain = document.getElementById("fuelCaloriesMain");
  const fuelCaloriesMeta = document.getElementById("fuelCaloriesMeta");
  const fuelStatus = document.getElementById("fuelStatus");
  const mealBreakdown = document.getElementById("mealBreakdown");
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
  let entryWasEstimated = false;

  function todayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function numberValue(element) {
    const value = Number(element.value || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function formatMacro(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function selectedDayLabel() {
    if (!nutritionDate.value) {
      return "Today's fuel";
    }

    const [year, month, day] = nutritionDate.value.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    return selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  function getFuelStatus(goals, totals) {
    const calorieGoal = Number(goals.caloriesGoal || 0);
    const calories = Number(totals.calories || 0);
    const proteinGoal = Number(goals.proteinGoal || 0);
    const protein = Number(totals.protein || 0);

    if (calorieGoal <= 0) {
      return "Set a calorie goal to unlock your daily fuel summary.";
    }

    if (calories > calorieGoal) {
      return "Over goal today — adjust the next meal calmly.";
    }

    if (proteinGoal > 0 && protein < proteinGoal * 0.5 && calories > calorieGoal * 0.5) {
      return "Protein is behind — add a protein-focused food next.";
    }

    if (calories < calorieGoal * 0.8) {
      return "On track — keep logging as you go.";
    }

    return "Nice pace — finish the day steady.";
  }

  function renderFuelSummary(day) {
    const goals = day.goals || {};
    const totals = day.totals || {};
    const calorieGoal = Number(goals.caloriesGoal || 0);
    const calories = Number(totals.calories || 0);
    const remaining = calorieGoal - calories;

    fuelDayLabel.textContent = selectedDayLabel();

    if (calorieGoal <= 0) {
      fuelCaloriesMain.textContent = `${formatMacro(calories)} kcal eaten`;
      fuelCaloriesMeta.textContent = "Set a calorie goal to unlock your daily fuel summary.";
      fuelStatus.textContent = "No pressure — goals can be set on the right.";
      fuelStatus.className = "fuel-status neutral";
      return;
    }

    fuelCaloriesMain.textContent = `${formatMacro(calories)} / ${formatMacro(calorieGoal)} kcal`;
    fuelCaloriesMeta.textContent = remaining >= 0
      ? `${formatMacro(remaining)} kcal left`
      : `${formatMacro(Math.abs(remaining))} kcal over`;
    fuelStatus.textContent = getFuelStatus(goals, totals);
    fuelStatus.className = `fuel-status ${remaining < 0 ? "over" : "steady"}`;
  }

  function renderMacros(day) {
    const goals = day.goals || {};
    const totals = day.totals || {};
    const remaining = day.remaining || {};

    macroGrid.innerHTML = macros.map(function (macro) {
      const total = Number(totals[macro.key] || 0);
      const goal = Number(goals[macro.goalKey] || 0);
      const remain = Number(remaining[macro.key] || 0);
      const percent = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
      const remainingLabel = goal > 0
        ? (remain >= 0 ? `${formatMacro(remain)} ${macro.unit} left` : `${formatMacro(Math.abs(remain))} ${macro.unit} over`)
        : "No goal set";

      return `
        <article class="macro-card ${macro.accent}">
          <div class="macro-card-top">
            <span>${macro.label}</span>
            <strong>${formatMacro(total)}<small>${macro.unit}</small></strong>
          </div>
          <div class="macro-progress"><span style="width:${percent}%"></span></div>
          <p>${goal > 0 ? `Goal ${formatMacro(goal)} ${macro.unit}` : `No ${macro.label.toLowerCase()} goal`}</p>
          <small class="macro-remaining ${goal > 0 && remain < 0 ? "over" : ""}">${remainingLabel}</small>
        </article>
      `;
    }).join("");
  }

  function sumEntriesByMeal(entries) {
    const meals = ["breakfast", "lunch", "dinner", "snack"];
    const totalsByMeal = Object.fromEntries(meals.map((meal) => [meal, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      count: 0
    }]));

    (entries || []).forEach(function (entry) {
      const meal = totalsByMeal[entry.mealType] ? entry.mealType : "snack";
      totalsByMeal[meal].calories += Number(entry.calories || 0);
      totalsByMeal[meal].protein += Number(entry.protein || 0);
      totalsByMeal[meal].carbs += Number(entry.carbs || 0);
      totalsByMeal[meal].fat += Number(entry.fat || 0);
      totalsByMeal[meal].count += 1;
    });

    return totalsByMeal;
  }

  function mealTitle(meal) {
    return meal.charAt(0).toUpperCase() + meal.slice(1);
  }

  function renderMealBreakdown(entries) {
    const totalsByMeal = sumEntriesByMeal(entries);
    mealBreakdown.innerHTML = Object.entries(totalsByMeal).map(function ([meal, totals]) {
      const meta = totals.count > 0
        ? `${formatMacro(totals.calories)} kcal · ${formatMacro(totals.protein)}g protein · ${formatMacro(totals.carbs)}g carbs · ${formatMacro(totals.fat)}g fat`
        : "No food logged";

      return `
        <div class="meal-breakdown-card ${totals.count > 0 ? "has-food" : ""}">
          <span>${mealTitle(meal)}</span>
          <strong>${totals.count > 0 ? `${formatMacro(totals.calories)} kcal` : "—"}</strong>
          <p>${meta}</p>
        </div>
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
        const confirmed = window.confirm("Delete this food entry?");
        if (!confirmed) {
          return;
        }

        try {
          await window.appUtils.requestJSON(`/api/nutrition/entries/${id}`, { method: "DELETE" });
          await loadDay();
          window.appUtils.setMessage(entryStatus, "Food entry deleted.", "success");
        } catch (error) {
          window.appUtils.setMessage(entryStatus, error.message, "error");
        }
      });
    });
  }

  function renderDay(day) {
    const entries = Array.isArray(day.entries) ? day.entries : [];
    currentDay = day;
    renderFuelSummary(day);
    renderMacros(day);
    renderMealBreakdown(entries);
    renderGoals(day.goals || {});
    renderEntries(entries);
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
    entryWasEstimated = false;
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
        isEstimate: entryWasEstimated
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
      entryWasEstimated = true;
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
