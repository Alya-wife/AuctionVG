/**
 * payment.js – Halaman Pembayaran Pemilik (Single & Batch)
 *
 * Fitur:
 *  - Filter Pemilik, Filter Pembeli, Pencarian nama kartu
 *  - Tabel dengan checkbox per baris (batch)
 *  - Toolbar: counter, Pilih Semua, tombol Bayar Batch
 *  - Single: klik "Konfirmasi Bayar" per baris → modal 1 kartu + komisi
 *  - Batch: centang beberapa kartu → Bayar Batch → tanggal + komisi per kartu
 */

let payCards    = [];     // semua kartu Waiting Payment
let selectedIds = new Set(); // ID yang dicentang

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    load();
    initSingleForm();
    initBatchForm();
    initToolbar();
    initFilters();
});

// ─── Load Data ────────────────────────────────────────────────────────────────
async function load() {
    const container = document.getElementById('paymentList');
    try {
        const inv = await API.request('getInventory');
        payCards = inv.filter(c => c.status === 'Waiting Payment');
        selectedIds.clear();
        updateToolbar();
        populateFilterOptions();
        applyFilters();
    } catch {
        UI.showToast('Gagal memuat data pembayaran', 'error');
    }
}

// ─── Filter Options ───────────────────────────────────────────────────────────
function populateFilterOptions() {
    const ownerSel = document.getElementById('filterOwner');
    const buyerSel = document.getElementById('filterBuyer');

    const owners = [...new Set(payCards.map(c => c.owner).filter(Boolean))].sort();
    const buyers = [...new Set(payCards.map(c => c.buyer).filter(Boolean))].sort();

    const savedOwner = ownerSel.value;
    const savedBuyer = buyerSel.value;

    ownerSel.innerHTML = '<option value="">Semua Pemilik</option>' +
        owners.map(o => `<option value="${o}"${o === savedOwner ? ' selected' : ''}>${o}</option>`).join('');
    buyerSel.innerHTML = '<option value="">Semua Pembeli</option>' +
        buyers.map(b => `<option value="${b}"${b === savedBuyer ? ' selected' : ''}>${b}</option>`).join('');
}

function initFilters() {
    document.getElementById('filterOwner').addEventListener('change', applyFilters);
    document.getElementById('filterBuyer').addEventListener('change', applyFilters);
    document.getElementById('filterSearch').addEventListener('input', applyFilters);
    document.getElementById('btnClearFilter').addEventListener('click', () => {
        document.getElementById('filterOwner').value = '';
        document.getElementById('filterBuyer').value = '';
        document.getElementById('filterSearch').value = '';
        applyFilters();
    });
}

function applyFilters() {
    const owner  = document.getElementById('filterOwner').value;
    const buyer  = document.getElementById('filterBuyer').value;
    const search = document.getElementById('filterSearch').value.toLowerCase().trim();

    const filtered = payCards.filter(c => {
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

    renderTable(filtered);
    updateToolbar();
}

// ─── Render Tabel ─────────────────────────────────────────────────────────────
function renderTable(cards) {
    const container = document.getElementById('paymentList');

    if (!payCards.length) {
        document.getElementById('batchToolbar').style.display = 'none';
        container.innerHTML = '<p class="empty-msg" style="padding:40px;text-align:center;">Tidak ada yang menunggu pembayaran ke pemilik.</p>';
        return;
    }

    document.getElementById('batchToolbar').style.display = 'flex';

    if (!cards.length) {
        container.innerHTML = '<p class="empty-msg" style="padding:40px;text-align:center;">Tidak ada kartu yang cocok dengan filter.</p>';
        return;
    }

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
                    <th>Harga Jual</th>
                    <th>No. Resi</th>
                    <th>Tgl Kirim</th>
                    <th style="text-align:right">Aksi</th>
                </tr>
            </thead>
            <tbody>
                ${cards.map(c => `
                <tr id="row-${c.id}">
                    <td class="col-check">
                        <input type="checkbox" class="pay-checkbox" data-id="${c.id}" ${selectedIds.has(c.id) ? 'checked' : ''} />
                    </td>
                    <td>
                        <div style="font-weight:600">${c.name}</div>
                        <div class="text-sm text-muted">${c.nation}</div>
                    </td>
                    <td>${c.owner || '-'}</td>
                    <td>${c.buyer || '-'}</td>
                    <td>${c.price ? UI.formatCurrency(c.price) : '-'}</td>
                    <td class="text-sm text-muted">${c.trackingNumber || '-'}</td>
                    <td>${UI.formatDate(c.shipDate)}</td>
                    <td style="text-align:right">
                        <button class="btn-primary btn-sm" onclick="openPayModal('${c.id}')">
                            Konfirmasi Bayar
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;

    // Event: checkbox per baris
    container.querySelectorAll('.pay-checkbox').forEach(cb => {
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
        // Apply row highlight for pre-checked
        if (cb.checked) {
            document.getElementById(`row-${cb.dataset.id}`)?.classList.add('row-selected');
        }
    });

    // Event: check-all header
    const checkAll = document.getElementById('checkAll');
    checkAll?.addEventListener('change', () => {
        const checked = checkAll.checked;
        container.querySelectorAll('.pay-checkbox').forEach(cb => {
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

// Sinkronkan checkbox "Pilih Semua"
function syncCheckAll() {
    const checkAll = document.getElementById('checkAll');
    const allBoxes = document.querySelectorAll('.pay-checkbox');
    if (!checkAll || !allBoxes.length) return;
    const total   = allBoxes.length;
    const checked = [...allBoxes].filter(cb => cb.checked).length;
    checkAll.checked       = checked === total;
    checkAll.indeterminate = checked > 0 && checked < total;
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function initToolbar() {
    document.getElementById('btnSelectAll')?.addEventListener('click', () => {
        const allBoxes   = document.querySelectorAll('.pay-checkbox');
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

    document.getElementById('btnBatchPay')?.addEventListener('click', openBatchModal);
}

function updateToolbar() {
    const count     = selectedIds.size;
    const countEl   = document.getElementById('selectedCount');
    const payBtn    = document.getElementById('btnBatchPay');
    const selAllBtn = document.getElementById('btnSelectAll');

    if (countEl) countEl.textContent = count;
    if (payBtn)  payBtn.disabled = count < 2;

    if (selAllBtn) {
        const totalVisible = document.querySelectorAll('.pay-checkbox').length;
        selAllBtn.textContent = (count === totalVisible && totalVisible > 0) ? 'Batal Pilih' : 'Pilih Semua';
    }
}

// ─── Single Payment ───────────────────────────────────────────────────────────
function initSingleForm() {
    document.getElementById('cancelPayBtn')?.addEventListener('click', () => UI.closeModal('modalPayment'));
    document.getElementById('modalPaymentClose')?.addEventListener('click', () => UI.closeModal('modalPayment'));

    document.getElementById('paymentForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.disabled = true;
        try {
            const commission = parseFloat(document.getElementById('payCommission').value) || 0;
            await API.request('updateCardStatus', {
                id: document.getElementById('payCardId').value,
                status: 'Completed',
                extra: {
                    payoutDate:  document.getElementById('payDate').value,
                    commission:  commission
                }
            });
            UI.showToast('Transaksi selesai! ✓');
            UI.closeModal('modalPayment');
            load();
        } catch {
            UI.showToast('Gagal menyimpan pembayaran', 'error');
        } finally {
            btn.disabled = false;
        }
    });
}

window.openPayModal = function(id) {
    const c = payCards.find(c => c.id === id);
    if (!c) return;
    document.getElementById('paymentForm').reset();
    document.getElementById('payCardId').value        = c.id;
    document.getElementById('payCardName').textContent = c.name;
    document.getElementById('payOwner').textContent   = c.owner;
    document.getElementById('payPrice').textContent   = UI.formatCurrency(c.price || 0);
    document.getElementById('payDate').value          = new Date().toISOString().split('T')[0];
    document.getElementById('payCommission').value    = '';
    UI.openModal('modalPayment');
};

// ─── Batch Payment ────────────────────────────────────────────────────────────
function initBatchForm() {
    document.getElementById('cancelBatchPayBtn')?.addEventListener('click', () => UI.closeModal('modalBatchPayment'));
    document.getElementById('modalBatchPayClose')?.addEventListener('click',  () => UI.closeModal('modalBatchPayment'));
    document.getElementById('batchPayForm')?.addEventListener('submit', handleBatchSubmit);
}

function openBatchModal() {
    if (selectedIds.size < 2) {
        UI.showToast('Pilih minimal 2 kartu untuk pembayaran batch', 'error');
        return;
    }

    const selected = payCards.filter(c => selectedIds.has(c.id));

    // Render daftar kartu dengan input komisi per item
    const listEl = document.getElementById('batchPayCardList');
    listEl.innerHTML = selected.map(c => `
        <div class="batch-card-item">
            <div style="flex:1">
                <div class="bci-name">${c.name} <span style="color:var(--text-secondary);font-size:.75rem">(${c.nation})</span></div>
                <div class="bci-owner">Pemilik: ${c.owner || '-'} · Pembeli: ${c.buyer || '-'}</div>
            </div>
            <div class="bci-price">${c.price ? UI.formatCurrency(c.price) : '-'}</div>
            <div class="bci-commission">
                <span style="color:var(--text-muted);font-size:.75rem">Komisi Rp</span>
                <input
                    type="number"
                    class="batch-commission-input"
                    data-id="${c.id}"
                    min="0"
                    step="500"
                    placeholder="0"
                    title="Komisi untuk ${c.name}"
                />
            </div>
        </div>`).join('');

    const noteEl = document.getElementById('batchPaySummaryNote');
    noteEl.textContent = `${selected.length} kartu akan dikonfirmasi pembayaran. Masukkan komisi per kartu jika ada.`;

    document.getElementById('batchPayForm').reset();
    document.getElementById('batchPayDate').value = new Date().toISOString().split('T')[0];

    UI.openModal('modalBatchPayment');
}

async function handleBatchSubmit(e) {
    e.preventDefault();
    const btn      = document.getElementById('batchPaySubmitBtn');
    const payDate  = document.getElementById('batchPayDate').value;
    const ids      = [...selectedIds];

    if (!payDate) { UI.showToast('Masukkan tanggal transfer', 'error'); return; }
    btn.disabled = true;

    try {
        // Kumpulkan komisi per kartu dari batch modal
        const commissionMap = {};
        document.querySelectorAll('.batch-commission-input').forEach(inp => {
            commissionMap[inp.dataset.id] = parseFloat(inp.value) || 0;
        });

        // Coba batchUpdateCardStatus jika semua komisi sama / bisa diperlakukan seragam
        // Karena komisi bisa berbeda per kartu, kita lakukan sequential
        try {
            await API.request('batchUpdateCardStatus', {
                ids,
                status: 'Completed',
                extra: {
                    payoutDate:  payDate,
                    commission:  0 // default, akan di-override per kartu di bawah jika berbeda
                }
            });

            // Override komisi per kartu jika ada yang tidak 0
            const hasCustomComm = ids.some(id => commissionMap[id] > 0);
            if (hasCustomComm) {
                for (const id of ids) {
                    if (commissionMap[id] > 0) {
                        await API.request('updateCardStatus', {
                            id,
                            status: 'Completed',
                            extra: { payoutDate: payDate, commission: commissionMap[id] }
                        });
                    }
                }
            }
        } catch (batchErr) {
            // Fallback sequential jika batch endpoint belum ada
            console.warn('[Batch Payment] Fallback ke sequential:', batchErr.message);
            for (const id of ids) {
                await API.request('updateCardStatus', {
                    id,
                    status: 'Completed',
                    extra: {
                        payoutDate: payDate,
                        commission: commissionMap[id] || 0
                    }
                });
            }
        }

        UI.showToast(`${ids.length} kartu berhasil dibayarkan ✓`);
        UI.closeModal('modalBatchPayment');
        load();
    } catch (err) {
        UI.showToast('Gagal memproses batch: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}
