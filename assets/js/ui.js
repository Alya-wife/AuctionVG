const UI = {
    NAV_LINKS: [
        { href: 'dashboard.html', label: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>' },
        { href: 'inventory.html', label: 'Inventory', icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
        { href: 'cards.html', label: 'Database Kartu', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
        { href: 'auction.html', label: 'Lelang', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
        { href: 'shipment.html', label: 'Pengiriman', icon: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' },
        { href: 'owners.html', label: 'Pemilik', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
        { href: 'scanner-debug.html', label: 'AI Scanner (Debug)', icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' }
    ],

    init() {
        this.buildSidebar();
        this.initModals();
        this.initUserInfo();
        this.initCurrencyInputs();
    },

    initCurrencyInputs() {
        document.addEventListener('input', (e) => {
            if (e.target && e.target.classList.contains('currency-input')) {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value !== '') {
                    e.target.value = parseInt(value, 10).toLocaleString('id-ID');
                } else {
                    e.target.value = '';
                }
            }
        });
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
                    <div class="user-avatar">${user && user.name ? user.name.charAt(0).toUpperCase() : 'P'}</div>
                    <div class="user-details">
                        <span class="user-name">${user && user.name ? user.name : 'Pacar Alya'}</span>
                        <span class="user-role">Pacar Alya</span>
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

    parseCurrency(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return parseFloat(value.toString().replace(/\./g, '')) || 0;
    },

    formatDate(d) {
        if (!d) return '-';
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
    },

    renderTypeBox(cardOrType, size = 'md') {
        let val = 'JP';
        let card = null;
        if (typeof cardOrType === 'object' && cardOrType !== null) {
            card = cardOrType;
            val = card.type || card.language || 'JP';
        } else if (typeof cardOrType === 'string') {
            val = cardOrType;
        }
        const t = val.toString().trim().toUpperCase() === 'EN' ? 'EN' : 'JP';

        // Jika hanya string bahasa (bukan objek kartu)
        if (!card) {
            return `<div class="card-type-box type-${t.toLowerCase()} size-${size}"><span>${t}</span></div>`;
        }

        // Resolusi gambar dan grade dari kartu atau CardDB
        let imageName = card.image;
        if (!imageName || imageName === 'JP' || imageName === 'EN') {
            if (window.CardDB) {
                const match = CardDB.findByName(card.name);
                if (match && match.image) imageName = match.image;
            }
        }
        let grade = card.grade;
        if (grade === undefined || grade === null || grade === '') {
            if (window.CardDB) {
                const match = CardDB.findByName(card.name);
                if (match && match.grade !== undefined) grade = match.grade;
            }
        }
        const imgUrl = (window.CardDB && imageName) ? CardDB.getImageUrl(imageName) : 'assets/images/cards/placeholder_card.svg';
        const gradeHtml = '';
        const langHtml = `<span class="card-lang-badge lang-${t.toLowerCase()}">${t}</span>`;

        if (size === 'detail') {
            return `
                <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:10px 0;">
                    <div style="position:relative;width:220px;height:308px;border-radius:12px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.6);border:2px solid rgba(255,255,255,0.18);background:#090d16;">
                        <img src="${imgUrl}" alt="${card.name || 'Kartu'}" style="width:100%;height:100%;object-fit:cover;object-position:center top;" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
                        ${gradeHtml}
                        ${langHtml}
                    </div>
                </div>`;
        }

        if (size === 'sm') {
            return `
                <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;background:#090d16;border:1px solid rgba(255,255,255,0.15);flex-shrink:0;position:relative;">
                    <img src="${imgUrl}" alt="${card.name || ''}" style="width:100%;height:100%;object-fit:cover;object-position:center top;" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
                </div>`;
        }

        // Default size = 'md' (Card Grid)
        return `
            <img class="card-thumb-img" src="${imgUrl}" alt="${card.name || 'Kartu'}" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
            ${gradeHtml}
            ${langHtml}
        `;
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
    },

    /**
     * Otomatis mengonversi gambar apapun (JPG, PNG, GIF, dll) ke format WebP terkompresi
     */
    async convertImageToWebP(file, options = {}) {
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('File yang dipilih bukan gambar yang valid.');
        }

        const maxWidth = options.maxWidth || 900;
        const maxHeight = options.maxHeight || 1260;
        const quality = options.quality !== undefined ? options.quality : 0.84;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
            reader.onload = (e) => {
                const img = new Image();
                img.onerror = () => reject(new Error('Gagal memuat elemen gambar.'));
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    const webpBaseName = file.name.replace(/\.[^/.]+$/, "") || "card";
                    const webpFileName = webpBaseName + ".webp";

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            return reject(new Error('Browser gagal mengekspor ke format WebP.'));
                        }

                        const webpFile = new File([blob], webpFileName, { type: 'image/webp' });
                        const dataUrl = canvas.toDataURL('image/webp', quality);
                        const savedBytes = Math.max(0, file.size - blob.size);
                        const savedPercent = file.size > 0 ? Math.round((savedBytes / file.size) * 100) : 0;

                        resolve({
                            file: webpFile,
                            blob: blob,
                            dataUrl: dataUrl,
                            name: webpFileName,
                            originalSize: file.size,
                            newSize: blob.size,
                            savedPercent: savedPercent,
                            width: width,
                            height: height
                        });
                    }, 'image/webp', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    convertDataUrlToWebP(dataUrl, quality = 0.82) {
        return new Promise((resolve) => {
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                return resolve(dataUrl);
            }
            if (dataUrl.startsWith('data:image/webp')) {
                return resolve(dataUrl);
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/webp', quality));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const isLogin = ['index.html', '/'].some(p => location.pathname.endsWith(p));
    if (!isLogin) UI.init();
});

