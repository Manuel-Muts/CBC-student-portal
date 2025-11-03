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
  if (!stored) { showNotAllowed(); return; }

  let user;
  try { user = JSON.parse(stored); } catch (err) {
    console.error("Invalid stored user:", err);
    localStorage.removeItem("loggedInUser");
    showNotAllowed(); return;
  }

  if (!user?.isClassTeacher && user.role !== "classteacher") {
    showNotAllowed(); return;
  }

  showAnalysis();

  // ======== POPULATE TEACHER'S CLASS ========
  gradeFilter.innerHTML = `<option value="${user.classGrade}">${user.classGrade}</option>`;

  // ======== HELPER FUNCTIONS ========
  function showNotAllowed() {
    notAllowedEl.classList.remove("hidden");
    analysisWrap.classList.add("hidden");
  }

  function showAnalysis() {
    notAllowedEl.classList.add("hidden");
    analysisWrap.classList.remove("hidden");
  }

  function getFilteredMarks() {
    let marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");

    marks = marks.filter(m => 
      m.grade == user.classGrade &&
      (!termFilter.value || m.term === termFilter.value) &&
      (!yearFilter.value || m.year == parseInt(yearFilter.value)) &&
      (onlyMySubjects.value === "no" || (user.subjects || []).includes(m.subject))
    );

    return marks;
  }

  function calculateStats(filtered) {
    if (!filtered.length) return {};

    const studentTotals = {};
    const subjectTotals = {};
    const subjectCounts = {};

    filtered.forEach(m => {
      // Per student
      if (!studentTotals[m.admission]) studentTotals[m.admission] = { name: m.studentName, total: 0, count: 0 };
      studentTotals[m.admission].total += m.score;
      studentTotals[m.admission].count++;

      // Per subject
      if (!subjectTotals[m.subject]) subjectTotals[m.subject] = 0;
      if (!subjectCounts[m.subject]) subjectCounts[m.subject] = 0;
      subjectTotals[m.subject] += m.score;
      subjectCounts[m.subject]++;
    });

    // Calculate means
    const studentMeans = Object.values(studentTotals).map(s => ({
      name: s.name,
      mean: s.total / s.count
    }));

    studentMeans.sort((a,b) => b.mean - a.mean); // Descending ranking

    const subjectMeans = {};
    for (let subj in subjectTotals) {
      subjectMeans[subj] = subjectTotals[subj]/subjectCounts[subj];
    }

    // Quick stats
    const classMean = studentMeans.reduce((acc,s) => acc+s.mean,0)/studentMeans.length;
    const topMean = studentMeans[0].mean;
    const lowMean = studentMeans[studentMeans.length-1].mean;

    let topSubject = "", lowSubject = "";
    let topVal = -Infinity, lowVal = Infinity;
    for (let subj in subjectMeans) {
      if(subjectMeans[subj] > topVal) { topVal = subjectMeans[subj]; topSubject = subj; }
      if(subjectMeans[subj] < lowVal) { lowVal = subjectMeans[subj]; lowSubject = subj; }
    }

    return { studentMeans, subjectMeans, classMean, topMean, lowMean, topSubject, lowSubject, records: filtered.length };
  }

  function renderOverview(stats) {
    // Ranking table
    let rankHtml = `<table>
      <thead><tr><th>Rank</th><th>Name</th><th>Mean Score</th></tr></thead>
      <tbody>`;
    stats.studentMeans.forEach((s,i) => {
      rankHtml += `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.mean.toFixed(2)}</td></tr>`;
    });
    rankHtml += `</tbody></table>`;
    rankingTableWrap.innerHTML = rankHtml;

    // Subject table
    let subjHtml = `<table>
      <thead><tr><th>Subject</th><th>Mean Score</th></tr></thead>
      <tbody>`;
    for (let subj in stats.subjectMeans) {
      subjHtml += `<tr><td>${subj}</td><td>${stats.subjectMeans[subj].toFixed(2)}</td></tr>`;
    }
    subjHtml += `</tbody></table>`;
    subjectTableWrap.innerHTML = subjHtml;

    // Quick stats
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
      <thead><tr><th>Admission</th><th>Name</th><th>Subject</th><th>Score</th><th>Term</th><th>Year</th></tr></thead>
      <tbody>`;
    filtered.forEach(m => {
      html += `<tr>
        <td>${m.admission}</td>
        <td>${m.studentName}</td>
        <td>${m.subject}</td>
        <td>${m.score}</td>
        <td>${m.term}</td>
        <td>${m.year}</td>
        <td>Assessment ${m.assessment}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    detailsTableWrap.innerHTML = html;
  }

  function generateReport() {
    const filtered = getFilteredMarks();
    const stats = calculateStats(filtered);

    if (analysisType.value === "overview") renderOverview(stats);
    else renderDetailed(filtered);
  }

  // ===== BUTTON EVENTS =====
 refreshBtn?.addEventListener("click", () => {
  window.location.reload(); // Reload the entire page
});

generateBtn?.addEventListener("click", () => {
  const originalText = generateBtn.textContent;
  generateBtn.textContent = "Generating...";
  generateBtn.disabled = true;

  // Add pulse animation
  generateBtn.classList.add("pulsing");

  setTimeout(() => {
    generateReport();              // Call the existing report generation
    generateBtn.textContent = originalText;
    generateBtn.disabled = false;
    generateBtn.classList.remove("pulsing");
  }, 500); // Duration for the visual effect
});

  exportExcelBtn?.addEventListener("click", () => {
    const filtered = getFilteredMarks();
    if (!filtered.length) return alert("No data to export.");
    if (!window.XLSX) return alert("XLSX library not loaded.");

    const aoa = [["Admission","Name","Grade","Subject","Score","Term","Year","Assessment"]];
    filtered.forEach(m => aoa.push([m.admission, m.studentName, m.grade, m.subject, m.score, m.term, m.year, `Assessment ${m.assessment}`]));

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analysis");
    XLSX.writeFile(wb, `analysis_${Date.now()}.xlsx`);
  });

  exportPdfBtn?.addEventListener("click", () => {
    const filtered = getFilteredMarks();
    if (!filtered.length) return alert("No data to export.");
    if (!window.jspdf || !window.jspdf.jsPDF) return alert("jsPDF library not loaded.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const head = [["Admission","Name","Grade","Subject","Score","Term","Year","Assessment"]];
    const body = filtered.map(m => [m.admission, m.studentName, m.grade, m.subject, m.score, m.term, m.year, `Assessment ${m.assessment}`]);
    doc.autoTable({ head, body, startY: 12 });
    doc.save(`analysis_${Date.now()}.pdf`);
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

});

function renderClassMarks(termFilter="all", yearFilter="all", assessmentFilter="all") {
  const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
  const tableBody = document.getElementById("classMarksList");
  tableBody.innerHTML = "";

  let filtered = [...marks];
  if (termFilter !== "all") filtered = filtered.filter(m => m.term === termFilter);
  if (yearFilter !== "all") filtered = filtered.filter(m => m.year === yearFilter);
  if (assessmentFilter !== "all") filtered = filtered.filter(m => m.assessment === Number(assessmentFilter));

  filtered.forEach((m,i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.admissionNo}</td>
      <td>${m.studentName}</td>
      <td>${m.grade}</td>
      <td>${m.subject.replace(/-/g," ")}</td>
      <td>${m.score}</td>
      <td>${m.level}</td>
      <td>${m.term}</td>
      <td>${m.year}</td>
      <td>Assessment ${m.assessment}</td>
    `;
    tableBody.appendChild(tr);
  });
}

document.getElementById("applyFiltersBtn").addEventListener("click", () => {
  const term = document.getElementById("termFilter").value;
  const year = document.getElementById("yearFilter").value;
  const assessment = document.getElementById("assessmentFilter").value;

  renderClassMarks(term, year, assessment);
});
