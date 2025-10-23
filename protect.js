document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("loggedInUser");
  const role = localStorage.getItem("userRole");

  if (!user || !role) {
    alert("Access denied. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const username = JSON.parse(user);
  const welcomeText = document.getElementById("welcomeText");

  if (welcomeText) {
    if (role === "teacher") {
      welcomeText.textContent = `Welcome, Teacher ${username}`;
    } else if (role === "student") {
      welcomeText.textContent = `Welcome, Student ${username}`;
    }
  }
});
