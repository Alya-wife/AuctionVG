const Auth = {
    login: async function(username, password) {
        const user = await API.request('login', { username, password });
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
            if (user && (user.name === 'Admin' || user.role === 'admin' || user.role === 'Administrator')) {
                user.name = 'Pacar Alya';
                user.role = 'Pacar Alya';
                localStorage.setItem('ag_user', JSON.stringify(user));
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
        const onLogin = ['index.html', '/'].some(p => window.location.pathname.endsWith(p));
        if (!user && !onLogin) window.location.href = 'index.html';
        if (user && onLogin) window.location.href = 'dashboard.html';
    }
};
document.addEventListener('DOMContentLoaded', () => Auth.checkAuth());
