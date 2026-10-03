// Handles the Login and Register forms.
function afterLogin(data) {
  Auth.save(data.token, data.user);
  const next = qs('next');
  if (data.user.role === 'admin') location.href = 'admin.html';
  else location.href = next && /^[\w\-.]+\.html/.test(next) ? next : 'index.html';
}

function setBusy(btn, busy, text) {
  btn.disabled = busy;
  btn.textContent = busy ? 'Please wait...' : text;
}

const loginForm = $('login-form');
if (loginForm) {
  if (Auth.token && Auth.user) location.href = Auth.user.role === 'admin' ? 'admin.html' : 'index.html';
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type=submit]');
    setBusy(btn, true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: $('email').value, password: $('password').value }
      });
      afterLogin(data);
    } catch (err) {
      showAlert('form-alert', err.message);
      setBusy(btn, false, 'Login');
    }
  });
}

const registerForm = $('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('button[type=submit]');
    if ($('password').value !== $('confirm').value) return showAlert('form-alert', 'Passwords do not match.');
    setBusy(btn, true);
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: { name: $('name').value, email: $('email').value, password: $('password').value }
      });
      afterLogin(data);
    } catch (err) {
      showAlert('form-alert', err.message);
      setBusy(btn, false, 'Create account');
    }
  });
}
