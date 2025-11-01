document.addEventListener("DOMContentLoaded", () => {
  // --- Protection ---
  const stored = localStorage.getItem("loggedInUser");
  if (!stored) {
    window.location.href = "login.html";
    return;
  }

  let user;
  try {
    user = JSON.parse(stored);
  } catch (e) {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
    return;
  }

  if (!user || user.role !== "student") {
    window.location.href = "login.html";
    return;
  }

  // --- CBC Level Mapping ---
  function getCBCLevel(score) {
    if (score >= 80) return "EE";
    if (score >= 60) return "ME";
    if (score >= 40) return "AE";
    return "BE";
  }

  // --- UI Elements ---
  const welcomeEl = document.getElementById("welcomeMessage");
  const marksContainer = document.getElementById("studentMarks");
  const rankEl = document.getElementById("classRank");
  const avgEl = document.getElementById("studentAvg");
  const feedbackEl = document.getElementById("aiFeedback");

  if (welcomeEl) welcomeEl.textContent = `Welcome, ${user.firstname || "Student"}`;

  // --- Load Data ---
  const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
  const studentMarks = marks.filter(m => m.admissionNo === user.admission);

  // --- Term/Year Filter Elements ---
  const termSelect = document.getElementById("termFilter");
  const yearSelect = document.getElementById("yearFilter");
  const applyBtn = document.getElementById("applyFilter");

  // --- RENDER MARKS ---
  function renderStudentMarks(term = "all", year = "all") {
    if (!marksContainer) return;
    marksContainer.innerHTML = "";

    let filtered = [...studentMarks];
    if (term !== "all") filtered = filtered.filter(m => m.term === term);
    if (year !== "all") filtered = filtered.filter(m => m.year === year);

    if (!filtered.length) {
      marksContainer.textContent = "No marks found for the selected filters.";
      if (avgEl) avgEl.textContent = "N/A";
      if (rankEl) rankEl.textContent = "N/A";
      if (feedbackEl) feedbackEl.textContent = "No marks to generate feedback.";
      return;
    }

    // Table Display
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
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");

    filtered.forEach(m => {
      const level = getCBCLevel(Number(m.score));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.term || ""}</td>
        <td>${m.year || ""}</td>
        <td>${m.grade || ""}</td>
        <td>${(m.subject || "").replace(/-/g, " ")}</td>
        <td>${m.score}</td>
        <td>${level}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    marksContainer.appendChild(table);

    // --- Compute Average ---
    const avg =
      filtered.reduce((s, m) => s + Number(m.score || 0), 0) / filtered.length;
    if (avgEl) avgEl.textContent = avg.toFixed(2);

    // --- Compute Class Rank ---
    const latestTerm = filtered[filtered.length - 1].term;
    const latestGrade = filtered[filtered.length - 1].grade;

    const students = {};
    marks
      .filter(m => m.term === latestTerm && m.grade === latestGrade)
      .forEach(m => {
        students[m.admissionNo] = students[m.admissionNo] || { total: 0, count: 0 };
        students[m.admissionNo].total += Number(m.score || 0);
        students[m.admissionNo].count += 1;
      });

    const averages = Object.keys(students).map(adm => ({
      adm,
      avg: students[adm].total / students[adm].count,
    }));

    averages.sort((a, b) => b.avg - a.avg);
    const pos = averages.findIndex(a => a.adm === user.admission);
    const rankText = pos >= 0 ? `${pos + 1} / ${averages.length}` : "N/A";
    if (rankEl) rankEl.textContent = rankText;

    // --- Generate Feedback ---
    if (feedbackEl) feedbackEl.textContent = generateFeedback(filtered);
  }

  // --- AI Feedback Generator ---
  function generateFeedback(marksList) {
    if (!marksList.length) return "No marks yet to generate feedback.";

    const avgScore =
      marksList.reduce((s, m) => s + Number(m.score || 0), 0) / marksList.length;
    const level = getCBCLevel(avgScore);
    let feedback = `CBC Level: ${level}\n`;

    if (avgScore >= 80)
      feedback += "Excellent overall performance. Keep consolidating strengths.\n";
    else if (avgScore >= 60)
      feedback += "Good performance. Focus on consistency to reach excellence.\n";
    else if (avgScore >= 40)
      feedback += "Fair performance. Work on weaker topics and practice more.\n";
    else
      feedback += "Needs improvement. Consider extra practice and ask your teacher for help.\n";

    const bySubject = {};
    marksList.forEach(m => {
      const s = m.subject || "unknown";
      bySubject[s] = bySubject[s] || { total: 0, count: 0 };
      bySubject[s].total += Number(m.score || 0);
      bySubject[s].count += 1;
    });

    const subAvgs = Object.keys(bySubject).map(s => ({
      subject: s.replace(/-/g, " "),
      avg: bySubject[s].total / bySubject[s].count,
    }));

    subAvgs.sort((a, b) => a.avg - b.avg);
    if (subAvgs.length) {
      feedback += `Areas to improve: ${subAvgs
        .slice(0, 3)
        .map(s => `${s.subject} (${s.avg.toFixed(0)})`)
        .join(", ")}.`;
    }

    return feedback;
  }

  // --- Filter Button Event ---
  applyBtn?.addEventListener("click", () => {
    const selectedTerm = termSelect.value;
    const selectedYear = yearSelect.value;
    renderStudentMarks(selectedTerm, selectedYear);
  });

  // Initial render
  renderStudentMarks();

  // --- REPORT & CHART LOGIC ---
  const nameEl = document.getElementById("studentName");
  const admEl = document.getElementById("studentAdm");
  const gradeEl = document.getElementById("studentGrade");
  const termEl = document.getElementById("studentTerm");
  const teacherEl = document.getElementById("classTeacher");
  const dateEl = document.getElementById("reportDate");
  const strengthsEl = document.getElementById("topStrengths");
  const improveEl = document.getElementById("areasImprove");
  const levelEl = document.getElementById("studentLevel");

  if (nameEl) {
    nameEl.textContent = `${user.firstname || ""} ${user.lastname || ""}`;
    admEl.textContent = user.admission;
    gradeEl.textContent = studentMarks.length ? studentMarks[0].grade : "N/A";
    termEl.textContent = studentMarks.length ? studentMarks[0].term : "N/A";
    teacherEl.textContent = "Mr. John Doe"; // optional: make dynamic later
    dateEl.textContent = new Date().toLocaleDateString();
  }

  // Determine overall level
  if (avgEl && levelEl) {
    const avgScore = parseFloat(avgEl.textContent);
    levelEl.textContent = getCBCLevel(avgScore);
  }

  // Strengths and Weaknesses
  const bySubject = {};
  studentMarks.forEach(m => {
    const s = m.subject || "unknown";
    bySubject[s] = bySubject[s] || { total: 0, count: 0 };
    bySubject[s].total += Number(m.score || 0);
    bySubject[s].count += 1;
  });
  const subjectAverages = Object.keys(bySubject).map(s => ({
    subject: s.replace(/-/g, " "),
    avg: bySubject[s].total / bySubject[s].count,
  }));
  subjectAverages.sort((a, b) => b.avg - a.avg);

  if (strengthsEl)
    strengthsEl.textContent =
      subjectAverages
        .slice(0, 3)
        .map(s => `${s.subject} (${s.avg.toFixed(0)}%)`)
        .join(", ") || "N/A";

  if (improveEl)
    improveEl.textContent =
      subjectAverages
        .slice(-3)
        .map(s => `${s.subject} (${s.avg.toFixed(0)}%)`)
        .join(", ") || "N/A";

  // ============ CHARTS ============
  const ctx1 = document.getElementById("subjectChart");
  const ctx2 = document.getElementById("performanceChart");

  if (ctx1 && subjectAverages.length) {
    new Chart(ctx1, {
      type: "bar",
      data: {
        labels: subjectAverages.map(s => s.subject),
        datasets: [
          {
            label: "Subject Scores",
            data: subjectAverages.map(s => s.avg),
            borderWidth: 1,
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: false } },
      },
    });
  }

  if (ctx2) {
    const byTerm = {};
    studentMarks.forEach(m => {
      byTerm[m.term] = byTerm[m.term] || { total: 0, count: 0 };
      byTerm[m.term].total += Number(m.score || 0);
      byTerm[m.term].count += 1;
    });
    const termData = Object.keys(byTerm).map(t => ({
      term: t,
      avg: byTerm[t].total / byTerm[t].count,
    }));

    new Chart(ctx2, {
      type: "line",
      data: {
        labels: termData.map(d => d.term),
        datasets: [
          {
            label: "Average per Term",
            data: termData.map(d => d.avg),
            fill: false,
            tension: 0.3,
            borderWidth: 2,
          },
        ],
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });
  }

  // --- Welcome Message (Header) ---
  const welcomeName = document.getElementById("welcomeName");
  if (welcomeName) {
    welcomeName.textContent =
      user.firstname || user.fullname || user.email || "Student";
  }

  // --- Logout Button ---
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });

  // --- Refresh Button ---
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.setAttribute("type", "button");
    refreshBtn.addEventListener("click", () => window.location.reload());
  }
});
