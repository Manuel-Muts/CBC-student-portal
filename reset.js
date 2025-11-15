// reset.js
const EMAILJS_PUBLIC_KEY = 'nrjtW2YjjKe_HsgQX';
const EMAILJS_SERVICE_ID = 'service_5b2j238';
const EMAILJS_TEMPLATE_ID = 'template_f7gwjac';

emailjs.init(EMAILJS_PUBLIC_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendBtn');
  const testEmailBtn = document.getElementById('testEmailBtn');
  const feedbackEl = document.getElementById('feedback');

  function show(message, type = 'info') {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback ${type}`;
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem('registeredUsers') || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem('registeredUsers', JSON.stringify(users));
  }

  // 🔥 ROLE-BASED PASSWORD GENERATOR
  function generateTempPasswordWithRole(role) {
    const rnd = Math.random().toString(36).slice(-8).toUpperCase();
    if (role === 'teacher') return 'T-' + rnd;
    if (role === 'classTeacher') return 'CT-' + rnd;
    if (role === 'admin') return 'ADMIN-' + rnd;
    return rnd;
  }

  sendBtn.addEventListener('click', async () => {
    const role = document.getElementById('role').value;
    const firstname = document.getElementById('firstname').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!role || !firstname || !email) {
      show('Please fill all fields.', 'error');
      return;
    }

    show('Verifying details...');

    const users = getUsers();

    // 🔍 Find user by name & email only — not by role
    const userIndex = users.findIndex(u =>
      u.firstname.toLowerCase() === firstname.toLowerCase() &&
      u.email.toLowerCase() === email.toLowerCase()
    );

    if (userIndex === -1) {
      show('No matching user found.', 'error');
      return;
    }

    const user = users[userIndex];

    // ❗ EXTRA VALIDATION — must match selected role
    if (role === "teacher" && user.role !== "teacher") {
      show("This user is not registered as a teacher.", 'error');
      return;
    }

    if (role === "classTeacher" && user.isClassTeacher !== true) {
      show("This user is not a class teacher.", 'error');
      return;
    }

    // 🔥 Generate correct temporary password
    const tempPass = generateTempPasswordWithRole(role);

    show('Sending reset email...');

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
   to_email: user.email,
   user_name: user.firstname,
   reset_code: tempPass
   });

      // 🟦 UPDATE THE CORRECT PASSWORD FIELD
      if (role === 'teacher') {
        user.password = tempPass;
      }

      if (role === 'classTeacher') {
        user.ct_password = tempPass;
      }

      if (role === 'admin') {
        user.password = tempPass;
      }

      users[userIndex] = user;
      saveUsers(users);

      show('Reset email sent successfully! Redirecting...', 'info');
      setTimeout(() => window.location.href = 'login.html', 2000);

    } catch (error) {
      console.error('EmailJS error:', error);
      show('Failed to send email. Check EmailJS configuration.', 'error');
    }
  });

  // TEST BUTTON
  testEmailBtn.addEventListener('click', async () => {
    const testEmail = prompt('Enter an email address for test');
    if (!testEmail) return;

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        user_name: 'Test User',
        temp_password: 'TEST-123456'
      });
      alert('Test email sent.');
    } catch (e) {
      console.error(e);
      alert('Failed to send test email.');
    }
  });
});
