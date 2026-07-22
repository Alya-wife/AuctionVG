let payCards = [];

document.addEventListener('DOMContentLoaded', () => { load(); initForm(); });

async function load() {
    const c = document.getElementById('paymentList');
    try {
        const inv = await API.request('getInventory');
        payCards = inv.filter(c => c.status === 'Waiting Payment');
        if (!payCards.length) { c.innerHTML = '<p class="empty-msg" style="padding:40px;text-align:center;">Tidak ada yang menunggu pembayaran ke pemilik.</p>'; return; }
        c.innerHTML = `<table class="data-table"><thead><tr><th>Kartu</th><th>Pemilik</th><th>Pembeli</th><th>Harga Jual</th><th>No. Resi</th><th style="text-align:right">Aksi</th></tr></thead><tbody>
        ${payCards.map(c => `<tr>
            <td><div style="font-weight:600">${c.name}</div><div class="text-sm text-muted">${c.nation}</div></td>
            <td>${c.owner}</td>
            <td>${c.buyer || '-'}</td>
            <td>${c.price ? UI.formatCurrency(c.price) : '-'}</td>
            <td class="text-sm text-muted">${c.trackingNumber || '-'}</td>
            <td style="text-align:right"><button class="btn-primary btn-sm" onclick="openPayModal('${c.id}')">Konfirmasi Bayar</button></td>
        </tr>`).join('')}
        </tbody></table>`;
    } catch { UI.showToast('Gagal memuat', 'error'); }
}

function initForm() {
    document.getElementById('cancelPayBtn').addEventListener('click', () => UI.closeModal('modalPayment'));
    document.getElementById('paymentForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]'); btn.disabled = true;
        try {
            const fileInput = document.getElementById('payProofFile');
            let proofUrl = '';
            
            if (fileInput.files.length > 0) {
                proofUrl = await UI.uploadToImgBB(fileInput.files[0]);
            }

            await API.request('updateCardStatus', {
                id: document.getElementById('payCardId').value,
                status: 'Completed',
                extra: {
                    payoutDate: document.getElementById('payDate').value,
                    payoutProofUrl: proofUrl
                }
            });
            UI.showToast('Transaksi selesai!');
            UI.closeModal('modalPayment');
            load();
        } catch { UI.showToast('Gagal', 'error'); }
        finally { btn.disabled = false; }
    });
}

window.openPayModal = function(id) {
    const c = payCards.find(c => c.id === id); if (!c) return;
    document.getElementById('paymentForm').reset();
    document.getElementById('payCardId').value = c.id;
    document.getElementById('payCardName').textContent = c.name;
    document.getElementById('payOwner').textContent = c.owner;
    document.getElementById('payPrice').textContent = UI.formatCurrency(c.price || 0);
    document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
    UI.openModal('modalPayment');
};

