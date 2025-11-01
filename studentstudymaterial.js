document.addEventListener("DOMContentLoaded", () => {
  const gradeFilter = document.getElementById("materialGradeFilter");
  const subjectFilter = document.getElementById("materialSubjectFilter");
  const materialsList = document.getElementById("studyMaterialsList");

  // -------------------------------
  // SUBJECTS BY GRADE RANGE
  // -------------------------------
  const gradeSubjects = {
    "1-3": ["Mathematics", "Kiswahili", "English", "Environmental Activities", "Social Studies", "Religious Studies (CRE)", "Creative Arts and Sports"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Religious Education (CRE)", "Creative Arts and Sports"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Agriculture", "Religious Studies (CRE)", "Creative Arts and Sports"]
  };

  const slugify = (s = "") => s.toLowerCase().replace(/\s+/g, "-");

  // -------------------------------
  // FILTERS
  // -------------------------------
  gradeFilter.addEventListener("change", function () {
    const grade = parseInt(this.value, 10);
    subjectFilter.innerHTML = '<option value="">All Subjects</option>';
    if (!grade) return loadMaterials();

    const range = grade <= 3 ? "1-3" : grade <= 6 ? "4-6" : "7-9";
    gradeSubjects[range].forEach((subj) => {
      const o = document.createElement("option");
      o.value = slugify(subj);
      o.textContent = subj;
      subjectFilter.appendChild(o);
    });
    loadMaterials();
  });

  subjectFilter.addEventListener("change", loadMaterials);

  // -------------------------------
  // FILTER LOGIC
  // -------------------------------
  const matchesFilter = (m, grade, subj) => {
    const g = !grade || String(m.grade) === String(grade);
    const s = !subj || slugify(m.subject || "") === subj;
    return g && s;
  };

  // -------------------------------
  // LOAD MATERIALS
  // -------------------------------
  function loadMaterials() {
    const grade = gradeFilter.value;
    const subject = subjectFilter.value;
    const all = JSON.parse(localStorage.getItem("studyMaterials") || "[]");

    materialsList.innerHTML = "";
    const filtered = all.filter((m) => matchesFilter(m, grade, subject));

    if (!filtered.length) {
      materialsList.innerHTML = `<p style="text-align:center;color:#777;">No study materials found for this selection.</p>`;
      return;
    }

    materialsList.innerHTML = filtered.map((m) => `
      <div class="material-card">
        <h3>${m.title}</h3>
        <p><strong>Grade:</strong> ${m.grade}</p>
        <p><strong>Subject:</strong> ${m.subject}</p>
        <p>${m.description || ""}</p>
        <div class="buttons">
          <button class="view-btn" data-link="${m.link}">👁️ View</button>
          <button class="download-btn" data-link="${m.link}">⬇️ Download</button>
          <button class="print-btn" data-link="${m.link}">🖨️ Print</button>
        </div>
      </div>
    `).join("");

    attachButtonHandlers();
  }

  // -------------------------------
  // BUTTON HANDLERS
  // -------------------------------
  function attachButtonHandlers() {
    materialsList.addEventListener("click", (e) => {
      const target = e.target;
      const link = target.dataset.link;
      if (!link) return;

      if (target.classList.contains("view-btn")) openFile(link);
      else if (target.classList.contains("download-btn")) downloadFile(link);
      else if (target.classList.contains("print-btn")) printFile(link);
    });
  }

  // -------------------------------
  // FILE OPERATIONS
  // -------------------------------
  function openFile(link) {
    const win = window.open(link, "_blank");
    if (!win) alert("Popup blocked — please allow popups to view this file.");
  }

  function downloadFile(link) {
    const a = document.createElement("a");
    a.href = link;
    a.download = link.split("/").pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function printFile(link) {
    const printWindow = window.open(link, "_blank");
    if (!printWindow) {
      alert("Popup blocked — please allow popups to print.");
      return;
    }
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  // Initial load
  loadMaterials();
});
