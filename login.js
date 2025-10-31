document.addEventListener("DOMContentLoaded", function() {
  // ...existing code for form and role select...

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
      // Find user in registered list - MODIFIED THIS SECTION
      const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      console.log("Searching for user:", { role, firstname, admission }); // Debug
      
      // Modified user lookup to not check role initially
      const user = users.find(u => 
        u.admission.toLowerCase() === admission.toLowerCase() &&
        u.firstname.toLowerCase() === firstname.toLowerCase()
      );

      if (!user) {
        alert("User not found. Please sign up first.");
        return;
      }

      // Build enhanced user object with role override
      const userWithFlags = {
        ...user,
        role: role, // Override with selected role
        isTeacher: role === "teacher",
        isClassTeacher: role === "classteacher",
        isAdmin: role === "admin"
      };

      // Debug log
      console.log("Login successful:", userWithFlags);

      // Save to localStorage
      localStorage.setItem("loggedInUser", JSON.stringify(userWithFlags));
      localStorage.setItem("userRole", role);

      // Redirect with delay to ensure storage is saved
      const redirect = redirectPaths[role];
      if (redirect) {
        setTimeout(() => {
          console.log("Redirecting to:", redirect);
          window.location.href = redirect;
        }, 500); // Increased delay to 0.5 seconds
      } else {
        alert("Invalid role configuration");
      }

    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login. Please try again.");
    }
  });
});