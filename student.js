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

  // --- YEAR FILTER POPULATION ---
  const yearFilter = document.getElementById("yearFilter");
  if (yearFilter) {
    for (let yr = 2025; yr <= 2090; yr++) {
      const option = document.createElement("option");
      option.value = yr;
      option.textContent = yr;
      yearFilter.appendChild(option);
    }
  }

  // --- UTILITIES ---
  const getCBCLevel = (score) =>
    score >= 80 ? "EE" : score >= 60 ? "ME" : score >= 40 ? "AE" : "BE";

  const getSubjectAverages = (list) => {
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
    return avgs;
  };

  const generateTopStrengths = (list) => {
    const avgs = getSubjectAverages(list);
    return avgs.slice(0, 3).map((s) => `${s.subject} (${s.avg.toFixed(0)})`).join(", ") || "N/A";
  };

  const generateAreasToImprove = (list) => {
    const avgs = getSubjectAverages(list);
    return avgs.slice(-3).reverse().map((s) => `${s.subject} (${s.avg.toFixed(0)})`).join(", ") || "N/A";
  };

  const generateWiseFeedback = (list) => {
    if (!list.length) return "No marks yet to generate feedback.";
    const avg = list.reduce((s, m) => s + Number(m.score || 0), 0) / list.length;
    const level = getCBCLevel(avg);
    let advice = "";
    if (avg >= 85)
      advice = "Excellent performance! Keep challenging yourself and consider helping classmates to strengthen understanding.";
    else if (avg >= 70)
      advice = "Good work! Focus on subjects where improvement is possible and maintain consistent study habits.";
    else if (avg >= 50)
      advice = "Fair performance. Prioritize weaker areas, practice regularly, and seek guidance where needed.";
    else
      advice = "Performance below expectations. Seek extra support, focus on fundamentals, and stay disciplined in your studies.";

    return `CBC Level: ${level}. Advice: ${advice}`;
  };

  const getComment = (score, type) => {
    if (score >= 85)
      return type === "teacher"
        ? "Excellent performance. Keep it up!"
        : "Outstanding achievement. Proud of your effort!";
    if (score >= 70)
      return type === "teacher"
        ? "Good work, but there's room for improvement."
        : "Satisfactory performance. Encourage consistency.";
    if (score >= 50)
      return type === "teacher"
        ? "Needs improvement. Focus on weak areas."
        : "Performance below expectations. Monitor progress closely.";
    return type === "teacher"
      ? "Poor performance. Extra support recommended."
      : "Critical performance. Immediate attention required.";
  };

  // --- RANK CALCULATION ---
  const calculateRank = (list, allMarks) => {
    if (!list.length) return "N/A";
    const { grade, term, year, assessment } = list[0];
    const sameGroup = allMarks.filter(
      (m) => m.grade === grade && m.term === term && m.year === year && m.assessment === assessment
    );

    const totals = {};
    sameGroup.forEach((m) => {
      if (!totals[m.admissionNo]) totals[m.admissionNo] = 0;
      totals[m.admissionNo] += Number(m.score || 0);
    });

    const sorted = Object.entries(totals)
      .map(([adm, total]) => ({ adm, total }))
      .sort((a, b) => b.total - a.total);

    const pos = sorted.findIndex((s) => s.adm === user.admission);
    return pos >= 0 ? `${pos + 1} / ${sorted.length}` : "N/A";
  };

  // --- MAIN DISPLAY FUNCTION ---
  const marksContainer = document.getElementById("studentMarks");
  const displayStudentTables = () => {
    marksContainer.innerHTML = "";
    const allMarks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const studentMarks = allMarks.filter((m) => m.admissionNo === user.admission);

    const termValue = document.getElementById("termFilter").value;
    const yearValue = document.getElementById("yearFilter").value;
    const assessValue = document.getElementById("assessmentFilter").value;

    const filteredMarks = studentMarks.filter((m) => {
      return (
        (termValue === "all" || m.term === termValue) &&
        (yearValue === "all" || m.year === yearValue) &&
        (assessValue === "all" || m.assessment === assessValue)
      );
    });

    if (!filteredMarks.length) {
      marksContainer.textContent = "No marks found for selected filters.";
      return;
    }

    const grouped = {};
    filteredMarks.forEach((m) => {
      const key = `${m.grade}_${m.term}_${m.year}_${m.assessment}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    Object.entries(grouped).forEach(([key, list]) => {
      const [grade, term, year, assess] = key.split("_");
      const wrapper = document.createElement("div");
      wrapper.classList.add("marks-group");

      wrapper.innerHTML = `
        <div class="marks-header">
          <p><strong>Full Name:</strong> ${user.firstname} ${user.lastname}</p>
          <p><strong>Admission No:</strong> ${user.admission}</p>
          <p><strong>Grade/Class:</strong> ${grade}</p>
          <p><strong>Term:</strong> ${term}</p>
          <p><strong>Year:</strong> ${year}</p>
          <p><strong>Assessment:</strong> ${assess}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
      `;

      const syncBtn = document.createElement("button");
      syncBtn.textContent = "🔄 Sync This Report";
      syncBtn.classList.add("sync-btn");
      syncBtn.addEventListener("click", () => {
        localStorage.setItem("studentReportMarks", JSON.stringify(list));
        alert(`✅ Synced ${grade} ${term} (${year}) - Assessment ${assess} to report form!`);
      });
      wrapper.appendChild(syncBtn);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>Subject</th>
          <th>Score</th>
          <th>CBC Level</th>
        </tr>
      `;
      const tbody = document.createElement("tbody");
      list.forEach((m) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${(m.subject || "").replace(/-/g, " ")}</td>
          <td>${m.score}</td>
          <td>${getCBCLevel(m.score)}</td>
        `;
        tbody.appendChild(tr);
      });
      table.append(thead, tbody);
      wrapper.appendChild(table);

      const allScores = list.map((m) => Number(m.score || 0));
      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const level = getCBCLevel(avg);

      const summary = document.createElement("div");
      summary.classList.add("marks-summary");
      summary.innerHTML = `
        <p><strong>Average Score:</strong> ${avg.toFixed(2)}</p>
        <p><strong>Overall Level:</strong> ${level}</p>
        <p><strong>Class Rank:</strong> ${calculateRank(list, allMarks)}</p>
      `;
      wrapper.appendChild(summary);

      const bottom = document.createElement("div");
      bottom.classList.add("marks-bottom-summary");
      bottom.innerHTML = `
        <div class="highlights">
          <h4>Highlights</h4>
          <p><strong>Top Strengths:</strong> ${generateTopStrengths(list)}</p>
          <p><strong>Areas to Improve:</strong> ${generateAreasToImprove(list)}</p>
        </div>
        <div class="remarks">
          <h4>Teacher & Headteacher Remarks</h4>
          <p><strong>Class Teacher’s Remarks:</strong> ${getComment(avg, "teacher")}</p>
          <p><strong>Headteacher’s Remarks:</strong> ${getComment(avg, "headteacher")}</p>
          <div class="signatures">
            <div>____________________<br>Class Teacher</div>
            <div>____________________<br>Headteacher</div>
          </div>
        </div>
        <div class="ai-summary">
          <h4>AI Feedback Summary</h4>
          <p>${generateWiseFeedback(list)}</p>
        </div>
      `;
      wrapper.appendChild(bottom);

      // ✅ Add spacing AFTER content is inserted
      bottom.querySelectorAll(".average-score, .overall-level, .class-rank, .highlights, .remarks, .ai-summary").forEach((sec) => {
        sec.style.marginTop = "14px";
        sec.style.marginBottom = "14px";
        sec.style.lineHeight = "1.6";
      });

      marksContainer.appendChild(wrapper);
    });
  };

  // --- FILTER BUTTON ---
  document.getElementById("applyFiltersBtn")?.addEventListener("click", displayStudentTables);

  // --- REFRESH BUTTON ---
  const refreshBtn = document.getElementById("refreshBtn");
  refreshBtn?.addEventListener("click", () => {
    refreshBtn.classList.add("spinning");
    refreshBtn.disabled = true;
    setTimeout(() => {
      displayStudentTables();
      refreshBtn.classList.remove("spinning");
      refreshBtn.disabled = false;
    }, 1000);
  });

  // --- LOGOUT ---
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });

  displayStudentTables();
});
