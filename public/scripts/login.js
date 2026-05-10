document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginName = document.getElementById("loginName");
  const loginPassword = document.getElementById("loginPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const confirmPasswordField = document.getElementById("confirmPasswordField");
  const loginStatus = document.getElementById("loginStatus");
  const loginTitle = document.getElementById("loginTitle");
  const loginCopy = document.getElementById("loginCopy");
  const showLoginButton = document.getElementById("showLoginButton");
  const showSignupButton = document.getElementById("showSignupButton");
  const submitLoginButton = document.getElementById("submitLoginButton");
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || "index.html";

  let mode = "login";

  function setMode(nextMode) {
    mode = nextMode;
    const isSignup = mode === "signup";
    loginTitle.textContent = isSignup ? "Create account" : "Welcome back";
    loginCopy.textContent = isSignup ? "Choose a username and password. Your workouts start empty." : "Log in with your username and password.";
    confirmPasswordField.classList.toggle("hidden", !isSignup);
    confirmPassword.required = isSignup;
    submitLoginButton.textContent = isSignup ? "Create account" : "Enter Iron Log";
    showLoginButton.className = `button ${isSignup ? "button-ghost" : "button-primary"}`;
    showSignupButton.className = `button ${isSignup ? "button-primary" : "button-ghost"}`;
    window.appUtils.setMessage(loginStatus, isSignup ? "Create a new local account." : "Ready.", null);
  }

  showLoginButton.addEventListener("click", function () { setMode("login"); });
  showSignupButton.addEventListener("click", function () { setMode("signup"); });

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      if (mode === "signup" && loginPassword.value !== confirmPassword.value) {
        throw new Error("Passwords do not match.");
      }

      window.appUtils.setMessage(loginStatus, mode === "signup" ? "Creating account..." : "Checking password...", null);
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const response = await window.appUtils.postJSON(endpoint, {
        name: loginName.value.trim(),
        password: loginPassword.value
      });
      window.appUtils.setMessage(loginStatus, response.message || "Success.", "success");
      window.location.href = next;
    } catch (error) {
      window.appUtils.setMessage(loginStatus, error.message, "error");
    }
  });

  setMode("login");
});
