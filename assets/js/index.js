/**
 * index.js – Landing Page Logics (Available Cards, Owners List & Admin Auth)
 */

let inventoryData = [];
let masterCardsCatalog = [];
let lastSoldPriceMap = {};
let availableCardGroups = [];
let activeLandingTab = 'available';
let currentAvailableGroup = null;

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

function formatNationWithLang(nation, typeOrLang) {
    const raw = (typeOrLang || 'JP').toString().trim().toUpperCase();
    const lang = (raw === 'EN' || raw === 'ENG') ? 'ENG' : (raw || 'JP');
    return nation ? `${nation} | ${lang}` : lang;
}

document.addEventListener('DOMContentLoaded', async () => {
    initLandingNavAuth();
    initModals();
    initGoogleSignIn();
    initFilterListeners();
    await loadInitialData();
});

// ─── 1. Load Data ─────────────────────────────────────────────────────────────
async function loadInitialData() {
    try {
        const [inv, lastSold, master] = await Promise.allSettled([
            API.request('getInventory'),
            API.request('getLastSoldPrices'),
            API.request('getMasterCards')
        ]);

        if (inv.status === 'fulfilled' && Array.isArray(inv.value)) {
            inventoryData = inv.value;
        }
        if (lastSold.status === 'fulfilled' && typeof lastSold.value === 'object' && lastSold.value) {
            lastSoldPriceMap = lastSold.value;
        }
        if (master.status === 'fulfilled' && Array.isArray(master.value)) {
            masterCardsCatalog = master.value;
            if (window.CardDB) {
                CardDB._cards = master.value;
            }
        }

        // Process data
        processAvailableCards();
        populateAvailableSetsFilter();
        renderAvailableCards();
        renderPublicOwners();

    } catch (err) {
        console.error('Gagal memuat data landing page:', err);
        UI.showToast('Gagal memuat sebagian data katalog', 'error');
    }
}

// ─── 2. Top-Right Admin Auth Area ─────────────────────────────────────────────
function initLandingNavAuth() {
    renderNavAuthArea();
}

function renderNavAuthArea() {
    const container = document.getElementById('landingNavActions');
    if (!container) return;

    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;

    if (user) {
        // User is logged in as Admin
        const initial = (user.name || user.email || 'A').charAt(0).toUpperCase();
        container.innerHTML = `
            <div class="admin-logged-pill">
                <div class="admin-logged-avatar">${initial}</div>
                <span style="font-weight:700; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${user.name || 'Admin'}
                </span>
            </div>
            <a href="dashboard.html" class="btn-admin-dash-pill" title="Buka Dashboard Inventaris">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Dashboard</span>
            </a>
            <button type="button" class="btn-admin-logout-icon" onclick="handleLandingLogout()" title="Keluar / Logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        `;
    } else {
        // Guest / Public view
        container.innerHTML = `
            <button type="button" class="btn-admin-login-top" id="btnTopLogin" onclick="openAdminLoginModal()">
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Login Admin</span>
            </button>
        `;
    }
}

window.handleLandingLogout = function() {
    if (confirm('Apakah Anda yakin ingin logout dari akun Admin?')) {
        Auth.logout();
    }
};

window.openAdminLoginModal = function() {
    openModal('modalAdminLogin');
    initGoogleSignIn();
};

// ─── 3. Tab Switcher (Available vs Owners vs Leaderboard) ─────────────────────
window.switchLandingTab = function(tab) {
    activeLandingTab = tab;

    const btnAvail = document.getElementById('tabAvailableBtn');
    const btnOwners = document.getElementById('tabOwnersBtn');
    const btnLeaderboard = document.getElementById('tabLeaderboardBtn');
    const viewAvail = document.getElementById('viewAvailable');
    const viewOwners = document.getElementById('viewOwners');
    const viewLeaderboard = document.getElementById('viewLeaderboard');

    btnAvail?.classList.remove('active');
    btnOwners?.classList.remove('active');
    btnLeaderboard?.classList.remove('active');
    if (viewAvail) viewAvail.style.display = 'none';
    if (viewOwners) viewOwners.style.display = 'none';
    if (viewLeaderboard) viewLeaderboard.style.display = 'none';

    if (tab === 'available') {
        btnAvail?.classList.add('active');
        if (viewAvail) viewAvail.style.display = 'block';
    } else if (tab === 'owners') {
        btnOwners?.classList.add('active');
        if (viewOwners) viewOwners.style.display = 'block';
    } else if (tab === 'leaderboard') {
        btnLeaderboard?.classList.add('active');
        if (viewLeaderboard) viewLeaderboard.style.display = 'block';
        loadPublicLeaderboard();
    }
};

// ─── 4. Process & Group Available Cards ────────────────────────────────────────
function cleanCardBaseName(name) {
    return (name || '').replace(/\s+(FOIL|Foil|foil)$/i, '').trim();
}

function processAvailableCards() {
    const availableItems = inventoryData.filter(c => c.status === 'Available');
    const groupMap = {};

    availableItems.forEach(c => {
        const baseName = cleanCardBaseName(c.name);
        const key = baseName.toLowerCase();

        if (!groupMap[key]) {
            groupMap[key] = {
                key: key,
                name: baseName,
                nation: c.nation || '',
                set: c.set || c.set_name || 'Promo Series',
                grade: c.grade !== undefined ? c.grade : '3',
                image: c.image || '',
                items: [],
                totalCount: 0,
                jpCount: 0,
                jpFoilCount: 0,
                engCount: 0,
                engFoilCount: 0
            };
        }

        const g = groupMap[key];
        g.items.push(c);
        g.totalCount++;

        // Language check
        const lang = (c.type || c.language || 'JP').toUpperCase();
        const isEng = (lang === 'EN' || lang === 'ENG');

        // Foil check
        const isFoil = !!c.isFoil || /\bfoil\b/i.test(c.name || '') || c.foil === true || c.foil === 1 || c.foil === '1';

        if (isEng) {
            g.engCount++;
            if (isFoil) g.engFoilCount++;
        } else {
            g.jpCount++;
            if (isFoil) g.jpFoilCount++;
        }

        // Priority for image if empty
        if (!g.image && c.image) {
            g.image = c.image;
        }
        if (!g.nation && c.nation) {
            g.nation = c.nation;
        }
        if (!g.set && (c.set || c.set_name)) {
            g.set = c.set || c.set_name;
        }
    });

    // Cross-match image from masterCardsCatalog if still missing
    Object.values(groupMap).forEach(g => {
        if (!g.image || g.image.includes('placeholder')) {
            const master = masterCardsCatalog.find(m => cleanCardBaseName(m.name).toLowerCase() === g.name.toLowerCase());
            if (master && master.image) {
                g.image = master.image;
            }
        }
    });

    availableCardGroups = Object.values(groupMap);

    // Update count badge in switcher
    const countBadge = document.getElementById('availableCountBadge');
    if (countBadge) {
        countBadge.textContent = availableItems.length;
    }
}

function populateAvailableSetsFilter() {
    const sel = document.getElementById('availableFilterSet');
    if (!sel) return;
    const sets = [...new Set(availableCardGroups.map(g => g.set).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Semua Set Promo</option>' +
        sets.map(s => `<option value="${s}">${s}</option>`).join('');
}

// ─── 5. Render Available Cards Grid ───────────────────────────────────────────
function renderAvailableCards() {
    const container = document.getElementById('availableCardsGrid');
    if (!container) return;

    const q = (document.getElementById('availableSearchInput')?.value || '').toLowerCase().trim();
    const nationVal = document.getElementById('availableFilterNation')?.value || '';
    const setVal = document.getElementById('availableFilterSet')?.value || '';

    let filtered = availableCardGroups.filter(g => {
        const matchQ = !q || g.name.toLowerCase().includes(q) || (g.set && g.set.toLowerCase().includes(q));
        const matchNation = !nationVal || g.nation === nationVal ||
            (nationVal.toLowerCase().includes('elemental') && (g.nation || '').toLowerCase().includes('elemental'));
        const matchSet = !setVal || g.set === setVal;
        return matchQ && matchNation && matchSet;
    });

    // Urutkan kartu berdasarkan Nation standard
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
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 56px 16px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:0.6;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p>Tidak ada kartu available yang cocok dengan pencarian atau filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(g => {
        const imgUrl = (window.CardDB && CardDB.getImageUrl) 
            ? CardDB.getImageUrl(g.image) 
            : (g.image ? `../assets/images/cards/${g.image}` : '../assets/images/cards/placeholder_card.svg');

        const foilBadge = g.foilCount > 0 ? `<div class="owner-card-visual-foil">Foil</div>` : '';
        const qtyBadge = `<div class="available-card-qty-badge">${g.totalCount}x</div>`;

        return `
            <div class="available-card-item" onclick="openAvailableCardDetail('${encodeURIComponent(g.name)}')" title="${g.name} - Klik untuk lihat detail">
                <div class="available-card-img-wrap">
                    <img src="${imgUrl}" alt="${g.name}" loading="lazy" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                    ${qtyBadge}
                    ${foilBadge}
                </div>
            </div>
        `;
    }).join('');
}

// ─── 6. Modal: Detail Kartu Available & Last Sold ─────────────────────────────
window.openAvailableCardDetail = function(rawCardName) {
    const cardName = decodeURIComponent(rawCardName);
    const group = availableCardGroups.find(g => g.name.toLowerCase() === cardName.toLowerCase());
    if (!group) return;

    currentAvailableGroup = group;

    const modalTitle = document.getElementById('availDetailModalTitle');
    const modalSubtitle = document.getElementById('availDetailModalSubtitle');
    const modalBody = document.getElementById('availDetailModalBody');

    if (modalTitle) modalTitle.textContent = group.name;
    if (modalSubtitle) modalSubtitle.textContent = `${group.set || 'Set Promo'} · ${group.nation || 'Vanguard'} (Grade ${group.grade})`;

    // Hitung Harga Terjual Terakhir (Last Sold)
    const lastSoldInfo = determineLastSoldPrice(group.name);

    const imgUrl = (window.CardDB && CardDB.getImageUrl) 
        ? CardDB.getImageUrl(group.image) 
        : (group.image ? `../assets/images/cards/${group.image}` : '../assets/images/cards/placeholder_card.svg');

    const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    const isAdmin = !!currentUser;

    const editBtnHtml = isAdmin ? `
        <button type="button" class="btn-edit-last-sold-inline" id="btnToggleEditLastSold" onclick="toggleEditLastSoldForm()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Edit</span>
        </button>
    ` : '';

    const lastSoldFormattedPrice = lastSoldInfo.price ? UI.formatCurrency(lastSoldInfo.price) : '-';
    const lastSoldDateText = lastSoldInfo.date ? UI.formatDate(lastSoldInfo.date) : '';

    modalBody.innerHTML = `
        <div class="available-modal-layout">
            <div class="available-modal-thumb">
                <img src="${imgUrl}" alt="${group.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
            </div>

            <div class="available-modal-info">
                <div class="available-modal-header" style="margin-bottom: 16px;">
                    <h3 style="margin-bottom: 4px;">${group.name}</h3>
                    <div class="available-modal-meta-row" style="color: var(--text-muted); font-size: 0.88rem;">
                        <span>${group.set || 'Promo Series'}</span>
                        <span>·</span>
                        <span>${formatNationWithLang(group.nation, '')}</span>
                        <span>·</span>
                        <span>Gr.${group.grade}</span>
                    </div>
                </div>

                <!-- Clean Lines Stock & Last Sold Structure -->
                <div class="stock-clean-lines">
                    <div class="stock-line-item line-total">
                        <span class="stock-label">Total stock :</span>
                        <span class="stock-val">${group.totalCount}</span>
                    </div>

                    <div class="stock-divider-hr"></div>

                    <div class="stock-line-item stock-grid-row">
                        <span class="stock-col-lang">ENG : <strong>${group.engCount}</strong></span>
                        <span class="bar-sep">|</span>
                        <span class="stock-col-foil">Foil : <strong class="${group.engFoilCount > 0 ? 'text-foil' : ''}">${group.engFoilCount}</strong></span>
                    </div>

                    <div class="stock-line-item stock-grid-row">
                        <span class="stock-col-lang">JP : <strong>${group.jpCount}</strong></span>
                        <span class="bar-sep">|</span>
                        <span class="stock-col-foil">Foil : <strong class="${group.jpFoilCount > 0 ? 'text-foil' : ''}">${group.jpFoilCount}</strong></span>
                    </div>

                    <div class="stock-divider-hr"></div>

                    <div class="stock-line-item line-last-sold">
                        <div class="last-sold-price-row">
                            <span class="stock-label">Last Sold :</span>
                            <span class="stock-val last-sold-num" id="lastSoldDisplayPrice">${lastSoldFormattedPrice}</span>
                            ${editBtnHtml}
                        </div>
                        <div class="last-sold-date-simple" id="lastSoldDisplayDate">${lastSoldDateText ? `Last sold ${lastSoldDateText}` : ''}</div>
                    </div>

                    <!-- Inline Form Edit Last Sold (Khusus Admin) -->
                    ${isAdmin ? `
                        <form id="formEditLastSold" class="last-sold-inline-edit" style="display: none;" onsubmit="saveCustomLastSoldPrice(event)">
                            <div style="flex:1;">
                                <input type="text" id="inputLastSoldPrice" class="currency-input" placeholder="0" value="${lastSoldInfo.price || ''}" required />
                            </div>
                            <button type="submit" class="btn-primary btn-sm" id="btnSaveLastSold">Simpan</button>
                            <button type="button" class="btn-ghost btn-sm" onclick="toggleEditLastSoldForm(false)">Batal</button>
                        </form>
                    ` : ''}
                </div>

            </div>
        </div>
    `;

    openModal('modalAvailableCardDetail');
};

function determineLastSoldPrice(cardName) {
    const baseName = cleanCardBaseName(cardName);

    // 1. Prioritas utama: jika admin sudah menetapkan harga custom di card_last_sold
    if (lastSoldPriceMap && lastSoldPriceMap[baseName] !== undefined) {
        const val = lastSoldPriceMap[baseName];
        const price = (typeof val === 'object' && val !== null) ? Number(val.price) : Number(val);
        const date = (typeof val === 'object' && val !== null) ? (val.updated_at || null) : null;
        if (price > 0) {
            return {
                price: price,
                date: date
            };
        }
    }

    // 2. Prioritas kedua: cari transaksi penjualan riil di inventory (Completed, Waiting Payment, Waiting Shipment, Sold)
    const soldCards = inventoryData.filter(c => {
        const matchesName = cleanCardBaseName(c.name).toLowerCase() === baseName.toLowerCase();
        const hasPrice = Number(c.price) > 0;
        const isSoldStatus = ['Completed', 'Waiting Payment', 'Waiting Shipment', 'Sold'].includes(c.status);
        return matchesName && hasPrice && isSoldStatus;
    });

    if (soldCards.length > 0) {
        // Urutkan tanggal jual terbaru dulu
        soldCards.sort((a, b) => new Date(b.soldDate || b.date || 0) - new Date(a.soldDate || a.date || 0));
        const latestSold = soldCards[0];
        return {
            price: Number(latestSold.price),
            date: latestSold.soldDate || latestSold.date || null
        };
    }

    return {
        price: null,
        date: null
    };
}

window.toggleEditLastSoldForm = function(show) {
    const form = document.getElementById('formEditLastSold');
    const btn = document.getElementById('btnToggleEditLastSold');
    if (!form) return;

    const isCurrentlyHidden = form.style.display === 'none';
    const shouldShow = (show !== undefined) ? show : isCurrentlyHidden;

    form.style.display = shouldShow ? 'flex' : 'none';
    if (btn) btn.style.display = shouldShow ? 'none' : 'inline-flex';

    if (shouldShow) {
        const input = document.getElementById('inputLastSoldPrice');
        if (input) {
            input.focus();
            input.select();
        }
    }
};

window.saveCustomLastSoldPrice = async function(e) {
    e.preventDefault();
    if (!currentAvailableGroup) return;

    const input = document.getElementById('inputLastSoldPrice');
    const saveBtn = document.getElementById('btnSaveLastSold');
    if (!input) return;

    const rawVal = input.value.replace(/[^0-9]/g, '');
    const price = Number(rawVal) || 0;

    if (price <= 0) {
        UI.showToast('Masukkan nominal harga yang valid', 'error');
        return;
    }

    if (saveBtn) saveBtn.disabled = true;

    try {
        const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
        await API.request('saveLastSoldPrice', {
            card_name: currentAvailableGroup.name,
            price: price,
            user: currentUser ? currentUser.name : 'Admin'
        });

        const now = new Date();
        // Update local map with price and updated_at
        lastSoldPriceMap[currentAvailableGroup.name] = {
            price: price,
            updated_at: now.toISOString()
        };

        // Update UI in modal
        const displayEl = document.getElementById('lastSoldDisplayPrice');
        const dateEl = document.getElementById('lastSoldDisplayDate');
        if (displayEl) displayEl.textContent = UI.formatCurrency(price);
        if (dateEl) dateEl.textContent = `Last sold ${UI.formatDate(now)}`;

        toggleEditLastSoldForm(false);
        UI.showToast(`Harga last sold untuk "${currentAvailableGroup.name}" berhasil disimpan!`, 'success');

    } catch (err) {
        console.error('Save last sold error:', err);
        UI.showToast('Gagal menyimpan harga last sold', 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
};

// ─── 7. Render Owners Tab (Semua Pemilik Langsung Ditampilkan) ────────────────
function renderPublicOwners() {
    const search = (document.getElementById('publicOwnerSearch')?.value || '').toLowerCase().trim();
    const container = document.getElementById('publicOwnerResults');
    if (!container) return;

    const map = {};
    inventoryData.forEach(card => {
        const ownerName = card.owner || 'Anonim';
        if (!map[ownerName]) {
            map[ownerName] = { 
                name: ownerName, 
                total: 0, 
                available: 0, 
                sold: 0, 
                shipment: 0, 
                payment: 0, 
                completed: 0, 
                cards: [] 
            };
        }
        const o = map[ownerName];
        o.total++;
        o.cards.push(card);
        if (['Available','Auction'].includes(card.status)) o.available++;
        if (card.status === 'Sold') o.sold++;
        if (['Waiting Shipment', 'Shipped'].includes(card.status)) o.shipment++;
        if (card.status === 'Waiting Payment') o.payment++;
        if (card.status === 'Completed') o.completed++;
    });

    let owners = Object.values(map);

    // Update count badge in switcher
    const countBadge = document.getElementById('ownersCountBadge');
    if (countBadge) {
        countBadge.textContent = owners.length;
    }

    // Filter by search input jika ada teks
    if (search.length > 0) {
        owners = owners.filter(o => o.name.toLowerCase().includes(search));
    }

    // Urutkan pemilik: yang memiliki kartu aktif / total terbanyak dulu
    owners.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    if (!owners.length) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 56px 16px;">
                <p>Tidak ada pemilik kartu ditemukan dengan kata kunci "${search}".</p>
            </div>
        `;
        return;
    }

    container.innerHTML = owners.map(o => {
        const initial = o.name.charAt(0).toUpperCase();

        return `
            <div class="public-owner-card-modern" onclick="openPublicOwnerDetail('${encodeURIComponent(o.name)}')">
                <div class="public-owner-avatar-circle">${initial}</div>
                <div class="public-owner-info-col">
                    <div class="public-owner-name-row">
                        <div class="public-owner-title">${o.name}</div>
                        <span class="public-owner-total-text">${o.total} kartu</span>
                    </div>
                    <div class="public-owner-pill-badges">
                        <span class="status-badge status-available" style="font-size:0.68rem; padding:2px 7px;">${o.available} Available</span>
                        ${o.shipment > 0 ? `<span class="status-badge status-waiting-shipment" style="font-size:0.68rem; padding:2px 7px;">${o.shipment} Kirim</span>` : ''}
                        ${o.payment > 0 ? `<span class="status-badge status-waiting-payment" style="font-size:0.68rem; padding:2px 7px;">${o.payment} Bayar</span>` : ''}
                        ${o.completed > 0 ? `<span class="status-badge status-completed" style="font-size:0.68rem; padding:2px 7px;">${o.completed} Selesai</span>` : ''}
                    </div>
                </div>
                <svg class="public-owner-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>
        `;
    }).join('');
}

// ─── 8. Owner Detail Modal (Public) ──────────────────────────────────────────
let currentPublicOwnerCards = [];
let currentPublicFilterTab = 'available';

const PUBLIC_STATUS_TABS = [
    { id: 'available', label: 'Available', filter: c => ['Available', 'Auction'].includes(c.status) },
    { id: 'shipment', label: 'Waiting Shipment', filter: c => ['Waiting Shipment', 'Shipped'].includes(c.status) },
    { id: 'payment', label: 'Waiting Payment', filter: c => c.status === 'Waiting Payment' },
    { id: 'completed', label: 'Completed', filter: c => c.status === 'Completed' }
];

window.openPublicOwnerDetail = function(rawOwnerName) {
    const ownerName = decodeURIComponent(rawOwnerName);
    currentPublicOwnerCards = inventoryData.filter(c => c.owner === ownerName);
    currentPublicFilterTab = 'available';

    document.getElementById('publicOwnerDetailName').textContent = ownerName;
    const totalEl = document.getElementById('publicOwnerDetailTotal');
    if (totalEl) totalEl.textContent = `${currentPublicOwnerCards.length} kartu total konsinyasi`;

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
            <button type="button" class="owner-status-tab-btn ${isActive ? 'active' : ''}" onclick="setPublicOwnerFilterTab('${tab.id}')">
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
        grid.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada kartu untuk status ini.</p>';
        return;
    }

    // Group identical cards
    const grouped = [];
    filtered.forEach(c => {
        const normName = (c.name || '').trim().toLowerCase();
        const normLang = (c.type || c.language || 'JP').toUpperCase();
        const normStatus = (c.status || '').trim().toLowerCase();
        const key = `${normName}___${normLang}___${normStatus}`;
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
        const imgUrl = (window.CardDB && CardDB.getImageUrl) 
            ? CardDB.getImageUrl(c.image) 
            : (c.image ? `../assets/images/cards/${c.image}` : '../assets/images/cards/placeholder_card.svg');
        const isFoil = c.isFoil || /\bfoil\b/i.test(c.name || '');

        return `
            <div class="owner-card-visual-item" onclick="openPublicCardDetail('${c.id}')" title="Klik untuk lihat detail">
                <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                ${c.count > 1 ? `<div class="owner-card-visual-qty">${c.count}x</div>` : ''}
                ${isFoil ? `<div class="owner-card-visual-foil">Foil</div>` : ''}
            </div>
        `;
    }).join('');
}

window.openPublicCardDetail = function(cardId) {
    const card = currentPublicOwnerCards.find(c => String(c.id) === String(cardId)) || inventoryData.find(c => String(c.id) === String(cardId));
    if (!card) return;

    const sc = UI.statusClass(card.status);
    const imgUrl = (window.CardDB && CardDB.getImageUrl) 
        ? CardDB.getImageUrl(card.image) 
        : (card.image ? `../assets/images/cards/${card.image}` : '../assets/images/cards/placeholder_card.svg');

    let metaRows = `
        <div class="owner-card-detail-row">
            <span class="label">Nation</span>
            <span class="value">${formatNationWithLang(card.nation, card.type)}</span>
        </div>
        <div class="owner-card-detail-row">
            <span class="label">Set Promo</span>
            <span class="value">${card.set || card.set_name || '–'}</span>
        </div>
        <div class="owner-card-detail-row">
            <span class="label">Grade</span>
            <span class="value">Grade ${card.grade !== undefined ? card.grade : '3'}</span>
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
    if (card.price && ['Sold', 'Waiting Shipment', 'Waiting Payment', 'Completed'].includes(card.status)) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">Harga Jual</span>
                <span class="value" style="color:#38bdf8; font-weight:700;">${UI.formatCurrency(card.price)}</span>
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
    if (card.trackingNumber) {
        metaRows += `
            <div class="owner-card-detail-row">
                <span class="label">No. Resi</span>
                <span class="value">${card.trackingNumber}</span>
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
                <span class="value" style="color: #f59e0b; font-weight:700;">Menunggu pembayaran ke pemilik</span>
            </div>
        `;
    }

    document.getElementById('publicCardDetailTitle').textContent = card.name || 'Detail Kartu';
    document.getElementById('publicCardDetailBody').innerHTML = `
        <div class="owner-card-detail-layout">
            <div class="owner-card-detail-thumb">
                <img src="${imgUrl}" alt="${card.name || 'Kartu'}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
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

// ─── 9. Filter Listeners & Interactions ───────────────────────────────────────
function initFilterListeners() {
    // Available filters
    const searchAvail = document.getElementById('availableSearchInput');
    const nationAvail = document.getElementById('availableFilterNation');
    const setAvail = document.getElementById('availableFilterSet');
    const resetAvail = document.getElementById('availableResetBtn');

    [searchAvail, nationAvail, setAvail].forEach(el => {
        if (el) {
            el.addEventListener('input', renderAvailableCards);
            el.addEventListener('change', renderAvailableCards);
        }
    });

    if (resetAvail) {
        resetAvail.addEventListener('click', () => {
            if (searchAvail) searchAvail.value = '';
            if (nationAvail) nationAvail.value = '';
            if (setAvail) setAvail.value = '';
            renderAvailableCards();
        });
    }

    // Owners search input
    const searchOwner = document.getElementById('publicOwnerSearch');
    if (searchOwner) {
        searchOwner.addEventListener('input', renderPublicOwners);
    }
}

// ─── 10. Google Sign-In & Auth Handling ───────────────────────────────────────
window.handleGoogleLoginResponse = async function(response) {
    const errorDiv = document.getElementById('loginError');
    const errorMsg = document.getElementById('loginErrorMsg');
    const spinner = document.getElementById('loginSpinner');

    if (!response || !response.credential) {
        if (errorDiv) {
            errorDiv.classList.remove('hidden');
            errorMsg.textContent = 'Gagal menerima kredensial akun dari Google.';
        }
        return;
    }

    if (errorDiv) errorDiv.classList.add('hidden');
    if (spinner) spinner.classList.remove('hidden');

    try {
        await Auth.googleLogin(response.credential);
        UI.showToast('Login berhasil! Mengalihkan ke dashboard...', 'success');
        closeModal('modalAdminLogin');
        renderNavAuthArea();

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 600);

    } catch (err) {
        if (errorDiv) {
            errorDiv.classList.remove('hidden');
            errorMsg.textContent = err.message || 'Login dengan Google gagal.';
        }
        if (spinner) spinner.classList.add('hidden');
    }
};

function initGoogleSignIn() {
    const clientId = (typeof CONFIG !== 'undefined' && CONFIG.GOOGLE_CLIENT_ID) 
        ? CONFIG.GOOGLE_CLIENT_ID 
        : '711651834929-ijkh41k8k47jaaags97dp8tiohipgji2.apps.googleusercontent.com';

    let attempts = 0;
    function render() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            try {
                google.accounts.id.initialize({
                    client_id: clientId,
                    callback: window.handleGoogleLoginResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                const container = document.getElementById('googleSignInBtn');
                if (container) {
                    container.innerHTML = '';
                    google.accounts.id.renderButton(container, {
                        type: 'standard',
                        theme: 'filled_blue',
                        size: 'large',
                        text: 'signin_with',
                        shape: 'pill',
                        logo_alignment: 'left',
                        width: '280'
                    });
                }
            } catch(e) {
                console.warn('Google Sign-In initialization:', e);
            }
        } else if (attempts < 25) {
            attempts++;
            setTimeout(render, 250);
        }
    }
    render();
}

// ─── 11. Modal Helpers ────────────────────────────────────────────────────────
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

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── 12. Public Season Leaderboard (Landing Page) ─────────────────────────────
let publicLeaderboardData = null;
let publicLeaderboardLoaded = false;

async function loadPublicLeaderboard() {
    const podiumEl = document.getElementById('publicSeasonPodium');
    const tableBody = document.getElementById('publicSeasonTableBody');
    if (!publicLeaderboardLoaded) {
        if (podiumEl) {
            podiumEl.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 36px; color: var(--text-muted);">
                    <div class="spinner-sm" style="margin: 0 auto 8px;"></div>
                    Memuat klasemen season...
                </div>
            `;
        }
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
                        <div class="spinner-sm" style="margin: 0 auto 8px;"></div>
                        Memuat data klasemen...
                    </td>
                </tr>
            `;
        }
    }

    try {
        const res = await API.request('getActiveSeasonLeaderboard');
        publicLeaderboardData = res || {};
        publicLeaderboardLoaded = true;

        const titleEl = document.getElementById('publicSeasonTitle');
        const headingEl = document.getElementById('publicSeasonTableHeading');
        if (titleEl && res?.season_name) titleEl.textContent = `Klasemen ${res.season_name}`;
        if (headingEl && res?.season_name) headingEl.textContent = `Peringkat Klasemen (${res.season_name})`;

        // Update header bulan
        const months = res?.months || [];
        if (months[0]) document.getElementById('thPublicMonth1').textContent = months[0].name;
        if (months[1]) document.getElementById('thPublicMonth2').textContent = months[1].name;
        if (months[2]) document.getElementById('thPublicMonth3').textContent = months[2].name;

        renderPublicPodium(res?.leaderboard || []);
        renderPublicLeaderboardTable();

        // Bind search input
        const searchInput = document.getElementById('publicLeaderboardSearch');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = 'true';
            searchInput.addEventListener('input', (e) => {
                renderPublicLeaderboardTable(e.target.value.toLowerCase().trim());
            });
        }
    } catch (err) {
        console.error('Error loadPublicLeaderboard:', err);
        if (podiumEl) podiumEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 24px;">Gagal memuat klasemen season: ${err.message}</div>`;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 24px;">Gagal memuat klasemen</td></tr>`;
    }
}

function renderPublicPodium(list) {
    const container = document.getElementById('publicSeasonPodium');
    if (!container) return;

    if (!list || !list.length) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 24px; color: var(--text-muted); background: rgba(15,23,42,0.4); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.08);">
                Belum ada turnamen tersimpan pada season berjalan saat ini.
            </div>
        `;
        return;
    }

    const renderCard = (rank, classColor) => {
        const p = list[rank - 1];
        if (!p) {
            return `
                <div class="landing-podium-card ${classColor}">
                    <span class="landing-podium-badge">Peringkat ${rank}</span>
                    <div class="landing-podium-name" style="color: var(--text-muted);">&mdash;</div>
                    <div class="landing-podium-pts">0 <span style="font-size:0.9rem;">Pt</span></div>
                    <div class="landing-podium-meta">Belum ada pemain</div>
                </div>
            `;
        }

        return `
            <div class="landing-podium-card ${classColor}">
                <span class="landing-podium-badge">Peringkat ${rank}</span>
                <div class="landing-podium-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
                <div class="landing-podium-pts">${p.total_season_points} <span style="font-size:0.9rem; color: var(--text-muted);">Pt</span></div>
                <div class="landing-podium-meta">${p.tournaments_played || 0}x Main</div>
            </div>
        `;
    };

    container.innerHTML = `
        ${renderCard(1, 'r1')}
        ${renderCard(2, 'r2')}
        ${renderCard(3, 'r3')}
    `;
}

function renderPublicLeaderboardTable(search = '') {
    const tbody = document.getElementById('publicSeasonTableBody');
    if (!tbody) return;

    const list = publicLeaderboardData?.leaderboard || [];
    const months = publicLeaderboardData?.months || [];
    const m1 = months[0]?.number;
    const m2 = months[1]?.number;
    const m3 = months[2]?.number;

    const filtered = search ? list.filter(p => p.name.toLowerCase().includes(search)) : list;

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    ${search ? `Tidak ada pemain dengan nama "${search}".` : 'Belum ada data klasemen untuk season ini.'}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const p1 = p.month_points?.[m1] || 0;
        const p2 = p.month_points?.[m2] || 0;
        const p3 = p.month_points?.[m3] || 0;
        const rankClass = p.rank === 1 ? 'rank-1' : (p.rank === 2 ? 'rank-2' : (p.rank === 3 ? 'rank-3' : ''));
        const trendHtml = renderPublicTrendBadge(p);

        return `
            <tr>
                <td style="text-align: center;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="slot-rank-num ${rankClass}" style="width: 26px; height: 26px; font-size: 0.8rem;">${p.rank}</span>
                        ${trendHtml}
                    </div>
                </td>
                <td>
                    <strong style="color: #f8fafc; font-size: 0.88rem;">${escapeHtml(p.name)}</strong>
                </td>
                <td style="text-align: center;">
                    <span class="week-pts-pill ${p1 > 0 ? 'has-pts' : ''}">${p1}</span>
                </td>
                <td style="text-align: center;">
                    <span class="week-pts-pill ${p2 > 0 ? 'has-pts' : ''}">${p2}</span>
                </td>
                <td style="text-align: center;">
                    <span class="week-pts-pill ${p3 > 0 ? 'has-pts' : ''}">${p3}</span>
                </td>
                <td style="text-align: right;">
                    <span class="total-pts-badge">${p.total_season_points}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 2px;">Pt</span>
                </td>
                <td style="text-align: center; color: var(--text-muted); font-weight: 600;">
                    ${p.tournaments_played || 0}x
                </td>
            </tr>
        `;
    }).join('');
}

function renderPublicTrendBadge(player) {
    if (!player) return `<span class="trend-pill same">&mdash;</span>`;
    const direction = player.trend_type || 'same';
    const diff = player.trend_value || 0;

    if (direction === 'up') {
        const diffText = diff > 0 ? ` ${diff}` : '';
        return `
            <span class="trend-pill up" title="Naik ${diff} peringkat">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>${diffText}
            </span>
        `;
    }

    if (direction === 'down') {
        const diffText = diff > 0 ? ` ${diff}` : '';
        return `
            <span class="trend-pill down" title="Turun ${diff} peringkat">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l8-8h-6v-8h-4v8h-6z"/></svg>${diffText}
            </span>
        `;
    }

    return `<span class="trend-pill same" title="Peringkat tetap">&mdash;</span>`;
}
