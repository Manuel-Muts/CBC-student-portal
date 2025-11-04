document.addEventListener("DOMContentLoaded", () => {
  const gradeSubjects = {
    "1-3": ["Mathematics", "Kiswahili", "English", "Environmental Activities", "Social Studies", "Religious Studies (CRE)", "Creative Arts and Sports"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Religious Studies (CRE)", "Creative Arts", "Physical Health Education"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Business Studies", "Agriculture", "Social Studies", "Religious Studies (CRE)", "Health Education", "Pre-Technical Studies", "Sports and Physical Education"]
  };

  // Elements
  const gradeRangeSelect = document.getElementById("gradeRange");
  const actualGradeSelect = document.getElementById("actualGrade");
  const subjectSelect = document.getElementById("subject");
  const assessmentSelect = document.getElementById("assessmentSelect");
  const admissionInput = document.getElementById("admissionNo");
  const studentNameInput = document.getElementById("studentName");
  const logoutBtn = document.getElementById("logoutBtn");
  const marksForm = document.getElementById("marks-form");
  const submittedMarksContainer = document.getElementById("submittedMarksContainer");
  const yearInput = document.getElementById("year");

  // Study materials
  const materialGrade = document.getElementById("materialGrade");
  const materialSubject = document.getElementById("materialSubject");
  const materialTitle = document.getElementById("materialTitle");
  const materialDescription = document.getElementById("materialDescription");
  const materialLink = document.getElementById("materialLink");
  const materialsForm = document.getElementById("materials-form");
  const materialsListEl = document.getElementById("materialsList");

  // Authentication
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

  // Populate Assessments
  for (let i = 1; i <= 5; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Assessment ${i}`;
    assessmentSelect.appendChild(opt);
  }

  // Populate Grades
  gradeRangeSelect?.addEventListener("change", () => {
    const range = gradeRangeSelect.value;
    actualGradeSelect.innerHTML = '<option value="">-- Select Grade --</option>';
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    const grades = range === "1-3" ? [1,2,3] : range === "4-6" ? [4,5,6] : range === "7-9" ? [7,8,9] : [];
    grades.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = `Grade ${g}`;
      actualGradeSelect.appendChild(opt);
    });
  });

  // Populate Subjects
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

  // Auto-fill Student Name
  function getStudentByAdmission(adm) {
    if (!adm) return null;
    try {
      const users = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      return users.find(u => (u.admission || "").toLowerCase() === adm.toLowerCase()) || null;
    } catch { return null; }
  }

  admissionInput?.addEventListener("input", () => {
    const student = getStudentByAdmission(admissionInput.value.trim());
    studentNameInput.value = student ? `${student.firstname} ${student.lastname || ""}` : "";
  });

  // Save Mark
  function saveMark(admNo, grade, term, year, subject, assessment, score) {
    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const existingIndex = marks.findIndex(m =>
      m.admissionNo === admNo &&
      m.grade === grade &&
      m.term === term &&
      m.year === year &&
      m.subject === subject &&
      m.assessment === assessment
    );

    if (existingIndex >= 0) marks[existingIndex].score = score;
    else marks.push({ admissionNo: admNo, studentName: studentNameInput.value, grade, term, year, subject, assessment, score, teacherAdmission: teacher.admission });

    localStorage.setItem("submittedMarks", JSON.stringify(marks));
  }

  // Display Submitted Marks Grouped
  function displaySubmittedMarks() {
    submittedMarksContainer.innerHTML = "";
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]")
      .filter(m => m.teacherAdmission === teacher.admission);

    const grouped = {};
    marks.forEach(m => {
      const key = `${m.grade}_${m.term}_${m.year}_${m.assessment}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    Object.entries(grouped).forEach(([key, list]) => {
      const [grade, term, year, assessment] = key.split("_");

      const wrapper = document.createElement("div");
      wrapper.classList.add("marks-group");

      const header = document.createElement("h3");
      header.textContent = `Grade: ${grade}, Term: ${term}, Year: ${year}, Assessment: ${assessment}`;
      wrapper.appendChild(header);

      // --- Export Buttons for this group ---
      const exportDiv = document.createElement("div");
      exportDiv.classList.add("export-btns");

      const excelBtn = document.createElement("button");
      excelBtn.textContent = "📊 Export Excel";
      excelBtn.addEventListener("click", () => exportToExcel(list, `Grade${grade}_${term}_${year}_Assessment${assessment}`));
      exportDiv.appendChild(excelBtn);

      const pdfBtn = document.createElement("button");
      pdfBtn.textContent = "📄 Export PDF";
      pdfBtn.addEventListener("click", () => exportToPDF(list, `Grade${grade}_${term}_${year}_Assessment${assessment}`));
      exportDiv.appendChild(pdfBtn);

      wrapper.appendChild(exportDiv);

      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Admission No</th>
            <th>Student Name</th>
            <th>Grade</th>
            <th>Subject</th>
            <th>Score</th>
            <th>Term</th>
            <th>Year</th>
            <th>Assessment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      wrapper.appendChild(table);

      const tbody = table.querySelector("tbody");
      list.forEach((m, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${m.admissionNo}</td>
          <td>${m.studentName}</td>
          <td>${m.grade}</td>
          <td>${m.subject.replace(/-/g," ")}</td>
          <td>${m.score}</td>
          <td>${m.term}</td>
          <td>${m.year}</td>
          <td>${m.assessment}</td>
          <td>
            <button onclick="editGroupedMark('${key}', ${i})">✏️</button>
            <button onclick="deleteGroupedMark('${key}', ${i})">🗑️</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      submittedMarksContainer.appendChild(wrapper);
    });
  }

  // Edit / Delete Grouped Marks
  window.editGroupedMark = function(groupKey, index) {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]")
      .filter(m => m.teacherAdmission === teacher.admission);
    const grouped = {};
    marks.forEach(m => {
      const key = `${m.grade}_${m.term}_${m.year}_${m.assessment}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    const mark = grouped[groupKey][index];
    if (!mark) return;

    admissionInput.value = mark.admissionNo;
    studentNameInput.value = mark.studentName;
    actualGradeSelect.value = mark.grade;
    actualGradeSelect.dispatchEvent(new Event("change"));
    setTimeout(() => subjectSelect.value = mark.subject, 50);
    document.getElementById("score").value = mark.score;
    document.getElementById("term").value = mark.term;
    document.getElementById("year").value = mark.year;
    assessmentSelect.value = mark.assessment;
  };

  window.deleteGroupedMark = function(groupKey, index) {
    if (!confirm("Delete this record?")) return;
    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]")
      .filter(m => m.teacherAdmission === teacher.admission);

    const grouped = {};
    marks.forEach(m => {
      const key = `${m.grade}_${m.term}_${m.year}_${m.assessment}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    const toDelete = grouped[groupKey][index];
    marks = marks.filter(m => m !== toDelete);
    localStorage.setItem("submittedMarks", JSON.stringify(marks));
    displaySubmittedMarks();
  };

  // Submit Marks
  marksForm?.addEventListener("submit", e => {
    e.preventDefault();
    const admNo = admissionInput.value.trim();
    const grade = actualGradeSelect.value;
    const subject = subjectSelect.value;
    const score = parseFloat(document.getElementById("score").value);
    const term = document.getElementById("term").value;
    const year = yearInput.value;
    const assessment = Number(assessmentSelect.value);

    if (!admNo || !grade || !subject || isNaN(score) || !term || !year || !assessment)
      return alert("Please fill all fields.");

    saveMark(admNo, grade, term, year, subject, assessment, score);
    marksForm.reset();
    studentNameInput.value = "";
    displaySubmittedMarks();
  });

  displaySubmittedMarks();

  // --- Export Functions ---
  function exportToExcel(data, filename = "marks") {
    const ws = XLSX.utils.json_to_sheet(data.map(m => ({
      "Admission No": m.admissionNo,
      "Student Name": m.studentName,
      "Grade": m.grade,
      "Subject": m.subject.replace(/-/g," "),
      "Score": m.score,
      "Term": m.term,
      "Year": m.year,
      "Assessment": m.assessment
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  function exportToPDF(data, filename = "marks") {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const rows = data.map(m => [
      m.admissionNo, m.studentName, m.grade,
      m.subject.replace(/-/g," "), m.score,
      m.term, m.year, m.assessment
    ]);
    doc.autoTable({
      head: [["Admission No","Student Name","Grade","Subject","Score","Term","Year","Assessment"]],
      body: rows
    });
    doc.save(`${filename}.pdf`);
  }

  // --- Study Materials ---
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
    materials.push({
      grade: materialGrade.value,
      subject: materialSubject.value,
      title: materialTitle.value,
      description: materialDescription.value,
      fileName: materialLink.files[0]?.name || "N/A",
      teacherAdmission: teacher.admission
    });
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
        <td>${mat.subject.replace(/-/g," ")}</td>
        <td>${mat.title}</td>
        <td>${mat.description}</td>
        <td>${mat.fileName}</td>
        <td><button onclick="deleteMaterial(${i})">🗑️</button></td>
      `;
      materialsListEl.appendChild(row);
    });
  }

  window.deleteMaterial = function(i) {
    if (!confirm("Delete this material?")) return;
    let materials = JSON.parse(localStorage.getItem("studyMaterials") || "[]");
    materials.splice(i,1);
    localStorage.setItem("studyMaterials", JSON.stringify(materials));
    loadMaterials();
  }

  loadMaterials();
});
