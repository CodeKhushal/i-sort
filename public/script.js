function showSignup() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.remove('hidden');
  document.getElementById('message').textContent = '';
}
function showLogin() {
  document.getElementById('signup-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('message').textContent = '';
}

// Signup
document.getElementById('signup-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('signup-email').value;
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  const res = await fetch('/api/signup', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, username, password})
  });
  const data = await res.json();
  document.getElementById('message').textContent = data.message;
  if (data.success) showLogin();
});

// Login
document.getElementById('login-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const res = await fetch('/api/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    window.location.href = '/dashboard.html';
  } else {
    document.getElementById('message').textContent = data.message;
  }
});