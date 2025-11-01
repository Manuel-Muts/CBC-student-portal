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

  // --- UI Targets ---
  const welcomeEl = document.getElementById("welcomeMessage");
  const marksContainer = document.getElementById("studentMarks");
  const rankEl = document.getElementById("classRank");
  const avgEl = document.getElementById("studentAvg");
  const feedbackEl = document.getElementById("aiFeedback");

  if (welcomeEl) welcomeEl.textContent = `Welcome, ${user.firstname || "Student"}`;

  // --- Load Marks ---
  const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
  const studentMarks = marks.filter(m => m.admissionNo === user.admission);

  // --- Display Marks ---
  if (marksContainer) {
    marksContainer.innerHTML = "";
    if (!studentMarks.length) {
      marksContainer.textContent = "No marks yet.";
    } else {
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Term</th>
            <th>Grade</th>
            <th>Subject</th>
            <th>Score</th>
            <th>CBC Level</th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement("tbody");

      studentMarks.forEach(m => {
        const level = getCBCLevel(Number(m.score));
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.term || ""}</td>
          <td>${m.grade || ""}</td>
          <td>${(m.subject || "").replace(/-/g, " ")}</td>
          <td>${m.score}</td>
          <td>${level}</td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      marksContainer.appendChild(table);
    }
  }

  // --- Compute Average ---
  const avg = studentMarks.length
    ? studentMarks.reduce((s, m) => s + Number(m.score || 0), 0) / studentMarks.length
    : 0;
  if (avgEl) avgEl.textContent = avg ? avg.toFixed(2) : "N/A";

  // --- Compute Class Rank ---
  if (studentMarks.length) {
    const latestTerm = studentMarks[studentMarks.length - 1].term;
    const latestGrade = studentMarks[studentMarks.length - 1].grade;

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
      avg: students[adm].total / students[adm].count
    }));

    averages.sort((a, b) => b.avg - a.avg);
    const pos = averages.findIndex(a => a.adm === user.admission);
    const rankText = pos >= 0 ? `${pos + 1} / ${averages.length}` : "N/A";
    if (rankEl) rankEl.textContent = rankText;
  } else {
    if (rankEl) rankEl.textContent = "N/A";
  }

  // --- AI Feedback Generator ---
  function generateFeedback(marksList) {
    if (!marksList || !marksList.length)
      return "No marks yet to generate feedback.";

    const avgScore = marksList.reduce((s, m) => s + Number(m.score || 0), 0) / marksList.length;
    const level = getCBCLevel(avgScore);
    let feedback = `CBC Level: ${level}\n`;

    if (avgScore >= 80)
      feedback += "Excellent overall performance. Keep consolidating strengths.\n";
    else if (avgScore >= 60)
      feedback += "Good performance. Focus on consistency to reach excellence.\n";
    else if (avgScore >= 40)
      feedback += "Fair performance. Work on weaker topics and practice more.\n";
    else
      feedback += "Needs improvement. Consider extra practice and ask your teacher for guidance.\n";

    // Identify weakest subjects
    const bySubject = {};
    marksList.forEach(m => {
      const s = m.subject || "unknown";
      bySubject[s] = bySubject[s] || { total: 0, count: 0 };
      bySubject[s].total += Number(m.score || 0);
      bySubject[s].count += 1;
    });

    const subAvgs = Object.keys(bySubject).map(s => ({
      subject: s.replace(/-/g, " "),
      avg: bySubject[s].total / bySubject[s].count
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

  if (feedbackEl) feedbackEl.textContent = generateFeedback(studentMarks);
});

// ================================
// ADDITIONAL REPORT & CHART LOGIC
// ================================
document.addEventListener("DOMContentLoaded", () => {
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
    teacherEl.textContent = "Mr. John Doe"; // you can make dynamic later
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
    avg: bySubject[s].total / bySubject[s].count
  }));
  subjectAverages.sort((a, b) => b.avg - a.avg);

  strengthsEl.textContent = subjectAverages.slice(0, 3).map(s => `${s.subject} (${s.avg.toFixed(0)}%)`).join(", ") || "N/A";
  improveEl.textContent = subjectAverages.slice(-3).map(s => `${s.subject} (${s.avg.toFixed(0)}%)`).join(", ") || "N/A";

  // ============ CHARTS ============
  const ctx1 = document.getElementById("subjectChart");
  const ctx2 = document.getElementById("performanceChart");

  if (ctx1 && subjectAverages.length) {
    new Chart(ctx1, {
      type: "bar",
      data: {
        labels: subjectAverages.map(s => s.subject),
        datasets: [{
          label: "Subject Scores",
          data: subjectAverages.map(s => s.avg),
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: false } }
      }
    });
  }

  if (ctx2) {
    // Term trend (simple average per term)
    const byTerm = {};
    studentMarks.forEach(m => {
      byTerm[m.term] = byTerm[m.term] || { total: 0, count: 0 };
      byTerm[m.term].total += Number(m.score || 0);
      byTerm[m.term].count += 1;
    });
    const termData = Object.keys(byTerm).map(t => ({
      term: t,
      avg: byTerm[t].total / byTerm[t].count
    }));

    new Chart(ctx2, {
      type: "line",
      data: {
        labels: termData.map(d => d.term),
        datasets: [{
          label: "Average per Term",
          data: termData.map(d => d.avg),
          fill: false,
          tension: 0.3,
          borderWidth: 2
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });
  }
});
//welcome message script
(function() {
  const stored = localStorage.getItem('loggedInUser');
  const welcomeEl = document.getElementById('welcomeName');
  if (!welcomeEl) return;

  try {
    const user = stored ? JSON.parse(stored) : null;
    if (user) {
      // prefer firstname, fallback to fullname or email
      welcomeEl.textContent = user.firstname || user.fullname || user.email || 'Student';
    } else {
      welcomeEl.textContent = 'Guest';
    }
  } catch (err) {
    console.error('Welcome message error:', err);
    welcomeEl.textContent = 'Student';
  }
})();

  // Logout button (attach after DOM ready)
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
  });

// Ensure the header refresh button works — add this at end of file
document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById("refreshBtn");
  if (!refreshBtn) return;

  // Prevent accidental form submit (if inside a form)
  refreshBtn.setAttribute("type", "button");

  refreshBtn.addEventListener("click", () => {
    // Prefer internal refresh functions if present
    if (typeof refreshStudentDashboard === "function") {
      refreshStudentDashboard();
      return;
    }
    if (typeof loadStudentData === "function") {
      loadStudentData();
      return;
    }
    // Fallback: reload the page to re-run scripts and UI rendering
    window.location.reload();
  });
});
