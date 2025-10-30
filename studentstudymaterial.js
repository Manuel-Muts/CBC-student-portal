document.addEventListener('DOMContentLoaded', function() {
      const gradeFilter = document.getElementById('materialGradeFilter');
      const subjectFilter = document.getElementById('materialSubjectFilter');
      const materialsList = document.getElementById('studyMaterialsList');

      // ===============================
      // SUBJECTS BY GRADE RANGE
      // ===============================
      const gradeSubjects = {
        "1-3": ["Mathematics", "Kiswahili", "English", "Environmental Activities", "Social Studies", "Religious Studies(CRE)", "Creative Arts and Sports"],
        "4-6": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Religious Education(CRE)", "Creative Arts and Sports"],
        "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Agriculture", "Religious Studies(CRE)", "Creative Arts and Sports"]
      };

      // ===============================
      // POPULATE SUBJECTS ON GRADE CHANGE
      // ===============================
      gradeFilter.addEventListener('change', function() {
        const grade = parseInt(this.value);
        subjectFilter.innerHTML = '<option value="">-- Select Subject --</option>';

        if (!grade) return;

        let range = grade <= 3 ? "1-3" : grade <= 6 ? "4-6" : "7-9";
        gradeSubjects[range].forEach(subject => {
          const option = document.createElement('option');
          option.value = subject.toLowerCase().replace(/\s+/g, '-');
          option.textContent = subject;
          subjectFilter.appendChild(option);
        });

        // Load materials when grade changes
        loadMaterials();
      });

      // Load materials when subject changes
      subjectFilter.addEventListener('change', loadMaterials);

      // ===============================
      // LOAD & FILTER MATERIALS
      // ===============================
      function loadMaterials() {
        const grade = gradeFilter.value;
        const subject = subjectFilter.value;
        const allMaterials = JSON.parse(localStorage.getItem('studyMaterials') || '[]');
        materialsList.innerHTML = '';

        // Filter by grade and subject
        const filtered = allMaterials.filter(m => {
          const matchGrade = !grade || m.grade === grade;
          const matchSubject = !subject || m.subject === subject;
          return matchGrade && matchSubject;
        });

        if (filtered.length === 0) {
          materialsList.innerHTML = '<p>No study materials found for this selection.</p>';
          return;
        }

        filtered.forEach(material => {
          const card = document.createElement('div');
          card.classList.add('material-card');
          card.innerHTML = `
            <h3>${material.title}</h3>
            <p><strong>Grade:</strong> ${material.grade}</p>
            <p><strong>Subject:</strong> ${material.subject.replace(/-/g, ' ')}</p>
            <p>${material.description}</p>
            <a href="${material.link}" target="_blank">📘 View Material</a>
          `;
          materialsList.appendChild(card);
        });
      }

      // Initial load (show all)
      loadMaterials();
    });