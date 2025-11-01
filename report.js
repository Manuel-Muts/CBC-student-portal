document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");

  if (!user) {
    alert("Please log in again.");
    window.location.href = "login.html";
    return;
  }

  // Fill in student details
  document.getElementById("studentName").textContent = user.firstname + " " + (user.lastname || "");
  document.getElementById("admissionNo").textContent = user.admission;
  document.getElementById("studentGrade").textContent = user.grade || "N/A";
  document.getElementById("studentTerm").textContent = user.term || "N/A";
  document.getElementById("reportDate").textContent = new Date().toLocaleDateString();

  // Get student’s marks
  const studentMarks = marks.filter(m => m.admissionNo === user.admission);

  const tbody = document.querySelector("#marksTable tbody");
  let total = 0;

  studentMarks.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${(m.subject || "").replace(/-/g, " ")}</td>
      <td>${m.score || 0}</td>
      <td>${getCBCLevel(Number(m.score))}</td>
      <td>${generateRemark(Number(m.score))}</td>
    `;
    tbody.appendChild(tr);
    total += Number(m.score);
  });

  const mean = studentMarks.length ? (total / studentMarks.length).toFixed(1) : 0;
  document.getElementById("totalMarks").textContent = total.toFixed(0);
  document.getElementById("meanScore").textContent = mean;

  document.getElementById("teacherComment").textContent = getTeacherComment(mean);
  document.getElementById("headComment").textContent = getHeadteacherComment(mean);
});

// --- CBC Level Logic ---
function getCBCLevel(score) {
  if (score >= 80) return "Exceeding Expectation (EE)";
  if (score >= 60) return "Meeting Expectation (ME)";
  if (score >= 40) return "Approaching Expectation (AE)";
  return "Below Expectation (BE)";
}

function generateRemark(score) {
  if (score >= 80) return "Excellent performance.";
  if (score >= 60) return "Good effort, keep improving.";
  if (score >= 40) return "Needs more practice.";
  return "Requires close attention.";
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
