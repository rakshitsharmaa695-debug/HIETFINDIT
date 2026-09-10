const API_URL = 'https://hietfindit-lqzt.onrender.com/api/auth';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const adminLoginForm = document.getElementById('adminLoginForm');

const showLoginBtn = document.getElementById('showLoginBtn');
const showRegBtn = document.getElementById('showRegBtn');
const showAdminBtn = document.getElementById('showAdminBtn');
const messageBox = document.getElementById('messageBox');

function resetTabs() {
  showLoginBtn.className = 'flex-1 text-slate-500 hover:text-slate-700 font-bold py-2 rounded-md text-sm transition';
  showRegBtn.className = 'flex-1 text-slate-500 hover:text-slate-700 font-bold py-2 rounded-md text-sm transition';
  showAdminBtn.className = 'flex-1 text-slate-500 hover:text-slate-700 font-bold py-2 rounded-md text-sm transition';
  
  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  adminLoginForm.classList.add('hidden');
  messageBox.classList.add('hidden');
}

showLoginBtn.addEventListener('click', () => {
  resetTabs();
  loginForm.classList.remove('hidden');
  showLoginBtn.className = 'flex-1 bg-white text-indigo-600 shadow font-bold py-2 rounded-md text-sm transition';
});

showRegBtn.addEventListener('click', () => {
  resetTabs();
  registerForm.classList.remove('hidden');
  showRegBtn.className = 'flex-1 bg-white text-indigo-600 shadow font-bold py-2 rounded-md text-sm transition';
});

showAdminBtn.addEventListener('click', () => {
  resetTabs();
  adminLoginForm.classList.remove('hidden');
  showAdminBtn.className = 'flex-1 bg-slate-900 text-white shadow font-bold py-2 rounded-md text-sm transition';
});

function showMessage(msg, isError = false) {
  messageBox.textContent = msg;
  messageBox.className = `mb-4 text-center text-sm font-semibold p-3 rounded-lg ${isError ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`;
  messageBox.classList.remove('hidden');
}

// Admin Login Logic
adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('adminId').value;
  const pass = document.getElementById('adminPass').value;

  if(id === 'admin@hiet.com' && pass === 'admin123') {
    showMessage('Admin Login Successful! Redirecting...');
    setTimeout(() => window.location.href = 'admin-dashboard.html', 1000);
  } else {
    showMessage('Invalid Admin Credentials!', true);
  }
});

// User Register Logic
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    
    showMessage('Account created! Please login.');
    setTimeout(() => showLoginBtn.click(), 2000);
  } catch (err) {
    showMessage(err.message, true);
  }
});

// User Login Logic
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    showMessage('Login successful! Redirecting...');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setTimeout(() => window.location.href = 'index.html', 1500);
  } catch (err) {
    showMessage(err.message, true);
  }
});