document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginName = document.getElementById("loginName");
  const loginPassword = document.getElementById("loginPassword");
  const loginStatus = document.getElementById("loginStatus");
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "index.html";

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      window.appUtils.setMessage(loginStatus, "Checking password...", null);
      const response = await window.appUtils.postJSON("/api/auth/login", {
        name: loginName.value,
        password: loginPassword.value
      });
      window.appUtils.setMessage(loginStatus, response.message || "Logged in.", "success");
      window.location.href = next;
    } catch (error) {
      window.appUtils.setMessage(loginStatus, error.message, "error");
    }
  });
});
