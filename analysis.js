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
        <td>${s.rank}</td><td>${s.name}</td><td>${s.assessment === "5" ? "End Term" : s.assessment}</td>`;
      stats.subjects.forEach(sub => html += `<td>${s.subjects[sub] ?? '-'}</td>`);
      html += `<td>${s.total}</td><td>${getCbcLevel(s.mean)}</td></tr>`;
    });

    html += "</tbody></table>";

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

  const pdfContainer = document.createElement("div");
  pdfContainer.style.padding = "25px";
  pdfContainer.style.fontFamily = "Arial, sans-serif";
  pdfContainer.style.fontSize = "10px";
  pdfContainer.style.background = "#fff";
  pdfContainer.style.width = "100%";
  pdfContainer.style.boxSizing = "border-box";

  // Title
  const title = document.createElement("h2");
  title.style.textAlign = "center";
  title.textContent = `Class Report - Grade ${user.classGrade}`;
  pdfContainer.appendChild(title);

  // Term / Year / Assessment
  const assessmentLabel = assessmentFilter.value === "5" ? "End Term" : assessmentFilter.value;
  const info = document.createElement("p");
  info.style.textAlign = "center";
  info.textContent = `Term: ${termFilter.value || "-"} | Year: ${yearFilter.value || "-"} | Assessment: ${assessmentLabel}`;
  pdfContainer.appendChild(info);

  // Stats Summary
  const statsDiv = document.createElement("p");
  statsDiv.textContent = `Class Mean: ${stats.classMean?.toFixed(2)} | Top Mean: ${stats.topMean?.toFixed(2)} | Low Mean: ${stats.lowMean?.toFixed(2)} | Top Subject: ${stats.topSubject} | Weak Subject: ${stats.lowSubject} | Records: ${stats.records}`;
  pdfContainer.appendChild(statsDiv);

  // Clone Ranking Table
  const rankingTableClone = rankingTableWrap.cloneNode(true);
  rankingTableClone.style.width = "100%";
  rankingTableClone.style.borderCollapse = "collapse";
  rankingTableClone.querySelectorAll("th, td").forEach(cell => {
    cell.style.fontSize = "9px";
    cell.style.padding = "3px";
    cell.style.border = "1px solid #000";
    cell.style.textAlign = "center";
    cell.style.wordBreak = "break-word";
  });
  pdfContainer.appendChild(rankingTableClone);

  // Clone Subject Means Table
  const subjectTableClone = subjectTableWrap.cloneNode(true);
  subjectTableClone.style.width = "100%";
  subjectTableClone.style.borderCollapse = "collapse";
  subjectTableClone.querySelectorAll("th, td").forEach(cell => {
    cell.style.fontSize = "9px";
    cell.style.padding = "3px";
    cell.style.border = "1px solid #000";
    cell.style.textAlign = "center";
    cell.style.wordBreak = "break-word";
  });
  pdfContainer.appendChild(subjectTableClone);


  // Footer
  const footer = document.createElement("div");
  footer.style.textAlign = "right";
  footer.style.marginTop = "15px";
  footer.style.fontStyle = "italic";
  footer.style.fontSize = "10px";
  footer.textContent = `Generated by: ${user.firstname} ${user.lastname}`;
  pdfContainer.appendChild(footer);

  // Export using html2pdf in landscape
  html2pdf().set({
    margin: 10,
    filename: `Class_Report_Grade_${user.classGrade}.pdf`,
    html2canvas: { scale: 2, scrollY: 0, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
  })
  .from(pdfContainer)
  .save()
  .then(() => pdfContainer.remove());
});

  // ===== Export Excel =====
  exportExcelBtn?.addEventListener("click", () => {
    const filtered = getFilteredMarks();
    const stats = calculateStats(filtered);
    if (!filtered.length) return alert("No data available to export.");

    const wb = XLSX.utils.book_new();

    const rankingData = [
      ["Rank", "Name", "Assessment", ...stats.subjects, "Total Marks", "CBC Level"]
    ];

    stats.studentArray.forEach(s => {
      const row = [
        s.rank,
        s.name,
        s.assessment === "5" ? "End Term" : s.assessment,
        ...stats.subjects.map(sub => s.subjects[sub] ?? "-"),
        s.total,
        getCbcLevel(s.mean)
      ];
      rankingData.push(row);
    });

    const rankingWS = XLSX.utils.aoa_to_sheet(rankingData);
    XLSX.utils.book_append_sheet(wb, rankingWS, "Ranking");

    const perfData = [["Subject", "Class Mean", "Top Mark", "Lowest Mark"]];
    Object.entries(stats.subjectMeans || {}).forEach(([subject, mean]) => {
      const subjectMarks = filtered.filter(m => m.subject === subject).map(m => Number(m.score));
      const topMark = Math.max(...subjectMarks);
      const lowMark = Math.min(...subjectMarks);
      perfData.push([subject, mean.toFixed(2), topMark, lowMark]);
    });

    const perfWS = XLSX.utils.aoa_to_sheet(perfData);
    XLSX.utils.book_append_sheet(wb, perfWS, "Subject Performance");

    XLSX.writeFile(wb, `Class_Report_Grade_${user.classGrade}.xlsx`);
  });

  // ===== Trend Chart =====
  function renderTrendChart(grade, term, year) {
    const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const ctx = document.getElementById("classTrendChart")?.getContext("2d");
    if (!ctx) return;

    const filtered = marks.filter(m => String(m.grade) === grade && (!term || String(m.term) === term) && (!year || Number(m.year) === Number(year)));
    const assessments = [...new Set(filtered.map(m => m.assessment))].sort((a,b) => a-b);

    const studentMap = {};
    filtered.forEach(m => {
      if (!studentMap[m.studentName]) studentMap[m.studentName] = {};
      studentMap[m.studentName][m.assessment] = Number(m.score);
    });

    const datasets = Object.keys(studentMap).map((student, idx) => ({
      label: student,
      data: assessments.map(a => studentMap[student][a] || 0),
      borderColor: `hsl(${idx * 40 % 360}, 70%, 50%)`,
      fill: false,
      tension: 0.2
    }));

    if (window.trendChart) window.trendChart.destroy();
    window.trendChart = new Chart(ctx, {
      type: "line",
      data: { labels: assessments.map(a => a === "5" ? "End Term" : a), datasets },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
});
