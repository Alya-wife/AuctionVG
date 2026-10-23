
window.setTitipCardLang = function(idx, lang) {
    if (selectedTitipCards && selectedTitipCards[idx]) {
        selectedTitipCards[idx].language = lang;
        selectedTitipCards[idx].type = lang;
        renderSelectedCardsList();
    }
};
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

    // Kelompokkan kartu identik (nama, pemilik, dan status sama) agar tidak dobel
    const grouped = [];
    page.forEach(card => {
        const key = `${card.name}___${card.owner}___${card.status}`;
        const existing = grouped.find(g => g.groupKey === key);
        if (existing) {
            existing.count++;
            existing.cardIds.push(card.id);
        } else {
            grouped.push({
                ...card,
                count: 1,
                groupKey: key,
                cardIds: [card.id]
            });
        }
    });

    container.innerHTML = grouped.map(card => {
        const sc = UI.statusClass(card.status);
        const qtyBadge = card.count > 1 ? `<span style="margin-left:8px;background:rgba(56,189,248,0.2);color:#38bdf8;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:800;border:1px solid rgba(56,189,248,0.4);">${card.count}x</span>` : '';

        return `
        <div class="card-item">
            <div class="card-img-wrap" onclick="viewDetail('${card.id}')">
                ${UI.renderTypeBox(card, 'md')}
                <span class="card-status-badge status-badge status-${sc}">${card.status}</span>
            </div>
            <div class="card-info">
                ${card.set ? `<div class="card-set-tag" title="${card.set}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>${card.set}</div>` : ''}
                <div class="card-title" onclick="viewDetail('${card.id}')" style="display:flex;align-items:center;">
                    <span>${card.name}</span>
                    ${qtyBadge}
                </div>
                <div class="card-meta">
                    <span><strong>Pemilik:</strong> ${card.owner}</span>
                    <span><strong>Diterima:</strong> ${UI.formatDate(card.date)}</span>
                    <span style="font-size:0.75rem;color:var(--text-muted);display:block;margin-top:2px;">
                        Ditambahkan oleh: <strong style="color:#e2e8f0;">${card.createdBy || card.created_by || 'Admin'}</strong>
                    </span>
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
                    <th>Pemilik &amp; Penginput</th>
                    <th>Status</th>
                    <th style="text-align:right">Aksi</th>
                </tr>
            </thead>
            <tbody>
            ${page.map(c => {
        const sc = UI.statusClass(c.status);
        const langBadge = `<span class="badge-lang ${(c.type || 'JP').toLowerCase()}" style="font-size:0.65rem;padding:1px 4px;margin-left:4px;">${c.type || 'JP'}</span>`;
        return `<tr>
                    <td>
                        ${UI.renderTypeBox(c, 'sm')}
                    </td>
                    <td class="text-muted">${c.id}</td>
                    <td>
                        <div style="font-weight:600;cursor:pointer;display:flex;align-items:center;" onclick="viewDetail('${c.id}')">
                            <span>${c.name}</span>
                            ${langBadge}
                        </div>
                    </td>
                    <td>
                        <span style="font-size:0.82rem;color:#38bdf8;">${c.set || '-'}</span>
                    </td>
                    <td>
                        <strong>${c.owner}</strong>
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Oleh: <span style="color:#94a3b8;">${c.createdBy || c.created_by || 'Admin'}</span></div>
                    </td>
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

window.deleteCard = async function(id) {
    const card = allCards.find(c => String(c.id) === String(id));
    const cardName = card ? card.name : id;
    if (!confirm(`Hapus kartu "${cardName}" dari inventory?`)) return;

    try {
        UI.showToast('Menghapus kartu...', 'info');
        await API.request('deleteCard', { id: id });
        UI.showToast(`Kartu "${cardName}" berhasil dihapus dari inventory.`, 'success');
        allCards = allCards.filter(c => String(c.id) !== String(id));
        applyFilters();
    } catch (err) {
        UI.showToast('Gagal menghapus kartu: ' + err.message, 'error');
    }
};

// ════════════ CARD FORM & VISUAL CATALOG PICKER (2-COLUMN MULTI-CARD) ════════════
let selectedTitipCards = [];

function renderSelectedCardsList() {
    const container = document.getElementById('selectedCardsContainer');
    const countBadge = document.getElementById('selectedCardsCount');
    const saveBtnText = document.getElementById('saveCardBtnText');

    const totalCount = selectedTitipCards.reduce((acc, c) => acc + (c.count || 1), 0);
    if (countBadge) {
        countBadge.textContent = `${totalCount} Kartu`;
    }
    if (saveBtnText) {
        saveBtnText.textContent = totalCount > 0 ? `Simpan ${totalCount} Kartu ke Inventory` : 'Simpan Kartu ke Inventory';
    }

    if (!container) return;

    if (totalCount === 0) {
        container.innerHTML = `
            <div class="selected-cards-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <p>Belum ada kartu dipilih</p>
                <small>Klik gambar kartu di sebelah kanan untuk menambahkan (klik lagi untuk menambah jumlah)</small>
            </div>
        `;
        return;
    }

    container.innerHTML = selectedTitipCards.map((c, idx) => {
        const imgUrl = window.CardDB ? CardDB.getImageUrl(c.image) : (c.image || 'assets/images/cards/placeholder_card.svg');
        const qtyBadge = (c.count && c.count > 1) 
            ? `<span class="badge-card-count" style="margin-left:6px;font-size:0.75rem;padding:2px 8px;background:rgba(56,189,248,0.2);color:#38bdf8;border-radius:12px;font-weight:800;">${c.count}x</span>` 
            : '';

        return `
            <div class="selected-card-chip">
                <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src=CardDB.getImageUrl('');" />
                <div class="selected-card-chip-info">
                    <div class="selected-card-chip-name" title="${c.name}" style="display:flex;align-items:center;">
                        <span>${c.name}</span>
                        ${qtyBadge}
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px;gap:6px;">
                        <span class="selected-card-chip-sub">${c.set || 'Promo'}</span>
                        <div class="lang-switch-wrap" onclick="event.stopPropagation();">
                            <button type="button" class="lang-switch-btn ${((c.language || c.type || 'JP').toUpperCase() === 'JP') ? 'active' : ''}" onclick="setTitipCardLang(${idx}, 'JP')" title="Kartu versi Jepang (JP)">JP</button>
                            <button type="button" class="lang-switch-btn ${((c.language || c.type || 'JP').toUpperCase() === 'EN' || (c.language || c.type || '').toUpperCase() === 'ENG') ? 'active' : ''}" onclick="setTitipCardLang(${idx}, 'EN')" title="Kartu versi Inggris (ENG)">ENG</button>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn-remove-selected-card" onclick="removeSelectedTitipCard(${idx})" title="Kurangi atau hapus kartu ini">
                    &times;
                </button>
            </div>
        `;
    }).join('');
}

window.togglePickerCard = function(cardId) {
    if (!window.CardDB) return;
    const card = CardDB.getById(cardId);
    if (!card) return;

    // Cek jika kartu sudah ada di daftar, cukup tambahkan jumlah count (2x, 3x, dst)
    const existing = selectedTitipCards.find(c => c.id === card.id || c.name === card.name);
    if (existing) {
        existing.count = (existing.count || 1) + 1;
    } else {
        selectedTitipCards.push({
            id: card.id,
            name: card.name,
            set: card.set || 'Promo',
            grade: card.grade !== undefined ? card.grade : '3',
            language: card.language || card.type || 'JP',
            nation: card.nation || '',
            image: card.image || '',
            count: 1
        });
    }

    renderSelectedCardsList();

    // Re-render gallery untuk update counter badge pada kartu
    if (window._renderModalGalleryFn) {
        window._renderModalGalleryFn();
    }

    // Auto-focus ke input pemilik jika masih kosong
    const ownerInput = document.getElementById('cardOwner');
    if (ownerInput && !ownerInput.value) {
        ownerInput.focus();
    }
};

window.removeSelectedTitipCard = function(index) {
    if (index >= 0 && index < selectedTitipCards.length) {
        if (selectedTitipCards[index].count > 1) {
            selectedTitipCards[index].count--;
        } else {
            selectedTitipCards.splice(index, 1);
        }
        renderSelectedCardsList();
        if (window._renderModalGalleryFn) {
            window._renderModalGalleryFn();
        }
    }
};

function initCardForm() {
    const searchInput = document.getElementById('modalPickerSearch');
    const setFilter = document.getElementById('modalPickerSet');
    const nationFilter = document.getElementById('modalPickerNation');
    const gradeFilter = document.getElementById('modalPickerGrade');
    const galleryContainer = document.getElementById('pickerCardsGallery');

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
            galleryContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 32px 16px;">Tidak ada kartu cocok dengan pencarian / filter.</div>';
            return;
        }

        galleryContainer.innerHTML = filtered.map(c => {
            const selItem = selectedTitipCards.find(sc => sc.id === c.id || sc.name === c.name);
            const countInSelected = selItem ? (selItem.count || 1) : 0;
            const isSel = countInSelected > 0;
            const imgUrl = CardDB.getImageUrl(c.image);
            const countBadge = isSel ? `<span class="picker-selected-badge">${countInSelected}x</span>` : '';

            // HANYA GAMBAR KARTU SAJA (tanpa badge grade, nation, dkk)
            return `
                <div class="picker-thumb-card ${isSel ? 'selected' : ''}" data-card-id="${c.id}" onclick="togglePickerCard('${c.id}')" title="${c.name} - ${c.set || 'Promo'} (Klik untuk menambah)">
                    <div class="picker-thumb-img-wrap">
                        <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src=CardDB.getImageUrl('');" />
                        ${countBadge}
                    </div>
                </div>
            `;
        }).join('');
    }

    window._renderModalGalleryFn = renderModalGallery;

    [searchInput, setFilter, nationFilter, gradeFilter].forEach(el => {
        if (el) {
            el.addEventListener('input', renderModalGallery);
            el.addEventListener('change', renderModalGallery);
        }
    });

    // Buka Modal Tambah Kartu
    const btnAddCard = document.getElementById('btnAddCard');
    if (btnAddCard) {
        btnAddCard.addEventListener('click', () => {
            document.getElementById('cardForm').reset();
            document.getElementById('cardId').value = '';
            selectedTitipCards = [];

            if (searchInput) searchInput.value = '';
            if (setFilter) setFilter.value = '';
            if (nationFilter) nationFilter.value = '';
            if (gradeFilter) gradeFilter.value = '';

            document.getElementById('cardDateReceived').value = new Date().toISOString().split('T')[0];
            const titleEl = document.getElementById('modalCardTitle');
            if (titleEl) titleEl.textContent = 'Input Titipan Kartu Baru';

            populateModalPickerSets();
            renderSelectedCardsList();
            renderModalGallery();
            UI.openModal('modalCard');
        });
    }

    const cancelCardBtn = document.getElementById('cancelCardBtn');
    if (cancelCardBtn) {
        cancelCardBtn.addEventListener('click', () => UI.closeModal('modalCard'));
    }

    // Submit Form
    const cardForm = document.getElementById('cardForm');
    if (cardForm) {
        cardForm.addEventListener('submit', async e => {
            e.preventDefault();

            if (!selectedTitipCards.length) {
                UI.showToast('Silakan klik minimal 1 gambar kartu di kotak kanan terlebih dahulu!', 'error');
                return;
            }

            const owner = document.getElementById('cardOwner').value.trim();
            const date = document.getElementById('cardDateReceived').value;
            const editingId = document.getElementById('cardId').value;

            const totalCount = selectedTitipCards.reduce((acc, c) => acc + (c.count || 1), 0);
            const btn = document.getElementById('saveCardBtn');
            btn.disabled = true;
            btn.textContent = editingId ? 'Menyimpan perubahan...' : `Menyimpan ${totalCount} kartu...`;

            const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
            const currentUserName = currentUser ? (currentUser.name || currentUser.username) : 'Admin';

            try {
                if (editingId) {
                    // Update satu kartu inventory yang sedang diedit
                    const card = selectedTitipCards[0];
                    await API.request('saveCard', {
                        id: editingId,
                        name: card.name,
                        set: card.set || '',
                        grade: card.grade !== undefined ? card.grade : '3',
                        type: (card.language || card.type || 'JP').toUpperCase(),
                        nation: card.nation || '',
                        image: card.image || '',
                        owner: owner,
                        date: date,
                        created_by: currentUserName
                    });
                    UI.showToast(`Data kartu "${card.name}" berhasil diperbarui!`, 'success');
                } else {
                    // Simpan satu atau banyak kartu titipan sekaligus (termasuk kelipatan 2x, 3x)
                    for (const card of selectedTitipCards) {
                        const qty = card.count || 1;
                        for (let q = 0; q < qty; q++) {
                            await API.request('saveCard', {
                                name: card.name,
                                set: card.set || '',
                                grade: card.grade !== undefined ? card.grade : '3',
                                type: (card.language || card.type || 'JP').toUpperCase(),
                                nation: card.nation || '',
                                image: card.image || '',
                                owner: owner,
                                date: date,
                                created_by: currentUserName
                            });
                        }
                    }
                    UI.showToast(`${totalCount} kartu berhasil disimpan ke Inventory untuk ${owner}!`, 'success');
                }

                UI.closeModal('modalCard');
                selectedTitipCards = [];
                loadInventory();
            } catch (err) {
                console.error(err);
                UI.showToast('Terjadi kesalahan saat menyimpan', 'error');
            } finally {
                btn.disabled = false;
                const saveBtnText = document.getElementById('saveCardBtnText');
                if (saveBtnText) saveBtnText.textContent = 'Simpan Kartu ke Inventory';
            }
        });
    }
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
            nation: c.nation || '',
            image: c.image || ''
        };
    }

    selectedTitipCards = [{
        id: master.id,
        name: master.name,
        set: master.set || 'Promo',
        grade: master.grade !== undefined ? master.grade : '3',
        language: master.language || master.type || 'JP',
        nation: master.nation || '',
        image: master.image || ''
    }];

    const titleEl = document.getElementById('modalCardTitle');
    if (titleEl) titleEl.textContent = 'Edit Data Titipan Kartu';

    const saveBtnText = document.getElementById('saveCardBtnText');
    if (saveBtnText) saveBtnText.textContent = 'Simpan Perubahan Kartu';

    renderSelectedCardsList();
    if (window._renderModalGalleryFn) {
        window._renderModalGalleryFn();
    }

    UI.openModal('modalCard');
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
            <div class="detail-field"><div class="detail-label">Ditambahkan Oleh</div><div class="detail-value" style="color:#38bdf8;font-weight:700;">${c.createdBy || c.created_by || 'Admin'}</div></div>
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
