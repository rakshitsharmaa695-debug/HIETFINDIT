const API_URL = 'http://localhost:5000/api/auth';

// UI Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegBtn = document.getElementById('showRegBtn');
const messageBox = document.getElementById('messageBox');

// Toggle between Login and Register
showRegBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  showRegBtn.classList.add('bg-indigo-600', 'text-white');
  showRegBtn.classList.remove('text-slate-400');
  showLoginBtn.classList.remove('bg-indigo-600', 'text-white');
  showLoginBtn.classList.add('text-slate-400');
  messageBox.classList.add('hidden');
});

showLoginBtn.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  showLoginBtn.classList.add('bg-indigo-600', 'text-white');
  showLoginBtn.classList.remove('text-slate-400');
  showRegBtn.classList.remove('bg-indigo-600', 'text-white');
  showRegBtn.classList.add('text-slate-400');
  messageBox.classList.add('hidden');
});

function showMessage(msg, isError = false) {
  messageBox.textContent = msg;
  messageBox.className = `mt-4 text-center text-sm font-semibold p-2 rounded ${isError ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`;
  messageBox.classList.remove('hidden');
}

// Handle Registration
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
    
    showMessage('Account created successfully! Please login.');
    setTimeout(() => showLoginBtn.click(), 2000); // Switch to login tab
  } catch (err) {
    showMessage(err.message, true);
  }
});

// Handle Login
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
    
    // Save Token to LocalStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect to main dashboard (hum ise next step me banayenge)
    setTimeout(() => {
      window.location.href = 'index.html'; 
    }, 1500);

  } catch (err) {
    showMessage(err.message, true);
  }
});