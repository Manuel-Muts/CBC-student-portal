document.addEventListener("DOMContentLoaded", function () {
  const teacherSelect = document.getElementById("teacherSelect");
  const classTeacherSelect = document.getElementById("classTeacherSelect");
  const gradeRangeSelect = document.getElementById("gradeRange");
  const gradesSelect = document.getElementById("gradesSelect");
  const subjectsSelect = document.getElementById("subjectsSelect");

  const subjectAllocTable = document.querySelector("#subjectAllocTable tbody");
  const classAllocTable = document.querySelector("#classAllocTable tbody");

  const gradeSubjects = {
    "1-3": ["Mathematics", "Kiswahili", "English", "Environmental Activities", "Social Studies", "Religious Studies(CRE)", "Creative Arts and Sports"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Religious Education(CRE)", "Creative Arts and Sports"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Agriculture", "Religious Studies(CRE)", "Creative Arts and Sports"]
  };

  // ===============================
  // POPULATE TEACHER LISTS
  // ===============================
  const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
  const teachers = users.filter(u => u.role === "teacher");

  teachers.forEach(t => {
    const opt1 = document.createElement("option");
    const opt2 = document.createElement("option");
    opt1.value = opt2.value = t.admission;
    opt1.textContent = opt2.textContent = `${t.firstname} ${t.lastname || ""} (${t.admission})`;
    teacherSelect.appendChild(opt1);
    classTeacherSelect.appendChild(opt2);
  });

  // ===============================
  // UPDATE GRADES + SUBJECTS
  // ===============================
  gradeRangeSelect.addEventListener("change", function () {
    gradesSelect.innerHTML = "";
    subjectsSelect.innerHTML = "";

    const range = this.value;
    const grades =
      range === "1-3" ? [1, 2, 3] :
      range === "4-6" ? [4, 5, 6] :
      range === "7-9" ? [7, 8, 9] : [];

    grades.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = `Grade ${g}`;
      gradesSelect.appendChild(opt);
    });

    (gradeSubjects[range] || []).forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.toLowerCase().replace(/\s+/g, "-");
      opt.textContent = s;
      subjectsSelect.appendChild(opt);
    });
  });

  // ===============================
  // SAVE SUBJECT ALLOCATION
  // ===============================
  document.getElementById("subjectAllocForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const teacherAdmission = teacherSelect.value;
    const gradeRange = gradeRangeSelect.value;
    const selectedGrades = Array.from(gradesSelect.selectedOptions).map(o => parseInt(o.value));
    const selectedSubjects = Array.from(subjectsSelect.selectedOptions).map(o => o.value);

    if (!teacherAdmission || !gradeRange || !selectedGrades.length || !selectedSubjects.length)
      return alert("Please select all required fields.");

    let allocations = JSON.parse(localStorage.getItem("teacherSubjectAllocations") || "[]");
    allocations.push({ teacherAdmission, gradeRange, grades: selectedGrades, subjects: selectedSubjects });
    localStorage.setItem("teacherSubjectAllocations", JSON.stringify(allocations));
    this.reset();
    gradeRangeSelect.dispatchEvent(new Event("change"));
    loadSubjectAllocations();
  });

  // ===============================
  // SAVE CLASS TEACHER ALLOCATION + SEND EMAIL
  // ===============================
  document.getElementById("classAllocForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const teacherAdmission = classTeacherSelect.value;
    const grade = parseInt(document.getElementById("classGradeSelect").value);
    if (!teacherAdmission || !grade) return alert("Please select all fields.");

    let classAlloc = JSON.parse(localStorage.getItem("classTeacherAllocations") || "[]");

    if (classAlloc.some(a => a.grade === grade)) {
      return alert("A class teacher is already assigned to this grade.");
    }

    const password = "CT" + Math.random().toString(36).substring(2, 8).toUpperCase();

    let users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
    const teacherIndex = users.findIndex(u => u.admission === teacherAdmission);

    if (teacherIndex === -1) return alert("Teacher not found in user records.");

    users[teacherIndex].ct_password = password;
    users[teacherIndex].isClassTeacher = true;
    users[teacherIndex].classGrade = `Grade ${grade}`;
    localStorage.setItem("registeredUsers", JSON.stringify(users));

    classAlloc.push({ teacherAdmission, grade, classGrade: `Grade ${grade}` });
    localStorage.setItem("classTeacherAllocations", JSON.stringify(classAlloc));

    const teacher = users[teacherIndex];
    sendEmailToTeacher(teacher.email, teacher.firstname, grade, password);

    this.reset();
    loadClassAllocations();
    alert(`✅ Class Teacher assigned successfully and credentials sent to ${teacher.email}`);
  });

  // ===============================
  // EMAIL SENDER
  // ===============================
  function sendEmailToTeacher(to_email, to_name, grade, password) {
    const serviceID = "service_5b2j238";
    const templateID = "template_v936gzy";

    const params = {
      to_email,
      to_name,
      grade,
      password
    };

    emailjs.send(serviceID, templateID, params)
      .then(() => console.log("Email sent successfully to", to_email))
      .catch(err => {
        console.error("Failed to send email:", err);
        alert("Email sending failed. Check EmailJS setup.");
      });
  }

  // ===============================
  // DISPLAY ALLOCATIONS
  // ===============================
  function loadSubjectAllocations() {
    const allocations = JSON.parse(localStorage.getItem("teacherSubjectAllocations") || "[]");
    subjectAllocTable.innerHTML = "";
    allocations.forEach((a, i) => {
      const teacher = teachers.find(t => t.admission === a.teacherAdmission);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${teacher ? teacher.firstname + " " + teacher.lastname : "Unknown"}</td>
        <td>${a.gradeRange}</td>
        <td>${a.grades.join(", ")}</td>
        <td>${a.subjects.map(s => s.replace(/-/g, " ")).join(", ")}</td>
        <td><button onclick="deleteSubjectAlloc(${i})">🗑️</button></td>
      `;
      subjectAllocTable.appendChild(row);
    });
  }

  function loadClassAllocations() {
    const allocations = JSON.parse(localStorage.getItem("classTeacherAllocations") || "[]");
    classAllocTable.innerHTML = "";
    allocations.forEach((a, i) => {
      const teacher = teachers.find(t => t.admission === a.teacherAdmission);
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${teacher ? teacher.firstname + " " + teacher.lastname : "Unknown"}</td>
        <td>Grade ${a.grade}</td>
        <td><button onclick="deleteClassAlloc(${i})">🗑️</button></td>
      `;
      classAllocTable.appendChild(row);
    });
  }

  // ===============================
  // DELETE ALLOCATIONS
  // ===============================
  window.deleteSubjectAlloc = function (index) {
    if (!confirm("Delete this allocation?")) return;
    let allocations = JSON.parse(localStorage.getItem("teacherSubjectAllocations") || "[]");
    allocations.splice(index, 1);
    localStorage.setItem("teacherSubjectAllocations", JSON.stringify(allocations));
    loadSubjectAllocations();
  };

  window.deleteClassAlloc = function (index) {
    if (!confirm("Delete this class allocation?")) return;
    let allocations = JSON.parse(localStorage.getItem("classTeacherAllocations") || "[]");
    allocations.splice(index, 1);
    localStorage.setItem("classTeacherAllocations", JSON.stringify(allocations));
    loadClassAllocations();
  };

  // Load initial tables
  loadSubjectAllocations();
  loadClassAllocations();
});

// ===============================
// PROTECT ADMIN ROUTE + REFRESH BUTTON
// ===============================
document.addEventListener('DOMContentLoaded', function () {
  const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  if (!user || user.role !== 'admin') {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('logoutBtn')?.addEventListener('click', function () {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    window.location.href = 'login.html';
  });

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Refreshing...";

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });
  }
});
