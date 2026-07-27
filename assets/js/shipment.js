/**
 * shipment.js – Halaman Pengiriman (Single & Batch)
 * 
 * Fitur:
 *  - Tabel dengan checkbox per baris
 *  - Toolbar: counter, Pilih Semua, tombol Kirim Batch
 *  - Single: klik "Konfirmasi Kirim" per baris → modal 1 kartu
 *  - Batch: centang beberapa kartu → Kirim Batch → 1 resi untuk semua
 */

let shipCards   = [];     // semua kartu Waiting Shipment
let selectedIds = new Set(); // ID kartu yang dicentang

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    load();
    initSingleForm();
    initBatchForm();
    initToolbar();
    initFilters();
});

// ─── Load Data ────────────────────────────────────────────────────────────────
async function load() {
    const container = document.getElementById('shipmentList');
    try {
        const inv = await API.request('getInventory');
        shipCards = inv.filter(c => c.status === 'Waiting Shipment');
        selectedIds.clear();
        updateToolbar();
        populateFilterOptions();
        applyFilters();
    } catch {
        UI.showToast('Gagal memuat data pengiriman', 'error');
    }
}

// ─── Filter Options ───────────────────────────────────────────────────────────
function populateFilterOptions() {
    const ownerSel = document.getElementById('shipFilterOwner');
    const buyerSel = document.getElementById('shipFilterBuyer');

    const owners = [...new Set(shipCards.map(c => c.owner).filter(Boolean))].sort();
    const buyers = [...new Set(shipCards.map(c => c.buyer).filter(Boolean))].sort();

    const savedOwner = ownerSel.value;
    const savedBuyer = buyerSel.value;

    ownerSel.innerHTML = '<option value="">Semua Pemilik</option>' +
        owners.map(o => `<option value="${o}"${o === savedOwner ? ' selected' : ''}>${o}</option>`).join('');
    buyerSel.innerHTML = '<option value="">Semua Pembeli</option>' +
        buyers.map(b => `<option value="${b}"${b === savedBuyer ? ' selected' : ''}>${b}</option>`).join('');
}

function initFilters() {
    document.getElementById('shipFilterOwner').addEventListener('change', applyFilters);
    document.getElementById('shipFilterBuyer').addEventListener('change', applyFilters);
    document.getElementById('shipFilterSearch').addEventListener('input', applyFilters);
    document.getElementById('shipBtnClearFilter').addEventListener('click', () => {
        document.getElementById('shipFilterOwner').value = '';
        document.getElementById('shipFilterBuyer').value = '';
        document.getElementById('shipFilterSearch').value = '';
        applyFilters();
    });
}

function applyFilters() {
    const owner  = document.getElementById('shipFilterOwner').value;
    const buyer  = document.getElementById('shipFilterBuyer').value;
    const search = document.getElementById('shipFilterSearch').value.toLowerCase().trim();

    const filtered = shipCards.filter(c => {
        if (owner  && c.owner !== owner)  return false;
        if (buyer  && c.buyer !== buyer)  return false;
        if (search && !c.name.toLowerCase().includes(search)) return false;
        return true;
    });

    // Uncheck items no longer visible
    const visibleIds = new Set(filtered.map(c => c.id));
    for (const id of [...selectedIds]) {
        if (!visibleIds.has(id)) selectedIds.delete(id);
    }

    const container = document.getElementById('shipmentList');
    if (!shipCards.length) {
        document.getElementById('batchToolbar').style.display = 'none';
        container.innerHTML = '<p class="empty-msg" style="padding:40px;text-align:center;">Tidak ada kartu menunggu pengiriman.</p>';
        return;
    }
    document.getElementById('batchToolbar').style.display = 'flex';

    if (!filtered.length) {
        container.innerHTML = '<p class="empty-msg" style="padding:40px;text-align:center;">Tidak ada kartu yang cocok dengan filter.</p>';
        updateToolbar();
        return;
    }

    renderTable(container, filtered);
    updateToolbar();
}

// ─── Render Tabel ─────────────────────────────────────────────────────────────
function renderTable(container, cards) {
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th class="col-check">
                        <input type="checkbox" class="check-all-box" id="checkAll" title="Pilih semua" />
                    </th>
                    <th>Kartu</th>
                    <th>Pemilik</th>
                    <th>Pembeli</th>
                    <th>Tgl Jual</th>
                    <th>Harga</th>
                    <th style="text-align:right">Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${cards.map(c => `
                <tr id="row-${c.id}">
                    <td class="col-check">
                        <input type="checkbox" class="ship-checkbox" data-id="${c.id}" />
                    </td>
                    <td>
                        <div style="font-weight:600">${c.name}</div>
                        <div class="text-sm text-muted">${c.nation}</div>
                    </td>
                    <td>${c.owner}</td>
                    <td>${c.buyer || '-'}</td>
                    <td>${UI.formatDate(c.soldDate)}</td>
                    <td>${c.price ? UI.formatCurrency(c.price) : '-'}</td>
                    <td style="text-align:right">
                        <button class="btn-primary btn-sm" onclick="openShipModal('${c.id}')">
                            Konfirmasi Kirim
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    // Event: checkbox per baris
    container.querySelectorAll('.ship-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.id;
            if (cb.checked) {
                selectedIds.add(id);
                document.getElementById(`row-${id}`)?.classList.add('row-selected');
            } else {
                selectedIds.delete(id);
                document.getElementById(`row-${id}`)?.classList.remove('row-selected');
            }
            syncCheckAll();
            updateToolbar();
        });
    });

    // Event: check-all
    const checkAll = document.getElementById('checkAll');
    checkAll?.addEventListener('change', () => {
        const checked = checkAll.checked;
        container.querySelectorAll('.ship-checkbox').forEach(cb => {
            cb.checked = checked;
            const id = cb.dataset.id;
            if (checked) {
                selectedIds.add(id);
                document.getElementById(`row-${id}`)?.classList.add('row-selected');
            } else {
                selectedIds.delete(id);
                document.getElementById(`row-${id}`)?.classList.remove('row-selected');
            }
        });
        updateToolbar();
    });
}

// Sinkronkan status checkbox "Pilih Semua" di header
function syncCheckAll() {
    const checkAll  = document.getElementById('checkAll');
    const allBoxes  = document.querySelectorAll('.ship-checkbox');
    if (!checkAll || !allBoxes.length) return;
    const total   = allBoxes.length;
    const checked = [...allBoxes].filter(cb => cb.checked).length;
    checkAll.checked       = checked === total;
    checkAll.indeterminate = checked > 0 && checked < total;
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function initToolbar() {
    // "Pilih Semua" button di toolbar
    document.getElementById('btnSelectAll')?.addEventListener('click', () => {
        const allBoxes = document.querySelectorAll('.ship-checkbox');
        const allChecked = [...allBoxes].every(cb => cb.checked);
        allBoxes.forEach(cb => {
            cb.checked = !allChecked;
            const id = cb.dataset.id;
            if (!allChecked) {
                selectedIds.add(id);
                document.getElementById(`row-${id}`)?.classList.add('row-selected');
            } else {
                selectedIds.delete(id);
                document.getElementById(`row-${id}`)?.classList.remove('row-selected');
            }
        });
        const checkAll = document.getElementById('checkAll');
        if (checkAll) checkAll.checked = !allChecked;
        updateToolbar();
    });

    // "Kirim Batch" button
    document.getElementById('btnBatchShip')?.addEventListener('click', openBatchModal);
}

function updateToolbar() {
    const count   = selectedIds.size;
    const countEl = document.getElementById('selectedCount');
    const shipBtn = document.getElementById('btnBatchShip');
    const selAllBtn = document.getElementById('btnSelectAll');

    if (countEl) countEl.textContent = count;
    if (shipBtn) shipBtn.disabled = count < 2; // batch minimal 2 kartu; 1 kartu pakai tombol per baris

    // Ubah teks Pilih Semua ↔ Batal Pilih
    if (selAllBtn) {
        const totalAvail = document.querySelectorAll('.ship-checkbox').length;
        selAllBtn.textContent = (count === totalAvail && totalAvail > 0) ? 'Batal Pilih' : 'Pilih Semua';
    }
}

// ─── Single Shipment ──────────────────────────────────────────────────────────
function initSingleForm() {
    document.getElementById('cancelShipBtn')?.addEventListener('click', () => UI.closeModal('modalShipment'));
    document.getElementById('shipmentForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            await API.request('updateCardStatus', {
                id:     document.getElementById('shipCardId').value,
                status: 'Waiting Payment',
                extra: {
                    shipDate:       document.getElementById('shipDate').value,
                    trackingNumber: document.getElementById('shipTracking').value
                }
            });
            UI.showToast('Pengiriman dikonfirmasi ✓');
            UI.closeModal('modalShipment');
            load();
        } catch {
            UI.showToast('Gagal mengkonfirmasi pengiriman', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

window.openShipModal = function(id) {
    const c = shipCards.find(c => c.id === id);
    if (!c) return;
    document.getElementById('shipmentForm').reset();
    document.getElementById('shipCardId').value       = c.id;
    document.getElementById('shipCardName').textContent = c.name;
    document.getElementById('shipBuyer').value        = c.buyer || '';
    document.getElementById('shipDate').value         = new Date().toISOString().split('T')[0];
    UI.openModal('modalShipment');
};

// ─── Batch Shipment ───────────────────────────────────────────────────────────
function initBatchForm() {
    document.getElementById('cancelBatchShipBtn')?.addEventListener('click', () => UI.closeModal('modalBatchShipment'));
    document.getElementById('batchShipForm')?.addEventListener('submit', handleBatchSubmit);
}

function openBatchModal() {
    if (selectedIds.size < 2) {
        UI.showToast('Pilih minimal 2 kartu untuk pengiriman batch', 'error');
        return;
    }

    const selected = shipCards.filter(c => selectedIds.has(c.id));

    // Render daftar kartu dalam modal
    const listEl = document.getElementById('batchCardList');
    listEl.innerHTML = selected.map(c => `
        <div class="batch-card-item">
            <div>
                <div class="bci-name">${c.name} <span style="color:var(--text-secondary);font-size:.75rem">(${c.nation})</span></div>
                <div class="bci-buyer">Pembeli: ${c.buyer || '-'}</div>
            </div>
            <div class="bci-price">${c.price ? UI.formatCurrency(c.price) : '-'}</div>
        </div>`).join('');

    const noteEl = document.getElementById('batchSummaryNote');
    noteEl.textContent = `${selected.length} kartu akan dikirim dalam 1 paket dengan resi yang sama.`;

    // Reset & isi tanggal
    document.getElementById('batchShipForm').reset();
    document.getElementById('batchShipDate').value = new Date().toISOString().split('T')[0];

    UI.openModal('modalBatchShipment');
}

async function handleBatchSubmit(e) {
    e.preventDefault();
    const btn        = document.getElementById('batchShipSubmitBtn');
    const shipDate   = document.getElementById('batchShipDate').value;
    const tracking   = document.getElementById('batchShipTracking').value.trim();
    const ids        = [...selectedIds];

    if (!tracking) { UI.showToast('Masukkan nomor resi', 'error'); return; }
    btn.disabled = true;

    try {
        // Coba pakai batchUpdateCardStatus jika tersedia, fallback ke loop
        try {
            await API.request('batchUpdateCardStatus', {
                ids,
                status: 'Waiting Payment',
                extra: { shipDate, trackingNumber: tracking }
            });
        } catch (batchErr) {
            // Jika endpoint batch belum ada, fallback ke sequential
            console.warn('[Batch] Fallback ke sequential update:', batchErr.message);
            for (const id of ids) {
                await API.request('updateCardStatus', {
                    id,
                    status: 'Waiting Payment',
                    extra: { shipDate, trackingNumber: tracking }
                });
            }
        }

        UI.showToast(`${ids.length} kartu berhasil dikonfirmasi pengiriman ✓`);
        UI.closeModal('modalBatchShipment');
        load();
    } catch (err) {
        UI.showToast('Gagal mengirim batch: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}
