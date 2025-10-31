document.addEventListener("DOMContentLoaded", () => {
  const notAllowedEl = document.getElementById("notAllowed");
  const analysisWrap = document.getElementById("analysisWrap");
  const logoutBtn = document.getElementById("logoutBtn");
  const exportExcelBtn = document.getElementById("exportExcel");
  const exportPdfBtn = document.getElementById("exportPdf");
  const refreshBtn = document.getElementById("refreshBtn");

  function showNotAllowed() {
    notAllowedEl && notAllowedEl.classList.remove("hidden");
    analysisWrap && analysisWrap.classList.add("hidden");
  }
  function showAnalysis() {
    notAllowedEl && notAllowedEl.classList.add("hidden");
    analysisWrap && analysisWrap.classList.remove("hidden");
  }

  // Auth check
  const stored = localStorage.getItem("loggedInUser");
  if (!stored) { showNotAllowed(); return; }

  let user;
  try { user = JSON.parse(stored); } catch (err) {
    console.error("Invalid stored user:", err);
    localStorage.removeItem("loggedInUser");
    showNotAllowed(); return;
  }

  // Authorize: require class teacher flag or role
  if (!user || (!(user.isClassTeacher) && user.role !== "classteacher")) {
    showNotAllowed(); return;
  }

  // Authorized -> show analysis
  showAnalysis();

  // Ensure toolbar buttons are plain buttons (avoid form submit)
  document.querySelectorAll(".toolbar button").forEach(b => b.setAttribute("type","button"));

  // Logout handler
  logoutBtn?.addEventListener("click", () => {
    // remove session only
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    // redirect home/login
    window.location.href = "index.html";
  });

  // Export Excel
  exportExcelBtn?.addEventListener("click", () => {
    try {
      const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
      if (!marks.length) { alert("No data to export."); return; }
      if (!window.XLSX) { alert("XLSX library not loaded."); return; }

      const aoa = [["Admission","Name","Grade","Subject","Score","Term"]];
      marks.forEach(m => aoa.push([
        m.admissionNo || m.admission || "",
        m.studentName || "",
        m.grade || "",
        (m.subject||"").replace(/-/g," "),
        m.score ?? "",
        m.term || ""
      ]));

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Analysis");
      XLSX.writeFile(wb, `analysis_${Date.now()}.xlsx`);
    } catch (err) {
      console.error("Export Excel error:", err);
      alert("Failed to export Excel.");
    }
  });

  // Export PDF
  exportPdfBtn?.addEventListener("click", () => {
    try {
      const marks = JSON.parse(localStorage.getItem("submittedMarks") || "[]");
      if (!marks.length) { alert("No data to export."); return; }
      if (!window.jspdf || !window.jspdf.jsPDF) { alert("jsPDF library not loaded."); return; }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const head = [["Admission","Name","Grade","Subject","Score","Term"]];
      const body = marks.map(m => [
        m.admissionNo || m.admission || "",
        m.studentName || "",
        m.grade || "",
        (m.subject||"").replace(/-/g," "),
        m.score ?? "",
        m.term || ""
      ]);
      doc.autoTable({ head, body, startY: 12 });
      doc.save(`analysis_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("Failed to export PDF.");
    }
  });

  // Refresh (reload or call your renderer)
  refreshBtn?.addEventListener("click", () => {
    if (typeof loadAnalysis === "function") loadAnalysis();
    else window.location.reload();
  });

  // Initial render hook
  if (typeof loadAnalysis === "function") loadAnalysis();
  else console.log("No loadAnalysis() defined — analysis UI visible for authorized user.");
});