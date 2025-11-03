document.addEventListener("DOMContentLoaded", () => {
  // =============================
  // AUTHENTICATION
  // =============================
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    alert("Please log in again.");
    window.location.href = "login.html";
    return;
  }

  // =============================
  // GET MARKS DATA
  // =============================
  let marks = JSON.parse(localStorage.getItem("studentReportMarks") || "[]");
  if (!marks.length) marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");

  const studentMarks = marks.filter(m => m.admissionNo === user.admission);
  if (!studentMarks.length) {
    alert("No report data found for this student yet.");
    return;
  }

  // =============================
  // HELPER FUNCTION
  // =============================
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  // =============================
  // AUTO-UPDATE GRADE FROM MARKS
  // =============================
  const latestGradeRecord = studentMarks.find(m => m.grade);
  if (latestGradeRecord && latestGradeRecord.grade !== user.grade) {
    user.grade = latestGradeRecord.grade;
    localStorage.setItem("loggedInUser", JSON.stringify(user));
  }

  // =============================
  // BASIC STUDENT INFO
  // =============================
  setText("studentName", `${user.firstname} ${user.lastname || ""}`);
  setText("admissionNo", user.admission);
  setText("studentGrade", user.grade || "N/A");
  setText("reportDate", new Date().toLocaleDateString());

  // =============================
  // DETERMINE LATEST TERM / YEAR
  // =============================
  const termOrder = { "Term 1": 1, "Term 2": 2, "Term 3": 3 };
  const sortedMarks = [...studentMarks].sort(
    (a, b) =>
      (b.year - a.year) ||
      ((termOrder[b.term] || 0) - (termOrder[a.term] || 0))
  );

  const latestMark = sortedMarks[0];
  const currentYear = latestMark.year || new Date().getFullYear();

  setText("studentTerm", latestMark.term || "N/A");
  setText("studentYear", currentYear);

  // =============================
  // ASSESSMENT DISPLAY
  // =============================
  if (latestMark.assessment) {
    const existing = document.getElementById("studentAssessment");
    if (!existing) {
      const p = document.createElement("p");
      p.innerHTML = `<strong>Assessment:</strong> <span id="studentAssessment">${latestMark.assessment}</span>`;
      const infoSection = document.querySelector(".student-info");
      if (infoSection) infoSection.appendChild(p);
    } else {
      setText("studentAssessment", latestMark.assessment);
    }
  }

  // =============================
  // POPULATE MARKS TABLE
  // =============================
  const tbody = document.querySelector("#marksTable tbody");
  if (!tbody) {
    console.error("❌ Missing table body (#marksTable tbody)");
    return;
  }

  tbody.innerHTML = "";
  let total = 0;

  studentMarks.forEach(m => {
    const tr = document.createElement("tr");
    const score = Number(m.score || 0);
    tr.innerHTML = `
      <td>${(m.subject || "").replace(/-/g, " ")}</td>
      <td>${score}</td>
      <td>${getCBCLevel(score)}</td>
      <td>${getSubjectRemark(score)}</td>
      <td>${m.term || "N/A"}</td>
      <td>${m.year || currentYear}</td>
    `;
    tbody.appendChild(tr);
    total += score;
  });

  const mean = studentMarks.length
    ? (total / studentMarks.length).toFixed(1)
    : 0;
  setText("totalMarks", total.toFixed(0));
  setText("meanScore", mean);

  setText("teacherComment", getTeacherComment(mean));
  setText("headComment", getHeadteacherComment(mean));

 // =============================
// CONTROL BUTTONS (External)
// =============================
const reportElement = document.querySelector(".report-container");
const downloadBtn = document.getElementById("downloadBtn");
const printBtn = document.getElementById("printBtn");
const refreshBtn = document.getElementById("refreshBtn");

// 🔄 Refresh
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => window.location.reload());
}

// 🖨️ Print
if (printBtn) {
  printBtn.addEventListener("click", () => {
    window.print();
  });
}

// ⬇️ Download PDF
if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    if (!reportElement) return;

    const grade = user.grade || "Grade";
    const term = latestMark.term || "Term";
    const assess = latestMark.assessment || "Assessment";
    const filename = `Report_${grade}_${term}_${assess}_${currentYear}.pdf`;

    // Temporarily hide external buttons
    document.querySelector(".report-controls").style.display = "none";

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };

    html2pdf()
      .set(opt)
      .from(reportElement)
      .save()
      .then(() => {
        document.querySelector(".report-controls").style.display = "block";
      });
  });
}

  // =============================
  // PDF DOWNLOAD FUNCTION (Optimized)
  // =============================
  function downloadReportAsPDF() {
    const element = document.querySelector(".report-container");
    if (!element) return;

    const grade = user.grade || "Grade";
    const term = latestMark.term || "Term";
    const assess = latestMark.assessment || "Assessment";
    const filename = `Report_${grade}_${term}_${assess}_${currentYear}.pdf`;

    // Hide buttons before export
    document.querySelectorAll(".print-btn, .refresh-btn").forEach(btn => btn.style.display = "none");

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: filename,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restore buttons after export
      document.querySelectorAll(".print-btn, .refresh-btn").forEach(btn => btn.style.display = "block");
    });
  }

  // =============================
  // HELPER FUNCTIONS
  // =============================
  function getCBCLevel(score) {
    if (score >= 80) return "Exceeding Expectation (EE)";
    if (score >= 60) return "Meeting Expectation (ME)";
    if (score >= 40) return "Approaching Expectation (AE)";
    return "Below Expectation (BE)";
  }

  function getSubjectRemark(score) {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Needs Improvement";
  }

  function getTeacherComment(mean) {
    if (mean >= 80) return "Great progress this term!";
    if (mean >= 60) return "Good effort, stay focused.";
    if (mean >= 40) return "You can do better with more effort.";
    return "Work harder next term.";
  }

  function getHeadteacherComment(mean) {
    if (mean >= 80) return "Keep up the outstanding work.";
    if (mean >= 60) return "A commendable performance.";
    if (mean >= 40) return "Needs improvement in some areas.";
    return "Put in more effort to improve.";
  }
});
