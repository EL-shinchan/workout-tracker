document.addEventListener("DOMContentLoaded", async function () {
  const configForm = document.getElementById("configForm");
  const processorEnabled = document.getElementById("processorEnabled");
  const processorTime = document.getElementById("processorTime");
  const processorTimezone = document.getElementById("processorTimezone");
  const processorFrequency = document.getElementById("processorFrequency");
  const processorState = document.getElementById("processorState");
  const reloadConfigButton = document.getElementById("reloadConfigButton");
  const configStatus = document.getElementById("configStatus");
  const configJsonPreview = document.getElementById("configJsonPreview");

  function renderConfig(payload) {
    const config = payload.config || {};
    const photoProcessor = config.photoProcessor || {};
    const allowedTimezones = payload.allowedTimezones || [photoProcessor.timezone || "Asia/Shanghai"];

    processorTimezone.innerHTML = allowedTimezones.map(function (timezone) {
      return `<option value="${window.appUtils.escapeHtml(timezone)}">${window.appUtils.escapeHtml(timezone)}</option>`;
    }).join("");

    processorEnabled.checked = Boolean(photoProcessor.enabled);
    processorTime.value = photoProcessor.time || "22:00";
    processorTimezone.value = photoProcessor.timezone || "Asia/Shanghai";
    processorFrequency.value = photoProcessor.frequency || "daily";
    processorState.textContent = processorEnabled.checked ? "Enabled" : "Disabled";
    configJsonPreview.textContent = JSON.stringify(config, null, 2);
  }

  async function loadConfig() {
    window.appUtils.setMessage(configStatus, "Loading config...", null);
    const payload = await window.appUtils.getJSON("/api/config");
    renderConfig(payload);
    window.appUtils.setMessage(configStatus, "Config loaded.", "success");
  }

  configForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
      photoProcessor: {
        enabled: processorEnabled.checked,
        time: processorTime.value,
        timezone: processorTimezone.value,
        frequency: processorFrequency.value
      }
    };

    try {
      window.appUtils.setMessage(configStatus, "Saving config and syncing OpenClaw cron...", null);
      const response = await window.appUtils.putJSON("/api/config", payload);
      renderConfig({ config: response.config, allowedTimezones: Array.from(processorTimezone.options).map((option) => option.value) });
      window.appUtils.setMessage(configStatus, response.message || "Config saved.", "success");
    } catch (error) {
      window.appUtils.setMessage(configStatus, error.message, "error");
    }
  });

  reloadConfigButton.addEventListener("click", function () {
    loadConfig().catch(function (error) {
      window.appUtils.setMessage(configStatus, error.message, "error");
    });
  });

  loadConfig().catch(function (error) {
    window.appUtils.setMessage(configStatus, error.message, "error");
  });
});
