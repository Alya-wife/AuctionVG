let shipCards = [];

document.addEventListener('DOMContentLoaded', () => { load(); initForm(); });

async function load() {
    const c = document.getElementById('shipmentList');
    try {
        const inv = await API.request('getInventory');
        shipCards = inv.filter(c => c.status === 'Waiting Shipment');
        if (!shipCards.length) { c.innerHTML = '<p class="empty-msg" style="padding:40px;text-align:center;">Tidak ada kartu menunggu pengiriman.</p>'; return; }
        c.innerHTML = `<table class="data-table"><thead><tr><th>Kartu</th><th>Pemilik</th><th>Pembeli</th><th>Tgl Jual</th><th>Harga</th><th style="text-align:right">Aksi</th></tr></thead><tbody>
        ${shipCards.map(c => `<tr>
            <td><div style="font-weight:600">${c.name}</div><div class="text-sm text-muted">${c.nation}</div></td>
            <td>${c.owner}</td>
            <td>${c.buyer || '-'}</td>
            <td>${UI.formatDate(c.soldDate)}</td>
            <td>${c.price ? UI.formatCurrency(c.price) : '-'}</td>
            <td style="text-align:right"><button class="btn-primary btn-sm" onclick="openShipModal('${c.id}')">Konfirmasi Kirim</button></td>
        </tr>`).join('')}
        </tbody></table>`;
    } catch { UI.showToast('Gagal memuat', 'error'); }
}

function initForm() {
    document.getElementById('cancelShipBtn').addEventListener('click', () => UI.closeModal('modalShipment'));
    document.getElementById('shipmentForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
        try {
            await API.request('updateCardStatus', {
                id: document.getElementById('shipCardId').value,
                status: 'Waiting Payment',
                extra: {
                    shipDate: document.getElementById('shipDate').value,
                    trackingNumber: document.getElementById('shipTracking').value,
                    shipProofUrl: document.getElementById('shipProofUrl').value
                }
            });
            UI.showToast('Pengiriman dikonfirmasi');
            UI.closeModal('modalShipment');
            load();
        } catch { UI.showToast('Gagal', 'error'); }
        finally { btn.disabled = false; }
    });
}

window.openShipModal = function(id) {
    const c = shipCards.find(c => c.id === id); if (!c) return;
    document.getElementById('shipmentForm').reset();
    document.getElementById('shipCardId').value = c.id;
    document.getElementById('shipCardName').textContent = c.name;
    document.getElementById('shipBuyer').value = c.buyer || '';
    document.getElementById('shipDate').value = new Date().toISOString().split('T')[0];
    UI.openModal('modalShipment');
};
