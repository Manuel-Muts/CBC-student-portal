document.addEventListener("DOMContentLoaded", function () {
  // ==============================
  // SUBJECTS BY GRADE RANGE
  // ==============================
  const gradeSubjects = {
    "1-3": ["Literacy", "Numeracy", "Environmental Activities", "Hygiene and Nutrition", "Religious Activities", "Movement and Creative Activities"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Science and Technology", "Social Studies", "Religious Education", "Creative Arts", "Physical and Health Education"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Agriculture", "Business Studies", "Religious Education", "Sports and Physical Education", "Visual Arts", "Performing Arts"]
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
  gradeRangeSelect.addEventListener("change", function () {
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
  actualGradeSelect.addEventListener("change", function () {
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
  // STUDENT LOOKUP BY ADMISSION
  // ==============================
  function getStudentByAdmission(adm) {
    if (!adm) return null;
    try {
      const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      return users.find(u => (u.admission || "").toString().toLowerCase() === adm.toString().toLowerCase()) || null;
    } catch {
      return null;
    }
  }

  // AUTO-FILL STUDENT NAME
  admissionInput?.addEventListener("input", function () {
    const adm = this.value.trim();
    const student = getStudentByAdmission(adm);
    if (student) {
      const fullName = `${student.firstname || ""}${student.lastname ? " " + student.lastname : ""}`.trim();
      studentNameInput.value = fullName;
    } else {
      studentNameInput.value = "";
    }
  });

  // ==============================
  // LOAD MARKS
  // ==============================
  function loadMarks() {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const teacherAdmission = window.currentTeacher?.admission;
    marksList.innerHTML = "";

    marks.filter(m => m.teacherAdmission === teacherAdmission).forEach((mark, index) => {
      const resolvedName = mark.studentName || (getStudentByAdmission(mark.admissionNo)
        ? `${getStudentByAdmission(mark.admissionNo).firstname || ""}${getStudentByAdmission(mark.admissionNo).lastname ? " " + getStudentByAdmission(mark.admissionNo).lastname : ""}`.trim()
        : "");
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${mark.admissionNo}</td>
        <td>${resolvedName}</td>
        <td>${mark.actualGrade}</td>
        <td>${(mark.subject || "").replace(/-/g, " ")}</td>
        <td>${mark.score}</td>
        <td>${mark.level}</td>
        <td>
          <button class="edit-btn" onclick="editMark(${index})">✏️</button>
          <button class="delete-btn" onclick="deleteMark(${index})">🗑️</button>
        </td>`;
      marksList.appendChild(row);
    });
  }
  loadMarks();

  // ==============================
  // ADD / EDIT MARKS
  // ==============================
  let editingIndex = null;
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const admissionNo = admissionInput.value.trim();
    const gradeRange = gradeRangeSelect.value;
    const actualGrade = actualGradeSelect.value;
    const subject = subjectSelect.value;
    const score = parseFloat(document.getElementById("score").value);

    if (!admissionNo || !gradeRange || !actualGrade || !subject || isNaN(score)) {
      return alert("Please fill all fields correctly.");
    }

    const student = getStudentByAdmission(admissionNo);
    const studentName = student
      ? `${student.firstname || ""}${student.lastname ? " " + student.lastname : ""}`.trim()
      : studentNameInput.value;

    // LEVEL
    let level = "";
    if (score >= 80) level = "Excellent";
    else if (score >= 65) level = "Good";
    else if (score >= 50) level = "Fair";
    else level = "Needs Improvement";

    const teacherAdmission = window.currentTeacher?.admission || "";
    const newMark = {
      admissionNo,
      studentName,
      gradeRange,
      actualGrade,
      subject,
      score,
      level,
      teacherAdmission
    };

    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    if (editingIndex !== null) {
      marks[editingIndex] = newMark;
      editingIndex = null;
    } else {
      marks.push(newMark);
    }

    localStorage.setItem("submittedMarks", JSON.stringify(marks));
    form.reset();
    studentNameInput.value = "";
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    loadMarks();
  });

  // ==============================
  // EDIT MARK
  // ==============================
  window.editMark = function (index) {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const mark = marks[index];
    if (!mark) return;

    admissionInput.value = mark.admissionNo;
    studentNameInput.value = mark.studentName || "";
    gradeRangeSelect.value = mark.gradeRange;
    gradeRangeSelect.dispatchEvent(new Event("change"));
    setTimeout(() => {
      actualGradeSelect.value = mark.actualGrade;
      actualGradeSelect.dispatchEvent(new Event("change"));
      setTimeout(() => (subjectSelect.value = mark.subject), 50);
    }, 50);
    document.getElementById("score").value = mark.score;
    editingIndex = index;
  };

  // ==============================
  // DELETE MARK
  // ==============================
  window.deleteMark = function (index) {
    if (!confirm("Delete this record?")) return;
    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    marks.splice(index, 1);
    localStorage.setItem("submittedMarks", JSON.stringify(marks));
    loadMarks();
  };

  // ==============================
  // EXPORT EXCEL
  // ==============================
  exportExcelBtn.addEventListener("click", function () {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const teacherAdmission = window.currentTeacher?.admission;
    const filtered = marks.filter(m => m.teacherAdmission === teacherAdmission);
    if (!filtered.length) return alert("No marks to export.");

    const header = ["Admission No", "Student Name", "Grade", "Subject", "Score", "Level"];
    const aoa = [header];
    filtered.forEach(m => {
      aoa.push([
        m.admissionNo,
        m.studentName || "",
        m.actualGrade,
        (m.subject || "").replace(/-/g, " "),
        m.score,
        m.level
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `marks_${teacherAdmission}.xlsx`);
  });

  // ==============================
  // EXPORT PDF
  // ==============================
  exportPdfBtn.addEventListener("click", function () {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const teacherAdmission = window.currentTeacher?.admission;
    const filtered = marks.filter(m => m.teacherAdmission === teacherAdmission);
    if (!filtered.length) return alert("No marks to export.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const headers = [["Admission No", "Student Name", "Grade", "Subject", "Score", "Level"]];
    const rows = filtered.map(m => [
      m.admissionNo,
      m.studentName || "",
      m.actualGrade,
      (m.subject || "").replace(/-/g, " "),
      m.score,
      m.level
    ]);

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    doc.save(`marks_${teacherAdmission}.pdf`);
  });
});
