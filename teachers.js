document.addEventListener("DOMContentLoaded", function () {
  // ==============================
  // SUBJECTS BY GRADE RANGE
  // ==============================
  const gradeSubjects = {
    "1-3": ["Mathematics", "Kiswahili", "English", "Environmental Activities", "Social Studies", "Religious Studies (CRE)", "Creative Arts and Sports"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Religious Studies (CRE)", "Creative Arts", "Physical Health Education"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Business Studies", "Agriculture", "Social Studies", "Religious Studies (CRE)", "Health Education", "Pre-Technical Studies", "Sports and Physical Education"]
  };

  // ==============================
  // ELEMENTS
  // ==============================
  const gradeRangeSelect = document.getElementById("gradeRange");
  const actualGradeSelect = document.getElementById("actualGrade");
  const subjectSelect = document.getElementById("subject");
  const marksList = document.getElementById("marksList");
  const form = document.getElementById("marks-form");
  const exportExcelBtn = document.getElementById("exportExcelBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const admissionInput = document.getElementById("admissionNo");
  const studentNameInput = document.getElementById("studentName");

  // ==============================
  // AUTH CHECK
  // ==============================
  try {
    const stored = localStorage.getItem("loggedInUser");
    if (!stored) return (window.location.href = "login.html");
    const user = JSON.parse(stored);
    if (user.role !== "teacher") return (window.location.href = "login.html");
    document.getElementById("teacherName").textContent = user.firstname || "";
    window.currentTeacher = user;
  } catch {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  }

  // ==============================
  // LOGOUT
  // ==============================
  window.logout = function () {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
  };

  // ==============================
  // POPULATE GRADE RANGE → ACTUAL GRADE
  // ==============================
  gradeRangeSelect?.addEventListener("change", function () {
    const range = this.value;
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

  // ==============================
  // POPULATE SUBJECTS WHEN GRADE SELECTED
  // ==============================
  actualGradeSelect?.addEventListener("change", function () {
    const range = gradeRangeSelect.value;
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    (gradeSubjects[range] || []).forEach(sub => {
      const option = document.createElement("option");
      option.value = sub.toLowerCase().replace(/\s+/g, "-");
      option.textContent = sub;
      subjectSelect.appendChild(option);
    });
  });

  // ==============================
  // STUDENT LOOKUP
  // ==============================
  function getStudentByAdmission(adm) {
    if (!adm) return null;
    try {
      const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      return users.find(u => (u.admission || "").toLowerCase() === adm.toLowerCase()) || null;
    } catch {
      return null;
    }
  }

  admissionInput?.addEventListener("input", function () {
    const student = getStudentByAdmission(this.value.trim());
    studentNameInput.value = student ? `${student.firstname || ""} ${student.lastname || ""}`.trim() : "";
  });

  // ==============================
  // LOAD MARKS
  // ==============================
  function loadMarks() {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const teacherAdmission = window.currentTeacher?.admission;
    marksList.innerHTML = "";
    marks.filter(m => m.teacherAdmission === teacherAdmission).forEach((mark, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${mark.admissionNo}</td>
        <td>${mark.studentName}</td>
        <td>${mark.actualGrade}</td>
        <td>${(mark.subject || "").replace(/-/g, " ")}</td>
        <td>${mark.score}</td>
        <td>${mark.level}</td>
        <td>
          <button onclick="editMark(${i})">✏️</button>
          <button onclick="deleteMark(${i})">🗑️</button>
        </td>`;
      marksList.appendChild(row);
    });
  }
  loadMarks();

  // ==============================
  // ADD / EDIT MARKS
  // ==============================
  let editingIndex = null;
  form?.addEventListener("submit", e => {
    e.preventDefault();
    const admissionNo = admissionInput.value.trim();
    const gradeRange = gradeRangeSelect.value;
    const actualGrade = actualGradeSelect.value;
    const subject = subjectSelect.value;
    const score = parseFloat(document.getElementById("score").value);
    if (!admissionNo || !gradeRange || !actualGrade || !subject || isNaN(score)) return alert("Please fill all fields.");

    const student = getStudentByAdmission(admissionNo);
    const studentName = student ? `${student.firstname || ""} ${student.lastname || ""}`.trim() : studentNameInput.value;
    const level = score >= 80 ? "EE" : score >= 60 ? "ME" : score >= 40 ? "AE" : "BE";
    const teacherAdmission = window.currentTeacher?.admission;

    const newMark = { admissionNo, studentName, gradeRange, actualGrade, subject, score, level, teacherAdmission };
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    if (editingIndex !== null) marks[editingIndex] = newMark;
    else marks.push(newMark);
    localStorage.setItem("submittedMarks", JSON.stringify(marks));
    form.reset();
    studentNameInput.value = "";
    loadMarks();
    editingIndex = null;
  });

  window.editMark = function (i) {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const mark = marks[i];
    if (!mark) return;
    admissionInput.value = mark.admissionNo;
    studentNameInput.value = mark.studentName;
    gradeRangeSelect.value = mark.gradeRange;
    gradeRangeSelect.dispatchEvent(new Event("change"));
    setTimeout(() => {
      actualGradeSelect.value = mark.actualGrade;
      actualGradeSelect.dispatchEvent(new Event("change"));
      setTimeout(() => (subjectSelect.value = mark.subject), 50);
    }, 50);
    document.getElementById("score").value = mark.score;
    editingIndex = i;
  };

  window.deleteMark = function (i) {
    if (!confirm("Delete this record?")) return;
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    marks.splice(i, 1);
    localStorage.setItem("submittedMarks", JSON.stringify(marks));
    loadMarks();
  };

  // ==============================
  // EXPORT EXCEL / PDF
  // ==============================
  exportExcelBtn?.addEventListener("click", function () {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const teacherAdmission = window.currentTeacher?.admission;
    const filtered = marks.filter(m => m.teacherAdmission === teacherAdmission);
    if (!filtered.length) return alert("No marks to export.");

    const header = ["Admission No", "Student Name", "Grade", "Subject", "Score", "Level"];
    const aoa = [header];
    filtered.forEach(m => aoa.push([m.admissionNo, m.studentName, m.actualGrade, (m.subject || "").replace(/-/g, " "), m.score, m.level]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `marks_${teacherAdmission}.xlsx`);
  });

  exportPdfBtn?.addEventListener("click", function () {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const teacherAdmission = window.currentTeacher?.admission;
    const filtered = marks.filter(m => m.teacherAdmission === teacherAdmission);
    if (!filtered.length) return alert("No marks to export.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const headers = [["Admission No", "Student Name", "Grade", "Subject", "Score", "Level"]];
    const rows = filtered.map(m => [m.admissionNo, m.studentName, m.actualGrade, (m.subject || "").replace(/-/g, " "), m.score, m.level]);
    doc.autoTable({ head: headers, body: rows, startY: 20, styles: { fontSize: 8 }, headStyles: { fillColor: [41, 128, 185] } });
    doc.save(`marks_${teacherAdmission}.pdf`);
  });

  // ==============================
  // STUDY MATERIALS UPLOAD (WORKING)
  // ==============================
 // ==============================
// STUDY MATERIALS UPLOAD (FINAL FIX)
// ==============================
const materialGradeSelect = document.getElementById("materialGrade");
const materialSubjectSelect = document.getElementById("materialSubject");
const materialsListBody = document.getElementById("materialsList");
const materialsForm = document.getElementById("materials-form");

// ===== Populate subjects by grade =====
if (materialGradeSelect && materialSubjectSelect) {
  materialGradeSelect.addEventListener("change", function () {
    const grade = parseInt(this.value);
    materialSubjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';

    let range = "";
    if ([1, 2, 3].includes(grade)) range = "1-3";
    else if ([4, 5, 6].includes(grade)) range = "4-6";
    else if ([7, 8, 9].includes(grade)) range = "7-9";

    (gradeSubjects[range] || []).forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.toLowerCase().replace(/\s+/g, "-");
      opt.textContent = sub;
      materialSubjectSelect.appendChild(opt);
    });
  });
}

// ===== Load and render materials =====
function renderMaterialsList() {
  const all = JSON.parse(localStorage.getItem("studyMaterials") || "[]");
  const teacherId = window.currentTeacher?.admission || null;
  const list = teacherId ? all.filter(m => m.teacherId === teacherId) : all;

  materialsListBody.innerHTML = list.length
    ? list.map((m, i) => `
      <tr>
        <td>${m.grade}</td>
        <td>${m.subject}</td>
        <td>${m.title}</td>
        <td>${m.description}</td>
        <td><a href="${m.link}" target="_blank" rel="noopener">View</a></td>
        <td><button class="delete-material" data-index="${i}">🗑️</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" style="text-align:center;">No materials uploaded yet.</td></tr>`;

  // Delete handler
  document.querySelectorAll(".delete-material").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(e.currentTarget.dataset.index);
      const filtered = teacherId ? all.filter(m => m.teacherId === teacherId) : all;
      const target = filtered[idx];
      const globalIndex = all.findIndex(x => x.dateAdded === target.dateAdded);

      if (globalIndex >= 0) {
        all.splice(globalIndex, 1);
        localStorage.setItem("studyMaterials", JSON.stringify(all));
        renderMaterialsList();
      }
    });
  });
}

// ===== Handle upload form =====
materialsForm?.addEventListener("submit", e => {
  e.preventDefault();

  const grade = materialGradeSelect.value;
  const subject = materialSubjectSelect.options[materialSubjectSelect.selectedIndex]?.text || "";
  const title = document.getElementById("materialTitle")?.value.trim() || "";
  const description = document.getElementById("materialDescription")?.value.trim() || "";
  const fileInput = document.getElementById("materialLink");

  if (!grade || !subject || !title || !description)
    return alert("Please fill all required fields.");

  if (!fileInput?.files?.length)
    return alert("Please select a PDF or Word file.");

  const file = fileInput.files[0];
  const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const blobURL = URL.createObjectURL(file); // generates temporary local link

  const newMaterial = {
    grade,
    subject,
    title,
    description,
    link: blobURL,
    filename: safeName,
    teacherId: window.currentTeacher?.admission || "T001",
    dateAdded: new Date().toISOString(),
  };

  const materials = JSON.parse(localStorage.getItem("studyMaterials") || "[]");
  materials.push(newMaterial);
  localStorage.setItem("studyMaterials", JSON.stringify(materials));

  materialsForm.reset();
  renderMaterialsList();
  alert("Material uploaded successfully!");
});

// Load on start
renderMaterialsList();
});