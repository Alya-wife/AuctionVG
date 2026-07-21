let allCards = [];
let filteredCards = [];
let currentView = 'grid';
const PAGE_SIZE = 12;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initCardForm();
    initSoldForm();
    initDetailClose();
    loadInventory();
});

async function loadInventory() {
    showGridLoading();
    try {
        allCards = await API.request('getInventory');
        populateOwnerFilter();
        applyFilters();
    } catch(e) {
        UI.showToast('Gagal memuat inventory', 'error');
    }
}

function showGridLoading() {
    document.getElementById('inventoryGrid').innerHTML =
        '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div><p>Memuat...</p></div>';
}

function populateOwnerFilter() {
    const sel = document.getElementById('filterOwner');
    const dl  = document.getElementById('ownerList');
    const owners = [...new Set(allCards.map(c => c.owner))].sort();
    const cur = sel.value;
    sel.innerHTML = '<option value="">Semua Pemilik</option>' + owners.map(o => `<option value="${o}">${o}</option>`).join('');
    sel.value = cur;
    if (dl) dl.innerHTML = owners.map(o => `<option value="${o}">`).join('');
}

function initFilters() {
    ['searchInput','filterOwner','filterNation','filterStatus','sortBy'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => { currentPage = 1; applyFilters(); });
        document.getElementById(id).addEventListener('change', () => { currentPage = 1; applyFilters(); });
    });
    document.getElementById('resetFilter').addEventListener('click', () => {
        ['searchInput','filterOwner','filterNation','filterStatus'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('sortBy').value = 'date_desc';
        currentPage = 1;
        applyFilters();
    });
    document.getElementById('viewGrid').addEventListener('click', () => { currentView = 'grid'; toggleViewBtn(); renderCards(); });
    document.getElementById('viewList').addEventListener('click', () => { currentView = 'list'; toggleViewBtn(); renderCards(); });
}

function toggleViewBtn() {
    document.getElementById('viewGrid').classList.toggle('active', currentView === 'grid');
    document.getElementById('viewList').classList.toggle('active', currentView === 'list');
}

function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const owner = document.getElementById('filterOwner').value;
    const nation = document.getElementById('filterNation').value;
    const status = document.getElementById('filterStatus').value;
    const sort = document.getElementById('sortBy').value;

    filteredCards = allCards.filter(c =>
        (!q || c.name.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) &&
        (!owner || c.owner === owner) &&
        (!nation || c.nation === nation) &&
        (!status || c.status === status)
    );

    filteredCards.sort((a,b) => {
        if (sort === 'date_desc') return new Date(b.date) - new Date(a.date);
        if (sort === 'date_asc')  return new Date(a.date) - new Date(b.date);
        if (sort === 'name_asc')  return a.name.localeCompare(b.name);
        if (sort === 'name_desc') return b.name.localeCompare(a.name);
    });

    document.getElementById('totalCount').textContent = `${filteredCards.length} kartu`;
    renderCards();
    renderPagination();
}

function paginated() {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCards.slice(start, start + PAGE_SIZE);
}

function renderCards() {
    const container = document.getElementById('inventoryGrid');
    const page = paginated();

    if (!page.length) {
        container.className = '';
        container.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Tidak ada kartu ditemukan</p></div>';
        return;
    }

    if (currentView === 'list') {
        renderList(container, page);
    } else {
        renderGrid(container, page);
    }
}

function renderGrid(container, page) {
    container.className = 'inventory-grid';
    container.innerHTML = page.map(card => {
        const sc = UI.statusClass(card.status);
        return `
        <div class="card-item">
            <div class="card-img-wrap" onclick="viewDetail('${card.id}')">
                <img src="${UI.cardImage(card)}" class="card-img" alt="${card.name}" loading="lazy">
                <span class="card-nation-badge">${card.nation}</span>
                <span class="card-status-badge status-badge status-${sc}">${card.status}</span>
            </div>
            <div class="card-info">
                <div class="card-title" onclick="viewDetail('${card.id}')">${card.name}</div>
                <div class="card-meta">
                    <span><strong>Pemilik:</strong> ${card.owner}</span>
                    <span><strong>Diterima:</strong> ${UI.formatDate(card.date)}</span>
                </div>
                <div class="card-actions">
                    <button class="ca-btn" onclick="editCard('${card.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                    ${card.status === 'Available' ? `<button class="ca-btn ca-sold" onclick="openSoldModal('${card.id}')">Tandai Sold</button>` : ''}
                    <button class="ca-btn ca-del" onclick="deleteCard('${card.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderList(container, page) {
    container.className = '';
    container.innerHTML = `
        <div class="table-card">
        <table class="data-table">
            <thead><tr><th>ID</th><th>Kartu</th><th>Pemilik</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead>
            <tbody>
            ${page.map(c => {
                const sc = UI.statusClass(c.status);
                return `<tr>
                    <td class="text-muted">${c.id}</td>
                    <td>
                        <div style="font-weight:600;cursor:pointer" onclick="viewDetail('${c.id}')">${c.name}</div>
                        <div class="text-sm text-muted">${c.nation}</div>
                    </td>
                    <td>${c.owner}</td>
                    <td><span class="status-badge status-${sc}">${c.status}</span></td>
                    <td style="text-align:right">
                        <div style="display:flex;gap:8px;justify-content:flex-end;">
                            <button class="btn-sm btn-ghost" onclick="editCard('${c.id}')">Edit</button>
                            ${c.status === 'Available' ? `<button class="btn-sm btn-primary" onclick="openSoldModal('${c.id}')">Sold</button>` : ''}
                        </div>
                    </td>
                </tr>`;
            }).join('')}
            </tbody>
        </table>
        </div>`;
}

function renderPagination() {
    const total = Math.ceil(filteredCards.length / PAGE_SIZE);
    const pag = document.getElementById('pagination');
    if (total <= 1) { pag.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - currentPage) <= 1) {
            html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
        } else if (Math.abs(i - currentPage) === 2) {
            html += `<span class="page-btn" style="cursor:default">…</span>`;
        }
    }
    html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===total?'disabled':''}>›</button>`;
    pag.innerHTML = html;
}

window.goPage = function(p) {
    const total = Math.ceil(filteredCards.length / PAGE_SIZE);
    if (p < 1 || p > total) return;
    currentPage = p;
    renderCards();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ──────────── CARD FORM ─────────────────────────────────────────────────────
function initCardForm() {
    document.getElementById('btnAddCard').addEventListener('click', () => {
        document.getElementById('cardForm').reset();
        document.getElementById('cardId').value = '';
        document.getElementById('cardDateReceived').value = new Date().toISOString().split('T')[0];
        document.getElementById('modalCardTitle').textContent = 'Tambah Kartu Baru';
        UI.openModal('modalCard');
    });
    document.getElementById('cancelCardBtn').addEventListener('click', () => UI.closeModal('modalCard'));

    document.getElementById('cardForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';
        try {
            await API.request('saveCard', {
                id:     document.getElementById('cardId').value || undefined,
                name:   document.getElementById('cardName').value,
                nation: document.getElementById('cardNation').value,
                owner:  document.getElementById('cardOwner').value,
                date:   document.getElementById('cardDateReceived').value,
                image:  document.getElementById('cardImageUrl').value
            });
            UI.showToast('Kartu berhasil disimpan');
            UI.closeModal('modalCard');
            loadInventory();
        } catch { UI.showToast('Terjadi kesalahan', 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Simpan Kartu'; }
    });
}

window.editCard = function(id) {
    const c = allCards.find(c => c.id === id);
    if (!c) return;
    document.getElementById('cardId').value = c.id;
    document.getElementById('cardName').value = c.name;
    document.getElementById('cardNation').value = c.nation;
    document.getElementById('cardOwner').value = c.owner;
    document.getElementById('cardDateReceived').value = c.date;
    document.getElementById('cardImageUrl').value = c.image || '';
    document.getElementById('modalCardTitle').textContent = 'Edit Kartu';
    UI.openModal('modalCard');
};

window.deleteCard = async function(id) {
    if (!confirm('Hapus kartu ini?')) return;
    try {
        await API.request('deleteCard', { id });
        UI.showToast('Kartu dihapus');
        loadInventory();
    } catch { UI.showToast('Gagal menghapus', 'error'); }
};

// ──────────── SOLD FORM ──────────────────────────────────────────────────────
function initSoldForm() {
    document.getElementById('cancelSoldBtn').addEventListener('click', () => UI.closeModal('modalSold'));
    document.getElementById('soldForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            await API.request('updateCardStatus', {
                id: document.getElementById('soldCardId').value,
                status: 'Waiting Shipment',
                extra: {
                    buyer:    document.getElementById('soldBuyer').value,
                    price:    parseInt(document.getElementById('soldPrice').value),
                    soldDate: document.getElementById('soldDate').value
                }
            });
            UI.showToast('Kartu ditandai terjual');
            UI.closeModal('modalSold');
            loadInventory();
        } catch { UI.showToast('Gagal update status', 'error'); }
        finally { btn.disabled = false; }
    });
}

window.openSoldModal = function(id) {
    const c = allCards.find(c => c.id === id);
    if (!c) return;
    document.getElementById('soldForm').reset();
    document.getElementById('soldCardId').value  = c.id;
    document.getElementById('soldCardName').textContent = c.name;
    document.getElementById('soldDate').value = new Date().toISOString().split('T')[0];
    UI.openModal('modalSold');
};

// ──────────── DETAIL ─────────────────────────────────────────────────────────
function initDetailClose() {
    document.getElementById('modalDetailClose').addEventListener('click', () => UI.closeModal('modalDetail'));
}

window.viewDetail = function(id) {
    const c = allCards.find(c => c.id === id);
    if (!c) return;
    const sc = UI.statusClass(c.status);

    let sections = `
        <div class="detail-grid">
            <div class="detail-field"><div class="detail-label">ID Kartu</div><div class="detail-value">${c.id}</div></div>
            <div class="detail-field"><div class="detail-label">Nation</div><div class="detail-value">${c.nation}</div></div>
            <div class="detail-field"><div class="detail-label">Pemilik</div><div class="detail-value">${c.owner}</div></div>
            <div class="detail-field"><div class="detail-label">Tgl Diterima</div><div class="detail-value">${UI.formatDate(c.date)}</div></div>
        </div>`;

    if (c.buyer || c.soldDate) {
        sections += `
            <div class="detail-section">
                <div class="detail-section-title">Informasi Penjualan</div>
                <div class="detail-grid">
                    ${c.buyer    ? `<div class="detail-field"><div class="detail-label">Pembeli</div><div class="detail-value">${c.buyer}</div></div>` : ''}
                    ${c.soldDate ? `<div class="detail-field"><div class="detail-label">Tanggal Jual</div><div class="detail-value">${UI.formatDate(c.soldDate)}</div></div>` : ''}
                    ${c.price    ? `<div class="detail-field"><div class="detail-label">Harga</div><div class="detail-value">${UI.formatCurrency(c.price)}</div></div>` : ''}
                </div>
            </div>`;
    }

    if (c.trackingNumber || c.shipDate) {
        sections += `
            <div class="detail-section">
                <div class="detail-section-title">Informasi Pengiriman</div>
                <div class="detail-grid">
                    ${c.trackingNumber ? `<div class="detail-field"><div class="detail-label">No. Resi</div><div class="detail-value">${c.trackingNumber}</div></div>` : ''}
                    ${c.shipDate       ? `<div class="detail-field"><div class="detail-label">Tgl Kirim</div><div class="detail-value">${UI.formatDate(c.shipDate)}</div></div>` : ''}
                </div>
                ${c.shipProofUrl ? `<a href="${c.shipProofUrl}" target="_blank" class="btn-link-block">Lihat Bukti Kirim →</a>` : ''}
            </div>`;
    }

    if (c.payoutDate) {
        sections += `
            <div class="detail-section">
                <div class="detail-section-title">Informasi Pembayaran Pemilik</div>
                <div class="detail-grid">
                    <div class="detail-field"><div class="detail-label">Tgl Transfer</div><div class="detail-value">${UI.formatDate(c.payoutDate)}</div></div>
                </div>
                ${c.payoutProofUrl ? `<a href="${c.payoutProofUrl}" target="_blank" class="btn-link-block">Lihat Bukti Transfer →</a>` : ''}
            </div>`;
    }

    document.getElementById('cardDetailContent').innerHTML = `
        <div class="detail-hero">
            <img src="${UI.cardImage(c)}" alt="${c.name}" class="detail-hero-img">
        </div>
        <div class="detail-body">
            <div class="detail-title-row">
                <div>
                    <div class="detail-card-subtitle">${c.nation}</div>
                    <h2 class="detail-card-name">${c.name}</h2>
                </div>
                <span class="status-badge status-${sc}">${c.status}</span>
            </div>
            ${sections}
        </div>`;

    UI.openModal('modalDetail');
};
