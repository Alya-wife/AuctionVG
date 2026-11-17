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
    initViewSwitcher();
    initIncomeFilters();
    await loadStats();
    await initDateBlock();
    await loadRecentActivities();
    loadIncomeStats();

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

/* ──────────────────────────────────────────────────────────────────────────
   PENGHASILAN & KOMISI (SWITCHER, 2 BOXES, AND CRUD TRANSACTIONS)
   ────────────────────────────────────────────────────────────────────────── */
let currentDashView = 'calendar';
let allIncomeTransactions = [];
let allAvailableInventoryCards = [];
let selectedIncomeYear = new Date().getFullYear();
let selectedIncomeMonth = ''; // '' = Semua Bulan, '1'..'12' = Bulan tertentu
let availableIncomeYears = [new Date().getFullYear()];

const INDONESIAN_MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function updateIncomePeriodBadge() {
    const badgeTextEl = document.getElementById('incomePeriodBadgeText');
    const modalTitleEl = document.getElementById('modalIncomeMonthTitle');

    let text = 'Semua Periode';
    if (!selectedIncomeYear && !selectedIncomeMonth) {
        text = 'Semua Periode';
    } else if (selectedIncomeYear && !selectedIncomeMonth) {
        text = `Tahun ${selectedIncomeYear}`;
    } else if (!selectedIncomeYear && selectedIncomeMonth) {
        const mIdx = parseInt(selectedIncomeMonth, 10) - 1;
        text = INDONESIAN_MONTH_NAMES[mIdx] || 'Semua Bulan';
    } else {
        const mIdx = parseInt(selectedIncomeMonth, 10) - 1;
        text = `${INDONESIAN_MONTH_NAMES[mIdx]} ${selectedIncomeYear}`;
    }

    if (badgeTextEl) badgeTextEl.textContent = text;
    if (modalTitleEl) modalTitleEl.textContent = text;
}

function initViewSwitcher() {
    const btnCal = document.getElementById('btnSwitchCalendar');
    const btnInc = document.getElementById('btnSwitchIncome');

    btnCal?.addEventListener('click', (e) => {
        e.preventDefault();
        switchDashView('calendar');
    });

    btnInc?.addEventListener('click', (e) => {
        e.preventDefault();
        switchDashView('income');
    });
}

window.switchDashView = function(view) {
    currentDashView = view;
    const btnCal = document.getElementById('btnSwitchCalendar');
    const btnInc = document.getElementById('btnSwitchIncome');
    const viewCal = document.getElementById('dashCalendarView');
    const viewInc = document.getElementById('dashIncomeView');

    if (view === 'calendar') {
        btnCal?.classList.add('active');
        btnInc?.classList.remove('active');
        if (viewCal) viewCal.style.display = 'flex';
        if (viewInc) viewInc.style.display = 'none';
    } else {
        btnInc?.classList.add('active');
        btnCal?.classList.remove('active');
        if (viewCal) viewCal.style.display = 'none';
        if (viewInc) viewInc.style.display = 'flex';
        loadIncomeStats();
    }
};

function setupCustomDropdown(dropdownId, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const trigger = dropdown.querySelector('.custom-dropdown-btn');
    const menu = dropdown.querySelector('.custom-dropdown-menu');

    trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Tutup dropdown lain yang sedang terbuka
        document.querySelectorAll('.custom-dropdown.is-open').forEach(d => {
            if (d !== dropdown) d.classList.remove('is-open');
        });
        dropdown.classList.toggle('is-open');
    });

    menu?.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-dropdown-item');
        if (!item) return;
        const val = item.dataset.value ?? '';
        const label = item.textContent.trim();

        menu.querySelectorAll('.custom-dropdown-item').forEach(it => it.classList.remove('is-selected'));
        item.classList.add('is-selected');

        const labelEl = trigger.querySelector('.custom-dropdown-label');
        if (labelEl) labelEl.textContent = label;

        dropdown.classList.remove('is-open');

        if (typeof onSelect === 'function') {
            onSelect(val, label);
        }
    });
}

function populateIncomeYearDropdown(years) {
    if (Array.isArray(years) && years.length) {
        availableIncomeYears = years;
    }
    const menu = document.getElementById('menuIncomeYear');
    if (!menu) return;

    let html = `<div class="custom-dropdown-item ${selectedIncomeYear === '' ? 'is-selected' : ''}" data-value="">Semua Tahun</div>`;
    availableIncomeYears.forEach(y => {
        const isSel = String(y) === String(selectedIncomeYear);
        html += `<div class="custom-dropdown-item ${isSel ? 'is-selected' : ''}" data-value="${y}">${y}</div>`;
    });
    menu.innerHTML = html;

    const labelEl = document.getElementById('labelIncomeYear');
    if (labelEl) {
        labelEl.textContent = selectedIncomeYear !== '' ? selectedIncomeYear : 'Semua Tahun';
    }
}

function setIncomeMonthSelection(monthVal) {
    selectedIncomeMonth = monthVal;
    const menu = document.getElementById('menuIncomeMonth');
    if (menu) {
        menu.querySelectorAll('.custom-dropdown-item').forEach(it => {
            const isSel = (it.dataset.value ?? '') === String(monthVal);
            it.classList.toggle('is-selected', isSel);
        });
    }
    const labelEl = document.getElementById('labelIncomeMonth');
    if (labelEl) {
        if (!monthVal) {
            labelEl.textContent = 'Semua Bulan';
        } else {
            const mIdx = parseInt(monthVal, 10) - 1;
            labelEl.textContent = INDONESIAN_MONTH_NAMES[mIdx] || 'Semua Bulan';
        }
    }
}

function initIncomeFilters() {
    // Inisialisasi Custom Dropdown Tahun
    setupCustomDropdown('dropdownIncomeYear', (val) => {
        selectedIncomeYear = val !== '' ? parseInt(val, 10) : '';
        updateIncomePeriodBadge();
        loadIncomeStats();
    });

    // Inisialisasi Custom Dropdown Bulan
    setupCustomDropdown('dropdownIncomeMonth', (val) => {
        selectedIncomeMonth = val !== '' ? parseInt(val, 10) : '';
        updateIncomePeriodBadge();
        loadIncomeStats();
    });

    // Klik di luar menutup dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
        }
    });

    // Tombol Reset Filter
    document.getElementById('btnResetIncomeFilter')?.addEventListener('click', () => {
        selectedIncomeYear = '';
        selectedIncomeMonth = '';
        populateIncomeYearDropdown(availableIncomeYears);
        setIncomeMonthSelection('');
        updateIncomePeriodBadge();
        loadIncomeStats();
    });

    populateIncomeYearDropdown(availableIncomeYears);
}

async function loadIncomeStats() {
    updateIncomePeriodBadge();

    const payload = {};
    if (selectedIncomeYear) {
        payload.year = selectedIncomeYear;
    }
    if (selectedIncomeMonth) {
        payload.month = selectedIncomeMonth;
    }

    try {
        const res = await API.request('getIncomeStats', payload);

        if (Array.isArray(res?.availableYears) && res.availableYears.length) {
            populateIncomeYearDropdown(res.availableYears);
        }

        const salesEl    = document.getElementById('totalSalesVal');
        const salesSubEl = document.getElementById('totalSalesSub');
        const commEl     = document.getElementById('totalCommissionVal');
        const commSubEl  = document.getElementById('totalCommissionSub');
        const compEl     = document.getElementById('incomeCompletedTxt');
        const pendEl     = document.getElementById('incomePendingTxt');

        if (salesEl)    salesEl.textContent    = 'Rp ' + Number(res?.totalSales || 0).toLocaleString('id-ID');
        if (salesSubEl) salesSubEl.textContent = `${res?.soldCount || 0} kartu terjual`;
        if (commEl)     commEl.textContent     = 'Rp ' + Number(res?.totalCommission || 0).toLocaleString('id-ID');
        if (commSubEl)  commSubEl.textContent  = `${res?.commCount || 0} kartu ber-komisi`;
        if (compEl)     compEl.textContent     = 'Rp ' + Number(res?.completedSales || 0).toLocaleString('id-ID');
        if (pendEl)     pendEl.textContent     = 'Rp ' + Number(res?.pendingSales || 0).toLocaleString('id-ID');
    } catch(e) {
        console.warn('Gagal memuat income stats:', e);
    }
}

window.openIncomeDetailModal = async function() {
    UI.openModal('modalIncomeDetail');
    updateIncomePeriodBadge();

    const tbody = document.getElementById('incomeTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);"><div class="spinner" style="margin:0 auto 10px;"></div>Memuat data transaksi...</td></tr>';

    try {
        const payload = {};
        if (selectedIncomeYear) payload.year = selectedIncomeYear;
        if (selectedIncomeMonth) payload.month = selectedIncomeMonth;
        const transactions = await API.request('getIncomeTransactions', payload);
        allIncomeTransactions = Array.isArray(transactions) ? transactions : [];
        applyIncomeFilterAndRender();
    } catch(e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#ef4444;">Gagal memuat transaksi: ${e.message}</td></tr>`;
    }
};

function applyIncomeFilterAndRender() {
    const q       = (document.getElementById('incomeSearchInput')?.value || '').toLowerCase().trim();
    const st      = (document.getElementById('incomeStatusFilter')?.value || '').trim();

    const filterYr = selectedIncomeYear ? parseInt(selectedIncomeYear, 10) : 0;
    const filterMo = selectedIncomeMonth ? parseInt(selectedIncomeMonth, 10) : 0;

    let filtered = allIncomeTransactions.filter(t => {
        const matchQ = !q || 
            (t.name && t.name.toLowerCase().includes(q)) ||
            (t.id && t.id.toLowerCase().includes(q)) ||
            (t.owner && t.owner.toLowerCase().includes(q)) ||
            (t.buyer && t.buyer.toLowerCase().includes(q));

        const matchSt = !st || t.status === st;

        let matchYr = true;
        let matchMo = true;
        const dStr = t.sold_date || t.date || '';
        if (dStr && (filterYr > 0 || filterMo > 0)) {
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) {
                if (filterYr > 0 && d.getFullYear() !== filterYr) matchYr = false;
                if (filterMo > 0 && (d.getMonth() + 1) !== filterMo) matchMo = false;
            }
        }

        return matchQ && matchSt && matchYr && matchMo;
    });

    // Update modal summary pills
    let totalSales = 0, totalComm = 0;
    filtered.forEach(item => {
        totalSales += Number(item.price || 0);
        totalComm += Number(item.commission || 0);
    });

    const imsSales = document.getElementById('imsTotalSales');
    const imsComm  = document.getElementById('imsTotalComm');
    const imsTrx   = document.getElementById('imsTotalTrx');
    if (imsSales) imsSales.textContent = 'Rp ' + totalSales.toLocaleString('id-ID');
    if (imsComm)  imsComm.textContent  = 'Rp ' + totalComm.toLocaleString('id-ID');
    if (imsTrx)   imsTrx.textContent   = `${filtered.length} kartu`;

    renderIncomeTable(filtered);
}

function renderIncomeTable(items) {
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;

    if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:36px;color:var(--text-muted);">Tidak ada data transaksi yang sesuai filter.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => {
        const sc = UI.statusClass(item.status);
        const priceFmt = 'Rp ' + Number(item.price || 0).toLocaleString('id-ID');
        const commFmt = item.commission > 0 ? ('Rp ' + Number(item.commission).toLocaleString('id-ID')) : '<span style="color:var(--text-muted);">-</span>';
        const dateFmt = item.sold_date ? UI.formatDate(item.sold_date) : '-';

        return `
            <tr>
                <td data-label="Kartu">
                    <div style="font-weight:700;color:#f8fafc;">${item.name || '-'}</div>
                    <small style="color:#38bdf8;font-family:monospace;">${item.id}</small>
                </td>
                <td data-label="Pemilik"><span style="color:var(--text-main);">${item.owner || '-'}</span></td>
                <td data-label="Pembeli"><strong style="color:#e2e8f0;">${item.buyer || '-'}</strong></td>
                <td data-label="Harga Jual" class="cell-price">${priceFmt}</td>
                <td data-label="Komisi" class="cell-comm">${commFmt}</td>
                <td data-label="Status"><span class="status-badge status-${sc}">${item.status || 'Completed'}</span></td>
                <td data-label="Tgl Jual" class="cell-date">${dateFmt}</td>
                <td data-label="Aksi" class="cell-action">
                    <button type="button" class="btn-income-action edit" onclick="editIncomeTransaction('${item.id}')" title="Edit Transaksi">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                    <button type="button" class="btn-income-action delete" onclick="deleteIncomeTransaction('${item.id}', '${(item.name || '').replace(/'/g, "\\'")}')" title="Hapus / Reset Penjualan">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        Hapus
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openAddIncomeModal = async function() {
    document.getElementById('incomeFormTitle').textContent = 'Catat Penjualan Kartu Baru';
    document.getElementById('incomeCardSelectGroup').style.display = 'block';
    document.getElementById('incomeCardStaticGroup').style.display = 'none';

    // Reset Form
    document.getElementById('incomeEditCardId').value = '';
    const selectEl = document.getElementById('incomeCardSelect');
    if (selectEl) {
        selectEl.disabled = false;
        selectEl.value = '';
    }
    const ownerEl = document.getElementById('incomeOwner');
    if (ownerEl) ownerEl.value = '';

    document.getElementById('incomeBuyer').value = '';
    document.getElementById('incomePrice').value = '';
    document.getElementById('incomeCommission').value = '';
    document.getElementById('incomeStatus').value = 'Completed';
    document.getElementById('incomeSoldDate').value = formatDateYMD(new Date());
    document.getElementById('incomePayoutDate').value = '';

    // Load available cards
    if (selectEl) {
        selectEl.innerHTML = '<option value="">Memuat kartu available...</option>';
        try {
            const allInv = await API.request('getInventory');
            allAvailableInventoryCards = Array.isArray(allInv) ? allInv.filter(c => c.status === 'Available') : [];
            if (!allAvailableInventoryCards.length) {
                selectEl.innerHTML = '<option value="">Tidak ada kartu berstatus Available</option>';
            } else {
                selectEl.innerHTML = '<option value="">-- Pilih Kartu yang Terjual --</option>' +
                    allAvailableInventoryCards.map(c => `
                        <option value="${c.id}">${c.name} (${c.id}) - Owner: ${c.owner || 'Anonim'}</option>
                    `).join('');
            }
        } catch(e) {
            selectEl.innerHTML = '<option value="">Gagal memuat kartu</option>';
        }
    }

    UI.openModal('modalIncomeForm');
};

window.editIncomeTransaction = function(cardId) {
    const item = allIncomeTransactions.find(t => t.id === cardId);
    if (!item) return;

    document.getElementById('incomeFormTitle').textContent = 'Edit Transaksi Penjualan';
    
    // Sembunyikan dropdown kartu dan nonaktifkan agar tidak kena validasi form
    document.getElementById('incomeCardSelectGroup').style.display = 'none';
    const selectEl = document.getElementById('incomeCardSelect');
    if (selectEl) {
        selectEl.disabled = true;
    }

    // Tampilkan informasi kartu statis
    document.getElementById('incomeCardStaticGroup').style.display = 'block';
    document.getElementById('incomeCardStaticName').textContent = `${item.name || 'Kartu'} (${item.id}) - Pemilik: ${item.owner || '-'}`;

    document.getElementById('incomeEditCardId').value = item.id;
    const ownerEl = document.getElementById('incomeOwner');
    if (ownerEl) ownerEl.value = item.owner || '';

    document.getElementById('incomeBuyer').value = item.buyer || '';
    document.getElementById('incomePrice').value = item.price || 0;
    document.getElementById('incomeCommission').value = item.commission || 0;
    document.getElementById('incomeStatus').value = item.status || 'Completed';

    // Format tanggal strictly YYYY-MM-DD untuk input date
    const rawSoldDate = String(item.sold_date || '').split(' ')[0].split('T')[0];
    document.getElementById('incomeSoldDate').value = rawSoldDate || formatDateYMD(new Date());

    const rawPayoutDate = String(item.payout_date || '').split(' ')[0].split('T')[0];
    document.getElementById('incomePayoutDate').value = rawPayoutDate || '';

    UI.openModal('modalIncomeForm');
};

window.handleSaveIncome = async function(e) {
    if (e) e.preventDefault();

    const isEdit = document.getElementById('incomeCardStaticGroup').style.display !== 'none';
    const cardId = isEdit 
        ? document.getElementById('incomeEditCardId').value.trim()
        : document.getElementById('incomeCardSelect').value.trim();

    if (!cardId) {
        UI.showToast('Silahkan pilih kartu yang terjual', 'warning');
        return;
    }

    const priceVal = Number(document.getElementById('incomePrice').value || 0);
    const commVal = Number(document.getElementById('incomeCommission').value || 0);
    const buyerVal = (document.getElementById('incomeBuyer').value || '').trim();
    const ownerVal = (document.getElementById('incomeOwner')?.value || '').trim();
    const statusVal = document.getElementById('incomeStatus').value;
    const soldDateVal = document.getElementById('incomeSoldDate').value;
    const payoutDateVal = document.getElementById('incomePayoutDate').value || null;

    if (!buyerVal) {
        UI.showToast('Nama pembeli wajib diisi', 'warning');
        return;
    }
    if (!soldDateVal) {
        UI.showToast('Tanggal terjual wajib diisi', 'warning');
        return;
    }

    const payload = {
        id: cardId,
        owner: ownerVal,
        buyer: buyerVal,
        price: priceVal,
        commission: commVal,
        status: statusVal,
        sold_date: soldDateVal,
        payout_date: payoutDateVal
    };

    const submitBtn = document.getElementById('btnSaveIncomeSubmit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Menyimpan...'; }

    try {
        await API.request('saveIncomeTransaction', payload);
        UI.showToast('Transaksi penjualan berhasil disimpan!', 'success');
        UI.closeModal('modalIncomeForm');

        // Refresh stats box di dashboard
        await loadIncomeStats();

        // Refresh tabel detail jika modal detail sedang aktif
        if (document.getElementById('modalIncomeDetail')?.classList.contains('active')) {
            const filterPayload = {};
            if (selectedIncomeYear) filterPayload.year = selectedIncomeYear;
            if (selectedIncomeMonth) filterPayload.month = selectedIncomeMonth;
            const transactions = await API.request('getIncomeTransactions', filterPayload);
            allIncomeTransactions = Array.isArray(transactions) ? transactions : [];
            applyIncomeFilterAndRender();
        }
    } catch(err) {
        console.error('Save income transaction error:', err);
        UI.showToast('Gagal menyimpan transaksi: ' + err.message, 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Simpan Transaksi'; }
    }
};

window.deleteIncomeTransaction = async function(cardId, cardName) {
    if (!confirm(`Yakin ingin mereset/menghapus transaksi penjualan kartu "${cardName}"?\nKartu akan dikembalikan ke status Available.`)) {
        return;
    }

    try {
        await API.request('deleteIncomeTransaction', { id: cardId });
        UI.showToast(`Transaksi kartu ${cardId} berhasil direset ke Available`, 'success');
        
        await loadIncomeStats();
        const filterPayload = {};
        if (selectedIncomeYear) filterPayload.year = selectedIncomeYear;
        if (selectedIncomeMonth) filterPayload.month = selectedIncomeMonth;
        const transactions = await API.request('getIncomeTransactions', filterPayload);
        allIncomeTransactions = Array.isArray(transactions) ? transactions : [];
        applyIncomeFilterAndRender();
    } catch(err) {
        UI.showToast('Gagal mereset transaksi: ' + err.message, 'error');
    }
};

// Listeners for income search & filter inside modal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('incomeSearchInput')?.addEventListener('input', applyIncomeFilterAndRender);
    document.getElementById('incomeStatusFilter')?.addEventListener('change', applyIncomeFilterAndRender);
    document.getElementById('modalIncomeDetailClose')?.addEventListener('click', () => UI.closeModal('modalIncomeDetail'));
    document.getElementById('modalIncomeFormClose')?.addEventListener('click', () => UI.closeModal('modalIncomeForm'));

    // Auto-fill owner saat memilih kartu baru di dropdown
    document.getElementById('incomeCardSelect')?.addEventListener('change', (e) => {
        const cardId = e.target.value;
        const card = allAvailableInventoryCards.find(c => c.id === cardId);
        if (card && card.owner) {
            const ownerEl = document.getElementById('incomeOwner');
            if (ownerEl && !ownerEl.value) ownerEl.value = card.owner;
        }
    });

    // Navigasi periode di dalam modal
    document.getElementById('modalBtnPrevIncomeMonth')?.addEventListener('click', () => {
        if (!selectedIncomeYear) selectedIncomeYear = new Date().getFullYear();
        let curM = selectedIncomeMonth ? parseInt(selectedIncomeMonth, 10) : (new Date().getMonth() + 1);
        curM--;
        if (curM < 1) {
            curM = 12;
            selectedIncomeYear--;
        }
        setIncomeMonthSelection(String(curM));
        populateIncomeYearDropdown(availableIncomeYears);
        updateIncomePeriodBadge();
        loadIncomeStats();
        if (document.getElementById('modalIncomeDetail')?.classList.contains('active')) {
            openIncomeDetailModal();
        }
    });

    document.getElementById('modalBtnNextIncomeMonth')?.addEventListener('click', () => {
        if (!selectedIncomeYear) selectedIncomeYear = new Date().getFullYear();
        let curM = selectedIncomeMonth ? parseInt(selectedIncomeMonth, 10) : (new Date().getMonth() + 1);
        curM++;
        if (curM > 12) {
            curM = 1;
            selectedIncomeYear++;
        }
        setIncomeMonthSelection(String(curM));
        populateIncomeYearDropdown(availableIncomeYears);
        updateIncomePeriodBadge();
        loadIncomeStats();
        if (document.getElementById('modalIncomeDetail')?.classList.contains('active')) {
            openIncomeDetailModal();
        }
    });

    document.getElementById('modalBtnIncomeAllTime')?.addEventListener('click', () => {
        selectedIncomeYear = '';
        selectedIncomeMonth = '';
        setIncomeMonthSelection('');
        populateIncomeYearDropdown(availableIncomeYears);
        updateIncomePeriodBadge();
        loadIncomeStats();
        if (document.getElementById('modalIncomeDetail')?.classList.contains('active')) {
            openIncomeDetailModal();
        }
    });
});

