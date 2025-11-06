document.addEventListener("DOMContentLoaded", () => {
  const notAllowedEl = document.getElementById("notAllowed");
  const analysisWrap = document.getElementById("analysisWrap");
  const logoutBtn = document.getElementById("logoutBtn");
  const exportExcelBtn = document.getElementById("exportExcel");
  const exportPdfBtn = document.getElementById("exportPdf");
  const refreshBtn = document.getElementById("refreshBtn");
  const generateBtn = document.getElementById("generateReport");

  const gradeFilter = document.getElementById("gradeFilter");
  const termFilter = document.getElementById("termFilter");
  const yearFilter = document.getElementById("yearFilter");
  const onlyMySubjects = document.getElementById("onlyMySubjects");
  const assessmentFilter = document.getElementById("assessmentFilter");

  const rankingTableWrap = document.getElementById("rankingTableWrap");
  const subjectTableWrap = document.getElementById("subjectTableWrap");
  const classMeanEl = document.getElementById("classMean");
  const topMeanEl = document.getElementById("topMean");
  const lowMeanEl = document.getElementById("lowMean");
  const topSubjectEl = document.getElementById("topSubject");
  const lowSubjectEl = document.getElementById("lowSubject");
  const recordsCountEl = document.getElementById("recordsCount");

  // ===== AUTH CHECK =====
  const stored = localStorage.getItem("loggedInUser");
  if (!stored) return showNotAllowed();

  let user;
  try { user = JSON.parse(stored); } 
  catch { localStorage.removeItem("loggedInUser"); return showNotAllowed(); }
  if (!user?.isClassTeacher && user.role !== "classteacher") return showNotAllowed();

  showAnalysis();

  // Fetch teacher allocation
  const allocations = JSON.parse(localStorage.getItem("classTeacherAllocations") || "[]");
  const myAllocation = allocations.find(a => a.teacherAdmission === user.admission);
  if (myAllocation) user.classGrade = myAllocation.grade;

  // Auto-fill grade filter
  if (user.isClassTeacher && user.classGrade && gradeFilter) {
    gradeFilter.innerHTML = `<option value="${user.classGrade}">${user.classGrade}</option>`;
    gradeFilter.disabled = true;
  }

  const teacherInfoEl = document.getElementById("teacherInfo");
  if (teacherInfoEl) {
    teacherInfoEl.innerHTML = `Class Teacher: <strong>${user.firstname} ${user.lastname}</strong> | Grade: <strong>${user.classGrade || "Not Set"}</strong>`;
  }

  function showNotAllowed() {
    notAllowedEl.classList.remove("hidden");
    analysisWrap.classList.add("hidden");
  }
  function showAnalysis() {
    notAllowedEl.classList.add("hidden");
    analysisWrap.classList.remove("hidden");
  }

  function getFilteredMarks() {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const selectedGrade = String(user.classGrade).trim().toLowerCase();
    const selectedTerm = (termFilter.value || "").trim().toLowerCase();
    const selectedYear = parseInt(yearFilter.value) || null;
    const selectedAssessment = assessmentFilter.value === "all" ? null : String(assessmentFilter.value).trim();

    const filtered = marks.filter(m => {
      const gradeMatch = String(m.grade).trim().toLowerCase() === selectedGrade;
      const termMatch = !selectedTerm || String(m.term).trim().toLowerCase() === selectedTerm;
      const yearMatch = !selectedYear || parseInt(m.year) === selectedYear;
      const assessmentMatch = !selectedAssessment || String(m.assessment) === selectedAssessment;
      const subjectMatch = onlyMySubjects.value === "no" || (user.subjects || []).includes(m.subject);
      return gradeMatch && termMatch && yearMatch && assessmentMatch && subjectMatch;
    });

    return filtered;
  }

  function getCbcLevel(mean) {
    if (mean >= 80) return "EE";
    if (mean >= 60) return "ME";
    if (mean >= 40) return "AE";
    return "BE";
  }

  // ===== Calculate Stats =====
  function calculateStats(filtered) {
    if (!filtered.length) return {};

    const subjects = new Set();
    const students = {};

    filtered.forEach(m => {
      const key = `${m.grade}_${m.assessment}_${m.admissionNo}`;
      subjects.add(m.subject);

      if (!students[key]) {
        students[key] = {
          admissionNo: m.admissionNo,
          name: m.studentName || "Unnamed",
          grade: m.grade,
          assessment: m.assessment,
          subjects: {}
        };
      }

      students[key].subjects[m.subject] = Number(m.score) || 0;
    });

    const studentArray = Object.values(students).map(s => {
      const scores = Object.values(s.subjects);
      const total = scores.reduce((a, b) => a + b, 0);
      const mean = scores.length ? total / scores.length : 0;
      return { ...s, total, mean };
    });

    studentArray.sort((a, b) => b.total - a.total);

    // Assign ranks with ties
    let prevTotal = null, prevRank = 0, currentRank = 0;
    studentArray.forEach(s => {
      currentRank++;
      if (s.total === prevTotal) s.rank = prevRank;
      else { s.rank = currentRank; prevRank = currentRank; prevTotal = s.total; }
    });

    // Subject means
    const subjectTotals = {}, subjectCounts = {};
    filtered.forEach(m => {
      subjectTotals[m.subject] = (subjectTotals[m.subject] || 0) + Number(m.score);
      subjectCounts[m.subject] = (subjectCounts[m.subject] || 0) + 1;
    });

    const subjectMeans = {};
    subjects.forEach(sub => subjectMeans[sub] = subjectTotals[sub] / subjectCounts[sub]);

    const classMean = studentArray.reduce((a, s) => a + s.mean, 0) / studentArray.length;
    const topMean = studentArray[0]?.mean ?? 0;
    const lowMean = studentArray[studentArray.length - 1]?.mean ?? 0;

    let topSubject = "", lowSubject = "";
    let topVal = -Infinity, lowVal = Infinity;
    for (let sub in subjectMeans) {
      if (subjectMeans[sub] > topVal) { topVal = subjectMeans[sub]; topSubject = sub; }
      if (subjectMeans[sub] < lowVal) { lowVal = subjectMeans[sub]; lowSubject = sub; }
    }

    return { studentArray, subjects: Array.from(subjects), subjectMeans, classMean, topMean, lowMean, topSubject, lowSubject, records: studentArray.length };
  }

  // ===== AI Feedback =====
  function generateAIFeedback(mean) {
    if (mean >= 75) return "Excellent class performance. Keep reinforcing analytical and creative problem-solving tasks.";
    if (mean >= 60) return "Good performance overall. Encourage collaborative learning and strengthen revision.";
    if (mean >= 40) return "Average performance. Consider organizing remedial lessons for weaker learners.";
    return "Below average performance. Focus on personalized learning and engage learners through participatory lessons.";
  }

  // ===== Render Ranking Table =====
  function renderRankingTable(stats) {
    if (!stats.studentArray?.length) {
      rankingTableWrap.innerHTML = "<div class='small'>No ranking data found.</div>";
      return;
    }

    let html = `
      <table style="border-collapse: collapse; width: 100%; border:1px solid #000; margin-bottom: 15px;">
        <thead>
          <tr>
            <th>Rank</th><th>Name</th><th>Assessment</th>`;
    stats.subjects.forEach(sub => html += `<th>${sub}</th>`);
    html += `<th>Total Marks</th><th>CBC Level</th></tr></thead><tbody>`;

    stats.studentArray.forEach(s => {
      html += `<tr>
        <td>${s.rank}</td><td>${s.name}</td><td>${s.assessment}</td>`;
      stats.subjects.forEach(sub => html += `<td>${s.subjects[sub] ?? '-'}</td>`);
      html += `<td>${s.total}</td><td>${getCbcLevel(s.mean)}</td></tr>`;
    });

    html += "</tbody></table>";

    // Add Top/Lowest summary + AI Feedback
    const topStudent = stats.studentArray[0];
    const lowStudent = stats.studentArray[stats.studentArray.length - 1];
    const aiFeedback = generateAIFeedback(stats.classMean);

   html += `
  <div style="margin-top:20px; font-size: 13px;">
    <p>🏆 <strong>Top Student:</strong> ${topStudent.name} — ${topStudent.total} marks (Avg: ${topStudent.mean.toFixed(1)}%)</p>
    <p>⚠️ <strong>Lowest Student:</strong> ${lowStudent.name} — ${lowStudent.total} marks (Avg: ${lowStudent.mean.toFixed(1)}%)</p>
    <hr style="margin: 12px 0;">
    <p><strong>AI Feedback:</strong> ${aiFeedback}</p>
  </div>
`;


    rankingTableWrap.innerHTML = html;
  }

  // ===== Subject Means Table =====
  function renderSubjectMeansTable(stats) {
    if (!stats.subjects?.length) {
      subjectTableWrap.innerHTML = "<div class='small'>No subject means found.</div>";
      return;
    }

    let html = `<table style="border-collapse: collapse; width: 100%; border:1px solid #000;">
      <thead><tr>`;
    stats.subjects.forEach(sub => html += `<th>${sub}</th>`);
    html += `</tr></thead><tbody><tr>`;
    stats.subjects.forEach(sub => html += `<td>${stats.subjectMeans[sub].toFixed(2)}</td>`);
    html += `</tr></tbody></table>`;
    subjectTableWrap.innerHTML = html;
  }

  // ===== Generate Report =====
  function generateReport() {
    const filtered = getFilteredMarks();
    const stats = calculateStats(filtered);
    renderRankingTable(stats);
    renderSubjectMeansTable(stats);

    classMeanEl.textContent = stats.classMean.toFixed(2);
    topMeanEl.textContent = stats.topMean.toFixed(2);
    lowMeanEl.textContent = stats.lowMean.toFixed(2);
    topSubjectEl.textContent = stats.topSubject;
    lowSubjectEl.textContent = stats.lowSubject;
    recordsCountEl.textContent = stats.records;

    renderTrendChart(user.classGrade, termFilter.value, yearFilter.value);
  }

  // ===== Buttons =====
  refreshBtn?.addEventListener("click", () => window.location.reload());
  generateBtn?.addEventListener("click", () => {
    generateBtn.textContent = "Generating...";
    generateBtn.disabled = true;
    setTimeout(() => {
      generateReport();
      generateBtn.textContent = "Generate Report";
      generateBtn.disabled = false;
    }, 500);
  });
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

   // ===== Export PDF =====
exportPdfBtn?.addEventListener("click", () => {
  const filtered = getFilteredMarks();
  const stats = calculateStats(filtered);
  if (!filtered.length) return alert("No data available to export.");

  // Detect number of subjects dynamically
  const firstStudent = stats.studentArray?.[0];
  const subjectCount = firstStudent ? Object.keys(firstStudent.subjects || {}).length : 0;
  const orientation = subjectCount > 7 ? "landscape" : "portrait";

  const pdfContainer = document.createElement("div");
  pdfContainer.style.padding = "25px";
  pdfContainer.style.fontFamily = "Arial, sans-serif";
  pdfContainer.style.fontSize = "10px";
  pdfContainer.style.background = "#fff";
  pdfContainer.style.width = "100%";
  pdfContainer.style.boxSizing = "border-box";

  // --- Title ---
  const title = document.createElement("h2");
  title.style.textAlign = "center";
  title.textContent = `Class Report - Grade ${user.classGrade}`;
  pdfContainer.appendChild(title);

  const info = document.createElement("p");
  info.style.textAlign = "center";
  info.textContent = `Term: ${termFilter.value || "-"} | Year: ${yearFilter.value || "-"} | Assessment: ${assessmentFilter.value}`;
  pdfContainer.appendChild(info);

  const statsDiv = document.createElement("p");
  statsDiv.textContent = `Class Mean: ${stats.classMean?.toFixed(2)} | Top Mean: ${stats.topMean?.toFixed(2)} | Low Mean: ${stats.lowMean?.toFixed(2)} | Top Subject: ${stats.topSubject} | Weak Subject: ${stats.lowSubject} | Records: ${stats.records}`;
  pdfContainer.appendChild(statsDiv);

  // --- Main Ranking Table ---
  const tableClone = rankingTableWrap.cloneNode(true);
  tableClone.style.marginTop = "15px";
  tableClone.style.width = "100%";
  tableClone.style.borderCollapse = "collapse";
  tableClone.style.wordWrap = "break-word";
  tableClone.style.tableLayout = "fixed";
  tableClone.querySelectorAll("th, td").forEach(cell => {
    cell.style.fontSize = "9px";
    cell.style.padding = "3px";
    cell.style.border = "1px solid #000";
    cell.style.wordBreak = "break-word";
    cell.style.textAlign = "center";
  });
  pdfContainer.appendChild(tableClone);

  // --- SUBJECT PERFORMANCE TABLE ---
  const performanceTitle = document.createElement("h3");
  performanceTitle.textContent = "Subject Performance Summary";
  performanceTitle.style.marginTop = "25px";
  performanceTitle.style.textAlign = "center";
  pdfContainer.appendChild(performanceTitle);

  const perfTable = document.createElement("table");
  perfTable.style.width = "100%";
  perfTable.style.marginTop = "10px";
  perfTable.style.borderCollapse = "collapse";
  perfTable.style.tableLayout = "fixed";
  perfTable.innerHTML = `
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="border:1px solid #000;padding:4px;font-size:9px;">Subject</th>
        <th style="border:1px solid #000;padding:4px;font-size:9px;">Class Mean</th>
        <th style="border:1px solid #000;padding:4px;font-size:9px;">Top Mark</th>
        <th style="border:1px solid #000;padding:4px;font-size:9px;">Lowest Mark</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(stats.subjectMeans || {})
        .map(([subject, mean]) => {
          const subjectMarks = filtered.filter(m => m.subject === subject).map(m => Number(m.score));
          const topMark = Math.max(...subjectMarks);
          const lowMark = Math.min(...subjectMarks);
          return `
            <tr>
              <td style="border:1px solid #000;padding:4px;font-size:9px;">${subject}</td>
              <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:center;">${mean.toFixed(2)}</td>
              <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:center;">${topMark}</td>
              <td style="border:1px solid #000;padding:4px;font-size:9px;text-align:center;">${lowMark}</td>
            </tr>`;
        })
        .join("")}
    </tbody>
  `;
  pdfContainer.appendChild(perfTable);

  // --- Footer (only one retained) ---
  const footer = document.createElement("div");
  footer.style.textAlign = "right";
  footer.style.marginTop = "25px";
  footer.style.fontStyle = "italic";
  footer.style.fontSize = "10px";
  footer.textContent = `Generated by: ${user.firstname} ${user.lastname}`;
  pdfContainer.appendChild(footer);

  // --- Export PDF ---
  html2pdf().set({
    margin: 10,
    filename: `Class_Report_Grade_${user.classGrade}.pdf`,
    html2canvas: { scale: 2, scrollY: 0, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation }
  })
  .from(pdfContainer)
  .save()
  .then(() => pdfContainer.remove());
});

  // ===== Trend Chart =====
  function renderTrendChart(grade, term, year) {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const ctx = document.getElementById("classTrendChart")?.getContext("2d");
    if (!ctx) return;

    const trendData = [1,2,3,4,5].map(a => {
      const filtered = marks.filter(m =>
        String(m.grade) === String(grade) &&
        (!term || m.term === term) &&
        (!year || m.year == year) &&
        m.assessment == a
      );
      if (!filtered.length) return null;
      const stats = calculateStats(filtered);
      return parseFloat(stats.classMean.toFixed(2));
    });

    if (window.classTrendChart) window.classTrendChart.destroy();
    window.classTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["1","2","3","4","5"],
        datasets: [{
          label: "Class Mean Score",
          data: trendData,
          borderColor: "rgba(75,192,192,1)",
          backgroundColor: "rgba(75,192,192,0.2)",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#4bc0c0"
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 100 },
          x: { title: { display: true, text: "Assessment" } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
});
