/**
 * Cards Catalog Page Controller
 * Terhubung 100% langsung ke Database MySQL Server (cards_master)
 */

let allMasterCards = [];
let filteredMasterCards = [];
let existingOwners = [];

document.addEventListener('DOMContentLoaded', () => {
    initCatalogFilters();
    initMasterModal();
    loadCatalog();

    window.addEventListener('cards_database_synced', () => {
        loadCatalog();
    });
});

async function loadCatalog() {
    // 1. Migrasi otomatis kartu lokal jika ada kartu yang sebelumnya tersimpan di localStorage browser ini
    try {
        const local = JSON.parse(localStorage.getItem('nitip_card_database') || '[]');
        const cacheMap = JSON.parse(localStorage.getItem('ag_card_webp_cache') || '{}');
        for (const c of local) {
            if (c && c.name && !c.id.startsWith('V-PR-') && !c.id.startsWith('SHOP-PR-')) {
                const imgData = cacheMap[c.image] || cacheMap[c.image?.replace(/\.(jpg|png)$/i, '.webp')];
                if (imgData && typeof API !== 'undefined') {
                    await API.request('uploadCardImage', { cardId: c.id, image_base64: imgData }).catch(() => {});
                }
                if (typeof API !== 'undefined') {
                    await API.request('saveMasterCard', c).catch(() => {});
                }
            }
        }
    } catch(e) {}

    // 2. Ambil data kartu murni langsung dari MySQL Database Server
    try {
        if (typeof API !== 'undefined' && API.request && (!window.CONFIG || !window.CONFIG.USE_LOCAL)) {
            const serverCards = await API.request('getMasterCards');
            if (Array.isArray(serverCards)) {
                allMasterCards = serverCards;
            } else {
                allMasterCards = (window.CardDB && CardDB.getAll) ? CardDB.getAll() : [];
            }
        } else {
            allMasterCards = (window.CardDB && CardDB.getAll) ? CardDB.getAll() : [];
        }
    } catch (err) {
        console.warn('Gagal load dari server, gunakan fallback lokal:', err);
        allMasterCards = (window.CardDB && CardDB.getAll) ? CardDB.getAll() : [];
    }

    populateSetFilterDropdown();
    applyCatalogFilters();

    // Load pemilik dari inventory untuk datalist
    try {
        const inv = await API.request('getInventory');
        existingOwners = [...new Set(inv.map(c => c.owner).filter(Boolean))].sort();
        const dl = document.getElementById('ownerDatalist');
        if (dl) dl.innerHTML = existingOwners.map(o => `<option value="${o}">`).join('');
    } catch(e) {}
}

function populateSetFilterDropdown() {
    const sel = document.getElementById('cardFilterSet');
    const dlMaster = document.getElementById('masterSetDatalist');
    const sets = [...new Set(allMasterCards.map(c => c.set).filter(Boolean))].sort();

    if (sel) {
        const cur = sel.value;
        sel.innerHTML = '<option value="">Semua Set Promo</option>' + 
            sets.map(s => `<option value="${s}">${s}</option>`).join('');
        sel.value = cur;
    }
    if (dlMaster) {
        dlMaster.innerHTML = sets.map(s => `<option value="${s}">`).join('');
    }
}

function initCatalogFilters() {
    ['cardSearch', 'cardFilterSet', 'cardFilterNation', 'cardFilterGrade', 'cardFilterLang'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', applyCatalogFilters);
            el.addEventListener('change', applyCatalogFilters);
        }
    });

    const resetBtn = document.getElementById('resetCardFilter');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            ['cardSearch', 'cardFilterSet', 'cardFilterNation', 'cardFilterGrade', 'cardFilterLang'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            applyCatalogFilters();
        });
    }
}

function applyCatalogFilters() {
    const q = (document.getElementById('cardSearch')?.value || '').toLowerCase().trim();
    const setVal = document.getElementById('cardFilterSet')?.value || '';
    const nationVal = document.getElementById('cardFilterNation')?.value || '';
    const gradeVal = document.getElementById('cardFilterGrade')?.value || '';
    const langVal = document.getElementById('cardFilterLang')?.value || '';

    filteredMasterCards = allMasterCards.filter(c => {
        const matchQ = !q || c.name.toLowerCase().includes(q) || (c.id && c.id.toLowerCase().includes(q));
        const matchSet = !setVal || c.set === setVal;
        const matchNation = !nationVal || c.nation === nationVal;
        const matchGrade = !gradeVal || String(c.grade) === gradeVal;
        const matchLang = !langVal || (c.language || c.type || 'JP').toUpperCase() === langVal.toUpperCase();
        return matchQ && matchSet && matchNation && matchGrade && matchLang;
    });

    renderCatalogGrid();
}

function renderCatalogGrid() {
    const container = document.getElementById('catalogGrid');
    if (!container) return;

    if (!filteredMasterCards.length) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 48px 16px;">Tidak ada kartu yang cocok dengan pencarian / filter. Silakan klik tombol <strong>+ Tambah Master Kartu</strong> atau lakukan <strong>Scan Kartu</strong>.</div>';
        return;
    }

    container.innerHTML = filteredMasterCards.map(c => {
        const imgUrl = (window.CardDB && CardDB.getImageUrl) ? CardDB.getImageUrl(c.image) : (c.image || '../assets/images/cards/placeholder_card.svg');

        return `
            <div class="catalog-card-item" title="${c.name} (${c.id})">
                <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                <div class="catalog-card-hover-overlay">
                    <button type="button" class="catalog-hover-btn edit" onclick="openEditMasterModal('${c.id}')" title="Edit Kartu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button type="button" class="catalog-hover-btn titip" onclick="openQuickTitipModal('${c.id}')" title="Titip Kartu ke Inventory">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        <span>Titip</span>
                    </button>
                    <button type="button" class="catalog-hover-btn delete" onclick="deleteMasterCard('${c.id}')" title="Hapus Kartu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="catalog-card-footer">
                    <div class="catalog-card-name">${c.name}</div>
                    <div class="catalog-card-meta">
                        <span>${c.id}</span>
                        <span>${(c.language || c.type || 'JP').toUpperCase()}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ──────────── MODAL: TAMBAH / EDIT MASTER KARTU ────────────
function initMasterModal() {
    const btnOpen = document.getElementById('btnOpenAddMasterModal');
    const modalClose = document.getElementById('modalMasterClose');
    const cancelBtn = document.getElementById('modalMasterCancel');
    const masterForm = document.getElementById('masterCardForm');

    const btnBrowse = document.getElementById('btnBrowseMasterImage');
    const masterFileInput = document.getElementById('masterCardFileInput');
    const masterDropzone = document.getElementById('masterImageDropzone');
    const webpStatus = document.getElementById('masterWebpStatus');

    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            const editIdEl = document.getElementById('masterEditId');
            if (editIdEl) editIdEl.value = '';
            if (masterForm) masterForm.reset();

            const titleEl = document.getElementById('modalMasterTitle');
            if (titleEl) titleEl.textContent = 'Tambah Master Kartu Baru';

            const btnText = document.getElementById('saveMasterBtnText');
            if (btnText) btnText.textContent = 'Daftarkan ke Database';

            if (webpStatus) webpStatus.style.display = 'none';
            UI.openModal('modalMaster');
        });
    }

    if (modalClose) modalClose.addEventListener('click', () => UI.closeModal('modalMaster'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => UI.closeModal('modalMaster'));

    if (btnBrowse && masterFileInput) {
        btnBrowse.addEventListener('click', (e) => {
            e.stopPropagation();
            masterFileInput.click();
        });
    }

    if (masterDropzone && masterFileInput) {
        masterDropzone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                masterFileInput.click();
            }
        });
        masterDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            masterDropzone.classList.add('dragover');
        });
        masterDropzone.addEventListener('dragleave', () => masterDropzone.classList.remove('dragover'));
        masterDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            masterDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                handleMasterImageUpload(e.dataTransfer.files[0]);
            }
        });

        masterFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length) {
                handleMasterImageUpload(e.target.files[0]);
            }
        });
    }

    async function handleMasterImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            UI.showToast('Harap pilih file gambar valid', 'error');
            return;
        }

        try {
            UI.showToast('Mengonversi gambar ke WebP...', 'info');
            const res = await UI.convertImageToWebP(file, { maxWidth: 900, maxHeight: 1260, quality: 0.84 });

            document.getElementById('masterImageFileName').value = res.name;

            // Simpan gambar WebP dataUrl ke cache lokal
            try {
                const cacheMap = JSON.parse(localStorage.getItem('ag_card_webp_cache') || '{}');
                cacheMap[res.name] = res.dataUrl;
                localStorage.setItem('ag_card_webp_cache', JSON.stringify(cacheMap));
            } catch(e){}

            // Upload & simpan file fisik WebP ke server hosting (assets/images/cards/)
            if (typeof API !== 'undefined' && API.request && res.dataUrl) {
                try {
                    await API.request('uploadCardImage', {
                        cardId: res.name,
                        image_base64: res.dataUrl
                    });
                } catch (upErr) {
                    console.warn('Upload fisik kartu ke server:', upErr);
                }
            }

            if (webpStatus) {
                const newKb = (res.newSize / 1024).toFixed(1);
                webpStatus.innerHTML = `
                    <span><strong>WebP Ready:</strong> ${res.name} (${newKb} KB, hemat ${res.savedPercent}%)</span>
                    <button type="button" class="webp-btn-download" id="btnDownloadMasterWebP">Download WebP</button>
                `;
                webpStatus.style.display = 'flex';

                const dlBtn = document.getElementById('btnDownloadMasterWebP');
                if (dlBtn) {
                    dlBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        UI.downloadBlob(res.blob, res.name);
                        UI.showToast(`File ${res.name} diunduh ke komputer Anda.`, 'success');
                    });
                }
            }

            UI.showToast('Gambar berhasil dikonversi ke WebP!', 'success');
        } catch (err) {
            UI.showToast('Gagal convert ke WebP: ' + err.message, 'error');
        }
    }

    // Submit Master Card (Tambah baru / Simpan perubahan) langsung ke MySQL
    if (masterForm) {
        masterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editIdEl = document.getElementById('masterEditId');
            const editingId = editIdEl ? editIdEl.value : '';

            const name = document.getElementById('masterName').value.trim();
            const set = document.getElementById('masterSet').value.trim();
            const grade = document.getElementById('masterGrade').value;
            const language = document.getElementById('masterLang').value;
            const nation = document.getElementById('masterNation').value;
            const image = document.getElementById('masterImageFileName').value.trim() || (name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.webp');

            const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
            const createdBy = currentUser ? (currentUser.name || currentUser.username) : 'Admin';

            try {
                if (editingId) {
                    await API.request('saveMasterCard', {
                        id: editingId,
                        name,
                        set,
                        grade,
                        language,
                        nation,
                        image,
                        created_by: createdBy
                    });
                    UI.showToast(`Kartu master "${name}" berhasil diperbarui di database!`, 'success');
                } else {
                    const id = 'CARD-' + Date.now().toString().slice(-6);
                    await API.request('saveMasterCard', {
                        id,
                        name,
                        set,
                        grade,
                        language,
                        nation,
                        image,
                        created_by: createdBy
                    });
                    UI.showToast(`Kartu master "${name}" berhasil didaftarkan ke database!`, 'success');
                }

                UI.closeModal('modalMaster');
                masterForm.reset();
                if (editIdEl) editIdEl.value = '';
                await loadCatalog();
            } catch (err) {
                UI.showToast('Gagal menyimpan kartu ke database: ' + err.message, 'error');
            }
        });
    }
}

// ──────────── GLOBAL ACTIONS: EDIT & DELETE MASTER CARD ────────────
window.openEditMasterModal = function(cardId) {
    const card = allMasterCards.find(c => c.id === cardId) || (window.CardDB && CardDB.getById(cardId));
    if (!card) return;

    const editIdEl = document.getElementById('masterEditId');
    if (editIdEl) editIdEl.value = card.id;

    document.getElementById('masterName').value = card.name || '';
    document.getElementById('masterSet').value = card.set || '';
    document.getElementById('masterGrade').value = card.grade !== undefined ? card.grade : '3';
    document.getElementById('masterLang').value = (card.language || card.type || 'JP').toUpperCase();
    document.getElementById('masterNation').value = card.nation || 'Dragon Empire';
    document.getElementById('masterImageFileName').value = card.image || '';

    const titleEl = document.getElementById('modalMasterTitle');
    if (titleEl) titleEl.textContent = `Edit Kartu: ${card.name}`;

    const btnText = document.getElementById('saveMasterBtnText');
    if (btnText) btnText.textContent = 'Simpan Perubahan';

    const webpStatus = document.getElementById('masterWebpStatus');
    if (webpStatus) {
        if (card.image) {
            webpStatus.innerHTML = `<span><strong>Gambar Saat Ini:</strong> ${card.image}</span>`;
            webpStatus.style.display = 'flex';
        } else {
            webpStatus.style.display = 'none';
        }
    }

    UI.openModal('modalMaster');
};

window.deleteMasterCard = async function(cardId) {
    const card = allMasterCards.find(c => c.id === cardId) || (window.CardDB && CardDB.getById(cardId));
    const cardName = card ? card.name : cardId;

    if (!confirm(`Hapus kartu "${cardName}" (${cardId}) dari database kartu?`)) {
        return;
    }

    try {
        await API.request('deleteMasterCard', { id: cardId });
        UI.showToast(`Kartu "${cardName}" berhasil dihapus dari database.`, 'success');
        await loadCatalog();
    } catch (err) {
        UI.showToast('Gagal menghapus kartu: ' + err.message, 'error');
    }
};

// ──────────── QUICK TITIP TO INVENTORY MODAL ────────────
let quickTitipTargetCard = null;

window.openQuickTitipModal = function(cardId) {
    const card = allMasterCards.find(c => c.id === cardId) || (window.CardDB && CardDB.getById(cardId));
    if (!card) return;

    quickTitipTargetCard = card;

    const titleEl = document.getElementById('quickTitipTitle');
    if (titleEl) titleEl.textContent = `Titip: ${card.name}`;

    const cardInfo = document.getElementById('quickTitipCardInfo');
    if (cardInfo) {
        const imgUrl = (window.CardDB && CardDB.getImageUrl) ? CardDB.getImageUrl(card.image) : (card.image || '../assets/images/cards/placeholder_card.svg');
        cardInfo.innerHTML = `
            <div style="display:flex; gap:16px; align-items:center; background:#0f172a; padding:12px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:16px;">
                <img src="${imgUrl}" alt="${card.name}" style="width:48px; aspect-ratio:5/7; object-fit:cover; border-radius:4px;" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                <div>
                    <strong style="color:#fff; font-size:0.95rem; display:block;">${card.name}</strong>
                    <span style="color:var(--text-muted); font-size:0.8rem;">${card.id} • Grade ${card.grade} • ${card.nation}</span>
                </div>
            </div>
        `;
    }

    const dateEl = document.getElementById('quickTitipDate');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

    UI.openModal('modalQuickTitip');
};

const quickTitipForm = document.getElementById('quickTitipForm');
if (quickTitipForm) {
    quickTitipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!quickTitipTargetCard) return;

        const owner = document.getElementById('quickTitipOwner').value.trim();
        const date = document.getElementById('quickTitipDate').value;

        if (!owner) {
            UI.showToast('Nama pemilik wajib diisi!', 'error');
            return;
        }

        const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
        const createdBy = currentUser ? (currentUser.name || currentUser.username) : 'Admin';

        try {
            await API.request('saveCard', {
                name: quickTitipTargetCard.name,
                set: quickTitipTargetCard.set || '',
                grade: quickTitipTargetCard.grade !== undefined ? quickTitipTargetCard.grade : '3',
                type: (quickTitipTargetCard.language || quickTitipTargetCard.type || 'JP').toUpperCase(),
                nation: quickTitipTargetCard.nation || '',
                image: quickTitipTargetCard.image || '',
                owner: owner,
                date: date,
                status: 'Available',
                created_by: createdBy
            });

            UI.showToast(`Kartu "${quickTitipTargetCard.name}" berhasil ditambahkan ke inventory milik ${owner}!`, 'success');
            UI.closeModal('modalQuickTitip');
            quickTitipForm.reset();
        } catch(err) {
            UI.showToast('Gagal titip ke inventory: ' + err.message, 'error');
        }
    });
}

const quickTitipClose = document.getElementById('quickTitipClose');
const quickTitipCancel = document.getElementById('quickTitipCancel');
if (quickTitipClose) quickTitipClose.addEventListener('click', () => UI.closeModal('modalQuickTitip'));
if (quickTitipCancel) quickTitipCancel.addEventListener('click', () => UI.closeModal('modalQuickTitip'));
