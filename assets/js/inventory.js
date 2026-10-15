let allCards = [];
let filteredCards = [];
let currentView = 'grid';
let currentStatusFilter = 'Available'; // Default: tampilkan Available
const PAGE_SIZE = 12;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initStatusPills();
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
        populateSetFilter();
        applyFilters();
    } catch (e) {
        UI.showToast('Gagal memuat inventory', 'error');
    }
}

function showGridLoading() {
    document.getElementById('inventoryGrid').innerHTML =
        '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div><p>Memuat...</p></div>';
}

function populateOwnerFilter() {
    const sel = document.getElementById('filterOwner');
    const dl = document.getElementById('ownerList');
    const owners = [...new Set(allCards.map(c => c.owner).filter(Boolean))].sort();
    const cur = sel.value;
    sel.innerHTML = '<option value="">Semua Pemilik</option>' + owners.map(o => `<option value="${o}">${o}</option>`).join('');
    sel.value = cur;
    if (dl) dl.innerHTML = owners.map(o => `<option value="${o}">`).join('');
}

function populateSetFilter() {
    const sel = document.getElementById('filterSet');
    const dlSet = document.getElementById('setList');
    const dbSets = window.CardDB ? CardDB.getSets() : [];
    const invSets = allCards.map(c => c.set).filter(Boolean);
    const sets = [...new Set([...dbSets, ...invSets])].sort();

    if (sel) {
        const cur = sel.value;
        sel.innerHTML = '<option value="">Semua Set Promo</option>' + sets.map(s => `<option value="${s}">${s}</option>`).join('');
        sel.value = cur;
    }
    if (dlSet) {
        dlSet.innerHTML = sets.map(s => `<option value="${s}">`).join('');
    }
}

function initFilters() {
    ['searchInput', 'filterOwner', 'filterSet', 'filterGrade', 'filterType', 'filterNation', 'sortBy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => { currentPage = 1; applyFilters(); });
            el.addEventListener('change', () => { currentPage = 1; applyFilters(); });
        }
    });

    document.getElementById('resetFilter').addEventListener('click', () => {
        ['searchInput', 'filterOwner', 'filterSet', 'filterGrade', 'filterType', 'filterNation'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('sortBy').value = 'date_desc';
        setStatusPill('Available');
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('viewGrid').addEventListener('click', () => { currentView = 'grid'; toggleViewBtn(); renderCards(); });
    document.getElementById('viewList').addEventListener('click', () => { currentView = 'list'; toggleViewBtn(); renderCards(); });
}

function initStatusPills() {
    document.querySelectorAll('.status-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.dataset.status;
            setStatusPill(status);
            currentPage = 1;
            applyFilters();
        });
    });
}

function setStatusPill(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.status-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
}

function toggleViewBtn() {
    document.getElementById('viewGrid').classList.toggle('active', currentView === 'grid');
    document.getElementById('viewList').classList.toggle('active', currentView === 'list');
}

function applyFilters() {
    const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const isValidSearch = q.length === 0 || q.length >= 2;
    const owner = document.getElementById('filterOwner')?.value || '';
    const setVal = document.getElementById('filterSet')?.value || '';
    const gradeVal = document.getElementById('filterGrade')?.value || '';
    const typeVal = document.getElementById('filterType')?.value || '';
    const nation = document.getElementById('filterNation')?.value || '';
    const status = currentStatusFilter;
    const sort = document.getElementById('sortBy')?.value || 'date_desc';

    filteredCards = allCards.filter(c => {
        const cType = (c.type || c.language || 'JP').toString().toUpperCase();
        const cGrade = c.grade !== undefined && c.grade !== null ? c.grade.toString() : '';
        const cSet = c.set || '';

        const matchQ = !q || 
            c.name.toLowerCase().includes(q) || 
            c.owner.toLowerCase().includes(q) || 
            c.id.toLowerCase().includes(q) ||
            cSet.toLowerCase().includes(q);

        return isValidSearch && matchQ &&
            (!owner || c.owner === owner) &&
            (!setVal || cSet === setVal) &&
            (!gradeVal || cGrade === gradeVal) &&
            (!typeVal || cType === typeVal.toUpperCase()) &&
            (!nation || c.nation === nation) &&
            (!status || c.status === status);
    });

    filteredCards.sort((a, b) => {
        const aAvail = a.status === 'Available' ? 0 : 1;
        const bAvail = b.status === 'Available' ? 0 : 1;
        if (aAvail !== bAvail) return aAvail - bAvail;

        if (sort === 'date_desc') return new Date(b.date) - new Date(a.date);
        if (sort === 'date_asc') return new Date(a.date) - new Date(b.date);
        if (sort === 'name_asc') return a.name.localeCompare(b.name);
        if (sort === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
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
                ${UI.renderTypeBox(card, 'md')}
                <span class="card-nation-badge">${card.nation}</span>
                <span class="card-status-badge status-badge status-${sc}">${card.status}</span>
            </div>
            <div class="card-info">
                ${card.set ? `<div class="card-set-tag" title="${card.set}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${card.set}</div>` : ''}
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
                    <button class="ca-btn ca-del" onclick="deleteCard('${card.id}')" title="Hapus Kartu">
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
            <thead>
                <tr>
                    <th style="width:50px;">Art</th>
                    <th>ID</th>
                    <th>Kartu</th>
                    <th>Set Promo</th>
                    <th>Pemilik</th>
                    <th>Status</th>
                    <th style="text-align:right">Aksi</th>
                </tr>
            </thead>
            <tbody>
            ${page.map(c => {
        const sc = UI.statusClass(c.status);
        const gradeBadge = (c.grade !== undefined && c.grade !== null && c.grade !== '') ? `<span class="badge-grade" style="font-size:0.65rem;padding:1px 5px;margin-right:4px;">G${c.grade}</span>` : '';
        const langBadge = `<span class="badge-lang ${(c.type || 'JP').toLowerCase()}" style="font-size:0.65rem;padding:1px 4px;margin-left:4px;">${c.type || 'JP'}</span>`;
        return `<tr>
                    <td>
                        ${UI.renderTypeBox(c, 'sm')}
                    </td>
                    <td class="text-muted">${c.id}</td>
                    <td>
                        <div style="font-weight:600;cursor:pointer;display:flex;align-items:center;" onclick="viewDetail('${c.id}')">
                            ${gradeBadge}
                            <span>${c.name}</span>
                            ${langBadge}
                        </div>
                        <div class="text-sm text-muted">${c.nation}</div>
                    </td>
                    <td>
                        <span style="font-size:0.82rem;color:#38bdf8;">${c.set || '-'}</span>
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

    let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - currentPage) <= 1) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
        } else if (Math.abs(i - currentPage) === 2) {
            html += `<span class="page-btn" style="cursor:default">…</span>`;
        }
    }
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled' : ''}>›</button>`;
    pag.innerHTML = html;
}

window.goPage = function (p) {
    const total = Math.ceil(filteredCards.length / PAGE_SIZE);
    if (p < 1 || p > total) return;
    currentPage = p;
    renderCards();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ──────────── CARD FORM & VISUAL CATALOG PICKER ──────────────────────────────
let selectedPickerCard = null;

function initCardForm() {
    const searchInput = document.getElementById('modalPickerSearch');
    const setFilter = document.getElementById('modalPickerSet');
    const nationFilter = document.getElementById('modalPickerNation');
    const gradeFilter = document.getElementById('modalPickerGrade');
    const galleryContainer = document.getElementById('pickerCardsGallery');
    const banner = document.getElementById('selectedCardBanner');

    function populateModalPickerSets() {
        if (!setFilter || !window.CardDB) return;
        const sets = CardDB.getSets();
        setFilter.innerHTML = '<option value="">Semua Set Promo</option>' + 
            sets.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    function renderModalGallery() {
        if (!galleryContainer || !window.CardDB) return;
        const q = (searchInput?.value || '').toLowerCase().trim();
        const setVal = setFilter?.value || '';
        const nationVal = nationFilter?.value || '';
        const gradeVal = gradeFilter?.value || '';

        const allCards = CardDB.getAll();
        const filtered = allCards.filter(c => {
            const matchQ = !q || c.name.toLowerCase().includes(q) || (c.id && c.id.toLowerCase().includes(q));
            const matchSet = !setVal || c.set === setVal;
            const matchNation = !nationVal || c.nation === nationVal;
            const matchGrade = !gradeVal || c.grade?.toString() === gradeVal;
            return matchQ && matchSet && matchNation && matchGrade;
        });

        if (!filtered.length) {
            galleryContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 24px;">Tidak ada kartu ditemukan.</div>';
            return;
        }

        galleryContainer.innerHTML = filtered.map(c => {
            const isSel = selectedPickerCard && (selectedPickerCard.id === c.id || selectedPickerCard.name === c.name);
            const lang = (c.language || c.type || 'JP').toUpperCase();
            const imgUrl = CardDB.getImageUrl(c.image);
            const gradeBadge = (c.grade !== undefined && c.grade !== null && c.grade !== '') ? `<span class="card-grade-badge grade-${c.grade}" style="font-size:0.65rem;padding:1px 5px;">G${c.grade}</span>` : '';
            const langBadge = `<span class="card-lang-badge lang-${lang.toLowerCase()}" style="font-size:0.62rem;padding:1px 4px;">${lang}</span>`;

            return `
                <div class="picker-thumb-card ${isSel ? 'selected' : ''}" data-card-id="${c.id}" onclick="selectCardInModal('${c.id}')">
                    <div class="picker-thumb-img-wrap">
                        <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
                        ${gradeBadge}
                        ${langBadge}
                    </div>
                    <div class="picker-thumb-info">
                        <div class="picker-thumb-name" title="${c.name}">${c.name}</div>
                        <div class="picker-thumb-set">${c.nation}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.selectCardInModal = function(cardId) {
        const card = CardDB.getById(cardId);
        if (!card) return;
        selectedPickerCard = card;

        // Set hidden form values
        document.getElementById('cardName').value = card.name;
        document.getElementById('cardSet').value = card.set || '';
        document.getElementById('cardGrade').value = card.grade !== undefined ? card.grade : '3';
        document.getElementById('cardType').value = (card.language || card.type || 'JP').toUpperCase();
        document.getElementById('cardNation').value = card.nation || '';
        document.getElementById('cardImage').value = card.image || '';

        // Tampilkan Banner Kartu Terpilih
        if (banner) {
            document.getElementById('selectedCardTitle').textContent = card.name;
            document.getElementById('selectedCardGrade').textContent = 'Grade ' + (card.grade !== undefined ? card.grade : '-');
            document.getElementById('selectedCardNation').textContent = card.nation;
            
            const lang = (card.language || card.type || 'JP').toUpperCase();
            const langEl = document.getElementById('selectedCardLang');
            langEl.textContent = lang;
            langEl.className = 'badge-lang ' + lang.toLowerCase();

            document.getElementById('selectedCardSet').textContent = card.set || 'Promo';
            document.getElementById('selectedCardThumbImg').src = CardDB.getImageUrl(card.image);
            banner.style.display = 'flex';
        }

        // Highlight kartu yang dipilih di galeri
        document.querySelectorAll('.picker-thumb-card').forEach(el => {
            el.classList.toggle('selected', el.dataset.cardId === cardId);
        });

        // Fokus ke input nama pemilik
        const ownerInput = document.getElementById('cardOwner');
        if (ownerInput && !ownerInput.value) {
            ownerInput.focus();
        }
    };

    [searchInput, setFilter, nationFilter, gradeFilter].forEach(el => {
        if (el) {
            el.addEventListener('input', renderModalGallery);
            el.addEventListener('change', renderModalGallery);
        }
    });

    // Buka Modal Tambah Kartu
    document.getElementById('btnAddCard').addEventListener('click', () => {
        document.getElementById('cardForm').reset();
        document.getElementById('cardId').value = '';
        selectedPickerCard = null;

        if (banner) banner.style.display = 'none';
        if (searchInput) searchInput.value = '';
        if (setFilter) setFilter.value = '';
        if (nationFilter) nationFilter.value = '';
        if (gradeFilter) gradeFilter.value = '';

        document.getElementById('cardDateReceived').value = new Date().toISOString().split('T')[0];
        document.getElementById('modalCardTitle').textContent = 'Pilih Kartu dari Database';
        
        populateModalPickerSets();
        renderModalGallery();
        UI.openModal('modalCard');
    });

    document.getElementById('cancelCardBtn').addEventListener('click', () => UI.closeModal('modalCard'));

    // Submit Form
    document.getElementById('cardForm').addEventListener('submit', async e => {
        e.preventDefault();

        const cardName = document.getElementById('cardName').value.trim();
        if (!cardName) {
            UI.showToast('Silakan klik salah satu gambar kartu di galeri terlebih dahulu!', 'error');
            return;
        }

        const btn = document.getElementById('saveCardBtn');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const cardId = document.getElementById('cardId').value;
            const owner = document.getElementById('cardOwner').value.trim();
            const date = document.getElementById('cardDateReceived').value;

            await API.request('saveCard', {
                id: cardId || undefined,
                name: cardName,
                set: document.getElementById('cardSet').value,
                grade: document.getElementById('cardGrade').value,
                type: document.getElementById('cardType').value,
                nation: document.getElementById('cardNation').value,
                image: document.getElementById('cardImage').value,
                owner: owner,
                date: date
            });

            UI.showToast(`Kartu "${cardName}" berhasil disimpan ke Inventory untuk ${owner}!`, 'success');
            UI.closeModal('modalCard');
            loadInventory();
        } catch (err) {
            console.error(err);
            UI.showToast('Terjadi kesalahan saat menyimpan', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan Kartu ke Inventory';
        }
    });
}

window.editCard = function (id) {
    const c = allCards.find(c => c.id === id);
    if (!c) return;

    document.getElementById('cardId').value = c.id;
    document.getElementById('cardOwner').value = c.owner;
    document.getElementById('cardDateReceived').value = c.date;

    // Cari kartu master yang cocok
    let master = window.CardDB ? CardDB.findByName(c.name) : null;
    if (!master) {
        master = {
            id: 'temp-' + c.id,
            name: c.name,
            set: c.set || 'Promo',
            grade: c.grade !== undefined ? c.grade : '3',
            language: c.type || 'JP',
            nation: c.nation,
            image: c.image
        };
    }

    selectedPickerCard = master;
    document.getElementById('cardName').value = master.name;
    document.getElementById('cardSet').value = master.set || '';
    document.getElementById('cardGrade').value = master.grade !== undefined ? master.grade : '3';
    document.getElementById('cardType').value = (master.language || master.type || 'JP').toUpperCase();
    document.getElementById('cardNation').value = master.nation || '';
    document.getElementById('cardImage').value = master.image || '';

    const banner = document.getElementById('selectedCardBanner');
    if (banner) {
        document.getElementById('selectedCardTitle').textContent = master.name;
        document.getElementById('selectedCardGrade').textContent = 'Grade ' + (master.grade !== undefined ? master.grade : '-');
        document.getElementById('selectedCardNation').textContent = master.nation;
        
        const lang = (master.language || master.type || 'JP').toUpperCase();
        const langEl = document.getElementById('selectedCardLang');
        langEl.textContent = lang;
        langEl.className = 'badge-lang ' + lang.toLowerCase();

        document.getElementById('selectedCardSet').textContent = master.set || 'Promo';
        document.getElementById('selectedCardThumbImg').src = CardDB.getImageUrl(master.image);
        banner.style.display = 'flex';
    }

    document.getElementById('modalCardTitle').textContent = 'Edit Data Titipan Kartu';
    UI.openModal('modalCard');
};

window.deleteCard = async function (id) {
    if (!confirm('Hapus kartu ini dari inventory?')) return;
    try {
        await API.request('deleteCard', { id });
        UI.showToast('Kartu berhasil dihapus');
        loadInventory();
    } catch {
        UI.showToast('Gagal menghapus kartu', 'error');
    }
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
                    buyer: document.getElementById('soldBuyer').value,
                    price: UI.parseCurrency(document.getElementById('soldPrice').value),
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

window.openSoldModal = function (id) {
    const c = allCards.find(c => c.id === id);
    if (!c) return;
    document.getElementById('soldForm').reset();
    document.getElementById('soldCardId').value = c.id;
    document.getElementById('soldCardName').textContent = c.name;
    document.getElementById('soldDate').value = new Date().toISOString().split('T')[0];
    UI.openModal('modalSold');
};

// ──────────── DETAIL ─────────────────────────────────────────────────────────
function initDetailClose() {
    document.getElementById('modalDetailClose').addEventListener('click', () => UI.closeModal('modalDetail'));
}

window.viewDetail = function (id) {
    const c = allCards.find(c => c.id === id);
    if (!c) return;
    const sc = UI.statusClass(c.status);

    let sections = `
        <div class="detail-grid">
            <div class="detail-field"><div class="detail-label">ID Kartu</div><div class="detail-value">${c.id}</div></div>
            <div class="detail-field"><div class="detail-label">Grade</div><div class="detail-value">${c.grade !== undefined ? 'Grade ' + c.grade : '-'}</div></div>
            <div class="detail-field"><div class="detail-label">Set Promo</div><div class="detail-value" style="color:#38bdf8;">${c.set || '-'}</div></div>
            <div class="detail-field"><div class="detail-label">Bahasa</div><div class="detail-value">${(c.type || 'JP').toUpperCase()}</div></div>
            <div class="detail-field"><div class="detail-label">Nation</div><div class="detail-value">${c.nation}</div></div>
            <div class="detail-field"><div class="detail-label">Pemilik</div><div class="detail-value">${c.owner}</div></div>
            <div class="detail-field"><div class="detail-label">Tgl Diterima</div><div class="detail-value">${UI.formatDate(c.date)}</div></div>
            <div class="detail-field"><div class="detail-label">File Gambar</div><div class="detail-value" style="font-family:monospace;font-size:0.8rem;">assets/images/cards/${c.image || '-'}</div></div>
        </div>`;

    if (c.buyer || c.soldDate) {
        sections += `
            <div class="detail-section">
                <div class="detail-section-title">Informasi Penjualan</div>
                <div class="detail-grid">
                    ${c.buyer ? `<div class="detail-field"><div class="detail-label">Pembeli</div><div class="detail-value">${c.buyer}</div></div>` : ''}
                    ${c.soldDate ? `<div class="detail-field"><div class="detail-label">Tanggal Jual</div><div class="detail-value">${UI.formatDate(c.soldDate)}</div></div>` : ''}
                    ${c.price ? `<div class="detail-field"><div class="detail-label">Harga</div><div class="detail-value">${UI.formatCurrency(c.price)}</div></div>` : ''}
                </div>
            </div>`;
    }

    if (c.trackingNumber || c.shipDate) {
        sections += `
            <div class="detail-section">
                <div class="detail-section-title">Informasi Pengiriman</div>
                <div class="detail-grid">
                    ${c.trackingNumber ? `<div class="detail-field"><div class="detail-label">No. Resi</div><div class="detail-value">${c.trackingNumber}</div></div>` : ''}
                    ${c.shipDate ? `<div class="detail-field"><div class="detail-label">Tgl Kirim</div><div class="detail-value">${UI.formatDate(c.shipDate)}</div></div>` : ''}
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
        <div class="detail-hero" style="display:flex;align-items:center;justify-content:center;background:transparent;height:auto;max-height:none;">
            ${UI.renderTypeBox(c, 'detail')}
        </div>
        <div class="detail-body">
            <div class="detail-title-row">
                <div>
                    <div class="detail-card-subtitle">${c.nation} • ${c.set || 'Promo'}</div>
                    <h2 class="detail-card-name">${c.name}</h2>
                </div>
                <span class="status-badge status-${sc}">${c.status}</span>
            </div>
            ${sections}
        </div>`;

    UI.openModal('modalDetail');
};
