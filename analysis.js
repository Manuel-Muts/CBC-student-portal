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

  // ======== AUTH CHECK ========
  const stored = localStorage.getItem("loggedInUser");
  if (!stored) return showNotAllowed();

  let user;
  try {
    user = JSON.parse(stored);
  } catch {
    localStorage.removeItem("loggedInUser");
    return showNotAllowed();
  }
  if (!user?.isClassTeacher && user.role !== "classteacher") return showNotAllowed();

  showAnalysis();

  // Fetch teacher allocation
  const allocations = JSON.parse(localStorage.getItem("classTeacherAllocations") || "[]");
  const myAllocation = allocations.find(a => a.teacherAdmission === user.admission);
  if (myAllocation) user.classGrade = myAllocation.grade;

  // Auto‑fill grade filter
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
    return marks.filter(m =>
      String(m.grade) === String(user.classGrade) &&
      (!termFilter.value || m.term === termFilter.value) &&
      (!yearFilter.value || m.year == parseInt(yearFilter.value)) &&
      (assessmentFilter.value === "all" || String(m.assessment) === assessmentFilter.value) &&
      (onlyMySubjects.value === "no" || (user.subjects || []).includes(m.subject))
    );
  }

  function getCbcLevel(mean) {
    if (mean >= 75) return "EE";
    if (mean >= 50) return "ME";
    if (mean >= 35) return "AE";
    return "BE";
  }

 function calculateStats(filtered) {
  if (!filtered.length) return {};

  const subjects = new Set();
  const subjectTotals = {};
  const subjectCounts = {};

  // For class ranking: EACH submission is a separate row
  const rankingRows = filtered.map(m => {
    subjects.add(m.subject);

    // Track subject totals for class averages
    subjectTotals[m.subject] = (subjectTotals[m.subject] || 0) + m.score;
    subjectCounts[m.subject] = (subjectCounts[m.subject] || 0) + 1;

    return {
      admission: m.admission,
      name: m.studentName,
      assessment: m.assessment,
      subjects: { [m.subject]: m.score }, // initially only this subject
      total: m.score
    };
  });

  // Merge subjects within the same submission (same student + assessment)
  const mergedRankingRows = {};
  rankingRows.forEach(s => {
    const key = s.admission + "_" + s.assessment;
    if (!mergedRankingRows[key]) {
      mergedRankingRows[key] = { ...s, subjects: { ...s.subjects } };
    } else {
      Object.assign(mergedRankingRows[key].subjects, s.subjects);
      mergedRankingRows[key].total = Object.values(mergedRankingRows[key].subjects).reduce((a, b) => a + b, 0);
    }
  });

  const studentRows = Object.values(mergedRankingRows);

  // Calculate mean per submission
  studentRows.forEach(s => {
    s.mean = s.total / Object.keys(s.subjects).length;
  });

  // Sort ranking table by mean descending
  studentRows.sort((a, b) => b.mean - a.mean);

  // Subject means
  const subjectMeans = {};
  subjects.forEach(sub => {
    subjectMeans[sub] = subjectTotals[sub] / subjectCounts[sub];
  });

  // Class stats
  const classMean = studentRows.reduce((acc, s) => acc + s.mean, 0) / studentRows.length;
  const topMean = studentRows[0]?.mean ?? 0;
  const lowMean = studentRows[studentRows.length - 1]?.mean ?? 0;

  let topSubject = "", lowSubject = "";
  let topVal = -Infinity, lowVal = Infinity;
  for (let sub in subjectMeans) {
    if (subjectMeans[sub] > topVal) { topVal = subjectMeans[sub]; topSubject = sub; }
    if (subjectMeans[sub] < lowVal) { lowVal = subjectMeans[sub]; lowSubject = sub; }
  }

  return {
    studentArray: studentRows, // will render each submission as separate row
    subjects: Array.from(subjects),
    subjectMeans,
    classMean,
    topMean,
    lowMean,
    topSubject,
    lowSubject,
    records: filtered.length
  };
}

  function renderRankingTable(stats) {
  if (!stats.studentArray?.length) {
    rankingTableWrap.innerHTML = "<div class='small'>No ranking data found.</div>";
    return;
  }

  let html = `<table style="border-collapse: collapse; width: 100%; border:1px solid #000;">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Name</th>
        <th>Assessment</th>`;

  stats.subjects.forEach(sub => html += `<th>${sub}</th>`);
  html += `<th>Total Marks</th><th>CBC Level</th></tr></thead><tbody>`;

  stats.studentArray.forEach((s, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${s.name}</td>
      <td>${s.assessment}</td>`;
    stats.subjects.forEach(sub => html += `<td>${s.subjects[sub] ?? '-'}</td>`);
    html += `<td>${s.total}</td><td>${getCbcLevel(s.mean)}</td></tr>`;
  });

  html += "</tbody></table>";
  rankingTableWrap.innerHTML = html;
}

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

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  });

  // ===== EXPORT EXCEL =====
  exportExcelBtn?.addEventListener("click", () => {
    const wb = XLSX.utils.book_new();
    const filtered = getFilteredMarks();
    const stats = calculateStats(filtered);

    if (stats.studentArray?.length) {
      const data = stats.studentArray.map((s, i) => {
        const row = { Rank: i + 1, Name: s.name, Assessment: assessmentFilter.value === "all" ? "-" : assessmentFilter.value };
        stats.subjects.forEach(sub => row[sub] = s.subjects[sub] ?? "-");
        row["Total Marks"] = s.total;
        row["CBC Level"] = getCbcLevel(s.mean);
        return row;
      });
      const ws1 = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws1, "Class Ranking");
    }

    if (stats.subjects?.length) {
      const subjData = [stats.subjectMeans].map(sm => {
        const row = {};
        stats.subjects.forEach(sub => row[sub] = sm[sub].toFixed(2));
        return row;
      });
      const ws2 = XLSX.utils.json_to_sheet(subjData);
      XLSX.utils.book_append_sheet(wb, ws2, "Subject Performance");
    }

    XLSX.writeFile(wb, `Class_Report_Grade_${user.classGrade}.xlsx`);
  });

  // ===== EXPORT PDF =====
  exportPdfBtn?.addEventListener("click", () => {
    const filtered = getFilteredMarks();
    const stats = calculateStats(filtered);

    if (!filtered.length) {
      alert("No data available to export.");
      return;
    }

    // Build the container for PDF
    const pdfContainer = document.createElement("div");
    pdfContainer.style.padding = "25px";
    pdfContainer.style.fontFamily = "Arial, sans-serif";
    pdfContainer.classList.add("pdf-container");
    pdfContainer.style.fontSize = "9px";
    pdfContainer.style.background = "#fff";
    pdfContainer.style.color = "#000";
    // Ensure the container is added to DOM so styles apply
    document.body.appendChild(pdfContainer);

    const title = document.createElement("h2");
    title.style.textAlign = "center";
    title.textContent = `Class Report - Grade ${user.classGrade}`;
    pdfContainer.appendChild(title);
    

    const info = document.createElement("p");
    info.style.textAlign = "center";
    info.textContent = `Term: ${termFilter.value || "-"} | Year: ${yearFilter.value || "-"} | Assessment: ${assessmentFilter.value}`;
    pdfContainer.appendChild(info);

    const statsDiv = document.createElement("p");
    statsDiv.textContent = `Class Mean: ${stats.classMean?.toFixed(2) || 0}, Top Mean: ${stats.topMean?.toFixed(2) || 0}, Low Mean: ${stats.lowMean?.toFixed(2) || 0}, Top Subject: ${stats.topSubject || '-'}, Weak Subject: ${stats.lowSubject || '-'}, Records: ${stats.records || 0}`;
    pdfContainer.appendChild(statsDiv);

    if (stats.studentArray?.length) {
      const rankTable = rankingTableWrap.cloneNode(true);
      pdfContainer.appendChild(document.createElement("br"));
      pdfContainer.appendChild(rankTable);
    }
    if (stats.subjects?.length) {
      const subjTable = subjectTableWrap.cloneNode(true);
      pdfContainer.appendChild(document.createElement("br"));
      pdfContainer.appendChild(subjTable);
    }

    html2pdf()
      .set({
        margin: 10,
        filename: `Class_Report_Grade_${user.classGrade}.pdf`,
        html2canvas: { scale: 2, scrollY: -window.scrollY },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      })
      .from(pdfContainer)
      .save()
      .then(() => {
        // clean up if you added it
        document.body.removeChild(pdfContainer);
      })
      .catch(err => {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF. Check console for details.");
        document.body.removeChild(pdfContainer);
      });
  });
});

// ====== TREND CHART ======
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
    return parseFloat((filtered.reduce((sum, m) => sum + m.score, 0) / filtered.length).toFixed(2));
  });

  if (window.classTrendChart) window.classTrendChart.destroy();
  window.classTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["1", "2", "3", "4", "5"],
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
