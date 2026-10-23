/**
 * dashboard.js - NitipPro Split Dashboard
 * 6 Stat Boxes (2x3), Calendar Box Sebelahnya, dan Simple Recent Activities
 */

let currentViewDate = new Date();
let selectedDateStr = formatDateYMD(new Date());
let receivedDatesMap = {};
let selectedCardsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    initTopBar();
    await loadStats();
    await initDateBlock();
    await loadRecentActivities();

    document.getElementById('btnRefreshActivities')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnRefreshActivities');
        btn.style.opacity = '0.5';
        await loadRecentActivities();
        btn.style.opacity = '1';
    });

    document.getElementById('modalReceivedCardsClose')?.addEventListener('click', () => {
        UI.closeModal('modalReceivedCards');
    });

    document.getElementById('btnViewReceivedCards')?.addEventListener('click', () => {
        openReceivedCardsModal();
    });
});

function initTopBar() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
    const user = Auth.getUser();
    const greetEl = document.getElementById('greetingMsg');
    const dateEl  = document.getElementById('currentDate');
    if (greetEl) greetEl.textContent = `${greeting}, ${user?.name || user?.email || 'Admin'}!`;
    if (dateEl)  dateEl.textContent  = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

async function loadStats() {
    try {
        const stats = await API.request('getStats');
        const sAvailable   = document.getElementById('s-available');
        const sShipment    = document.getElementById('s-shipment');
        const sPayment     = document.getElementById('s-payment');
        const sSold        = document.getElementById('s-sold');
        const sAuction     = document.getElementById('s-auction');
        const sAuctionDone = document.getElementById('s-auctiondone');

        if (sAvailable)   sAvailable.textContent   = stats.available || 0;
        if (sShipment)    sShipment.textContent    = stats.shipment || 0;
        if (sPayment)     sPayment.textContent     = stats.payment || 0;
        if (sSold)        sSold.textContent        = stats.sold || 0;
        if (sAuction)     sAuction.textContent     = stats.auctionActive || 0;
        if (sAuctionDone) sAuctionDone.textContent = stats.auctionDone || 0;
    } catch(e) {
        console.error('Gagal memuat stats:', e);
    }
}

/* ──────────────────────────────────────────────────────────────────────────
   CALENDAR BOX (7-COLUMN MINI MONTH GRID)
   ────────────────────────────────────────────────────────────────────────── */
async function initDateBlock() {
    try {
        const datesRes = await API.request('getReceivedDates');
        receivedDatesMap = {};
        if (Array.isArray(datesRes)) {
            datesRes.forEach(d => {
                if (d.date) receivedDatesMap[d.date] = parseInt(d.count, 10) || 0;
            });
        }
    } catch(e) {
        console.warn('Gagal memuat ringkasan tanggal:', e);
    }

    document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        renderCalendarGrid();
    });

    document.getElementById('btnNextMonth')?.addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        renderCalendarGrid();
    });

    document.getElementById('btnToday')?.addEventListener('click', () => {
        currentViewDate = new Date();
        selectedDateStr = formatDateYMD(new Date());
        renderCalendarGrid();
        selectDate(selectedDateStr);
    });

    renderCalendarGrid();
    selectDate(selectedDateStr);
}

function renderCalendarGrid() {
    const year  = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthTitle = document.getElementById('dateMonthTitle');
    if (monthTitle) {
        monthTitle.textContent = `${monthNames[month]} ${year}`;
    }

    const container = document.getElementById('calDaysGrid');
    if (!container) return;

    // Senin = 0, Selasa = 1, Rabu = 2, Kamis = 3, Jumat = 4, Sabtu = 5, Minggu = 6
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays     = new Date(year, month + 1, 0).getDate();

    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
        cells.push('<div class="cal-day-cell empty"></div>');
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
        const dObj = new Date(year, month, day);
        const dayOfWeekIndex = (firstDayIndex + day - 1) % 7;
        const isRabu  = (dayOfWeekIndex === 2);
        const isSabtu = (dayOfWeekIndex === 5);
        const isRegular = isRabu || isSabtu;

        const dateStr = formatDateYMD(dObj);
        const count = receivedDatesMap[dateStr] || 0;
        const isActive = (dateStr === selectedDateStr);

        cells.push(`
            <div class="cal-day-cell ${isActive ? 'active' : ''} ${isRegular ? 'is-regular' : ''} ${count > 0 ? 'has-cards' : ''}"
                 onclick="selectDate('${dateStr}')"
                 title="${day} ${monthNames[month]} ${year}${isRegular ? ' (Jadwal Masuk)' : ''}">
                <span>${day}</span>
                ${count > 0 ? `<span class="cal-badge">${count}</span>` : ''}
            </div>
        `);
    }

    container.innerHTML = cells.join('');
}

window.selectDate = async function(dateStr) {
    selectedDateStr = dateStr;

    document.querySelectorAll('.cal-day-cell').forEach(el => el.classList.remove('active'));
    const allCells = document.querySelectorAll('.cal-day-cell');
    allCells.forEach(p => {
        if (p.getAttribute('onclick')?.includes(dateStr)) {
            p.classList.add('active');
        }
    });

    const dParts = dateStr.split('-');
    const dObj = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
    const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = indonesianDays[dObj.getDay()];
    const formattedDate = UI.formatDate(dateStr);

    const textEl = document.getElementById('dateSelectedText');
    const btnEl  = document.getElementById('btnViewReceivedCards');

    try {
        const res = await API.request('getCardsByDate', { date: dateStr });
        const cards = res?.cards || [];
        selectedCardsList = cards;

        if (cards.length > 0) {
            if (textEl) textEl.innerHTML = `<strong>${dayName}, ${formattedDate}</strong> — <span style="color:#10B981;font-weight:700;">${cards.length} Kartu</span>`;
            if (btnEl)  btnEl.style.display = 'inline-block';
        } else {
            if (textEl) textEl.textContent = 'No data';
            if (btnEl)  btnEl.style.display = 'none';
        }
    } catch(e) {
        if (textEl) textEl.textContent = 'No data';
        if (btnEl)  btnEl.style.display = 'none';
    }
};

function openReceivedCardsModal() {
    if (!selectedCardsList || !selectedCardsList.length) {
        UI.showToast('Tidak ada data kartu', 'warning');
        return;
    }

    const dParts = selectedDateStr.split('-');
    const dObj = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
    const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = indonesianDays[dObj.getDay()];

    const titleEl = document.getElementById('receivedCardsModalTitle');
    const subEl   = document.getElementById('receivedCardsModalSubtitle');
    const bodyEl  = document.getElementById('receivedCardsModalBody');

    if (titleEl) titleEl.textContent = `Kartu Masuk: ${dayName}, ${UI.formatDate(selectedDateStr)}`;
    if (subEl)   subEl.textContent   = `Total ${selectedCardsList.length} kartu diterima`;

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div class="received-cards-grid">
                ${selectedCardsList.map(c => {
                    const imgUrl = (c.image && c.image.trim()) 
                        ? (c.image.startsWith('http') ? c.image : '../' + c.image) 
                        : '../assets/images/cards/placeholder_card.svg';
                    const sc = UI.statusClass(c.status);
                    return `
                        <div class="received-card-item">
                            <div class="received-card-img">
                                <img src="${imgUrl}" alt="${c.name}" onerror="this.onerror=null; this.src='../assets/images/cards/placeholder_card.svg';" />
                            </div>
                            <div class="received-card-info">
                                <h4>${c.name}</h4>
                                <span>Pemilik: <strong>${c.owner || '-'}</strong></span>
                                <span>${c.type || 'JP'} &bull; ${c.nation || '-'} &bull; Gr.${c.grade || '-'}</span>
                                <div style="margin-top: 4px;">
                                    <span class="status-badge status-${sc}">${c.status}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    UI.openModal('modalReceivedCards');
}

/* ──────────────────────────────────────────────────────────────────────────
   RECENT ACTIVITIES (SIMPLE: KARTU / ITEM - AKTIVITAS - SIAPA - TANGGAL JAM)
   ────────────────────────────────────────────────────────────────────────── */
async function loadRecentActivities() {
    const tableBody = document.getElementById('recentActivityTable');
    if (!tableBody) return;

    try {
        const activities = await API.request('getActivities');

        if (!activities || !activities.length) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--text-muted)">No data</td></tr>';
            return;
        }

        tableBody.innerHTML = activities.map(act => {
            const timeFormatted = formatDateTimeSimple(act.time);
            let badgeClass = 'status-available';
            if (act.activity === 'Shipment') badgeClass = 'status-waiting-shipment';
            else if (act.activity === 'Payment') badgeClass = 'status-waiting-payment';
            else if (act.activity === 'Start Auction') badgeClass = 'status-auction';
            else if (act.activity === 'Finish Auction') badgeClass = 'status-completed';

            return `
                <tr>
                    <td><strong>${act.item}</strong></td>
                    <td><span class="status-badge ${badgeClass}">${act.activity}</span></td>
                    <td style="color:var(--text-muted);">${act.user || 'Ravy'}</td>
                    <td style="text-align:right;color:var(--text-muted);font-size:0.82rem;">${timeFormatted}</td>
                </tr>
            `;
        }).join('');
    } catch(e) {
        console.error('Error loadRecentActivities:', e);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--status-shipment)">Gagal memuat aktivitas</td></tr>';
    }
}

function formatDateTimeSimple(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return dateStr;

        const day   = d.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mStr  = months[d.getMonth()];
        const year  = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins  = String(d.getMinutes()).padStart(2, '0');

        return `${day} ${mStr} ${year}, ${hours}:${mins}`;
    } catch(e) {
        return dateStr;
    }
}

function formatDateYMD(d) {
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
