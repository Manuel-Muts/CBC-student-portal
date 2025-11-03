document.addEventListener("DOMContentLoaded", () => {
  // ===== Elements =====
  const gradeSubjects = {
    "1-3": ["Mathematics", "Kiswahili", "English", "Environmental Activities", "Social Studies", "Religious Studies (CRE)", "Creative Arts and Sports"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Religious Studies (CRE)", "Creative Arts", "Physical Health Education"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Business Studies", "Agriculture", "Social Studies", "Religious Studies (CRE)", "Health Education", "Pre-Technical Studies", "Sports and Physical Education"]
  };

  const gradeRangeSelect = document.getElementById("gradeRange");
  const actualGradeSelect = document.getElementById("actualGrade");
  const subjectSelect = document.getElementById("subject");
  const assessmentSelect = document.getElementById("assessmentSelect");
  const marksList = document.getElementById("marksList");
  const form = document.getElementById("marks-form");
  const admissionInput = document.getElementById("admissionNo");
  const studentNameInput = document.getElementById("studentName");
  const logoutBtn = document.getElementById("logoutBtn");

  // Study materials elements
  const materialGrade = document.getElementById("materialGrade");
  const materialSubject = document.getElementById("materialSubject");
  const materialTitle = document.getElementById("materialTitle");
  const materialDescription = document.getElementById("materialDescription");
  const materialLink = document.getElementById("materialLink");
  const materialsForm = document.getElementById("materials-form");
  const materialsListEl = document.getElementById("materialsList");

  // ===== Authentication =====
  let teacher;
  try {
    const stored = localStorage.getItem("loggedInUser");
    if (!stored) throw new Error("No user");
    teacher = JSON.parse(stored);
    if (teacher.role !== "teacher") throw new Error("Unauthorized");
    document.getElementById("teacherName").textContent = teacher.firstname || "";
    window.currentTeacher = teacher;
  } catch {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  }

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  });

  // ===== Populate Assessment 1–5 =====
  if (assessmentSelect) {
    assessmentSelect.innerHTML = '<option value="">-- Select Assessment --</option>';
    for (let i = 1; i <= 5; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Assessment ${i}`;
      assessmentSelect.appendChild(opt);
    }
  }

  // ===== Populate Grades =====
  gradeRangeSelect?.addEventListener("change", () => {
    const range = gradeRangeSelect.value;
    actualGradeSelect.innerHTML = '<option value="">-- Select Grade --</option>';
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    const grades = range === "1-3" ? [1, 2, 3] : range === "4-6" ? [4, 5, 6] : range === "7-9" ? [7, 8, 9] : [];
    grades.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = `Grade ${g}`;
      actualGradeSelect.appendChild(opt);
    });
  });

  // ===== Populate Subjects =====
  actualGradeSelect?.addEventListener("change", () => {
    const range = gradeRangeSelect.value;
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    (gradeSubjects[range] || []).forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.toLowerCase().replace(/\s+/g, "-");
      opt.textContent = sub;
      subjectSelect.appendChild(opt);
    });
  });

  // ===== Student Name Auto-Fill =====
  function getStudentByAdmission(adm) {
    if (!adm) return null;
    try {
      const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      return users.find(u => (u.admission || "").toLowerCase() === adm.toLowerCase()) || null;
    } catch {
      return null;
    }
  }

  admissionInput?.addEventListener("input", () => {
    const student = getStudentByAdmission(admissionInput.value.trim());
    studentNameInput.value = student ? `${student.firstname || ""} ${student.lastname || ""}`.trim() : "";
  });

  // ===== Save Mark =====
  function saveMark(admNo, grade, term, year, subject, assessment, score) {
    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");

    const existing = marks.find(m =>
      m.admissionNo === admNo &&
      m.grade === grade &&
      m.term === term &&
      m.year === year &&
      m.subject === subject &&
      m.assessment === assessment
    );

    if (existing) {
      existing.score = score;
    } else {
      marks.push({
        admissionNo: admNo,
        studentName: studentNameInput.value,
        grade,
        term,
        year,
        subject,
        assessment,
        score,
        teacherAdmission: teacher.admission
      });
    }

    localStorage.setItem("submittedMarks", JSON.stringify(marks));

    // 🔄 Sync for student/report dashboards
    const studentMarks = marks.filter(m => m.admissionNo === admNo);
    localStorage.setItem("studentReportMarks", JSON.stringify(studentMarks));
  }

  // ===== Load Marks =====
  function loadMarks() {
    marksList.innerHTML = "";
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    marks
      .filter(m => m.teacherAdmission === teacher.admission)
      .forEach((mark, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${mark.admissionNo}</td>
          <td>${mark.studentName}</td>
          <td>${mark.grade}</td>
          <td>${(mark.subject || "").replace(/-/g, " ")}</td>
          <td>${mark.score}</td>
          <td>${mark.term || "—"}</td>
          <td>${mark.year || "—"}</td>
          <td>Assessment ${mark.assessment || 1}</td>
          <td>
            <button onclick="editMark(${i})">✏️</button>
            <button onclick="deleteMark(${i})">🗑️</button>
          </td>`;
        marksList.appendChild(row);
      });
  }

  loadMarks();

  // ===== Add / Edit Marks =====
  let editingIndex = null;
  form?.addEventListener("submit", e => {
    e.preventDefault();
    const admissionNo = admissionInput.value.trim();
    const grade = actualGradeSelect.value;
    const subject = subjectSelect.value;
    const score = parseFloat(document.getElementById("score").value);
    const term = document.getElementById("term").value;
    const year = document.getElementById("year").value;
    const assessment = Number(assessmentSelect.value);

    if (!admissionNo || !grade || !subject || isNaN(score) || !term || !year || !assessment)
      return alert("Please fill all fields including Assessment number.");

    saveMark(admissionNo, grade, term, year, subject, assessment, score);
    form.reset();
    studentNameInput.value = "";
    loadMarks();
    editingIndex = null;
  });

  // ===== Edit/Delete =====
  window.editMark = function (i) {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const mark = marks[i];
    if (!mark) return;
    admissionInput.value = mark.admissionNo;
    studentNameInput.value = mark.studentName;
    actualGradeSelect.value = mark.grade;
    actualGradeSelect.dispatchEvent(new Event("change"));
    setTimeout(() => (subjectSelect.value = mark.subject), 50);
    document.getElementById("score").value = mark.score;
    assessmentSelect.value = mark.assessment;
    editingIndex = i;
  };

  window.deleteMark = function (i) {
    if (!confirm("Delete this record?")) return;
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    marks.splice(i, 1);
    localStorage.setItem("submittedMarks", JSON.stringify(marks));
    loadMarks();
  };

  // =========================
  // STUDY MATERIALS HANDLING
  // =========================
  materialGrade?.addEventListener("change", () => {
    const grade = materialGrade.value;
    materialSubject.innerHTML = '<option value="">-- Select Subject --</option>';
    const range = grade <= 3 ? "1-3" : grade <= 6 ? "4-6" : "7-9";
    (gradeSubjects[range] || []).forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.toLowerCase().replace(/\s+/g, "-");
      opt.textContent = sub;
      materialSubject.appendChild(opt);
    });
  });

  materialsForm?.addEventListener("submit", e => {
    e.preventDefault();
    const materials = JSON.parse(localStorage.getItem("studyMaterials") || "[]");
    const newMaterial = {
      grade: materialGrade.value,
      subject: materialSubject.value,
      title: materialTitle.value,
      description: materialDescription.value,
      fileName: materialLink.files[0]?.name || "N/A",
      teacherAdmission: teacher.admission
    };
    materials.push(newMaterial);
    localStorage.setItem("studyMaterials", JSON.stringify(materials));
    materialsForm.reset();
    loadMaterials();
  });

  function loadMaterials() {
    materialsListEl.innerHTML = "";
    const materials = JSON.parse(localStorage.getItem("studyMaterials") || "[]")
      .filter(m => m.teacherAdmission === teacher.admission);

    materials.forEach((mat, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${mat.grade}</td>
        <td>${mat.subject.replace(/-/g, " ")}</td>
        <td>${mat.title}</td>
        <td>${mat.description}</td>
        <td>${mat.fileName}</td>
        <td><button onclick="deleteMaterial(${i})">🗑️</button></td>`;
      materialsListEl.appendChild(row);
    });
  }

  window.deleteMaterial = function (i) {
    if (!confirm("Delete this material?")) return;
    let materials = JSON.parse(localStorage.getItem("studyMaterials") || "[]");
    materials.splice(i, 1);
    localStorage.setItem("studyMaterials", JSON.stringify(materials));
    loadMaterials();
  };

  loadMaterials();
});
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const allMarks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");

  if (!user) {
    alert("Please log in again.");
    window.location.href = "login.html";
    return;
  }

  // Filter marks for this student
  const studentMarks = allMarks.filter(m => m.admissionNo === user.admission);

  // Save for report page use
  localStorage.setItem("studentReportMarks", JSON.stringify(studentMarks));

  // Optional: populate dashboard with student info
  document.getElementById("studentName").textContent = `${user.firstname} ${user.lastname || ""}`;
  document.getElementById("studentGrade").textContent = user.grade || "N/A";
  document.getElementById("studentAdmission").textContent = user.admission;

  // Show latest selected term, year, and assessment if available
  const latest = studentMarks[studentMarks.length - 1];
  if (latest) {
    document.getElementById("currentTerm").textContent = latest.term;
    document.getElementById("currentYear").textContent = latest.year;
    document.getElementById("currentAssessment").textContent = latest.assessment || "N/A";
  }
});
