let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPublicOwners();
    initPublicSearch();
    initLoginModal();
    initModals();
});

// Load data for public search
async function loadPublicOwners() {
    const container = document.getElementById('publicOwnerResults');
    try {
        inventoryData = await API.request('getInventory');
        // Show initial empty state message instead of rendering all owners
        container.innerHTML = '';
    } catch(e) {
        container.innerHTML = '<p class="empty-msg">Gagal memuat data. Silakan coba lagi.</p>';
    }
}

// Init public search functionality
function initPublicSearch() {
    document.getElementById('publicOwnerSearch').addEventListener('input', renderPublicOwners);
}

// Render owner list for public search
function renderPublicOwners() {
    const search = document.getElementById('publicOwnerSearch').value.toLowerCase().trim();
    const container = document.getElementById('publicOwnerResults');

    // Show prompt message if no search input or less than 3 chars
    if (search.length < 3) {
        container.innerHTML = '';
        return;
    }

    const map = {};
    inventoryData.forEach(card => {
        if (!map[card.owner]) {
            map[card.owner] = { 
                name: card.owner, 
                total: 0, 
                available: 0, 
                sold: 0, 
                shipment: 0, 
                payment: 0, 
                completed: 0, 
                cards: [] 
            };
        }
        const o = map[card.owner];
        o.total++;
        o.cards.push(card);
        if (['Available','Auction'].includes(card.status)) o.available++;
        if (card.status === 'Sold') o.sold++;
        if (card.status === 'Waiting Shipment') o.shipment++;
        if (card.status === 'Waiting Payment') o.payment++;
        if (card.status === 'Completed') o.completed++;
    });

    let owners = Object.values(map).filter(o => o.name.toLowerCase().includes(search));

    if (!owners.length) {
        container.innerHTML = '<p class="empty-msg">Tidak ada pemilik ditemukan dengan nama tersebut.</p>';
        return;
    }

    container.innerHTML = owners.map(o => `
        <div class="public-owner-card" onclick="openPublicOwnerDetail('${o.name}')">
            <div class="owner-avatar">${o.name.charAt(0).toUpperCase()}</div>
            <div class="owner-body">
                <h3>${o.name}</h3>
                <p>${o.total} kartu total</p>
                <div class="owner-badges">
                    <span class="status-badge status-available">${o.available} Tersedia</span>
                    <span class="status-badge status-sold">${o.sold} Terjual</span>
                    ${o.shipment ? `<span class="status-badge status-waiting-shipment">${o.shipment} Kirim</span>` : ''}
                    ${o.payment  ? `<span class="status-badge status-waiting-payment">${o.payment} Bayar</span>` : ''}
                    <span class="status-badge status-completed">${o.completed} Selesai</span>
                </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);flex-shrink:0">
                <polyline points="9 18 15 12 9 6"/>
            </svg>
        </div>
    `).join('');
}

let currentPublicOwnerCards = [];
let currentPublicFilterTab = 'all';

const PUBLIC_STATUS_TABS = [
    { id: 'all', label: 'Semua', filter: () => true },
    { id: 'available', label: 'Available', filter: c => ['Available', 'Auction'].includes(c.status) },
    { id: 'sold', label: 'Terjual', filter: c => c.status === 'Sold' },
    { id: 'payment', label: 'Menunggu Dibayar', filter: c => c.status === 'Waiting Payment' },
    { id: 'shipment', label: 'Menunggu Dikirim', filter: c => ['Waiting Shipment', 'Shipped'].includes(c.status) },
    { id: 'payout', label: 'Menunggu Uang ke Pemilik', filter: c => !c.payoutDate && ['Completed', 'Waiting Payment', 'Sold', 'Waiting Shipment'].includes(c.status) },
    { id: 'completed', label: 'Selesai', filter: c => c.status === 'Completed' }
];

// Open public owner detail modal
window.openPublicOwnerDetail = function(ownerName) {
    currentPublicOwnerCards = inventoryData.filter(c => c.owner === ownerName);
    currentPublicFilterTab = 'all';

    document.getElementById('publicOwnerDetailName').textContent = ownerName;
    const totalEl = document.getElementById('publicOwnerDetailTotal');
    if (totalEl) totalEl.textContent = `${currentPublicOwnerCards.length} kartu total`;

    renderPublicOwnerTabs();
    renderPublicOwnerCardsGrid();
    openModal('modalPublicOwnerDetail');
};

function renderPublicOwnerTabs() {
    const tabsContainer = document.getElementById('publicOwnerStatusTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = PUBLIC_STATUS_TABS.map(tab => {
        const count = currentPublicOwnerCards.filter(tab.filter).length;
        const isActive = tab.id === currentPublicFilterTab;
        return `
            <button class="owner-status-tab-btn ${isActive ? 'active' : ''}" onclick="setPublicOwnerFilterTab('${tab.id}')">
                <span>${tab.label}</span>
                <span class="tab-count">${count}</span>
            </button>
        `;
    }).join('');
}

window.setPublicOwnerFilterTab = function(tabId) {
    currentPublicFilterTab = tabId;
    renderPublicOwnerTabs();
    renderPublicOwnerCardsGrid();
};

function renderPublicOwnerCardsGrid() {
    const grid = document.getElementById('publicOwnerCardsGrid');
    if (!grid) return;

    const currentTabObj = PUBLIC_STATUS_TABS.find(t => t.id === currentPublicFilterTab) || PUBLIC_STATUS_TABS[0];
    const filtered = currentPublicOwnerCards.filter(currentTabObj.filter);

    if (!filtered.length) {
        grid.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada kartu untuk kategori ini.</p>';
        return;
    }

    // Group identical cards: same name and status
    const grouped = [];
    filtered.forEach(c => {
        const key = `${c.name}___${c.status}___${c.soldDate || ''}___${c.shipDate || ''}___${c.payoutDate || ''}`;
        const existing = grouped.find(g => g.groupKey === key);
        if (existing) {
            existing.count++;
        } else {
            grouped.push({
                ...c,
                count: 1,
                groupKey: key
            });
        }
    });

    grid.innerHTML = grouped.map(c => {
        const imgUrl = (window.CardDB && CardDB.getImageUrl) ? CardDB.getImageUrl(c.image) : (c.image || 'assets/images/cards/placeholder_card.svg');
        const sc = UI.statusClass(c.status);

        return `
            <div class="owner-card-visual-item" onclick="openPublicCardDetail('${c.id}')" title="Klik untuk lihat detail">
                <img src="${imgUrl}" alt="" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
                ${c.count > 1 ? `<div class="owner-card-visual-qty">${c.count}x</div>` : ''}
                <div class="owner-card-visual-status status-badge status-${sc}">${c.status}</div>
            </div>
        `;
    }).join('');
}

window.openPublicCardDetail = function(cardId) {
    const card = currentPublicOwnerCards.find(c => String(c.id) === String(cardId)) || inventoryData.find(c => String(c.id) === String(cardId));
    if (!card) return;

    const sc = UI.statusClass(card.status);
    const imgUrl = (window.CardDB && CardDB.getImageUrl) ? CardDB.getImageUrl(card.image) : (card.image || 'assets/images/cards/placeholder_card.svg');

    let metaRows = `
        <div class="owner-card-detail-row">
            <span class="label">Nation</span>
            <span class="value">${card.nation || '–'}</span>
        </div>
        <div class="owner-card-detail-row">
            <span class="label">Diterima</span>
            <span class="value">${UI.formatDate(card.date) || '–'}</span>
        </div>
    `;

    if (card.soldDate) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Terjual</span>
                <span class="value">${UI.formatDate(card.soldDate)}</span>
            </div>
        `;
    }
    if (card.shipDate) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Tgl Kirim</span>
                <span class="value">${UI.formatDate(card.shipDate)}</span>
            </div>
        `;
    }
    if (card.payoutDate) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Tgl Bayar</span>
                <span class="value" style="color: #a78bfa; font-weight:700;">${UI.formatDate(card.payoutDate)}</span>
            </div>
        `;
    } else if (['Completed', 'Waiting Payment', 'Sold'].includes(card.status)) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Status Uang</span>
                <span class="value" style="color: #f59e0b; font-weight:700;">Menunggu uang dibayarkan ke pemilik</span>
            </div>
        `;
    }

    document.getElementById('publicCardDetailTitle').textContent = card.name || 'Detail Kartu';
    document.getElementById('publicCardDetailBody').innerHTML = `
        <div class="owner-card-detail-layout">
            <div class="owner-card-detail-thumb">
                <img src="${imgUrl}" alt="${card.name || 'Kartu'}" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
            </div>
            <div class="owner-card-detail-info">
                <div class="owner-card-detail-header">
                    <h4>${card.name}</h4>
                    <span class="status-badge status-${sc}">${card.status}</span>
                </div>
                <div class="owner-card-detail-meta-list">
                    ${metaRows}
                </div>
            </div>
        </div>
    `;

    openModal('modalPublicCardDetail');
};

// Init login modal
function initLoginModal() {
    const showLoginBtn = document.getElementById('showLoginBtn');
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');

    showLoginBtn.addEventListener('click', () => {
        openModal('modalLogin');
    });

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const pwdInput = document.getElementById('password');
            const type = pwdInput.type === 'password' ? 'text' : 'password';
            pwdInput.type = type;
            
            const eyeIcon = togglePassword.querySelector('svg');
            if (type === 'text') {
                eyeIcon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
            } else {
                eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');
        const btnText = document.getElementById('loginBtnText');
        const spinner = document.getElementById('loginSpinner');
        const errorDiv = document.getElementById('loginError');

        btn.disabled = true;
        btnText.textContent = 'Memverifikasi...';
        spinner.classList.remove('hidden');
        errorDiv.classList.add('hidden');

        try {
            await Auth.login(username, password);
            // Success - redirect
            window.location.href = 'dashboard.html';
        } catch (err) {
            errorDiv.classList.remove('hidden');
            document.getElementById('loginErrorMsg').textContent = err.message || 'Login gagal';
            btn.disabled = false;
            btnText.textContent = 'Masuk';
            spinner.classList.add('hidden');
        }
    });
}

// Modal management
function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.addEventListener('click', e => { 
            if (e.target === m) closeModal(m.id); 
        });
    });
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) closeModal(modal.id);
        });
    });
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) { 
        m.style.display = 'flex'; 
        setTimeout(() => m.classList.add('active'), 10); 
    }
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { 
        m.classList.remove('active'); 
        setTimeout(() => m.style.display = 'none', 300); 
    }
}
