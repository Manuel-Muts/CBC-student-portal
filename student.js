document.addEventListener("DOMContentLoaded", () => {
  // --- AUTHENTICATION ---
  const stored = localStorage.getItem("loggedInUser");
  if (!stored) return (window.location.href = "login.html");

  let user;
  try {
    user = JSON.parse(stored);
  } catch (e) {
    localStorage.removeItem("loggedInUser");
    return (window.location.href = "login.html");
  }
  if (!user || user.role !== "student") return (window.location.href = "login.html");

  // --- UTILS ---
  const getCBCLevel = (score) =>
    score >= 80 ? "EE" : score >= 60 ? "ME" : score >= 40 ? "AE" : "BE";

  // --- ELEMENTS ---
  const welcomeName = document.getElementById("welcomeName");
  const marksContainer = document.getElementById("studentMarks");
  const rankEl = document.getElementById("classRank");
  const avgEl = document.getElementById("studentAvg");
  const feedbackEl = document.getElementById("aiFeedback");
  const gradeEl = document.getElementById("studentGrade");
  const termEl = document.getElementById("studentTerm");
  const yearEl = document.getElementById("studentYear");
  const levelEl = document.getElementById("studentLevel");

  // NEW elements (for report info)
  const studentNameEl = document.getElementById("studentName");
  const studentAdmEl = document.getElementById("studentAdm");
  const classTeacherEl = document.getElementById("classTeacher");
  const reportDateEl = document.getElementById("reportDate");

  if (welcomeName) welcomeName.textContent = user.firstname || "Student";
  if (studentNameEl) studentNameEl.textContent = `${user.firstname || ""} ${user.lastname || ""}`;
  if (studentAdmEl) studentAdmEl.textContent = user.admission || "N/A";

  // --- LOAD DATA ---
  const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
  const studentMarks = marks.filter((m) => m.admissionNo === user.admission);

  // --- FILTER ELEMENTS ---
  const termSelect = document.getElementById("termFilter");
  const yearSelect = document.getElementById("yearFilter");
  const assessmentSelect = document.getElementById("assessmentFilter");
  const applyBtn = document.getElementById("applyFilter");

  // Populate years dynamically
  if (yearSelect) {
    yearSelect.innerHTML = "";
    for (let y = 2025; y <= new Date().getFullYear() + 10; y++) {
      const option = document.createElement("option");
      option.value = y;
      option.textContent = y;
      yearSelect.appendChild(option);
    }
  }

  // Populate assessments dynamically
  if (assessmentSelect) {
    assessmentSelect.innerHTML = '<option value="all">All Assessments</option>';
    for (let i = 1; i <= 5; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Assessment ${i}`;
      assessmentSelect.appendChild(opt);
    }
  }

  // --- RENDER FUNCTION ---
  function renderStudentMarks(term = "all", year = "all", assessment = "all") {
    if (!marksContainer) return;
    marksContainer.innerHTML = "";

    let filtered = [...studentMarks];
    if (term !== "all") filtered = filtered.filter((m) => m.term === term);
    if (year !== "all") filtered = filtered.filter((m) => m.year == year);
    if (assessment !== "all") filtered = filtered.filter((m) => m.assessment == assessment);

    // --- REPORT HEADER UPDATE ---
    if (termEl) termEl.textContent = term !== "all" ? term : "N/A";
    if (yearEl) yearEl.textContent = year !== "all" ? year : new Date().getFullYear();
    if (gradeEl) gradeEl.textContent = filtered[0]?.grade || "N/A";
    if (reportDateEl) reportDateEl.textContent = new Date().toLocaleDateString();

    // Update class teacher (from latest data)
    if (classTeacherEl)
      classTeacherEl.textContent = filtered[0]?.teacherName || "N/A";

    // --- NO DATA CASE ---
    if (!filtered.length) {
      marksContainer.textContent = "No marks found for the selected filters.";
      avgEl.textContent = rankEl.textContent = feedbackEl.textContent = "N/A";
      levelEl.textContent = "N/A";
      return;
    }

    // --- TABLE ---
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Term</th>
          <th>Year</th>
          <th>Grade</th>
          <th>Subject</th>
          <th>Score</th>
          <th>CBC Level</th>
          <th>Assessment</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");

    filtered.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.term}</td>
        <td>${m.year}</td>
        <td>${m.grade}</td>
        <td>${(m.subject || "").replace(/-/g, " ")}</td>
        <td>${m.score}</td>
        <td>${getCBCLevel(m.score)}</td>
        <td>${m.assessment}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    marksContainer.appendChild(table);

    // --- STATS ---
    const avg = filtered.reduce((s, m) => s + Number(m.score || 0), 0) / filtered.length;
    avgEl.textContent = avg.toFixed(2);
    levelEl.textContent = getCBCLevel(avg);

    // --- FEEDBACK ---
    feedbackEl.textContent = generateFeedback(filtered);

    // --- RANK COMPUTATION ---
    const latestTerm = filtered.at(-1)?.term;
    const latestGrade = filtered.at(-1)?.grade;
    const sameClass = marks.filter((m) => m.term === latestTerm && m.grade === latestGrade);

    const students = {};
    sameClass.forEach((m) => {
      if (!students[m.admissionNo]) students[m.admissionNo] = { total: 0, count: 0 };
      students[m.admissionNo].total += Number(m.score || 0);
      students[m.admissionNo].count++;
    });

    const averages = Object.entries(students).map(([adm, s]) => ({
      adm,
      avg: s.total / s.count,
    }));
    averages.sort((a, b) => b.avg - a.avg);
    const pos = averages.findIndex((a) => a.adm === user.admission);
    rankEl.textContent = pos >= 0 ? `${pos + 1} / ${averages.length}` : "N/A";
  }

  // --- APPLY FILTER ---
  applyBtn?.addEventListener("click", () => {
    const term = termSelect.value;
    const year = yearSelect.value;
    const assess = assessmentSelect.value;
    localStorage.setItem("selectedTerm", term);
    localStorage.setItem("selectedYear", year);
    localStorage.setItem("selectedAssessment", assess);
    renderStudentMarks(term, year, assess);
  });

  // --- RESTORE FILTERS ---
  const savedTerm = localStorage.getItem("selectedTerm") || "all";
  const savedYear = localStorage.getItem("selectedYear") || "all";
  const savedAssessment = localStorage.getItem("selectedAssessment") || "all";
  termSelect.value = savedTerm;
  yearSelect.value = savedYear;
  assessmentSelect.value = savedAssessment;

  renderStudentMarks(savedTerm, savedYear, savedAssessment);

  // --- REFRESH BUTTON ---
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn)
    refreshBtn.addEventListener("click", () => {
      const savedT = localStorage.getItem("selectedTerm") || "all";
      const savedY = localStorage.getItem("selectedYear") || "all";
      const savedA = localStorage.getItem("selectedAssessment") || "all";
      renderStudentMarks(savedT, savedY, savedA);
    });

  // --- LOGOUT ---
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });

  // --- FEEDBACK FUNCTION ---
  function generateFeedback(list) {
    if (!list.length) return "No marks yet to generate feedback.";
    const avg = list.reduce((s, m) => s + Number(m.score || 0), 0) / list.length;
    const level = getCBCLevel(avg);
    const subjects = {};
    list.forEach((m) => {
      const s = m.subject || "unknown";
      subjects[s] = subjects[s] || { total: 0, count: 0 };
      subjects[s].total += Number(m.score || 0);
      subjects[s].count++;
    });
    const avgs = Object.entries(subjects).map(([s, v]) => ({
      subject: s.replace(/-/g, " "),
      avg: v.total / v.count,
    }));
    avgs.sort((a, b) => b.avg - a.avg);
    const top = avgs.slice(0, 3)
      .map((s) => `${s.subject} (${s.avg.toFixed(0)})`)
      .join(", ");
    const low = avgs
      .slice(-3)
      .reverse()
      .map((s) => `${s.subject} (${s.avg.toFixed(0)})`)
      .join(", ");
    document.getElementById("topStrengths").textContent = top || "N/A";
    document.getElementById("areasImprove").textContent = low || "N/A";
    return `CBC Level: ${level}. Top Strengths: ${top}. Areas to Improve: ${low}.`;
  }

  // --- SYNC REPORT ---
  document.getElementById("syncReportBtn")?.addEventListener("click", () => {
    const allMarks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const studentMarks = allMarks.filter((m) => m.admissionNo === user.admission);
    localStorage.setItem("studentReportMarks", JSON.stringify(studentMarks));
    alert("✅ Report data synced successfully!");
  });
});
