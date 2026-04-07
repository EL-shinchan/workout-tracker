document.addEventListener("DOMContentLoaded", async function () {
  const exerciseSelect = document.getElementById("exerciseSelect");
  const trackedSessions = document.getElementById("trackedSessions");
  const bestWeight = document.getElementById("bestWeight");
  const bestVolume = document.getElementById("bestVolume");
  const bestWeightDate = document.getElementById("bestWeightDate");
  const latestEntry = document.getElementById("latestEntry");
  const bestLiftHighlight = document.getElementById("bestLiftHighlight");
  const progressHistory = document.getElementById("progressHistory");
  const params = new URLSearchParams(window.location.search);

  let weightChart = null;
  let volumeChart = null;

  function createChart(canvasId, label, color) {
    const context = document.getElementById(canvasId);
    return new Chart(context, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: label,
            data: [],
            borderColor: color,
            backgroundColor: color,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color,
            pointBorderColor: color,
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#f4f1eb"
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#b9b2a9" },
            grid: { color: "rgba(255,255,255,0.08)" }
          },
          y: {
            ticks: { color: "#b9b2a9" },
            grid: { color: "rgba(255,255,255,0.08)" }
          }
        }
      }
    });
  }

  function applyPointHighlight(chart, dataPoints, highlightIndex, baseColor, highlightColor) {
    chart.data.datasets[0].data = dataPoints;
    chart.data.datasets[0].pointRadius = dataPoints.map(function (_, index) {
      return index === highlightIndex ? 8 : 4;
    });
    chart.data.datasets[0].pointHoverRadius = dataPoints.map(function (_, index) {
      return index === highlightIndex ? 10 : 6;
    });
    chart.data.datasets[0].pointBackgroundColor = dataPoints.map(function (_, index) {
      return index === highlightIndex ? highlightColor : baseColor;
    });
    chart.data.datasets[0].pointBorderColor = dataPoints.map(function (_, index) {
      return index === highlightIndex ? highlightColor : baseColor;
    });
  }

  function setEmptyState() {
    trackedSessions.textContent = "0";
    bestWeight.textContent = "0";
    bestVolume.textContent = "0";
    bestWeightDate.textContent = "No data yet";
    latestEntry.textContent = "No data yet";
    bestLiftHighlight.textContent = "No progress data yet for this exercise.";
    progressHistory.textContent = "No progress data yet for this exercise.";

    weightChart.data.labels = [];
    applyPointHighlight(weightChart, [], null, "#ff7a1a", "#ffd36e");
    weightChart.update();

    volumeChart.data.labels = [];
    applyPointHighlight(volumeChart, [], null, "#b7ff5a", "#d8ff9e");
    volumeChart.update();
  }

  async function loadProgress(exerciseId) {
    if (!exerciseId) {
      setEmptyState();
      return;
    }

    try {
      const data = await window.appUtils.getJSON(`/api/progress/exercise/${exerciseId}`);
      const summary = data.summary || [];

      if (summary.length === 0) {
        setEmptyState();
        return;
      }

      trackedSessions.textContent = summary.length;
      bestWeight.textContent = data.allTimeBest
        ? window.appUtils.formatNumber(data.allTimeBest.weight) + " kg"
        : "0";
      bestVolume.textContent = window.appUtils.formatNumber(Math.max.apply(null, summary.map(function (entry) {
        return Number(entry.totalVolume || 0);
      })));
      bestWeightDate.textContent = data.allTimeBest
        ? window.appUtils.formatDate(data.allTimeBest.workoutDate)
        : "No data yet";
      latestEntry.textContent = window.appUtils.formatDate(summary[summary.length - 1].workoutDate);

      if (data.allTimeBest) {
        bestLiftHighlight.innerHTML = `
          <div class="highlight-row">
            <span class="pr-badge">All-time best</span>
            <strong>${window.appUtils.escapeHtml(data.exercise.name)}</strong>
          </div>
          <p class="highlight-value">${window.appUtils.formatNumber(data.allTimeBest.weight)} kg</p>
          <p class="highlight-copy">Hit on ${window.appUtils.formatDate(data.allTimeBest.workoutDate)} during ${window.appUtils.escapeHtml(data.allTimeBest.title)}.</p>
        `;
      } else {
        bestLiftHighlight.textContent = "No progress data yet for this exercise.";
      }

      weightChart.data.labels = data.chartData.labels;
      applyPointHighlight(
        weightChart,
        data.chartData.topWeight,
        data.chartData.prPointIndex,
        "#ff7a1a",
        "#ffe27a"
      );
      weightChart.update();

      volumeChart.data.labels = data.chartData.labels;
      applyPointHighlight(
        volumeChart,
        data.chartData.totalVolume,
        data.chartData.prPointIndex,
        "#b7ff5a",
        "#f4f1eb"
      );
      volumeChart.update();

      progressHistory.innerHTML = data.history.map(function (entry) {
        const bestSet = entry.sets.reduce(function (best, set) {
          return Number(set.weight) > Number(best.weight) ? set : best;
        }, entry.sets[0]);

        return `
          <article class="entry-card ${entry.isCurrentAllTimeBest ? "current-pr-card" : ""}">
            <div class="entry-card-top">
              <div>
                <p class="mini-label">${window.appUtils.formatDate(entry.workoutDate)}</p>
                <h3>${window.appUtils.escapeHtml(entry.title)}</h3>
              </div>
              <div class="tag-row">
                ${entry.isCurrentAllTimeBest ? '<span class="pr-badge">Current PR</span>' : ""}
                ${entry.isPr ? '<span class="metric-pill pr-pill">PR session</span>' : ""}
                <span class="metric-pill">Best set ${window.appUtils.formatNumber(bestSet.weight)} × ${bestSet.reps}</span>
              </div>
            </div>
            ${entry.exerciseNotes ? `<p>${window.appUtils.escapeHtml(entry.exerciseNotes)}</p>` : ""}
            <div class="detail-set-list">
              ${entry.sets.map(function (set) {
                return `
                  <div class="detail-set-item">
                    <strong>Set ${set.setNumber}</strong>
                    <span>${window.appUtils.formatNumber(set.weight)} × ${set.reps}</span>
                    <span>${window.appUtils.escapeHtml(set.notes || "No notes")}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </article>
        `;
      }).join("");
    } catch (error) {
      progressHistory.textContent = error.message;
      setEmptyState();
    }
  }

  try {
    const exerciseData = await window.appUtils.getJSON("/api/exercises");
    const exercises = exerciseData.exercises || [];

    exerciseSelect.innerHTML = ['<option value="">Choose an exercise</option>']
      .concat(exercises.map(function (exercise) {
        return `<option value="${exercise.id}">${window.appUtils.escapeHtml(exercise.name)}</option>`;
      }))
      .join("");

    weightChart = createChart("weightChart", "Top weight", "#ff7a1a");
    volumeChart = createChart("volumeChart", "Total volume", "#b7ff5a");

    const selectedExercise = params.get("exercise");
    if (selectedExercise) {
      exerciseSelect.value = selectedExercise;
      await loadProgress(selectedExercise);
    } else {
      setEmptyState();
    }

    exerciseSelect.addEventListener("change", function () {
      loadProgress(exerciseSelect.value);
    });
  } catch (error) {
    progressHistory.textContent = error.message;
  }
});
