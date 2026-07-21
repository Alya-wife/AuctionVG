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
            ${a.fbUrl ? `<a href="${a.fbUrl}" target="_blank" class="btn-link text-sm">🔗 Lihat Post Facebook</a>` : ''}
            ${status === 'Active' ? `<button class="btn-primary" style="width:100%;justify-content:center;margin-top:8px;" onclick="openFinishModal('${a.id}')">Selesaikan Lelang</button>` : 
            `<div class="text-sm text-muted">Terjual: ${a.results?.filter(r=>r.sold).length||0}/${a.cardIds?.length||0}</div>`}
        </div>`).join('')}</div>`;
}

function initNewAuctionModal() {
    document.getElementById('btnNewAuction').addEventListener('click', async () => {
        document.getElementById('newAuctionForm').reset();
        selectedAuctionCards = [];
        updateSelectedUI();
        document.getElementById('cardPickerList').innerHTML = '<div class="loading-state-sm"><div class="spinner-sm"></div></div>';
        UI.openModal('modalNewAuction');

        const inv = await API.request('getInventory');
        availableCards = inv.filter(c => c.status === 'Available');
        renderPicker(availableCards);
    });

    document.getElementById('cancelNewAuctionBtn').addEventListener('click', () => UI.closeModal('modalNewAuction'));

    document.getElementById('cardPickerSearch').addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        renderPicker(availableCards.filter(c => c.name.toLowerCase().includes(term) || c.owner.toLowerCase().includes(term)));
    });

    document.getElementById('newAuctionForm').addEventListener('submit', async e => {
        e.preventDefault();
        if (!selectedAuctionCards.length) { UI.showToast('Pilih minimal 1 kartu', 'error'); return; }
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            await API.request('saveAuction', { fbUrl: document.getElementById('auctionFbUrl').value, cardIds: selectedAuctionCards.map(c => c.id) });
            UI.showToast('Lelang dibuat');
            UI.closeModal('modalNewAuction');
            loadAuctions();
        } catch { UI.showToast('Gagal membuat lelang', 'error'); }
        finally { btn.disabled = false; }
    });
}

function renderPicker(cards) {
    const list = document.getElementById('cardPickerList');
    if (!cards.length) { list.innerHTML = '<div class="empty-state" style="padding:16px;font-size:.9rem;">Tidak ada kartu tersedia</div>'; return; }
    list.innerHTML = cards.map(c => {
        const sel = selectedAuctionCards.some(s => s.id === c.id);
        return `<div class="picker-item ${sel ? 'selected' : ''}" onclick="togglePick('${c.id}')">
            <div>
                <div style="font-weight:600">${c.name}</div>
                <div class="text-sm text-muted">${c.nation} · ${c.owner}</div>
            </div>
            ${sel ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : '<div class="pick-check"></div>'}
        </div>`;
    }).join('');
}

window.togglePick = function(id) {
    const card = availableCards.find(c => c.id === id);
    if (!card) return;
    const idx = selectedAuctionCards.findIndex(c => c.id === id);
    idx === -1 ? selectedAuctionCards.push(card) : selectedAuctionCards.splice(idx, 1);
    const term = document.getElementById('cardPickerSearch').value.toLowerCase();
    renderPicker(availableCards.filter(c => c.name.toLowerCase().includes(term) || c.owner.toLowerCase().includes(term)));
    updateSelectedUI();
};

function updateSelectedUI() {
    document.getElementById('selectedCount').textContent = selectedAuctionCards.length;
    document.getElementById('selectedCardsList').innerHTML = selectedAuctionCards.map(c =>
        `<span class="tag">${c.name} <button type="button" onclick="togglePick('${c.id}')">&times;</button></span>`
    ).join('');
}

window.openFinishModal = async function(id) {
    currentFinishId = id;
    const auc = allAuctions.find(a => a.id === id);
    const list = document.getElementById('auctionResultList');
    list.innerHTML = '<div class="loading-state-sm"><div class="spinner-sm"></div></div>';
    UI.openModal('modalFinishAuction');

    const inv = await API.request('getInventory');
    currentFinishCards = (auc.cardIds || []).map(cid => inv.find(c => c.id === cid)).filter(Boolean);

    list.innerHTML = currentFinishCards.map(c => `
        <div class="result-item">
            <div style="font-weight:600;margin-bottom:8px;">${c.name} <span class="text-sm text-muted">(${c.owner})</span></div>
            <div style="display:flex;gap:16px;margin-bottom:8px;">
                <label><input type="radio" name="res_${c.id}" value="sold" onchange="toggleResultInputs('${c.id}',true)"> Terjual</label>
                <label><input type="radio" name="res_${c.id}" value="unsold" checked onchange="toggleResultInputs('${c.id}',false)"> Tidak Terjual</label>
            </div>
            <div id="inputs_${c.id}" style="display:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;display:none">
                <div><label class="form-label-sm">Pembeli</label><input type="text" id="buyer_${c.id}" class="input-sm" placeholder="Nama pembeli"></div>
                <div><label class="form-label-sm">Harga</label><input type="number" id="price_${c.id}" class="input-sm" placeholder="Harga jual"></div>
            </div>
        </div>`).join('');
};

window.toggleResultInputs = function(id, show) {
    document.getElementById(`inputs_${id}`).style.display = show ? 'grid' : 'none';
};

async function confirmFinish() {
    if (!currentFinishId) return;
    const results = [];
    let valid = true;

    currentFinishCards.forEach(c => {
        const isSold = document.querySelector(`input[name="res_${c.id}"]:checked`)?.value === 'sold';
        if (isSold) {
            const buyer = document.getElementById(`buyer_${c.id}`).value;
            const price = document.getElementById(`price_${c.id}`).value;
            if (!buyer || !price) { valid = false; return; }
            results.push({ cardId: c.id, sold: true, buyer, price: parseInt(price) });
        } else {
            results.push({ cardId: c.id, sold: false });
        }
    });

    if (!valid) { UI.showToast('Lengkapi data pembeli dan harga', 'error'); return; }

    const btn = document.getElementById('confirmFinishBtn');
    btn.disabled = true;
    try {
        await API.request('finishAuction', { auctionId: currentFinishId, results });
        UI.showToast('Lelang selesai');
        UI.closeModal('modalFinishAuction');
        loadAuctions();
    } catch { UI.showToast('Gagal', 'error'); }
    finally { btn.disabled = false; }
}
