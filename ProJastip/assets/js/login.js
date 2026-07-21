document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorMsg');
    const btnText = document.getElementById('loginBtnText');
    const spinner = document.getElementById('loginSpinner');
    const loginBtn = document.getElementById('loginBtn');

    // Create particles for background
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.width = Math.random() * 5 + 2 + 'px';
        p.style.height = p.style.width;
        p.style.background = Math.random() > 0.5 ? 'var(--primary)' : 'var(--secondary)';
        p.style.borderRadius = '50%';
        p.style.position = 'absolute';
        p.style.opacity = Math.random() * 0.5 + 0.1;
        p.style.animation = `float ${Math.random() * 10 + 5}s linear infinite`;
        particlesContainer.appendChild(p);
    }

    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            // Toggle icon
            if (type === 'text') {
                togglePassword.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            } else {
                togglePassword.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;

            // Loading state
            loginBtn.disabled = true;
            btnText.textContent = 'Memverifikasi...';
            spinner.classList.remove('hidden');
            errorMsg.classList.add('hidden');

            try {
                await Auth.login(username, password);
                // Success - redirect
                window.location.href = 'dashboard.html';
            } catch (error) {
                // Error
                errorMsg.classList.remove('hidden');
                errorText.textContent = error.message;
                loginBtn.disabled = false;
                btnText.textContent = 'Masuk';
                spinner.classList.add('hidden');
            }
        });
    }
});
