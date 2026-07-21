let inventoryData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadOwners();
    document.getElementById('ownerSearch').addEventListener('input', renderOwners);
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
    const search = document.getElementById('ownerSearch').value.toLowerCase();

    const map = {};
    inventoryData.forEach(card => {
        if (!map[card.owner]) {
            map[card.owner] = { name: card.owner, total: 0, available: 0, sold: 0, shipment: 0, payment: 0, completed: 0, cards: [] };
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

    let owners = Object.values(map).filter(o => !search || o.name.toLowerCase().includes(search));

    const container = document.getElementById('ownerGrid');
    if (!owners.length) {
        container.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Tidak ada pemilik ditemukan.</p>';
        return;
    }

    container.className = 'stats-grid';
    container.innerHTML = owners.map(o => `
        <div class="stat-card owner-card" onclick="openOwnerDetail('${o.name}')">
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
    `).join('');
}

window.openOwnerDetail = function(ownerName) {
    const cards = inventoryData.filter(c => c.owner === ownerName);
    document.getElementById('ownerDetailName').textContent = ownerName;

    let rows = cards.map(c => {
        const sc = UI.statusClass(c.status);
        // Extra info per status
        let extra = '';
        if (c.buyer)    extra += `<div class="detail-meta">Pembeli: <strong>${c.buyer}</strong></div>`;
        if (c.soldDate) extra += `<div class="detail-meta">Terjual: <strong>${UI.formatDate(c.soldDate)}</strong></div>`;
        if (c.price)    extra += `<div class="detail-meta">Harga: <strong>${UI.formatCurrency(c.price)}</strong></div>`;
        if (c.trackingNumber) extra += `<div class="detail-meta">Resi: <strong>${c.trackingNumber}</strong></div>`;
        if (c.shipDate) extra += `<div class="detail-meta">Tgl Kirim: <strong>${UI.formatDate(c.shipDate)}</strong></div>`;
        if (c.payoutDate) extra += `<div class="detail-meta">Tgl Bayar: <strong>${UI.formatDate(c.payoutDate)}</strong></div>`;

        return `
            <div class="detail-card-row">
                <div class="detail-card-img">
                    <img src="${UI.cardImage(c)}" alt="${c.name}">
                </div>
                <div class="detail-card-info">
                    <div class="detail-card-name">${c.name}</div>
                    <div class="detail-meta">${c.nation} · Diterima ${UI.formatDate(c.date)}</div>
                    ${extra}
                </div>
                <span class="status-badge status-${sc}">${c.status}</span>
            </div>
        `;
    }).join('');

    document.getElementById('ownerDetailContent').innerHTML = rows || '<p class="empty-msg">Tidak ada kartu.</p>';
    UI.openModal('modalOwnerDetail');
};
