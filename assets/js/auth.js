const Auth = {
    login: async function(username, password) {
        const user = await API.request('login', { username, password });
        localStorage.setItem('ag_user', JSON.stringify(user));
        return user;
    },
    googleLogin: async function(credential) {
        const user = await API.request('googleLogin', { credential });
        localStorage.setItem('ag_user', JSON.stringify(user));
        return user;
    },
    logout: function() {
        localStorage.removeItem('ag_user');
        window.location.href = 'index.html';
    },
    getUser: function() {
        const u = localStorage.getItem('ag_user');
        if (!u) return null;
        try {
            const user = JSON.parse(u);
            if (user && user.email && user.email.toLowerCase() === 'ravywhienelda@gmail.com') {
                user.role = 'Super Admin';
            }
            return user;
        } catch(e) {
            return null;
        }
    },
    setUser: function(user) {
        localStorage.setItem('ag_user', JSON.stringify(user));
    },
    checkAuth: function() {
        const user = this.getUser();
        const path = window.location.pathname;
        const onLogin = ['index.html', '/', 'scanner-debug.html'].some(p => path.endsWith(p));

        if (!user && !onLogin) {
            window.location.href = 'index.html';
            return;
        }
        if (user && onLogin && !path.endsWith('scanner-debug.html')) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Role Guard: Staff tidak bisa akses users.html (Kelola Admin) dan payment.html (Pembayaran)
        if (user) {
            const isSuperAdmin = (
                user.role === 'Super Admin' || 
                (user.email && user.email.toLowerCase() === 'ravywhienelda@gmail.com')
            );
            const isRestricted = path.includes('users.html') || path.includes('payment.html');
            if (!isSuperAdmin && isRestricted) {
                alert('Akses ditolak: Hanya Super Admin yang dapat mengakses halaman ini.');
                window.location.href = 'dashboard.html';
            }
        }
    }
};
document.addEventListener('DOMContentLoaded', () => Auth.checkAuth());
