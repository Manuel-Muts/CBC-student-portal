document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const redirectPaths = {
    student: "student-dashboard.html",
    teacher: "teacher-dashboard.html",
    classteacher: "analysis.html",
    admin: "admin.html"
  };

  form.addEventListener("submit", function(e) {
    e.preventDefault();

    const role = document.getElementById("role").value;
    const firstname = document.getElementById("firstname").value.trim();
    const admission = document.getElementById("admission").value.trim();

    if (!role || !firstname || !admission) {
      alert("Please fill in all fields");
      return;
    }

    // Validate ID format
    const validFormat = {
      student: /^[A-Z0-9]+$/i,
      teacher: /^T[A-Z0-9]+$/i,
      classteacher: /^CT[A-Z0-9]+$/i,
      admin: /^ADMIN[A-Z0-9]+$/i
    };

    if (!validFormat[role].test(admission)) {
      alert(`Invalid ID format for ${role}. Please check the format guide.`);
      return;
    }

    try {
      let users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      console.log("Searching for user:", { role, firstname, admission });

      // ============================
      // FIND USER (Teacher or ClassTeacher)
      // ============================
      let user = users.find(u =>
        u.firstname.toLowerCase() === firstname.toLowerCase() &&
        u.admission.toLowerCase() === admission.toLowerCase()
      );

      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      // ============================
      // ROLE VALIDATION LOGIC
      // ============================
      let effectiveRole = role;

      if (role === "classteacher") {
        // If they are trying to log in as class teacher
        if (user.isClassTeacher && user.ct_password) {
          effectiveRole = "classteacher";
        } else {
          alert("You are not assigned as a class teacher.");
          return;
        }
      }

      // ============================
      // TEACHER DUAL LOGIN LOGIC
      // ============================
      // Allow teacher to log in with teacher ID or CT password
      if (role === "teacher") {
        // Normal teacher login (uses admission)
        effectiveRole = "teacher";
      } else if (role === "classteacher") {
        // Class teacher login (requires CT password)
        const enteredPass = prompt("Enter your Class Teacher password (starts with CT):");
        if (enteredPass !== user.ct_password) {
          alert("Incorrect Class Teacher password!");
          return;
        }
      }

      // ============================
      // SAVE SESSION + REDIRECT
      // ============================
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

      // Redirect to appropriate dashboard
      const redirect = redirectPaths[effectiveRole];
      if (redirect) {
        setTimeout(() => {
          window.location.href = redirect;
        }, 400);
      } else {
        alert("Invalid role configuration.");
      }

    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
    }
  });
});
