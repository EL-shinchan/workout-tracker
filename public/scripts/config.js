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
  const accountName = document.getElementById("accountName");
  const accountState = document.getElementById("accountState");
  const accountStatus = document.getElementById("accountStatus");
  const logoutButton = document.getElementById("logoutButton");
  const deleteAccountButton = document.getElementById("deleteAccountButton");

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

  async function loadAccount() {
    try {
      const payload = await window.appUtils.getJSON("/api/auth/me");
      accountName.textContent = payload.user ? payload.user.name : "Logged in";
      accountState.textContent = "Active";
      window.appUtils.setMessage(accountStatus, "Account loaded.", "success");
    } catch (error) {
      window.appUtils.setMessage(accountStatus, error.message, "error");
    }
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

  logoutButton.addEventListener("click", async function () {
    try {
      await window.appUtils.postJSON("/api/auth/logout", {});
      window.location.href = "login.html";
    } catch (error) {
      window.appUtils.setMessage(accountStatus, error.message, "error");
    }
  });

  deleteAccountButton.addEventListener("click", async function () {
    const password = window.prompt("Type your password to permanently delete this account and its workouts.");
    if (!password) {
      return;
    }

    const confirmed = window.confirm("This permanently deletes this account and all workouts under it. Continue?");
    if (!confirmed) {
      return;
    }

    try {
      await window.appUtils.requestJSON("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      window.location.href = "login.html";
    } catch (error) {
      window.appUtils.setMessage(accountStatus, error.message, "error");
    }
  });

  reloadConfigButton.addEventListener("click", function () {
    loadConfig().catch(function (error) {
      window.appUtils.setMessage(configStatus, error.message, "error");
    });
  });

  loadAccount();

  loadConfig().catch(function (error) {
    window.appUtils.setMessage(configStatus, error.message, "error");
  });
});
