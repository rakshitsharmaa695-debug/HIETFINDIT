document.addEventListener('DOMContentLoaded', () => {
  // 1. Check if user is logged in
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    // Agar login nahi hai, toh login page par bhejo
    window.location.href = 'login.html';
    return;
  }

  // 2. Display User Info
  const user = JSON.parse(userStr);
  document.getElementById('userNameDisplay').textContent = user.name;
  document.getElementById('userRoleDisplay').textContent = user.role;

  // 3. Logout Functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      const confirmLogout = confirm('Are you sure you want to log out?');
      if (confirmLogout) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
      }
    });
  }
});