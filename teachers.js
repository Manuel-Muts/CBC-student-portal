// Dynamic subject loading based on selected grade
const gradeSubjects = {
    "1-3": [
      "Literacy",
      "Numeracy",
      "Environmental Activities",
      "Hygiene and Nutrition",
      "Religious Activities",
      "Movement and Creative Activities"
    ],
    "4-6": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Science and Technology",
      "Social Studies",
      "Religious Education",
      "Creative Arts",
      "Physical and Health Education"
    ],
    "7-9": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "Pre-Technical Studies",
      "Agriculture",
      "Business Studies",
      "Religious Education",
      "Sports and Physical Education",
      "Visual Arts",
      "Performing Arts"
    ]
  };

  const gradeSelect = document.getElementById("grade");
  const subjectSelect = document.getElementById("subject");

  gradeSelect.addEventListener("change", function () {
    const selected = this.value;
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>'; // Reset

    if (gradeSubjects[selected]) {
      gradeSubjects[selected].forEach(subject => {
        const option = document.createElement("option");
        option.value = subject.toLowerCase().replace(/\s+/g, "-");
        option.textContent = subject;
        subjectSelect.appendChild(option);
      });
    }
  });

// Teacher authentication and name display
  document.addEventListener("DOMContentLoaded", function () {
      const stored = localStorage.getItem("loggedInUser");
      if (!stored) {
        window.location.href = "login.html";
        return;
      }

      try {
        const user = JSON.parse(stored);
        if (!user || user.role !== "teacher") {
          window.location.href = "login.html";
          return;
        }

        // ✅ Set teacher name
        const nameSpan = document.getElementById("teacherName");
        if (nameSpan && user.firstname) {
          nameSpan.textContent = user.firstname;
        }
      } catch (err) {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userRole");
        window.location.href = "login.html";
      }
    });

    function logout() {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("userRole");
      window.location.href = "login.html";
    }

// Marks submission logic.(This handles mark submission, computes levels (e.g. Excellent / Good / Fair), 
// saves them in localStorage, and displays them immediately)
  const form = document.getElementById("marks-form");
  const marksList = document.getElementById("marksList");

  // Load saved marks when page opens
  document.addEventListener("DOMContentLoaded", loadMarks);

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const admissionNo = document.getElementById("admissionNo").value.trim();
    const grade = document.getElementById("grade").value;
    const subject = document.getElementById("subject").value;
    const strand = document.getElementById("strand").value.trim();
    const score = parseFloat(document.getElementById("score").value);

    if (!admissionNo || !grade || !subject || !strand || isNaN(score)) {
      alert("Please fill in all fields correctly.");
      return;
    }

    // Determine level
    let level = "";
    if (score >= 80) level = "Excellent";
    else if (score >= 65) level = "Good";
    else if (score >= 50) level = "Fair";
    else level = "Needs Improvement";

    // Save to localStorage
    const newMark = { admissionNo, grade, subject, strand, score, level };
    const saved = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    saved.push(newMark);
    localStorage.setItem("submittedMarks", JSON.stringify(saved));

    // Update table
    appendRow(newMark);

    // Reset form
    form.reset();
    document.getElementById("subject").innerHTML = '<option value="">-- Select Subject --</option>';
  });

  function appendRow(mark) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${mark.admissionNo}</td>
      <td>${mark.grade}</td>
      <td>${mark.subject.replace(/-/g, ' ')}</td>
      <td>${mark.strand}</td>
      <td>${mark.score}</td>
      <td>${mark.level}</td>
    `;
    marksList.appendChild(row);
  }

  function loadMarks() {
    const saved = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
    saved.forEach(appendRow);
  }
