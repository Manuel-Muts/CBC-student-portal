document.addEventListener('DOMContentLoaded', function() {
  const materialsForm = document.getElementById('materials-form');
  const materialsList = document.getElementById('materialsList');
  const materialGrade = document.getElementById('materialGrade');
  const materialSubject = document.getElementById('materialSubject');

  // Subject lists per grade range
  const gradeSubjects = {
    "1-3": ["Literacy", "Numeracy", "Environmental Activities", "Hygiene and Nutrition", "Religious Activities", "Movement and Creative Activities"],
    "4-6": ["Mathematics", "English", "Kiswahili", "Science and Technology", "Social Studies", "Religious Education", "Creative Arts", "Physical and Health Education"],
    "7-9": ["Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies", "Pre-Technical Studies", "Agriculture", "Business Studies", "Religious Education", "Sports and Physical Education", "Visual Arts", "Performing Arts"]
  };

  // Populate subjects based on grade
  materialGrade?.addEventListener('change', function() {
    const grade = parseInt(this.value);
    let range = grade <= 3 ? "1-3" : grade <= 6 ? "4-6" : "7-9";
    
    if (materialSubject) {
      materialSubject.innerHTML = '<option value="">-- Select Subject --</option>';
      gradeSubjects[range].forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.toLowerCase().replace(/\s+/g, '-');
        option.textContent = subject;
        materialSubject.appendChild(option);
      });
    }
  });

  // Handle form submission
  materialsForm?.addEventListener('submit', function(e) {
    e.preventDefault();

    const material = {
      grade: document.getElementById('materialGrade').value,
      subject: document.getElementById('materialSubject').value,
      title: document.getElementById('materialTitle').value.trim(),
      description: document.getElementById('materialDescription').value.trim(),
      link: document.getElementById('materialLink').value.trim(),
      teacherId: JSON.parse(localStorage.getItem('loggedInUser'))?.admission,
      dateAdded: new Date().toISOString()
    };

    // Save to localStorage
    let materials = JSON.parse(localStorage.getItem('studyMaterials') || '[]');
    materials.push(material);
    localStorage.setItem('studyMaterials', JSON.stringify(materials));

    // Reset form and refresh list
    this.reset();
    loadMaterials();
    alert('Study material added successfully!');
  });

  // Load and display materials
  function loadMaterials() {
    if (!materialsList) return;
    
    const materials = JSON.parse(localStorage.getItem('studyMaterials') || '[]');
    const currentTeacher = JSON.parse(localStorage.getItem('loggedInUser'))?.admission;
    
    materialsList.innerHTML = '';
    
    materials.filter(m => m.teacherId === currentTeacher).forEach((material, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>Grade ${material.grade}</td>
        <td>${material.subject.replace(/-/g, ' ')}</td>
        <td>${material.title}</td>
        <td>${material.description}</td>
        <td><a href="${material.link}" target="_blank">View</a></td>
        <td>
          <button onclick="deleteMaterial(${index})">🗑️ Delete</button>
        </td>
      `;
      materialsList.appendChild(row);
    });
  }

  // Delete material
  window.deleteMaterial = function(index) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    let materials = JSON.parse(localStorage.getItem('studyMaterials') || '[]');
    materials.splice(index, 1);
    localStorage.setItem('studyMaterials', JSON.stringify(materials));
    loadMaterials();
  };

  // Initial load
  loadMaterials();
});