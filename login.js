document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const admissionField = document.getElementById("admission");
  const ctPasswordField = document.createElement("input");
  ctPasswordField.type = "password";
  ctPasswordField.id = "ctPassword";
  ctPasswordField.placeholder = "Enter your Class Teacher password";
  ctPasswordField.style.display = "none";
  ctPasswordField.required = false;
  form.insertBefore(ctPasswordField, form.querySelector("button"));

  const redirectPaths = {
    student: "student-dashboard.html",
    teacher: "teacher-dashboard.html",
    classteacher: "analysis.html",
    admin: "admin.html"
  };

  const roleSelect = document.getElementById("role");
  roleSelect.addEventListener("change", () => {
    const selected = roleSelect.value;
    if (selected === "classteacher") {
      admissionField.style.display = "none";
      admissionField.required = false;
      ctPasswordField.style.display = "block";
      ctPasswordField.required = true;
    } else {
      admissionField.style.display = "block";
      admissionField.required = true;
      ctPasswordField.style.display = "none";
      ctPasswordField.required = false;
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const role = roleSelect.value;
    const firstname = document.getElementById("firstname").value.trim();
    const admission = admissionField.value.trim();
    const ctPassword = ctPasswordField.value.trim();

    if (!role || !firstname || (role !== "classteacher" && !admission)) {
      alert("Please fill in all required fields");
      return;
    }

    let users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
    let user;

    // ===============================
    // FIND USER BY NAME AND ID
    // ===============================
    if (role === "classteacher") {
      // Find a teacher who is assigned as class teacher
      user = users.find(
        (u) =>
          u.firstname.toLowerCase() === firstname.toLowerCase() &&
          u.isClassTeacher === true
      );

      if (!user) {
        alert("You are not assigned as a class teacher.");
        return;
      }

      if (ctPassword !== user.ct_password) {
        alert("Incorrect Class Teacher password!");
        return;
      }
    } else {
      // Normal roles (student, teacher, admin)
      user = users.find(
        (u) =>
          u.firstname.toLowerCase() === firstname.toLowerCase() &&
          u.admission.toLowerCase() === admission.toLowerCase()
      );

      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      if (role === "classteacher" && !user.isClassTeacher) {
        alert("You are not assigned as a class teacher.");
        return;
      }
    }

    // ===============================
    // DETERMINE EFFECTIVE ROLE
    // ===============================
    let effectiveRole = role;
    if (role === "classteacher" && user.isClassTeacher) {
      effectiveRole = "classteacher";
    } else if (role === "teacher") {
      effectiveRole = "teacher";
    }

    // ===============================
    // SAVE SESSION + REDIRECT
    // ===============================
    const userWithFlags = {
      ...user,
      role: effectiveRole,
      isTeacher: effectiveRole === "teacher",
      isClassTeacher: effectiveRole === "classteacher",
      isAdmin: effectiveRole === "admin"
    };

    localStorage.setItem("loggedInUser", JSON.stringify(userWithFlags));
    localStorage.setItem("userRole", effectiveRole);

    console.log("Login successful:", userWithFlags);

    const redirect = redirectPaths[effectiveRole];
    if (redirect) {
      setTimeout(() => {
        window.location.href = redirect;
      }, 400);
    } else {
      alert("Invalid role configuration.");
    }
  });
});
