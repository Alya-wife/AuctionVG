const UI = {
    NAV_LINKS: [
        { href: 'dashboard.html', label: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { href: 'inventory.html', label: 'Inventory', icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
        { href: 'auction.html', label: 'Lelang', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
        { href: 'shipment.html', label: 'Pengiriman', icon: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' },
        { href: 'payment.html', label: 'Pembayaran', icon: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
        { href: 'owners.html', label: 'Pemilik', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' }
    ],

    init() {
        this.buildSidebar();
        this.initModals();
        this.initUserInfo();
    },

    buildSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const user = Auth.getUser();
        const path = window.location.pathname;

        const links = this.NAV_LINKS.map(n => `
            <a href="${n.href}" class="nav-item ${path.includes(n.href.replace('.html','')) ? 'active' : ''}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${n.icon}</svg>
                <span>${n.label}</span>
            </a>`).join('');

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="brand-icon-sm">
                    <svg width="32" height="32" viewBox="0 0 40 40"><polygon points="20,2 38,12 38,28 20,38 2,28 2,12" fill="url(#hg)"/><defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4F8EF7"/><stop offset="100%" stop-color="#7B5CF7"/></linearGradient></defs><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="Outfit">A</text></svg>
                </div>
                <span class="brand-name">NitipPro</span>
                <button class="sidebar-close" id="sidebarCloseBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <nav class="sidebar-nav">${links}</nav>
            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">${user ? user.name.charAt(0).toUpperCase() : 'A'}</div>
                    <div class="user-details">
                        <span class="user-name">${user ? user.name : 'Admin'}</span>
                        <span class="user-role">Administrator</span>
                    </div>
                </div>
                <button class="btn-logout" id="logoutBtn" title="Keluar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
            </div>`;

        // Sidebar toggle
        const hamburger = document.getElementById('hamburgerBtn');
        const overlay = document.getElementById('sidebarOverlay');
        const closeBtn = document.getElementById('sidebarCloseBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        const open = () => { sidebar.classList.add('open'); overlay && overlay.classList.add('open'); };
        const close = () => { sidebar.classList.remove('open'); overlay && overlay.classList.remove('open'); };

        if (hamburger) hamburger.addEventListener('click', open);
        if (closeBtn)  closeBtn.addEventListener('click', close);
        if (overlay)   overlay.addEventListener('click', close);
        if (logoutBtn) logoutBtn.addEventListener('click', () => { if (confirm('Yakin ingin keluar?')) Auth.logout(); });
    },

    initModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.addEventListener('click', e => { if (e.target === m) this.closeModal(m.id); });
        });
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) this.closeModal(modal.id);
            });
        });
    },

    openModal(id) {
        const m = document.getElementById(id);
        if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); }
    },

    closeModal(id) {
        const m = document.getElementById(id);
        if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
    },

    initUserInfo() {},

    showToast(message, type = 'success') {
        let toast = document.getElementById('toast');
        if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; document.body.appendChild(toast); }
        toast.className = `toast ${type}`;
        const icon = type === 'success'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        toast.innerHTML = `${icon}<span>${message}</span>`;
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    formatCurrency(n) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
    },

    formatDate(d) {
        if (!d) return '-';
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
    },

    async uploadToImgBB(file) {
        if (!file) return '';
        if (!CONFIG.IMGBB_API_KEY) {
            UI.showToast('ImgBB API Key belum dikonfigurasi', 'error');
            throw new Error('IMGBB_API_KEY missing');
        }
        
        const formData = new FormData();
        formData.append('image', file);
        // ImgBB requires the API key in the URL
        const url = `https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            UI.showToast('Gagal upload gambar ke ImgBB', 'error');
            throw new Error(data.error?.message || 'ImgBB upload failed');
        }
    },

    cardImage(card) {
        if (card.image) return card.image;
        const m = {
            'Dragon Empire': 'https://images.unsplash.com/photo-1542204637-e67bc7d41e48?w=500&q=80',
            'Keter Sanctuary': 'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=500&q=80',
            'Stoicheia': 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=500&q=80',
            'Dark States': 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&q=80',
            'Brandt Gate': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80',
            'Lyrical Monasterio': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80'
        };
        return m[card.nation] || 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=500&q=80';
    },

    statusClass(status) {
        const map = {
            'Available': 'available',
            'Auction': 'auction',
            'Sold': 'sold',
            'Waiting Shipment': 'waiting-shipment',
            'Shipped': 'shipped',
            'Waiting Payment': 'waiting-payment',
            'Completed': 'completed'
        };
        return map[status] || 'available';
    },

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name,
                mimeType: file.type,
                data: reader.result.split(',')[1] // remove data:image/...;base64,
            });
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const isLogin = ['index.html', '/'].some(p => location.pathname.endsWith(p));
    if (!isLogin) UI.init();
});

