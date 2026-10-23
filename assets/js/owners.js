let inventoryData = [];
let currentOwnerCards = [];
let currentOwnerName = '';
let currentFilterTab = 'all';

const STATUS_TABS = [
    { id: 'all', label: 'Semua', filter: () => true },
    { id: 'available', label: 'Available', filter: c => ['Available', 'Auction'].includes(c.status) },
    { id: 'sold', label: 'Terjual', filter: c => c.status === 'Sold' },
    { id: 'payment', label: 'Menunggu Dibayar', filter: c => c.status === 'Waiting Payment' },
    { id: 'shipment', label: 'Menunggu Dikirim', filter: c => ['Waiting Shipment', 'Shipped'].includes(c.status) },
    { id: 'payout', label: 'Menunggu Uang ke Pemilik', filter: c => !c.payoutDate && ['Completed', 'Waiting Payment', 'Sold', 'Waiting Shipment'].includes(c.status) },
    { id: 'completed', label: 'Selesai', filter: c => c.status === 'Completed' }
];

document.addEventListener('DOMContentLoaded', () => {
    loadOwners();
    document.getElementById('ownerSearch').addEventListener('input', renderOwners);

    document.getElementById('modalOwnerDetailClose')?.addEventListener('click', () => {
        UI.closeModal('modalOwnerDetail');
    });

    document.getElementById('modalOwnerCardDetailClose')?.addEventListener('click', () => {
        UI.closeModal('modalOwnerCardDetail');
    });
});

async function loadOwners() {
    try {
        inventoryData = await API.request('getInventory');
        renderOwners();
    } catch(e) {
        UI.showToast('Gagal memuat data pemilik', 'error');
    }
}

function renderOwners() {
    const search = (document.getElementById('ownerSearch').value || '').toLowerCase();

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
                payout: 0,
                completed: 0, 
                cards: [] 
            };
        }
        const o = map[card.owner];
        o.total++;
        o.cards.push(card);
        if (['Available','Auction'].includes(card.status)) o.available++;
        if (card.status === 'Sold') o.sold++;
        if (['Waiting Shipment', 'Shipped'].includes(card.status)) o.shipment++;
        if (card.status === 'Waiting Payment') o.payment++;
        if (!card.payoutDate && ['Completed', 'Waiting Payment', 'Sold', 'Waiting Shipment'].includes(card.status)) o.payout++;
        if (card.status === 'Completed') o.completed++;
    });

    let owners = Object.values(map).filter(o => !search || o.name.toLowerCase().includes(search));

    const container = document.getElementById('ownerGrid');
    if (!owners.length) {
        container.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Tidak ada pemilik ditemukan.</p>';
        return;
    }

    container.className = 'stats-grid';
    container.innerHTML = owners.map(o => `
        <div class="stat-card owner-card" onclick="openOwnerDetail('${escapeQuotes(o.name)}')">
            <div class="owner-avatar">${(o.name || '?').charAt(0).toUpperCase()}</div>
            <div class="owner-body">
                <h3>${o.name}</h3>
                <p>${o.total} kartu total</p>
                <div class="owner-badges">
                    <span class="status-badge status-available">${o.available} Available</span>
                    <span class="status-badge status-waiting-shipment">${o.shipment} Waiting Shipment</span>
                    <span class="status-badge status-waiting-payment">${o.payment} Waiting Payment</span>
                </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
    `).join('');
}

function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.openOwnerDetail = function(ownerName) {
    currentOwnerName = ownerName;
    currentOwnerCards = inventoryData.filter(c => c.owner === ownerName);
    currentFilterTab = 'all';

    document.getElementById('ownerDetailName').textContent = ownerName;
    document.getElementById('ownerDetailTotal').textContent = `${currentOwnerCards.length} kartu total`;

    renderOwnerTabs();
    renderOwnerCardsGrid();
    UI.openModal('modalOwnerDetail');
};

function renderOwnerTabs() {
    const tabsContainer = document.getElementById('ownerStatusTabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = STATUS_TABS.map(tab => {
        const count = currentOwnerCards.filter(tab.filter).length;
        const isActive = tab.id === currentFilterTab;
        return `
            <button class="owner-status-tab-btn ${isActive ? 'active' : ''}" onclick="setOwnerFilterTab('${tab.id}')">
                <span>${tab.label}</span>
                <span class="tab-count">${count}</span>
            </button>
        `;
    }).join('');
}

window.setOwnerFilterTab = function(tabId) {
    currentFilterTab = tabId;
    renderOwnerTabs();
    renderOwnerCardsGrid();
};

function renderOwnerCardsGrid() {
    const grid = document.getElementById('ownerCardsGrid');
    if (!grid) return;

    const currentTabObj = STATUS_TABS.find(t => t.id === currentFilterTab) || STATUS_TABS[0];
    const filtered = currentOwnerCards.filter(currentTabObj.filter);

    if (!filtered.length) {
        grid.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada kartu untuk kategori ini.</p>';
        return;
    }

    // Group identical cards: same name, status, and sales metadata
    const grouped = [];
    filtered.forEach(c => {
        const key = `${c.name}___${c.status}___${c.buyer || ''}___${c.price || ''}___${c.trackingNumber || ''}___${c.payoutDate || ''}`;
        const existing = grouped.find(g => g.groupKey === key);
        if (existing) {
            existing.count++;
            existing.cardIds.push(c.id);
        } else {
            grouped.push({
                ...c,
                count: 1,
                groupKey: key,
                cardIds: [c.id]
            });
        }
    });

    grid.innerHTML = grouped.map(c => {
        const imgUrl = (window.CardDB && CardDB.getImageUrl) ? CardDB.getImageUrl(c.image) : (c.image || 'assets/images/cards/placeholder_card.svg');
        const sc = UI.statusClass(c.status);

        return `
            <div class="owner-card-visual-item" onclick="openOwnerCardDetail('${c.id}')" title="Klik untuk lihat detail">
                <img src="${imgUrl}" alt="" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
                ${c.count > 1 ? `<div class="owner-card-visual-qty">${c.count}x</div>` : ''}
                <div class="owner-card-visual-status status-badge status-${sc}">${c.status}</div>
            </div>
        `;
    }).join('');
}

window.openOwnerCardDetail = function(cardId) {
    const card = currentOwnerCards.find(c => String(c.id) === String(cardId)) || inventoryData.find(c => String(c.id) === String(cardId));
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

    if (card.buyer) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Pembeli</span>
                <span class="value" style="color: #38bdf8; font-weight:700;">${card.buyer}</span>
            </div>
        `;
    }
    if (card.soldDate) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Terjual</span>
                <span class="value">${UI.formatDate(card.soldDate)}</span>
            </div>
        `;
    }
    if (card.price) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Harga</span>
                <span class="value" style="color: #10b981; font-weight:700;">${UI.formatCurrency(card.price)}</span>
            </div>
        `;
    }
    if (card.trackingNumber) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Resi</span>
                <span class="value" style="font-family: monospace;">${card.trackingNumber}</span>
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

    if (card.createdBy || card.created_by) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Ditambahkan Oleh</span>
                <span class="value" style="color: #38bdf8; font-weight:700;">${card.createdBy || card.created_by}</span>
            </div>
        `;
    }

    document.getElementById('ownerCardDetailTitle').textContent = card.name || 'Detail Kartu';
    document.getElementById('ownerCardDetailBody').innerHTML = `
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

    UI.openModal('modalOwnerCardDetail');
};
