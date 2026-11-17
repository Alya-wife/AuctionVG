let allAuctions = [];
let availableCards = [];
let selectedAuctionCards = [];
let currentFinishId = null;
let currentFinishCards = [];

document.addEventListener('DOMContentLoaded', () => {
    loadAuctions();
    initTabs();
    initNewAuctionModal();
    document.getElementById('cancelFinishBtn').addEventListener('click', () => UI.closeModal('modalFinishAuction'));
    document.getElementById('modalFinishAuctionClose')?.addEventListener('click', () => UI.closeModal('modalFinishAuction'));
    document.getElementById('confirmFinishBtn').addEventListener('click', confirmFinish);
});

async function loadAuctions() {
    const c = document.getElementById('auctionList');
    c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
        allAuctions = await API.request('getAuctions');
        renderAuctions(document.querySelector('.tab-btn.active')?.dataset.tab || 'active');
    } catch { UI.showToast('Gagal memuat lelang', 'error'); }
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderAuctions(e.target.dataset.tab);
        });
    });
}

function renderAuctions(tab) {
    const status = tab === 'active' ? 'Active' : 'Finished';
    const list = allAuctions.filter(a => a.status === status);
    const c = document.getElementById('auctionList');

    if (!list.length) {
        c.innerHTML = `<div class="empty-state"><p>Tidak ada lelang ${status === 'Active' ? 'aktif' : 'selesai'}</p></div>`;
        return;
    }

    c.innerHTML = `<div class="auction-grid">${list.map(a => `
        <div class="stat-card" style="flex-direction:column;align-items:flex-start;gap:12px;">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                <div>
                    <div class="text-sm text-muted">ID: ${a.id}</div>
                    <div style="font-weight:700;font-size:1.05rem;">Lelang ${UI.formatDate(a.date)}</div>
                </div>
                <span class="status-badge ${status === 'Active' ? 'status-auction' : 'status-completed'}">${a.status}</span>
            </div>
            <div class="text-sm">${a.cardIds?.length || 0} kartu dilelang</div>
            ${a.fbUrl ? `<a href="${a.fbUrl}" target="_blank" class="btn-link text-sm">Lihat Post Facebook</a>` : ''}
            ${status === 'Active' ? `<button class="btn-primary" style="width:100%;justify-content:center;margin-top:8px;" onclick="openFinishModal('${a.id}')">Selesaikan Lelang</button>` : 
            `<div class="text-sm text-muted">Terjual: ${a.results?.filter(r=>r.sold).length||0}/${a.cardIds?.length||0}</div>`}
        </div>`).join('')}</div>`;
}

const NATION_ORDER_MAP = {
    'dragon empire': 1,
    'dark states': 2,
    'brandt gate': 3,
    'keter sanctuary': 4,
    'stoicheia': 5,
    'lyrical monasterio': 6,
    'elemental cray': 7,
    'cray elemental': 7
};

function getNationRank(nation) {
    if (!nation) return 99;
    const n = String(nation).trim().toLowerCase();
    return NATION_ORDER_MAP[n] !== undefined ? NATION_ORDER_MAP[n] : 50;
}

function getCardImage(card) {
    let img = card.image;
    if (!img || img === 'JP' || img === 'EN') {
        if (window.CardDB) {
            const match = CardDB.findByName(card.name);
            if (match && match.image) img = match.image;
        }
    }
    return (window.CardDB && img) ? CardDB.getImageUrl(img) : '../assets/images/cards/placeholder_card.svg';
}

function renderSelectedAuctionCardsList() {
    const container = document.getElementById('selectedCardsContainer');
    const countBadge = document.getElementById('selectedCardsCount');
    if (countBadge) {
        countBadge.textContent = `${selectedAuctionCards.length} Kartu`;
    }
    if (!container) return;

    if (!selectedAuctionCards.length) {
        container.innerHTML = `
            <div class="selected-cards-empty" id="selectedCardsEmpty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <p>Belum ada kartu dipilih</p>
                <small>Klik gambar kartu di sebelah kanan untuk menambahkan (klik lagi untuk membatalkan)</small>
            </div>
        `;
        return;
    }

    container.innerHTML = selectedAuctionCards.map(c => {
        const imgUrl = getCardImage(c);
        const isFoil = c.isFoil || /\bfoil\b/i.test(c.name || '');
        const rawLang = (c.language || c.type || 'JP').toString().trim().toUpperCase();
        const normLang = (rawLang === 'EN' || rawLang === 'ENG') ? 'ENG' : 'JP';
        return `
            <div class="selected-card-chip">
                <div class="selected-card-chip-img-wrap ${isFoil ? 'is-foil' : ''}" style="position:relative;width:36px;height:50px;flex-shrink:0;border-radius:4px;overflow:hidden;">
                    <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" style="width:100%;height:100%;object-fit:cover;display:block;" />
                </div>
                <div class="selected-card-chip-info">
                    <div class="selected-card-chip-name" title="${c.name}" style="display:flex;align-items:center;">
                        <span>${c.name}</span>
                        ${isFoil ? `<span class="badge-foil" style="margin-left:4px;font-size:0.65rem;">FOIL</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px;gap:6px;">
                        <span class="selected-card-chip-sub">${c.nation ? c.nation + ' · ' : ''}${c.owner || 'Anon'} | ${normLang}</span>
                    </div>
                </div>
                <button type="button" class="btn-remove-selected-card" onclick="removeSelectedAuctionCard('${c.id}')" title="Hapus kartu ini dari lelang">
                    &times;
                </button>
            </div>
        `;
    }).join('');
}

window.toggleAuctionCard = function(id) {
    const card = availableCards.find(c => c.id === id);
    if (!card) return;
    const idx = selectedAuctionCards.findIndex(c => c.id === id);
    if (idx === -1) {
        selectedAuctionCards.push(card);
    } else {
        selectedAuctionCards.splice(idx, 1);
    }
    renderSelectedAuctionCardsList();
    renderAuctionGallery();
};

window.removeSelectedAuctionCard = function(id) {
    const idx = selectedAuctionCards.findIndex(c => c.id === id);
    if (idx !== -1) {
        selectedAuctionCards.splice(idx, 1);
        renderSelectedAuctionCardsList();
        renderAuctionGallery();
    }
};

function populateModalPickerSets() {
    const setFilter = document.getElementById('modalPickerSet');
    if (!setFilter) return;
    const sets = [...new Set(availableCards.map(c => c.set).filter(Boolean))].sort();
    setFilter.innerHTML = '<option value="">Semua Set Promo</option>' + 
        sets.map(s => `<option value="${s}">${s}</option>`).join('');
}

function renderAuctionGallery() {
    const galleryContainer = document.getElementById('pickerCardsGallery');
    if (!galleryContainer) return;

    const q = (document.getElementById('modalPickerSearch')?.value || '').toLowerCase().trim();
    const setVal = document.getElementById('modalPickerSet')?.value || '';
    const nationVal = document.getElementById('modalPickerNation')?.value || '';
    const langVal = (document.getElementById('modalPickerLang')?.value || '').toUpperCase();

    const filtered = availableCards.filter(c => {
        const matchQ = !q || c.name.toLowerCase().includes(q) || (c.id && c.id.toLowerCase().includes(q)) || (c.owner && c.owner.toLowerCase().includes(q)) || (c.set && c.set.toLowerCase().includes(q));
        const matchSet = !setVal || c.set === setVal;
        const matchNation = !nationVal || c.nation === nationVal || (nationVal.toLowerCase().includes('elemental') && (c.nation || '').toLowerCase().includes('elemental'));
        
        const rawLang = (c.language || c.type || 'JP').toString().trim().toUpperCase();
        const normLang = (rawLang === 'EN' || rawLang === 'ENG') ? 'ENG' : 'JP';
        const matchLang = !langVal || normLang === langVal;

        return matchQ && matchSet && matchNation && matchLang;
    });

    filtered.sort((a, b) => {
        const rankA = getNationRank(a.nation);
        const rankB = getNationRank(b.nation);
        if (rankA !== rankB) return rankA - rankB;

        const natCompare = (a.nation || '').localeCompare(b.nation || '');
        if (natCompare !== 0) return natCompare;

        const gA = parseInt(a.grade, 10);
        const gB = parseInt(b.grade, 10);
        if (!isNaN(gA) && !isNaN(gB) && gA !== gB) {
            return gB - gA;
        }

        return (a.name || '').localeCompare(b.name || '');
    });

    if (!filtered.length) {
        galleryContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 32px 16px;">Tidak ada kartu available yang cocok dengan pencarian / filter.</div>';
        return;
    }

    galleryContainer.innerHTML = filtered.map(c => {
        const isSel = selectedAuctionCards.some(sc => sc.id === c.id);
        const imgUrl = getCardImage(c);
        const selBadge = isSel ? `<span class="picker-selected-badge">&#10003;</span>` : '';
        const rawLang = (c.language || c.type || 'JP').toString().trim().toUpperCase();
        const normLang = (rawLang === 'EN' || rawLang === 'ENG') ? 'ENG' : 'JP';

        return `
            <div class="picker-thumb-card ${isSel ? 'selected' : ''}" data-card-id="${c.id}" onclick="toggleAuctionCard('${c.id}')" title="${c.name} - ${c.owner || ''} (${normLang})">
                <div class="picker-thumb-img-wrap">
                    <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                    ${selBadge}
                </div>
            </div>
        `;
    }).join('');
}

function initNewAuctionModal() {
    const searchInput = document.getElementById('modalPickerSearch');
    const setFilter = document.getElementById('modalPickerSet');
    const nationFilter = document.getElementById('modalPickerNation');
    const langFilter = document.getElementById('modalPickerLang');

    if (searchInput) searchInput.addEventListener('input', renderAuctionGallery);
    if (setFilter) setFilter.addEventListener('change', renderAuctionGallery);
    if (nationFilter) nationFilter.addEventListener('change', renderAuctionGallery);
    if (langFilter) langFilter.addEventListener('change', renderAuctionGallery);

    document.getElementById('btnNewAuction').addEventListener('click', async () => {
        document.getElementById('newAuctionForm').reset();
        const dateInput = document.getElementById('auctionDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        selectedAuctionCards = [];
        renderSelectedAuctionCardsList();
        
        const galleryContainer = document.getElementById('pickerCardsGallery');
        if (galleryContainer) {
            galleryContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 24px;"><div class="spinner-sm"></div><p style="margin-top:8px;color:var(--text-muted);font-size:0.85rem;">Memuat kartu available...</p></div>';
        }
        UI.openModal('modalNewAuction');

        try {
            const inv = await API.request('getInventory');
            availableCards = inv.filter(c => c.status === 'Available');
            populateModalPickerSets();
            renderAuctionGallery();
        } catch (e) {
            UI.showToast('Gagal memuat kartu inventory', 'error');
        }
    });

    document.getElementById('cancelNewAuctionBtn').addEventListener('click', () => UI.closeModal('modalNewAuction'));
    const closeBtn = document.getElementById('modalNewAuctionClose');
    if (closeBtn) closeBtn.addEventListener('click', () => UI.closeModal('modalNewAuction'));

    document.getElementById('newAuctionForm').addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedAuctionCards.length) { 
            UI.showToast('Pilih minimal 1 kartu untuk dilelang', 'error'); 
            return; 
        }
        const btn = document.getElementById('saveAuctionBtn') || e.target.querySelector('[type=submit]');
        if (btn) btn.disabled = true;
        try {
            const fbUrl = document.getElementById('auctionFbUrl').value.trim();
            const date = document.getElementById('auctionDate')?.value || new Date().toISOString().split('T')[0];
            await API.request('saveAuction', { 
                fbUrl, 
                date,
                cardIds: selectedAuctionCards.map(c => c.id) 
            });
            UI.showToast('Lelang berhasil dibuat');
            UI.closeModal('modalNewAuction');
            loadAuctions();
        } catch (err) { 
            UI.showToast('Gagal membuat lelang', 'error'); 
        } finally { 
            if (btn) btn.disabled = false; 
        }
    });
}

window.openFinishModal = async function(id) {
    currentFinishId = id;
    const auc = allAuctions.find(a => a.id === id);
    const list = document.getElementById('auctionResultList');
    list.innerHTML = '<div class="loading-state-sm"><div class="spinner-sm"></div></div>';
    UI.openModal('modalFinishAuction');

    const inv = await API.request('getInventory');
    currentFinishCards = (auc.cardIds || []).map(cid => inv.find(c => c.id === cid)).filter(Boolean);

    if (!currentFinishCards.length) {
        list.innerHTML = '<div class="empty-state" style="padding: 24px; text-align: center;"><p>Tidak ada kartu yang ditemukan untuk lelang ini</p></div>';
        return;
    }

    // Kelompokkan berdasarkan kartu (nama kartu dasar)
    const cardGroups = [];
    currentFinishCards.forEach(c => {
        const cleanName = (c.name || '').replace(/\bfoil\b/i, '').trim();
        const groupKey = cleanName.toLowerCase();
        
        let grp = cardGroups.find(g => g.key === groupKey);
        if (!grp) {
            grp = {
                key: groupKey,
                name: cleanName || c.name,
                image: c.image,
                nation: c.nation,
                grade: c.grade,
                cards: []
            };
            cardGroups.push(grp);
        }
        grp.cards.push(c);
    });

    // Urutkan grup kartu (Dragon Empire, Dark States, ..., kemudian nama)
    cardGroups.sort((a, b) => {
        const rankA = getNationRank(a.nation);
        const rankB = getNationRank(b.nation);
        if (rankA !== rankB) return rankA - rankB;
        return (a.name || '').localeCompare(b.name || '');
    });

    list.innerHTML = cardGroups.map(grp => {
        const repCard = grp.cards[0];
        const imgUrl = getCardImage(repCard);
        const hasFoil = grp.cards.some(c => c.isFoil || /\bfoil\b/i.test(c.name || ''));

        return `
            <div class="result-card-item">
                <!-- Gambar kartu -->
                <div class="result-card-img-wrap ${hasFoil ? 'is-foil' : ''}">
                    <img src="${imgUrl}" alt="${grp.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                    ${hasFoil ? '<span class="badge-foil" style="position:absolute;bottom:3px;right:3px;font-size:0.58rem;padding:1px 4px;border-radius:3px;">FOIL</span>' : ''}
                </div>

                <!-- Konten kartu & daftar pemilik yang berjejer rapi -->
                <div class="result-card-content">
                    <div class="result-card-header" style="margin-bottom: ${grp.cards.length > 1 ? '10px' : '4px'};">
                        <div class="result-card-name" title="${grp.name}">
                            <span>${grp.name}</span>
                        </div>
                        ${grp.cards.length > 1 ? `<span class="badge-card-count" style="font-size:0.75rem;padding:2px 8px;">${grp.cards.length} Kartu</span>` : ''}
                    </div>

                    <div class="result-card-copies-list">
                        ${grp.cards.map((c, idx) => {
                            const isFoil = c.isFoil || /\bfoil\b/i.test(c.name || '');
                            const numLabel = grp.cards.length > 1 ? `<span class="copy-index">#${idx + 1}</span>` : '';
                            return `
                                <div class="result-copy-row" id="result_card_${c.id}">
                                    <div class="result-copy-header">
                                        <div class="result-card-owner">
                                            ${numLabel}Pemilik: <span>${c.owner || 'Anon'}</span>
                                            ${(isFoil && grp.cards.length > 1) ? '<span class="badge-foil" style="margin-left:6px;font-size:0.6rem;padding:1px 4px;border-radius:3px;">FOIL</span>' : ''}
                                        </div>

                                        <!-- Capsule switch laku dan tidak -->
                                        <div class="capsule-switch active-tidak" id="switch_${c.id}" data-sold="false" onclick="toggleAuctionCardSold('${c.id}')" title="Klik untuk ubah status Laku / Tidak">
                                            <div class="capsule-switch-pill"></div>
                                            <span class="capsule-switch-opt opt-laku">Laku</span>
                                            <span class="capsule-switch-opt opt-tidak">Tidak</span>
                                        </div>
                                    </div>

                                    <!-- Bila laku muncul 2 field: Nama Pemenang & Harga -->
                                    <div id="inputs_${c.id}" class="result-sold-fields" style="display: none;">
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label class="form-label-sm">Nama Pemenang *</label>
                                            <input type="text" id="buyer_${c.id}" class="input-sm" placeholder="Nama Pemenang..." />
                                        </div>
                                        <div class="form-group" style="margin-bottom: 0;">
                                            <label class="form-label-sm">Harga *</label>
                                            <input type="text" id="price_${c.id}" class="currency-input input-sm" placeholder="Rp 0" />
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.toggleAuctionCardSold = function(id) {
    const switchEl = document.getElementById(`switch_${id}`);
    if (!switchEl) return;
    const isSold = switchEl.dataset.sold !== 'true';
    switchEl.dataset.sold = isSold ? 'true' : 'false';
    switchEl.classList.toggle('active-laku', isSold);
    switchEl.classList.toggle('active-tidak', !isSold);

    const inputsEl = document.getElementById(`inputs_${id}`);
    const copyRowEl = document.getElementById(`result_card_${id}`);

    if (inputsEl) {
        inputsEl.style.display = isSold ? 'grid' : 'none';
        if (isSold) {
            const buyerInput = document.getElementById(`buyer_${id}`);
            if (buyerInput && !buyerInput.value) {
                buyerInput.focus();
            }
        }
    }

    if (copyRowEl) {
        copyRowEl.classList.toggle('is-sold', isSold);
    }
};

async function confirmFinish() {
    if (!currentFinishId) return;
    const results = [];
    let valid = true;

    currentFinishCards.forEach(c => {
        const switchEl = document.getElementById(`switch_${c.id}`);
        const isSold = switchEl ? switchEl.dataset.sold === 'true' : false;

        if (isSold) {
            const buyer = (document.getElementById(`buyer_${c.id}`)?.value || '').trim();
            const price = UI.parseCurrency(document.getElementById(`price_${c.id}`)?.value || '0');
            if (!buyer || !price) {
                valid = false;
                return;
            }
            results.push({ cardId: c.id, sold: true, buyer, price: price });
        } else {
            results.push({ cardId: c.id, sold: false });
        }
    });

    if (!valid) {
        UI.showToast('Lengkapi nama pemenang dan harga untuk setiap kartu yang laku', 'error');
        return;
    }

    const btn = document.getElementById('confirmFinishBtn');
    btn.disabled = true;
    try {
        await API.request('finishAuction', { auctionId: currentFinishId, results });
        UI.showToast('Lelang selesai');
        UI.closeModal('modalFinishAuction');
        loadAuctions();
    } catch {
        UI.showToast('Gagal menyelesaikan lelang', 'error');
    } finally {
        btn.disabled = false;
    }
}
