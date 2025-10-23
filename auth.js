document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", loginUser);
  }
});

function loginUser(event) {
  event.preventDefault();

  const role = document.getElementById("role")?.value || "";
  const firstname = document.getElementById("firstname")?.value.trim() || "";
  const admission = document.getElementById("admission")?.value.trim() || "";

  if (!role || !firstname || !admission) {
    alert("Please fill in all fields.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");

  const match = users.find(u =>
    u.role === role &&
    u.admission === admission &&
    u.firstname.toLowerCase() === firstname.toLowerCase()
  );

  if (!match) {
    alert("User not found. Please sign up first.");
    return;
  }

  localStorage.setItem("loggedInUser", JSON.stringify(match));
  localStorage.setItem("userRole", role);

  window.location.href = role === "teacher"
    ? "teacher-dashboard.html"
    : "student-dashboard.html";
}