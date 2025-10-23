document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signupForm");
  if (form) {
    form.addEventListener("submit", signupUser);
  }
});

function signupUser(event) {
  event.preventDefault();

  const firstname = document.getElementById("firstname")?.value.trim();
  const gender = document.getElementById("gender")?.value;
  const dob = document.getElementById("dob")?.value;
  const role = document.getElementById("role")?.value;
  const admission = document.getElementById("admission")?.value.trim();

  if (!firstname || !gender || !dob || !role || !admission) {
    alert("Please fill in all fields.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");

  const exists = users.some(u => u.admission === admission && u.role === role);
  if (exists) {
    alert("User already exists. Please login.");
    return;
  }

  const newUser = {
    firstname,
    gender,
    dob,
    role,
    admission
  };

  users.push(newUser);
  localStorage.setItem("registeredUsers", JSON.stringify(users));

  alert("Signup successful! You can now login.");
  window.location.href = "login.html";
}