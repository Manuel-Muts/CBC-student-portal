
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const firstname = (document.getElementById('firstname')?.value || '').trim();
    const lastname = (document.getElementById('lastname')?.value || '').trim();
    const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
    const gender = (document.getElementById('gender')?.value || '').trim();
    const dob = (document.getElementById('dob')?.value || '').trim();
    const role = (document.getElementById('role')?.value || '').trim();
    const admission = (document.getElementById('admission')?.value || '').trim();
    const confirmAdmission = (document.getElementById('confirmAdmission')?.value || '').trim();

    if (!firstname || !lastname || !email || !gender || !dob || !role || !admission || !confirmAdmission) {
      alert('Please fill in all fields.');
      return;
    }

    if (admission !== confirmAdmission) {
      alert('Admission / Staff No and confirmation do not match.');
      return;
    }

    // Optional teacher-specific validation: staff numbers start with "T"
    if (role === 'teacher' && !admission.toUpperCase().startsWith('T')) {
      alert("Teacher staff number must start with 'T'.");
      return;
    }

    // Load existing users
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      if (!Array.isArray(users)) users = [];
    } catch (err) {
      users = [];
    }

    // Prevent duplicate email or admission
    const duplicate = users.find(u => (u.email && u.email.toLowerCase()) === email || u.admission === admission);
    if (duplicate) {
      alert('A user with that email or admission/staff number already exists.');
      return;
    }

    const newUser = {
      firstname,
      lastname,
      email,
      gender,
      dob,
      role,
      admission
    };

    users.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    alert('Account created successfully. Please log in.');
    window.location.href = 'login.html';
  });
});





