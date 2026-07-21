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
        return u ? JSON.parse(u) : null;
    },
    checkAuth: function() {
        const user = this.getUser();
        const onLogin = ['index.html', '/'].some(p => window.location.pathname.endsWith(p));
        if (!user && !onLogin) window.location.href = 'index.html';
        if (user && onLogin) window.location.href = 'dashboard.html';
    }
};
document.addEventListener('DOMContentLoaded', () => Auth.checkAuth());
