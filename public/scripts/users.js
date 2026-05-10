document.addEventListener("DOMContentLoaded", async function () {
  const usersGrid = document.getElementById("usersGrid");
  const usersStatus = document.getElementById("usersStatus");

  function renderUsers(users, activeUser) {
    usersGrid.innerHTML = users.map(function (user) {
      const isActive = activeUser && Number(activeUser.id) === Number(user.id);
      return `
        <article class="panel user-card ${isActive ? "active-user-card" : ""}">
          <div class="panel-header">
            <div>
              <p class="eyebrow">${isActive ? "Current profile" : "Profile"}</p>
              <h2>${window.appUtils.escapeHtml(user.name)}</h2>
            </div>
            ${isActive ? '<span class="info-pill">Active</span>' : ""}
          </div>
          <p class="hero-copy">${Number(user.workoutCount || 0)} workout${Number(user.workoutCount || 0) === 1 ? "" : "s"} saved.</p>
          <div class="form-actions">
            <button type="button" class="button ${isActive ? "button-ghost" : "button-primary"}" data-user-id="${user.id}" ${isActive ? "disabled" : ""}>
              ${isActive ? "Selected" : `Switch to ${window.appUtils.escapeHtml(user.name)}`}
            </button>
          </div>
        </article>
      `;
    }).join("");

    usersGrid.querySelectorAll("button[data-user-id]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try {
          button.disabled = true;
          const data = await window.appUtils.putJSON("/api/users/active", { userId: Number(button.dataset.userId) });
          renderUsers(data.users || [], data.activeUser);
          window.appUtils.setMessage(usersStatus, data.message || "Profile switched.", "success");
        } catch (error) {
          window.appUtils.setMessage(usersStatus, error.message, "error");
        }
      });
    });
  }

  try {
    const data = await window.appUtils.getJSON("/api/users");
    renderUsers(data.users || [], data.activeUser);
    window.appUtils.setMessage(usersStatus, `Active profile: ${data.activeUser ? data.activeUser.name : "none"}.`, "success");
  } catch (error) {
    usersGrid.innerHTML = "";
    window.appUtils.setMessage(usersStatus, error.message, "error");
  }
});
