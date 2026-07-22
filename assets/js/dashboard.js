document.addEventListener('DOMContentLoaded', async () => {
    // Greeting & date
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
    const user = Auth.getUser();
    const greetEl = document.getElementById('greetingMsg');
    const dateEl  = document.getElementById('currentDate');
    if (greetEl) greetEl.textContent = `${greeting}, ${user?.name || 'Pacar Alya'}!`;
    if (dateEl)  dateEl.textContent  = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    try {
        const stats = await API.request('getStats');
        document.getElementById('s-total').textContent     = stats.total;
        document.getElementById('s-available').textContent = stats.available;
        document.getElementById('s-sold').textContent      = stats.sold;
        document.getElementById('s-shipment').textContent  = stats.shipment;
        document.getElementById('s-payment').textContent   = stats.payment;
        document.getElementById('s-completed').textContent = stats.completed;
        document.getElementById('s-auction').textContent   = stats.auctionActive;
        document.getElementById('s-auctiondone').textContent = stats.auctionDone;

        const cards = await API.request('getInventory');
        const recent = [...cards].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

        const el = document.getElementById('recentActivity');
        if (!recent.length) {
            el.innerHTML = '<p class="empty-msg">Belum ada data.</p>';
            return;
        }

        el.innerHTML = recent.map(c => `
            <div class="activity-row">
                <div class="activity-img">
                    <img src="${UI.cardImage(c)}" alt="${c.name}" referrerpolicy="no-referrer" onerror="UI.handleImgError(this, '${c.nation}')">
                </div>
                <div class="activity-info">
                    <strong>${c.name}</strong>
                    <span>${c.nation} · ${c.owner}</span>
                </div>
                <div>
                    <span class="status-badge status-${UI.statusClass(c.status)}">${c.status}</span>
                </div>
                <div class="activity-date">${UI.formatDate(c.date)}</div>
            </div>
        `).join('');
    } catch(e) {
        UI.showToast('Gagal memuat data', 'error');
        console.error(e);
    }
});
