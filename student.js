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
  // --- Populate Year Filter dynamically from 2025 to 2090 ---
const yearFilter = document.getElementById("yearFilter");
if(yearFilter) {
  for(let yr = 2025; yr <= 2090; yr++) {
    const option = document.createElement("option");
    option.value = yr;
    option.textContent = yr;
    yearFilter.appendChild(option);
  }
}

  // --- UTILS ---
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
    return avgs.slice(0, 3).map(s => `${s.subject} (${s.avg.toFixed(0)})`).join(", ") || "N/A";
  };

  const generateAreasToImprove = (list) => {
    const avgs = getSubjectAverages(list);
    return avgs.slice(-3).reverse().map(s => `${s.subject} (${s.avg.toFixed(0)})`).join(", ") || "N/A";
  };

  // --- WISE AI FEEDBACK ---
  const generateWiseFeedback = (list) => {
    if (!list.length) return "No marks yet to generate feedback.";

    const avg = list.reduce((s, m) => s + Number(m.score || 0), 0) / list.length;
    const level = getCBCLevel(avg);
    const top = generateTopStrengths(list);
    const low = generateAreasToImprove(list);

    let advice = "";
    if(avg >= 85) {
      advice = "Excellent performance! Keep challenging yourself and consider helping classmates to strengthen understanding.";
    } else if(avg >= 70) {
      advice = "Good work! Focus on subjects where improvement is possible and maintain consistent study habits.";
    } else if(avg >= 50) {
      advice = "Fair performance. Prioritize weaker areas, practice regularly, and seek guidance where needed.";
    } else {
      advice = "Performance below expectations. Seek extra support, focus on fundamentals, and stay disciplined in your studies.";
    }

    return `
      CBC Level: ${level}.
      Top Strengths: ${top}.
      Areas to Improve: ${low}.
      Advice: ${advice}
    `;
  };

  // --- ELEMENTS ---
  const welcomeName = document.getElementById("welcomeName");
  const marksContainer = document.getElementById("studentMarks");
  const studentNameEl = document.getElementById("studentName");
  const studentAdmEl = document.getElementById("studentAdm");

  if (welcomeName) welcomeName.textContent = user.firstname || "Student";
  if (studentNameEl) studentNameEl.textContent = `${user.firstname || ""} ${user.lastname || ""}`;
  if (studentAdmEl) studentAdmEl.textContent = user.admission || "N/A";

  // --- HELPER: Teacher & Headteacher Comments ---
  const getComment = (score, type) => {
    if(score >= 85) return type === 'teacher' ? "Excellent performance. Keep it up!" : "Outstanding achievement. Proud of your effort!";
    if(score >= 70) return type === 'teacher' ? "Good work, but there's room for improvement." : "Satisfactory performance. Encourage consistency.";
    if(score >= 50) return type === 'teacher' ? "Needs improvement. Focus on weak areas." : "Performance below expectations. Monitor progress closely.";
    return type === 'teacher' ? "Poor performance. Extra support recommended." : "Critical performance. Immediate attention required.";
  };

  // --- DISPLAY TABLES ---
  const displayStudentTables = () => {
    marksContainer.innerHTML = "";
    const allMarks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    const studentMarks = allMarks.filter((m) => m.admissionNo === user.admission);

    if (!studentMarks.length) {
      marksContainer.textContent = "No marks found yet. Please check back later.";
      return;
    }

    const grouped = {};
    studentMarks.forEach((m) => {
      const key = `${m.grade}_${m.term}_${m.year}_${m.assessment}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    Object.entries(grouped).forEach(([key, list]) => {
      const [grade, term, year, assess] = key.split("_");

      const wrapper = document.createElement("div");
      wrapper.classList.add("marks-group");

      // --- Header ---
      const header = document.createElement("div");
      header.classList.add("marks-header");
      header.innerHTML = `
        <p><strong>Full Name:</strong> ${user.firstname} ${user.lastname}</p>
        <p><strong>Admission No:</strong> ${user.admission}</p>
        <p><strong>Grade/Class:</strong> ${grade}</p>
        <p><strong>Term:</strong> ${term}</p>
        <p><strong>Year:</strong> ${year}</p>
        <p><strong>Assessment:</strong> ${assess}</p>
        <p><strong>Class Teacher:</strong> ${list[0]?.teacherName || "N/A"}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      `;
      wrapper.appendChild(header);

      // --- Sync Button ---
      const syncBtn = document.createElement("button");
      syncBtn.textContent = "🔄 Sync This Report";
      syncBtn.classList.add("sync-btn");
      syncBtn.addEventListener("click", () => {
        localStorage.setItem("studentReportMarks", JSON.stringify(list));
        alert(`✅ Synced ${grade} ${term} (${year}) - Assessment ${assess} to report form!`);
      });
      wrapper.appendChild(syncBtn);

      // --- Marks Table ---
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Subject</th>
            <th>Score</th>
            <th>CBC Level</th>
            <th>Teacher</th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement("tbody");
      list.forEach((m) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${(m.subject || "").replace(/-/g, " ")}</td>
          <td>${m.score}</td>
          <td>${getCBCLevel(m.score)}</td>
          <td>${m.teacherName || "N/A"}</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrapper.appendChild(table);

      // --- Summary Stats ---
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

      // --- Bottom Section ---
      const bottomSection = document.createElement("div");
      bottomSection.classList.add("marks-bottom-summary");

      // Highlights
      const highlights = document.createElement("div");
      highlights.classList.add("highlights");
      highlights.innerHTML = `
        <h4>Highlights</h4>
        <p><strong>Top Strengths:</strong> ${generateTopStrengths(list)}</p>
        <p><strong>Areas to Improve:</strong> ${generateAreasToImprove(list)}</p>
      `;
      bottomSection.appendChild(highlights);

      // Teacher & Headteacher Remarks (automated)
      const remarks = document.createElement("div");
      remarks.classList.add("remarks");
      remarks.innerHTML = `
        <h4>Teacher & Headteacher Remarks</h4>
        <p><strong>Class Teacher’s Remarks:</strong> ${getComment(avg, 'teacher')}</p>
        <p><strong>Headteacher’s Remarks:</strong> ${getComment(avg, 'headteacher')}</p>
        <div class="signatures">
          <div class="signature-line">
            ____________________<br>Class Teacher
          </div>
          <div class="signature-line">
            ____________________<br>Headteacher
          </div>
        </div>
      `;
      bottomSection.appendChild(remarks);

      // AI Feedback
      const aiSummary = document.createElement("div");
      aiSummary.classList.add("ai-summary");
      aiSummary.innerHTML = `
        <h4>AI Feedback Summary</h4>
        <p>${generateWiseFeedback(list)}</p>
      `;
      bottomSection.appendChild(aiSummary);

      wrapper.appendChild(bottomSection);
      marksContainer.appendChild(wrapper);
    });
  };

  // --- HELPER: Class Rank ---
  const calculateRank = (list, allMarks) => {
    if (!list.length) return "N/A";
    const { grade, term, year, assessment } = list[0];

    const sameGroup = allMarks.filter(
      (m) =>
        m.grade === grade &&
        m.term === term &&
        m.year === year &&
        m.assessment === assessment
    );

    const studentTotals = {};
    sameGroup.forEach((m) => {
      if (!studentTotals[m.admissionNo]) studentTotals[m.admissionNo] = 0;
      studentTotals[m.admissionNo] += Number(m.score || 0);
    });

    const sorted = Object.entries(studentTotals)
      .map(([adm, total]) => ({ adm, total }))
      .sort((a, b) => b.total - a.total);

    const pos = sorted.findIndex((s) => s.adm === user.admission);
    return pos >= 0 ? `${pos + 1} / ${sorted.length}` : "N/A";
  };

  // --- REFRESH BUTTON ---
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.add("spinning");
      refreshBtn.disabled = true;
      setTimeout(() => {
        displayStudentTables();
        refreshBtn.classList.remove("spinning");
        refreshBtn.disabled = false;
      }, 1000);
    });
  }

  // --- LOGOUT ---
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    window.location.href = "index.html";
  });

  // --- INITIAL LOAD ---
  displayStudentTables();
});
