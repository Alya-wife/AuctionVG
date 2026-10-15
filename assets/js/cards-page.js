/**
 * Cards Catalog Page Controller
 * Halaman database kartu promo: bisa filter per set/nation/grade/bahasa
 * Klik gambar kartu untuk langsung titip ke inventory hanya dengan mengisi nama pemilik & tanggal!
 */

let allMasterCards = [];
let filteredMasterCards = [];
let existingOwners = [];

document.addEventListener('DOMContentLoaded', () => {
    initCatalogFilters();
    initTitipModal();
    initMasterModal();
    loadCatalog();
});

async function loadCatalog() {
    allMasterCards = CardDB.getAll();
    populateSetFilterDropdown();
    
    // Load pemilik dari inventory untuk datalist
    try {
        const inv = await API.request('getInventory');
        existingOwners = [...new Set(inv.map(c => c.owner).filter(Boolean))].sort();
        const dl = document.getElementById('ownerDatalist');
        if (dl) dl.innerHTML = existingOwners.map(o => `<option value="${o}">`).join('');
    } catch(e) {}

    applyCatalogFilters();
}

function populateSetFilterDropdown() {
    const sel = document.getElementById('cardFilterSet');
    const dlMaster = document.getElementById('masterSetDatalist');
    const sets = CardDB.getSets();

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
    ['cardSearchInput', 'cardFilterSet', 'cardFilterNation', 'cardFilterGrade', 'cardFilterLang'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', applyCatalogFilters);
            el.addEventListener('change', applyCatalogFilters);
        }
    });

    const resetBtn = document.getElementById('btnResetFilter');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            ['cardSearchInput', 'cardFilterSet', 'cardFilterNation', 'cardFilterGrade', 'cardFilterLang'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            applyCatalogFilters();
        });
    }
}

function applyCatalogFilters() {
    const q = (document.getElementById('cardSearchInput')?.value || '').toLowerCase().trim();
    const setVal = document.getElementById('cardFilterSet')?.value || '';
    const nationVal = document.getElementById('cardFilterNation')?.value || '';
    const gradeVal = document.getElementById('cardFilterGrade')?.value || '';
    const langVal = document.getElementById('cardFilterLang')?.value || '';

    filteredMasterCards = allMasterCards.filter(c => {
        const matchQ = !q || 
            c.name.toLowerCase().includes(q) || 
            (c.id && c.id.toLowerCase().includes(q)) ||
            (c.set && c.set.toLowerCase().includes(q));

        const matchSet = !setVal || c.set === setVal;
        const matchNation = !nationVal || c.nation === nationVal;
        const matchGrade = !gradeVal || c.grade?.toString() === gradeVal;
        const matchLang = !langVal || (c.language || c.type || 'JP').toUpperCase() === langVal.toUpperCase();

        return matchQ && matchSet && matchNation && matchGrade && matchLang;
    });

    const countEl = document.getElementById('catalogCardCount');
    if (countEl) countEl.textContent = `${filteredMasterCards.length} kartu tersedia`;

    renderCatalogGrid();
}

function renderCatalogGrid() {
    const container = document.getElementById('catalogGrid');
    if (!container) return;

    if (!filteredMasterCards.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Tidak ada kartu yang cocok dengan filter</p>
            </div>`;
        return;
    }

    container.innerHTML = filteredMasterCards.map(c => {
        const imgUrl = CardDB.getImageUrl(c.image);

        return `
            <div class="catalog-card-item">
                <div class="catalog-card-img-wrap" onclick="openTitipModal('${c.id}')" title="Klik gambar untuk titipkan kartu ini">
                    <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='assets/images/cards/placeholder_card.svg';" />
                </div>
                <div class="catalog-card-body">
                    <div style="font-size:0.75rem; color:#38bdf8; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.set || 'Promo'}">
                        ${c.set || 'Promo'}
                    </div>
                    <div class="catalog-card-title" title="${c.name}">${c.name}</div>
                    <div class="catalog-card-actions">
                        <button type="button" class="btn-quick-titip" onclick="openTitipModal('${c.id}')" title="Titip ke Inventory">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Titipkan
                        </button>
                        <button type="button" class="btn-card-action edit" onclick="openEditMasterModal('${c.id}')" title="Edit Data Kartu">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button type="button" class="btn-card-action delete" onclick="deleteMasterCard('${c.id}')" title="Hapus dari Database">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ──────────── MODAL 1: TITIP KARTU KE INVENTORY ──────────────────────────────
let selectedMasterCardForTitip = null;

function initTitipModal() {
    const modalClose = document.getElementById('modalTitipClose');
    const cancelBtn = document.getElementById('cancelTitipBtn');
    const titipForm = document.getElementById('titipForm');

    if (modalClose) modalClose.addEventListener('click', () => UI.closeModal('modalTitip'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => UI.closeModal('modalTitip'));

    if (titipForm) {
        titipForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedMasterCardForTitip) return;

            const submitBtn = document.getElementById('saveTitipBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Menyimpan...';

            try {
                const owner = document.getElementById('titipOwner').value.trim();
                const date = document.getElementById('titipDate').value;
                const lang = (selectedMasterCardForTitip.language || selectedMasterCardForTitip.type || 'JP').toUpperCase();

                await API.request('saveCard', {
                    name: selectedMasterCardForTitip.name,
                    set: selectedMasterCardForTitip.set || '',
                    grade: selectedMasterCardForTitip.grade !== undefined ? selectedMasterCardForTitip.grade : '3',
                    type: lang,
                    nation: selectedMasterCardForTitip.nation,
                    image: selectedMasterCardForTitip.image || undefined,
                    owner: owner,
                    date: date
                });

                UI.showToast(`Kartu "${selectedMasterCardForTitip.name}" berhasil dimasukkan ke Inventory untuk ${owner}!`, 'success');
                UI.closeModal('modalTitip');
                titipForm.reset();
            } catch (err) {
                console.error(err);
                UI.showToast('Gagal menyimpan kartu ke inventory', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Simpan ke Inventory';
            }
        });
    }
}

window.openTitipModal = function(cardId) {
    const card = CardDB.getById(cardId);
    if (!card) return;

    selectedMasterCardForTitip = card;
    document.getElementById('titipCardMasterId').value = card.id;
    document.getElementById('titipCardName').textContent = card.name;
    document.getElementById('titipCardSet').textContent = card.set || 'Promo';
    document.getElementById('titipCardGrade').textContent = 'Grade ' + (card.grade !== undefined ? card.grade : '-');
    document.getElementById('titipCardNation').textContent = card.nation;

    const lang = (card.language || card.type || 'JP').toUpperCase();
    const langEl = document.getElementById('titipCardLang');
    langEl.textContent = lang;
    langEl.className = 'badge-lang ' + lang.toLowerCase();

    const imgEl = document.getElementById('titipCardImg');
    imgEl.src = CardDB.getImageUrl(card.image);

    // Set default tanggal hari ini
    document.getElementById('titipDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('titipOwner').value = '';

    UI.openModal('modalTitip');
};

// ──────────── MODAL 2: TAMBAH MASTER KARTU BARU (DENGAN WEBP) ────────────────
function initMasterModal() {
    const btnOpen = document.getElementById('btnOpenNewMaster');
    const modalClose = document.getElementById('modalMasterClose');
    const cancelBtn = document.getElementById('cancelMasterBtn');
    const masterForm = document.getElementById('masterForm');

    const masterFileInput = document.getElementById('masterFileInput');
    const masterDropzone = document.getElementById('masterDropzone');
    const btnBrowse = document.getElementById('btnBrowseMasterImg');
    const webpStatus = document.getElementById('masterWebpStatus');

    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            masterForm.reset();
            document.getElementById('masterImageFileName').value = '';
            if (webpStatus) webpStatus.style.display = 'none';
            UI.openModal('modalMaster');
        });
    }

    if (modalClose) modalClose.addEventListener('click', () => UI.closeModal('modalMaster'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => UI.closeModal('modalMaster'));

    // WebP Auto-Convert on File Upload
    if (btnBrowse && masterFileInput) {
        btnBrowse.addEventListener('click', (e) => {
            e.stopPropagation();
            masterFileInput.click();
        });
    }
    if (masterDropzone && masterFileInput) {
        masterDropzone.addEventListener('click', (e) => {
            if (e.target !== btnBrowse) masterFileInput.click();
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

            // Simpan gambar WebP dataUrl ke cache lokal agar langsung tampil
            try {
                const cacheMap = JSON.parse(localStorage.getItem('ag_card_webp_cache') || '{}');
                cacheMap[res.name] = res.dataUrl;
                localStorage.setItem('ag_card_webp_cache', JSON.stringify(cacheMap));
            } catch(e){}

            if (webpStatus) {
                const newKb = (res.newSize / 1024).toFixed(1);
                webpStatus.innerHTML = `
                    <span>⚡ <strong>WebP Ready:</strong> ${res.name} (${newKb} KB, hemat ${res.savedPercent}%)</span>
                    <button type="button" class="webp-btn-download" id="btnDownloadMasterWebP">⬇️ Download WebP</button>
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

    // Submit Master Card
    if (masterForm) {
        masterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('masterName').value.trim();
            const set = document.getElementById('masterSet').value.trim();
            const grade = document.getElementById('masterGrade').value;
            const language = document.getElementById('masterLang').value;
            const nation = document.getElementById('masterNation').value;
            const image = document.getElementById('masterImageFileName').value.trim() || (name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.webp');

            const id = 'CARD-' + Date.now().toString().slice(-6);

            const newCard = {
                id,
                name,
                set,
                grade,
                language,
                nation,
                image
            };

            CardDB.addCard(newCard);
            allMasterCards = CardDB.getAll();
            populateSetFilterDropdown();
            applyCatalogFilters();

            UI.showToast(`Kartu master "${name}" berhasil didaftarkan ke database!`, 'success');
            UI.closeModal('modalMaster');
            masterForm.reset();
        });
    }
}
