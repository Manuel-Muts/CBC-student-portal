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
  const analysisType = document.getElementById("analysisType");
  const onlyMySubjects = document.getElementById("onlyMySubjects");
  const assessmentFilter = document.getElementById("assessmentFilter");

  const rankingTableWrap = document.getElementById("rankingTableWrap");
  const subjectTableWrap = document.getElementById("subjectTableWrap");
  const detailsTableWrap = document.getElementById("detailsTableWrap");

  const classMeanEl = document.getElementById("classMean");
  const topMeanEl = document.getElementById("topMean");
  const lowMeanEl = document.getElementById("lowMean");
  const topSubjectEl = document.getElementById("topSubject");
  const lowSubjectEl = document.getElementById("lowSubject");
  const recordsCountEl = document.getElementById("recordsCount");

  // ======== AUTH CHECK ========
  const stored = localStorage.getItem("loggedInUser");
  if (!stored) return showNotAllowed();

  let user;
  try {
    user = JSON.parse(stored);
  } catch (err) {
    console.error("Invalid stored user:", err);
    localStorage.removeItem("loggedInUser");
    return showNotAllowed();
  }

  if (!user?.isClassTeacher && user.role !== "classteacher") {
    return showNotAllowed();
  }

  showAnalysis();

  // ===============================
  // FETCH CLASS TEACHER ALLOCATION
  // ===============================
  const allocations = JSON.parse(localStorage.getItem("classTeacherAllocations")) || [];
  const myAllocation = allocations.find(a => a.teacherAdmission === user.admission);

  if (myAllocation) {
    user.classGrade = myAllocation.grade;
  }

  // ===============================
  // AUTO-FILL CLASS TEACHER GRADE
  // ===============================
  if (user.isClassTeacher && user.classGrade) {
    if (gradeFilter) {
      gradeFilter.innerHTML = `<option value="${user.classGrade}">${user.classGrade}</option>`;
      gradeFilter.disabled = true;
    }

    const gradeDisplay = document.getElementById("teacherGradeDisplay");
    if (gradeDisplay) gradeDisplay.textContent = user.classGrade;

    console.log(`✅ Auto-filled class grade: ${user.classGrade}`);
  }

  // ✅ Log and display teacher info
  const teacherInfoEl = document.getElementById("teacherInfo");
  if (teacherInfoEl) {
    teacherInfoEl.innerHTML = `
      Class Teacher: <strong>${user.firstname} ${user.lastname}</strong> |
      Grade: <strong>${user.classGrade || "Not Set"}</strong>
    `;
  }

  // ======== HELPER FUNCTIONS ========
  function showNotAllowed() {
    notAllowedEl.classList.remove("hidden");
    analysisWrap.classList.add("hidden");
  }

  function showAnalysis() {
    notAllowedEl.classList.add("hidden");
    analysisWrap.classList.remove("hidden");
  }

  // Fetch marks for this teacher’s grade
  function getFilteredMarks() {
    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    return marks.filter(m =>
      String(m.grade) === String(user.classGrade) &&
      (!termFilter.value || m.term === termFilter.value) &&
      (!yearFilter.value || m.year == parseInt(yearFilter.value)) &&
      (assessmentFilter.value === "all" || String(m.assessment) === assessmentFilter.value) &&
      (onlyMySubjects.value === "no" || (user.subjects || []).includes(m.subject))
    );
  }

  function calculateStats(filtered) {
    if (!filtered.length) return {};

    const studentTotals = {};
    const subjectTotals = {};
    const subjectCounts = {};

    filtered.forEach(m => {
      if (!studentTotals[m.admission]) {
        studentTotals[m.admission] = { name: m.studentName, total: 0, count: 0 };
      }
      studentTotals[m.admission].total += m.score;
      studentTotals[m.admission].count++;

      subjectTotals[m.subject] = (subjectTotals[m.subject] || 0) + m.score;
      subjectCounts[m.subject] = (subjectCounts[m.subject] || 0) + 1;
    });

    const studentMeans = Object.values(studentTotals).map(s => ({
      name: s.name,
      mean: s.total / s.count
    }));

    studentMeans.sort((a, b) => b.mean - a.mean);

    const subjectMeans = {};
    for (let subj in subjectTotals) {
      subjectMeans[subj] = subjectTotals[subj] / subjectCounts[subj];
    }

    const classMean = studentMeans.reduce((acc, s) => acc + s.mean, 0) / studentMeans.length;
    const topMean = studentMeans[0].mean;
    const lowMean = studentMeans[studentMeans.length - 1].mean;

    let topSubject = "", lowSubject = "";
    let topVal = -Infinity, lowVal = Infinity;
    for (let subj in subjectMeans) {
      if (subjectMeans[subj] > topVal) { topVal = subjectMeans[subj]; topSubject = subj; }
      if (subjectMeans[subj] < lowVal) { lowVal = subjectMeans[subj]; lowSubject = subj; }
    }

    return {
      studentMeans,
      subjectMeans,
      classMean,
      topMean,
      lowMean,
      topSubject,
      lowSubject,
      records: filtered.length
    };
  }

  function renderOverview(stats) {
    if (!stats.studentMeans || !stats.studentMeans.length) {
      rankingTableWrap.innerHTML = "<div class='small'>No ranking data found.</div>";
      return;
    }

    let rankHtml = `<table>
      <thead><tr><th>Rank</th><th>Name</th><th>Mean Score</th></tr></thead>
      <tbody>`;
    stats.studentMeans.forEach((s, i) => {
      rankHtml += `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.mean.toFixed(2)}</td></tr>`;
    });
    rankHtml += `</tbody></table>`;
    rankingTableWrap.innerHTML = rankHtml;

    let subjHtml = `<table>
      <thead><tr><th>Subject</th><th>Mean Score</th></tr></thead><tbody>`;
    for (let subj in stats.subjectMeans) {
      subjHtml += `<tr><td>${subj}</td><td>${stats.subjectMeans[subj].toFixed(2)}</td></tr>`;
    }
    subjHtml += `</tbody></table>`;
    subjectTableWrap.innerHTML = subjHtml;

    classMeanEl.textContent = stats.classMean.toFixed(2);
    topMeanEl.textContent = stats.topMean.toFixed(2);
    lowMeanEl.textContent = stats.lowMean.toFixed(2);
    topSubjectEl.textContent = stats.topSubject;
    lowSubjectEl.textContent = stats.lowSubject;
    recordsCountEl.textContent = stats.records;
  }

  function renderDetailed(filtered) {
    if (!filtered.length) {
      detailsTableWrap.innerHTML = "<div class='small'>No records to display.</div>";
      return;
    }

    let html = `<table>
      <thead><tr><th>Admission</th><th>Name</th><th>Subject</th><th>Score</th><th>Term</th><th>Year</th><th>Assessment</th></tr></thead>
      <tbody>`;
    filtered.forEach(m => {
      html += `<tr>
        <td>${m.admission}</td>
        <td>${m.studentName}</td>
        <td>${m.subject}</td>
        <td>${m.score}</td>
        <td>${m.term}</td>
        <td>${m.year}</td>
        <td>${m.assessment ? "Assessment " + m.assessment : "-"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    detailsTableWrap.innerHTML = html;
  }

  // ======= GENERATE REPORT + TREND CHART =======
  function generateReport() {
    const filtered = getFilteredMarks();
    const stats = calculateStats(filtered);

    if (analysisType.value === "overview") renderOverview(stats);
    else renderDetailed(filtered);

    renderTrendChart(user.classGrade, termFilter.value, yearFilter.value);
  }

  // ===== BUTTON EVENTS =====
  refreshBtn?.addEventListener("click", () => window.location.reload());

  generateBtn?.addEventListener("click", () => {
    const originalText = generateBtn.textContent;
    generateBtn.textContent = "Generating...";
    generateBtn.disabled = true;
    generateBtn.classList.add("pulsing");

    setTimeout(() => {
      generateReport();
      generateBtn.textContent = originalText;
      generateBtn.disabled = false;
      generateBtn.classList.remove("pulsing");
    }, 500);
  });

  exportExcelBtn?.addEventListener("click", () => {
    const filtered = getFilteredMarks();
    if (!filtered.length) return alert("No data to export.");
    if (!window.XLSX) return alert("XLSX library not loaded.");

    const aoa = [["Admission", "Name", "Grade", "Subject", "Score", "Term", "Year", "Assessment"]];
    filtered.forEach(m => aoa.push([
      m.admission, m.studentName, m.grade, m.subject, m.score, m.term, m.year, `Assessment ${m.assessment}`
    ]));

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis");
    XLSX.writeFile(wb, `analysis_${Date.now()}.xlsx`);
  });

  exportPdfBtn?.addEventListener("click", () => {
    const filtered = getFilteredMarks();
    if (!filtered.length) return alert("No data to export.");
    if (!window.jspdf || !window.jspdf.jsPDF) return alert("jsPDF not loaded.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const head = [["Admission", "Name", "Grade", "Subject", "Score", "Term", "Year", "Assessment"]];
    const body = filtered.map(m => [
      m.admission, m.studentName, m.grade, m.subject, m.score, m.term, m.year, `Assessment ${m.assessment}`
    ]);
    doc.autoTable({ head, body, startY: 12 });
    doc.save(`analysis_${Date.now()}.pdf`);
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });
});

// ======= TREND CHART FUNCTION =======
function renderTrendChart(grade, term, year) {
  const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
  const ctx = document.getElementById("classTrendChart")?.getContext("2d");
  if (!ctx) return;

  const trendData = [1, 2, 3, 4, 5].map(a => {
    const filtered = marks.filter(m =>
      String(m.grade) === String(grade) &&
      (!term || m.term === term) &&
      (!year || m.year == year) &&
      m.assessment == a
    );
    if (!filtered.length) return null;
    const avg = filtered.reduce((sum, m) => sum + m.score, 0) / filtered.length;
    return parseFloat(avg.toFixed(2));
  });

  if (window.classTrendChart) window.classTrendChart.destroy();

  window.classTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["A1", "A2", "A3", "A4", "A5"],
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
        y: { beginAtZero: true, max: 100, title: { display: true, text: "Mean Score" } },
        x: { title: { display: true, text: "Assessment" } }
      },
      plugins: { legend: { display: false } }
    }
  });
}
