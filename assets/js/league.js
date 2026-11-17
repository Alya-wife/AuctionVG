/**
 * Tournament League & Point Ranking Management - NitipPro Vanguard
 * 
 * 4 Tab Utama:
 * 1. Input & Rekap Mingguan (2 Card: Kiri Input Turnamen, Kanan Rekap & Leaderboard)
 * 2. Rekap Bulanan & Season (Akumulasi 3 Bulan per Season)
 * 3. Hadiah Turnamen (Prize Pool per minggu: 50% - 30% - 20%, potongan toko & histori)
 * 4. Edit Poin Turnamen (Kustomisasi pembagian poin per peringkat)
 */

let selectedLeagueYear = new Date().getFullYear();
let selectedLeagueMonth = new Date().getMonth() + 1;
let selectedInputWeek = 1;
let currentLeagueData = null;
let currentSlotRows = [];
let availableLeagueYears = [new Date().getFullYear()];

// Pagination State Leaderboard (10 Pemain per Halaman)
let leaderboardCurrentPage = 1;
const LEADERBOARD_PAGE_SIZE = 10;

// Season state (Default to current quarter: Jan-Mar=1, Apr-Jun=2, Jul-Sep=3, Okt-Des=4)
let selectedSeasonYear = new Date().getFullYear();
let selectedSeasonNumber = Math.ceil((new Date().getMonth() + 1) / 3);
let currentSeasonData = null;

// Prize Pool state (Total Hadiah Akumulasi 3 Bulan / Season)
let selectedPrizeYear = new Date().getFullYear();
let selectedPrizeSeason = Math.ceil((new Date().getMonth() + 1) / 3);
let currentPrizeData = null;

// Dynamic Point Rules
let currentPointRules = {
    rank_1: 10,
    rank_2: 8,
    rank_3: 6,
    rank_4: 5,
    rank_5_6: 4,
    rank_7_8: 3,
    rank_9_plus: 2
};

const INDONESIAN_MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Formula hitung poin otomatis berdasarkan posisi peringkat dan aturan aktif
 */
function calculatePoints(rank) {
    const r = parseInt(rank, 10);
    if (r === 1) return currentPointRules.rank_1;
    if (r === 2) return currentPointRules.rank_2;
    if (r === 3) return currentPointRules.rank_3;
    if (r === 4) return currentPointRules.rank_4;
    if (r === 5 || r === 6) return currentPointRules.rank_5_6;
    if (r === 7 || r === 8) return currentPointRules.rank_7_8;
    if (r >= 9) return currentPointRules.rank_9_plus;
    return 0;
}

document.addEventListener('DOMContentLoaded', () => {
    initLeagueTabs();
    initLeagueFilters();
    initWeekPillSelector();
    initQuickPaste();
    initMasterPlayersEvents();
    initSeasonTab();
    initPointRulesTab();
    initPrizeTab();

    // Initial data loading
    loadPointRules().then(() => {
        loadLeagueData();
    });
});

/* ──────────────────────────────────────────────────────────────────────────
   1. TAB NAVIGASI UTAMA (FIXED: ID MATCHING 100% SUPAYA TIDAK STUCK)
   ────────────────────────────────────────────────────────────────────────── */
function initLeagueTabs() {
    const tabButtons = document.querySelectorAll('.league-tab-btn');
    const tabPanes = document.querySelectorAll('.league-tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;
            if (!targetId) return;

            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabPanes.forEach(pane => {
                if (pane.id === targetId) {
                    pane.style.display = 'block';
                    pane.classList.add('active');
                } else {
                    pane.style.display = 'none';
                    pane.classList.remove('active');
                }
            });

            // Trigger data loader sesuai tab yang dibuka
            if (targetId === 'tabInput2Cards') {
                renderSlotRows();
            } else if (targetId === 'tabSeasonRekap') {
                loadSeasonData();
            } else if (targetId === 'tabPrize') {
                loadPrizeData();
            } else if (targetId === 'tabEditPoints') {
                populatePointRulesForm();
            }
        });
    });
}

/* ──────────────────────────────────────────────────────────────────────────
   2. FILTER PERIODE BULANAN & DROPDOWN (TAB 1 & TAB PRIZE)
   ────────────────────────────────────────────────────────────────────────── */
function initLeagueFilters() {
    setupCustomDropdown('dropdownLeagueYear', (val) => {
        selectedLeagueYear = parseInt(val, 10);
        updatePeriodTag();
        loadLeagueData();
        if (document.getElementById('tabPrize')?.style.display === 'block') {
            loadPrizeData();
        }
    });

    setupCustomDropdown('dropdownLeagueMonth', (val) => {
        selectedLeagueMonth = parseInt(val, 10);
        updatePeriodTag();
        loadLeagueData();
        if (document.getElementById('tabPrize')?.style.display === 'block') {
            loadPrizeData();
        }
    });

    setLeagueMonthSelection(String(selectedLeagueMonth));
    updatePeriodTag();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
        }
    });

    document.getElementById('leaderboardSearch')?.addEventListener('input', (e) => {
        leaderboardCurrentPage = 1;
        renderLeaderboardTable(e.target.value.toLowerCase().trim());
    });
}

function updatePeriodTag() {
    const mIdx = selectedLeagueMonth - 1;
    const mName = INDONESIAN_MONTH_NAMES[mIdx] || 'Bulan';
    const tag = document.getElementById('leaguePeriodTag');
    if (tag) tag.textContent = `${mName} ${selectedLeagueYear}`;

    const prizeTag = document.getElementById('prizePeriodTag');
    if (prizeTag) prizeTag.textContent = `${mName} ${selectedLeagueYear}`;

    const rekapTitle = document.getElementById('rekapCardTitle');
    if (rekapTitle) rekapTitle.textContent = `Rekap & Leaderboard (${mName} ${selectedLeagueYear})`;
}

function setupCustomDropdown(dropdownId, onSelect) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const trigger = dropdown.querySelector('.custom-dropdown-btn');
    const menu = dropdown.querySelector('.custom-dropdown-menu');

    trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
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

function populateLeagueYearDropdown(years) {
    if (Array.isArray(years) && years.length) {
        availableLeagueYears = years;
    }
    const menu = document.getElementById('menuLeagueYear');
    if (menu) {
        let html = '';
        availableLeagueYears.forEach(y => {
            const isSel = y === selectedLeagueYear;
            html += `<div class="custom-dropdown-item ${isSel ? 'is-selected' : ''}" data-value="${y}">${y}</div>`;
        });
        menu.innerHTML = html;

        const labelEl = document.getElementById('labelLeagueYear');
        if (labelEl) labelEl.textContent = selectedLeagueYear;
    }

    const seasonSelect = document.getElementById('seasonYearSelect');
    if (seasonSelect) {
        seasonSelect.innerHTML = availableLeagueYears.map(y => `<option value="${y}" ${y === selectedSeasonYear ? 'selected' : ''}>${y}</option>`).join('');
    }
}

function setLeagueMonthSelection(monthVal) {
    const menu = document.getElementById('menuLeagueMonth');
    if (menu) {
        menu.querySelectorAll('.custom-dropdown-item').forEach(it => {
            const isSel = it.dataset.value === String(monthVal);
            it.classList.toggle('is-selected', isSel);
        });
    }
    const labelEl = document.getElementById('labelLeagueMonth');
    if (labelEl) {
        const mIdx = parseInt(monthVal, 10) - 1;
        labelEl.textContent = INDONESIAN_MONTH_NAMES[mIdx] || 'Bulan';
    }
}

/* ──────────────────────────────────────────────────────────────────────────
   LOAD DATA BULANAN (TAB 1)
   ────────────────────────────────────────────────────────────────────────── */
async function loadLeagueData() {
    const tbody = document.getElementById('leaderboardTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);"><div class="spinner-sm" style="margin: 0 auto 8px;"></div>Memuat rekap...</td></tr>';
    }

    try {
        const res = await API.request('getLeagueData', {
            year: selectedLeagueYear,
            month: selectedLeagueMonth
        });

        currentLeagueData = res || {};

        if (Array.isArray(res?.available_years)) {
            populateLeagueYearDropdown(res.available_years);
        }

        // Update pills
        const tourneyCountEl = document.getElementById('statTourneyCount');
        const playerCountEl  = document.getElementById('statPlayerCount');
        if (tourneyCountEl) tourneyCountEl.textContent = `${res?.summary?.total_tournaments || 0} Turnamen`;
        if (playerCountEl)  playerCountEl.textContent  = `${res?.summary?.total_players || 0} Pemain Aktif`;

        // Update autocomplete datalist
        updatePlayersDatalist(res?.players_master || []);

        // Render Card Rekap
        leaderboardCurrentPage = 1;
        renderMiniPodium(res?.leaderboard || []);
        renderLeaderboardTable();

        // Update Card Input
        updateWeekPillsState(res?.tournaments || []);
        loadFormForWeek(selectedInputWeek);

    } catch (err) {
        console.error('Error loadLeagueData:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#ef4444;">Gagal memuat: ${err.message}</td></tr>`;
        }
    }
}

function updatePlayersDatalist(players) {
    const datalist = document.getElementById('playersDatalist');
    if (!datalist) return;
    datalist.innerHTML = players.map(p => `<option value="${p}"></option>`).join('');
}

/* ──────────────────────────────────────────────────────────────────────────
   CARD KIRI: INPUT TURNAMEN MINGGUAN (LANGSUNG DI HALAMAN)
   ────────────────────────────────────────────────────────────────────────── */
function initWeekPillSelector() {
    const pills = document.querySelectorAll('.week-pill-btn');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const w = parseInt(pill.dataset.week, 10);
            if (!w || w === selectedInputWeek) return;
            selectedInputWeek = w;

            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            loadFormForWeek(selectedInputWeek);
        });
    });

    document.getElementById('btnAddSlotRow')?.addEventListener('click', () => {
        addSlotRow(1);
    });

    document.getElementById('btnBottomAddSlot')?.addEventListener('click', () => {
        addSlotRow(1);
    });

    document.getElementById('btnAdd4Slots')?.addEventListener('click', () => {
        addSlotRow(4);
    });

    document.getElementById('btnResetTo8Slots')?.addEventListener('click', () => {
        if (confirm('Reset slot menjadi 8 peserta? Nama yang melebihi slot 8 akan dihapus.')) {
            if (currentSlotRows.length > 8) {
                currentSlotRows = currentSlotRows.slice(0, 8);
            } else {
                initDefaultSlots(8);
            }
            renderSlotRows();
        }
    });

    document.getElementById('btnDeleteCurrentWeek')?.addEventListener('click', deleteCurrentWeekTournament);
}

function updateWeekPillsState(tournaments) {
    const map = {};
    (tournaments || []).forEach(t => {
        map[t.week] = t;
    });

    for (let w = 1; w <= 5; w++) {
        const pill = document.getElementById(`pillWeek${w}`);
        if (!pill) continue;
        if (map[w]) {
            pill.classList.add('has-data');
            pill.title = `${map[w].title || 'Turnamen'} (${map[w].scores?.length || 0} pemain)`;
        } else {
            pill.classList.remove('has-data');
            pill.title = 'Belum ada data turnamen';
        }
    }
}

function loadFormForWeek(weekNum) {
    const tournaments = currentLeagueData?.tournaments || [];
    const tourney = tournaments.find(t => t.week === weekNum) || null;

    const banner = document.getElementById('weekStatusBanner');
    const statusText = document.getElementById('weekStatusText');
    const btnDel = document.getElementById('btnDeleteCurrentWeek');
    const inputTitle = document.getElementById('inputCardTitle');
    const submitText = document.getElementById('btnSaveInlineText');

    if (tourney) {
        if (banner) {
            banner.classList.remove('is-empty');
            banner.classList.add('is-saved');
        }
        if (statusText) statusText.innerHTML = `<strong>Minggu ${weekNum}:</strong> Sudah tersimpan (${tourney.scores?.length || 0} peserta) &bull; ${tourney.tournament_date || ''}`;
        if (btnDel) btnDel.style.display = 'inline-flex';
        if (inputTitle) inputTitle.textContent = `Edit Hasil Turnamen (Minggu ${weekNum})`;
        if (submitText) submitText.textContent = `Perbarui Hasil Minggu ${weekNum}`;

        document.getElementById('tourneyEditId').value = tourney.id || '';
        document.getElementById('tourneyDate').value = tourney.tournament_date || '';
        document.getElementById('tourneyTitle').value = tourney.title || `Turnamen Mingguan (Minggu ${weekNum})`;

        const scores = Array.isArray(tourney.scores) ? [...tourney.scores] : [];
        scores.sort((a, b) => (parseInt(a.rank_position, 10) || 0) - (parseInt(b.rank_position, 10) || 0));

        currentSlotRows = scores.map((s, idx) => ({
            rank: s.rank_position || (idx + 1),
            playerName: s.player_name || '',
            notes: s.notes || ''
        }));

        if (currentSlotRows.length === 0) {
            initDefaultSlots(8);
        }

    } else {
        if (banner) {
            banner.classList.add('is-empty');
            banner.classList.remove('is-saved');
        }
        if (statusText) statusText.textContent = `Minggu ${weekNum}: Belum ada data &bull; Input Baru`;
        if (btnDel) btnDel.style.display = 'none';
        if (inputTitle) inputTitle.textContent = `Input Hasil Turnamen (Minggu ${weekNum})`;
        if (submitText) submitText.textContent = `Simpan Hasil Minggu ${weekNum}`;

        document.getElementById('tourneyEditId').value = '';
        document.getElementById('tourneyTitle').value = `Turnamen Mingguan (Minggu ${weekNum})`;

        const y = selectedLeagueYear;
        const m = String(selectedLeagueMonth).padStart(2, '0');
        const approxDay = Math.min(28, Math.max(1, (weekNum - 1) * 7 + 1));
        const dayStr = String(approxDay).padStart(2, '0');
        document.getElementById('tourneyDate').value = `${y}-${m}-${dayStr}`;

        initDefaultSlots(8);
    }

    renderSlotRows();
}

function initDefaultSlots(count = 8) {
    currentSlotRows = [];
    for (let r = 1; r <= count; r++) {
        currentSlotRows.push({
            rank: r,
            playerName: '',
            notes: ''
        });
    }
}

function addSlotRow(count = 1) {
    for (let i = 0; i < count; i++) {
        const nextRank = currentSlotRows.length + 1;
        currentSlotRows.push({
            rank: nextRank,
            playerName: '',
            notes: ''
        });
    }
    renderSlotRows();

    setTimeout(() => {
        const container = document.getElementById('slotRowsContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
        const inputs = document.querySelectorAll('.slot-player-input');
        if (inputs.length) {
            inputs[inputs.length - 1].focus();
        }
    }, 40);
}

function removeSlotRow(index) {
    if (currentSlotRows.length <= 1) return;
    currentSlotRows.splice(index, 1);
    currentSlotRows.forEach((item, idx) => {
        item.rank = idx + 1;
    });
    renderSlotRows();
}

/**
 * Render input slot pemain dengan UI Modern Gelap (bukan default HTML putih jelek!)
 */
function renderSlotRows() {
    const container = document.getElementById('slotRowsContainer');
    const countLabel = document.getElementById('slotCountLabel');
    if (countLabel) countLabel.textContent = currentSlotRows.length;
    if (!container) return;

    const masterList = Array.isArray(currentLeagueData?.players_master) ? currentLeagueData.players_master : [];

    container.innerHTML = currentSlotRows.map((slot, idx) => {
        const pts = calculatePoints(slot.rank);
        const rankClass = slot.rank === 1 ? 'rank-1' : (slot.rank === 2 ? 'rank-2' : (slot.rank === 3 ? 'rank-3' : ''));
        const currentNameLower = (slot.playerName || '').trim().toLowerCase();

        return `
            <div class="slot-input-row" data-index="${idx}">
                <span class="slot-rank-num ${rankClass}">${slot.rank}</span>
                <select class="slot-player-input" data-index="${idx}" style="cursor: pointer;">
                    <option value="">-- Pilih Pemain Terdaftar --</option>
                    ${masterList.map(p => {
                        const isSelected = p.toLowerCase() === currentNameLower;
                        return `<option value="${escapeHtml(p)}" ${isSelected ? 'selected' : ''}>${escapeHtml(p)}</option>`;
                    }).join('')}
                </select>
                <span class="slot-pts-pill" id="slotPts_${idx}">${pts} PT</span>
                <button type="button" class="slot-del-btn" onclick="removeSlotRow(${idx})" title="Hapus peringkat ini">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.slot-player-input').forEach(select => {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index, 10);
            const chosen = (e.target.value || '').trim();

            if (chosen) {
                // Validasi: Cek apakah pemain sudah dipilih pada peringkat lain dalam sesi ini
                const isDuplicate = currentSlotRows.some((s, sIdx) => sIdx !== idx && (s.playerName || '').trim().toLowerCase() === chosen.toLowerCase());
                if (isDuplicate) {
                    UI.showToast(`Pemain "${chosen}" sudah dipilih pada peringkat lain! Setiap turnamen hanya boleh ada 1 nama pemain yang sama.`, 'warning');
                    e.target.value = '';
                    if (currentSlotRows[idx]) currentSlotRows[idx].playerName = '';
                    return;
                }
            }

            if (currentSlotRows[idx]) {
                currentSlotRows[idx].playerName = chosen;
            }
        });
    });
}

function updateInputCardRuleBadges() {
    const r1 = document.getElementById('badgeRule1');
    const r2 = document.getElementById('badgeRule2');
    const r3 = document.getElementById('badgeRule3');
    const r4 = document.getElementById('badgeRule4');
    const r5 = document.getElementById('badgeRule5');
    const r7 = document.getElementById('badgeRule7');
    const r9 = document.getElementById('badgeRule9');

    if (r1) r1.textContent = `1st: ${currentPointRules.rank_1}Pt`;
    if (r2) r2.textContent = `2nd: ${currentPointRules.rank_2}Pt`;
    if (r3) r3.textContent = `3rd: ${currentPointRules.rank_3}Pt`;
    if (r4) r4.textContent = `4th: ${currentPointRules.rank_4}Pt`;
    if (r5) r5.textContent = `5-6th: ${currentPointRules.rank_5_6}Pt`;
    if (r7) r7.textContent = `7-8th: ${currentPointRules.rank_7_8}Pt`;
    if (r9) r9.textContent = `9+: ${currentPointRules.rank_9_plus}Pt`;
}

function initQuickPaste() {
    const btnToggle = document.getElementById('btnToggleQuickPaste');
    const wrapper = document.getElementById('quickPasteWrapper');
    const btnApply = document.getElementById('btnApplyQuickPaste');
    const textarea = document.getElementById('quickPasteInput');

    btnToggle?.addEventListener('click', () => {
        if (!wrapper) return;
        const isHidden = wrapper.style.display === 'none';
        wrapper.style.display = isHidden ? 'block' : 'none';
        if (isHidden && textarea) textarea.focus();
    });

    btnApply?.addEventListener('click', () => {
        const text = (textarea?.value || '').trim();
        if (!text) {
            UI.showToast('Tempel daftar nama terlebih dahulu', 'warning');
            return;
        }

        const lines = text.split(/\r?\n/)
            .map(line => line.replace(/^[\d]+[\.\)\-\s]+/, '').trim())
            .filter(line => line.length > 0);

        if (!lines.length) {
            UI.showToast('Tidak ada nama valid yang ditemukan', 'warning');
            return;
        }

        const masterList = Array.isArray(currentLeagueData?.players_master) ? currentLeagueData.players_master : [];
        const masterMap = {};
        masterList.forEach(p => {
            masterMap[p.toLowerCase()] = p;
        });

        const unregistered = [];
        const duplicates = [];
        const chosenInPaste = new Set();
        const validNames = [];

        for (const line of lines) {
            const lower = line.toLowerCase();
            if (!masterMap[lower]) {
                unregistered.push(line);
            } else if (chosenInPaste.has(lower)) {
                duplicates.push(masterMap[lower]);
            } else {
                chosenInPaste.add(lower);
                validNames.push(masterMap[lower]);
            }
        }

        if (unregistered.length > 0) {
            UI.showToast(`Pemain belum terdaftar: "${unregistered.join(', ')}". Daftarkan di Master Pemain terlebih dahulu!`, 'warning');
            return;
        }

        if (duplicates.length > 0) {
            UI.showToast(`Pemain dobel pada tempel: "${duplicates.join(', ')}". Setiap turnamen hanya boleh ada 1 nama pemain yang sama!`, 'warning');
            return;
        }

        currentSlotRows = validNames.map((name, idx) => ({
            rank: idx + 1,
            playerName: name,
            notes: ''
        }));

        renderSlotRows();
        wrapper.style.display = 'none';
        if (textarea) textarea.value = '';
        UI.showToast(`Berhasil menerapkan ${validNames.length} nama peserta!`, 'success');
    });
}

window.handleSaveTournamentInline = async function(event) {
    if (event) event.preventDefault();

    const tDate = document.getElementById('tourneyDate').value;
    const tTitle = (document.getElementById('tourneyTitle')?.value || '').trim() || `Turnamen Mingguan (Minggu ${selectedInputWeek})`;
    const editId = document.getElementById('tourneyEditId').value;

    if (!tDate) {
        UI.showToast('Tanggal turnamen wajib diisi!', 'warning');
        return;
    }

    const validScores = currentSlotRows
        .filter(slot => (slot.playerName || '').trim() !== '')
        .map(slot => ({
            player_name: slot.playerName.trim(),
            rank_position: slot.rank,
            points: calculatePoints(slot.rank),
            notes: slot.notes || ''
        }));

    if (!validScores.length) {
        UI.showToast('Pilih minimal 1 nama pemain yang terdaftar pada slot peringkat!', 'warning');
        return;
    }

    // Validasi duplikasi pemain
    const seen = new Set();
    for (const sc of validScores) {
        const lower = sc.player_name.toLowerCase();
        if (seen.has(lower)) {
            UI.showToast(`Pemain "${sc.player_name}" dipilih lebih dari 1 kali! Setiap turnamen hanya boleh ada 1 nama pemain yang sama.`, 'warning');
            return;
        }
        seen.add(lower);
    }

    const btnSubmit = document.getElementById('btnSaveInlineSubmit');
    const origHtml = btnSubmit ? btnSubmit.innerHTML : '';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<div class="spinner-sm" style="display:inline-block; margin-right:8px;"></div> Menyimpan...';
    }

    try {
        const payload = {
            id: editId ? parseInt(editId, 10) : null,
            title: tTitle || `Turnamen Mingguan (Minggu ${selectedInputWeek})`,
            tournament_date: tDate,
            year: selectedLeagueYear,
            month: selectedLeagueMonth,
            week: selectedInputWeek,
            entry_fee: 10000,
            scores: validScores
        };

        const res = await API.request('saveTournament', payload);
        UI.showToast(`Hasil Minggu ke-${selectedInputWeek} berhasil disimpan!`, 'success');

        if (res && res.id) {
            document.getElementById('tourneyEditId').value = res.id;
        }

        await loadLeagueData();

    } catch (err) {
        UI.showToast('Gagal menyimpan turnamen: ' + err.message, 'error');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origHtml;
        }
    }
};

async function deleteCurrentWeekTournament() {
    const editId = document.getElementById('tourneyEditId').value;
    if (!editId) return;

    if (!confirm(`Hapus hasil turnamen Minggu ${selectedInputWeek}? Rekap poin pemain bulan ini akan diperbarui.`)) {
        return;
    }

    try {
        await API.request('deleteTournament', { id: editId });
        UI.showToast(`Turnamen Minggu ${selectedInputWeek} berhasil dihapus.`, 'info');

        await loadLeagueData();
        loadFormForWeek(selectedInputWeek);

    } catch (err) {
        UI.showToast('Gagal menghapus turnamen: ' + err.message, 'error');
    }
}

/* ──────────────────────────────────────────────────────────────────────────
   CARD KANAN: REKAP BULANAN & LEADERBOARD (TREN PANAH SAJA)
   ────────────────────────────────────────────────────────────────────────── */
function renderMiniPodium(leaderboard) {
    const container = document.getElementById('miniPodiumStrip');
    if (!container) return;

    if (!leaderboard || !leaderboard.length) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 12px; background: rgba(15,23,42,0.4); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.08); color: var(--text-muted); font-size: 0.78rem;">
                Belum ada turnamen tersimpan. Masukkan hasil mingguan pada card di sebelah kiri.
            </div>
        `;
        return;
    }

    const r1 = leaderboard[0] || null;
    const r2 = leaderboard[1] || null;
    const r3 = leaderboard[2] || null;

    container.innerHTML = `
        <div class="mini-podium-box r1">
            <span class="med-icon" style="font-size:0.78rem; font-weight:800; font-family:'Outfit',sans-serif;">#1</span>
            <div class="med-info">
                <span class="med-name" title="${r1 ? r1.name : '-'}">${r1 ? r1.name : '-'}</span>
                <span class="med-pts">${r1 ? r1.total_points : 0} Poin</span>
            </div>
        </div>
        <div class="mini-podium-box r2">
            <span class="med-icon" style="font-size:0.78rem; font-weight:800; font-family:'Outfit',sans-serif;">#2</span>
            <div class="med-info">
                <span class="med-name" title="${r2 ? r2.name : '-'}">${r2 ? r2.name : '-'}</span>
                <span class="med-pts">${r2 ? r2.total_points : 0} Poin</span>
            </div>
        </div>
        <div class="mini-podium-box r3">
            <span class="med-icon" style="font-size:0.78rem; font-weight:800; font-family:'Outfit',sans-serif;">#3</span>
            <div class="med-info">
                <span class="med-name" title="${r3 ? r3.name : '-'}">${r3 ? r3.name : '-'}</span>
                <span class="med-pts">${r3 ? r3.total_points : 0} Poin</span>
            </div>
        </div>
    `;
}

function renderLeaderboardTable(searchQuery = '') {
    const tbody = document.getElementById('leaderboardTableBody');
    const paginationBar = document.getElementById('leaderboardPaginationBar');
    const paginationInfo = document.getElementById('leaderboardPaginationInfo');
    const paginationButtons = document.getElementById('leaderboardPaginationButtons');
    if (!tbody) return;

    const list = currentLeagueData?.leaderboard || [];
    const filtered = searchQuery
        ? list.filter(p => p.name.toLowerCase().includes(searchQuery))
        : list;

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 0.85rem;">
                    ${searchQuery ? 'Pemain tidak ditemukan.' : 'Belum ada data turnamen pada bulan ini.'}
                </td>
            </tr>
        `;
        if (paginationBar) paginationBar.style.display = 'none';
        return;
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / LEADERBOARD_PAGE_SIZE) || 1;

    if (leaderboardCurrentPage > totalPages) {
        leaderboardCurrentPage = totalPages;
    }
    if (leaderboardCurrentPage < 1) {
        leaderboardCurrentPage = 1;
    }

    const startIndex = (leaderboardCurrentPage - 1) * LEADERBOARD_PAGE_SIZE;
    const endIndex = Math.min(startIndex + LEADERBOARD_PAGE_SIZE, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(player => {
        const trendHtml = renderTrendBadge(player);

        let w1Html = renderWeekCell(player.weeks?.[1]);
        let w2Html = renderWeekCell(player.weeks?.[2]);
        let w3Html = renderWeekCell(player.weeks?.[3]);
        let w4Html = renderWeekCell(player.weeks?.[4]);

        const rankClass = player.rank === 1 ? 'rank-1' : (player.rank === 2 ? 'rank-2' : (player.rank === 3 ? 'rank-3' : ''));

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="slot-rank-num ${rankClass}" style="width: 24px; height: 24px; font-size: 0.78rem;">${player.rank}</span>
                        ${trendHtml}
                    </div>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column; min-width: 0;">
                        <strong style="color: #f8fafc; font-size: 0.84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;" title="${escapeHtml(player.name)}">${escapeHtml(player.name)}</strong>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">${player.played_count || 0}x main</span>
                    </div>
                </td>
                <td style="text-align: center;">${w1Html}</td>
                <td style="text-align: center;">${w2Html}</td>
                <td style="text-align: center;">${w3Html}</td>
                <td style="text-align: center;">${w4Html}</td>
                <td style="text-align: right;">
                    <span class="total-pts-badge">${player.total_points}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 2px;">Pt</span>
                </td>
                <td style="text-align: center;">
                    <button type="button" class="btn-ghost" onclick="showPlayerDetail('${escapeHtml(player.name)}')" title="Lihat Riwayat Pemain" style="padding: 4px 6px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Update Pagination UI
    if (paginationBar) {
        if (totalItems > LEADERBOARD_PAGE_SIZE) {
            paginationBar.style.display = 'flex';
            if (paginationInfo) {
                paginationInfo.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalItems} pemain`;
            }

            if (paginationButtons) {
                let buttonsHtml = '';

                // Prev Button
                buttonsHtml += `
                    <button type="button" class="page-btn" ${leaderboardCurrentPage === 1 ? 'disabled' : ''} onclick="changeLeaderboardPage(${leaderboardCurrentPage - 1})" title="Halaman Sebelumnya">
                        &lsaquo;
                    </button>
                `;

                // Page numbers
                for (let i = 1; i <= totalPages; i++) {
                    buttonsHtml += `
                        <button type="button" class="page-btn ${i === leaderboardCurrentPage ? 'active' : ''}" onclick="changeLeaderboardPage(${i})">
                            ${i}
                        </button>
                    `;
                }

                // Next Button
                buttonsHtml += `
                    <button type="button" class="page-btn" ${leaderboardCurrentPage === totalPages ? 'disabled' : ''} onclick="changeLeaderboardPage(${leaderboardCurrentPage + 1})" title="Halaman Selanjutnya">
                        &rsaquo;
                    </button>
                `;

                paginationButtons.innerHTML = buttonsHtml;
            }
        } else {
            paginationBar.style.display = 'none';
        }
    }
}

window.changeLeaderboardPage = function(newPage) {
    leaderboardCurrentPage = newPage;
    const searchVal = document.getElementById('leaderboardSearch')?.value?.toLowerCase()?.trim() || '';
    renderLeaderboardTable(searchVal);
};

function renderTrendBadge(trendOrPlayer) {
    if (!trendOrPlayer) {
        return `<span class="trend-pill same" title="Tetap">&mdash;</span>`;
    }

    const direction = trendOrPlayer.trend_type || trendOrPlayer.direction || 'same';
    const diff = trendOrPlayer.trend_value ?? trendOrPlayer.diff ?? 0;

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

    if (direction === 'new') {
        return `<span class="trend-pill new" title="Pemain Baru">BARU</span>`;
    }

    return `<span class="trend-pill same" title="Tetap">&mdash;</span>`;
}

function renderWeekCell(weekData) {
    if (!weekData || typeof weekData.points !== 'number') {
        return `<span style="color: rgba(255,255,255,0.18); font-size: 0.8rem;">&mdash;</span>`;
    }
    const isRank1 = weekData.rank === 1;
    const cls = isRank1 ? 'rank-1-pts' : (weekData.points > 0 ? 'has-pts' : '');
    const title = `Finish #${weekData.rank || '-'}: ${weekData.points} Poin`;
    return `<span class="week-pts-pill ${cls}" title="${title}">${weekData.points}</span>`;
}

/* ──────────────────────────────────────────────────────────────────────────
   3. TAB 2: REKAP BULANAN & SEASON (SELAMA 3 BULAN)
   ────────────────────────────────────────────────────────────────────────── */
function initSeasonTab() {
    const pills = document.querySelectorAll('.season-pill-btn');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const s = parseInt(pill.dataset.season, 10);
            if (!s || s === selectedSeasonNumber) return;
            selectedSeasonNumber = s;

            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            loadSeasonData();
        });
    });

    const yearSelect = document.getElementById('seasonYearSelect');
    yearSelect?.addEventListener('change', (e) => {
        selectedSeasonYear = parseInt(e.target.value, 10);
        loadSeasonData();
    });

    document.getElementById('seasonSearchInput')?.addEventListener('input', (e) => {
        renderSeasonTable(e.target.value.toLowerCase().trim());
    });
}

async function loadSeasonData() {
    const tbody = document.getElementById('seasonTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);"><div class="spinner-sm" style="margin: 0 auto 8px;"></div>Memuat data season...</td></tr>';
    }

    try {
        const res = await API.request('getSeasonData', {
            year: selectedSeasonYear,
            season: selectedSeasonNumber
        });

        currentSeasonData = res || {};

        const periodTag = document.getElementById('seasonPeriodTag');
        const tableTitle = document.getElementById('seasonTableTitle');
        const playerCount = document.getElementById('statSeasonPlayers');

        if (periodTag) periodTag.textContent = res?.season_name || `Season ${selectedSeasonNumber} (${selectedSeasonYear})`;
        if (tableTitle) tableTitle.textContent = `Klasemen ${res?.season_name || 'Season'}`;
        if (playerCount) playerCount.textContent = `${res?.total_players || 0} Pemain Terdaftar`;

        const months = res?.months || [];
        if (months[0]) document.getElementById('thSeasonMonth1').textContent = months[0].name;
        if (months[1]) document.getElementById('thSeasonMonth2').textContent = months[1].name;
        if (months[2]) document.getElementById('thSeasonMonth3').textContent = months[2].name;

        renderSeasonPodium(res?.leaderboard || []);
        renderSeasonTable();

    } catch (err) {
        console.error('Error loadSeasonData:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#ef4444;">Gagal memuat: ${err.message}</td></tr>`;
        }
    }
}

function renderSeasonPodium(leaderboard) {
    const strip = document.getElementById('seasonPodiumStrip');
    if (!strip) return;

    if (!leaderboard || !leaderboard.length) {
        strip.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 18px; background: rgba(15,23,42,0.4); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.08); color: var(--text-muted); font-size: 0.85rem;">
                Belum ada turnamen tersimpan dalam rentang 3 bulan untuk season ini.
            </div>
        `;
        return;
    }

    const r1 = leaderboard[0] || null;
    const r2 = leaderboard[1] || null;
    const r3 = leaderboard[2] || null;

    strip.innerHTML = `
        <div class="season-podium-card r1">
            <div class="season-podium-badge" style="font-size:0.85rem; font-weight:800; font-family:'Outfit',sans-serif;">#1</div>
            <div class="season-podium-info">
                <span class="season-podium-title">Peringkat 1</span>
                <span class="season-podium-name" title="${r1 ? r1.name : '-'}">${r1 ? r1.name : '-'}</span>
                <span class="season-podium-pts">${r1 ? r1.total_season_points : 0} Poin <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">(${r1 ? r1.tournaments_played : 0}x Main)</span></span>
            </div>
        </div>
        <div class="season-podium-card r2">
            <div class="season-podium-badge" style="font-size:0.85rem; font-weight:800; font-family:'Outfit',sans-serif;">#2</div>
            <div class="season-podium-info">
                <span class="season-podium-title">Peringkat 2</span>
                <span class="season-podium-name" title="${r2 ? r2.name : '-'}">${r2 ? r2.name : '-'}</span>
                <span class="season-podium-pts">${r2 ? r2.total_season_points : 0} Poin <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">(${r2 ? r2.tournaments_played : 0}x Main)</span></span>
            </div>
        </div>
        <div class="season-podium-card r3">
            <div class="season-podium-badge" style="font-size:0.85rem; font-weight:800; font-family:'Outfit',sans-serif;">#3</div>
            <div class="season-podium-info">
                <span class="season-podium-title">Peringkat 3</span>
                <span class="season-podium-name" title="${r3 ? r3.name : '-'}">${r3 ? r3.name : '-'}</span>
                <span class="season-podium-pts">${r3 ? r3.total_season_points : 0} Poin <span style="font-size:0.72rem; color:var(--text-muted); font-weight:normal;">(${r3 ? r3.tournaments_played : 0}x Main)</span></span>
            </div>
        </div>
    `;
}

function renderSeasonTable(searchQuery = '') {
    const tbody = document.getElementById('seasonTableBody');
    if (!tbody) return;

    const list = currentSeasonData?.leaderboard || [];
    const months = currentSeasonData?.months || [];
    const m1 = months[0]?.number;
    const m2 = months[1]?.number;
    const m3 = months[2]?.number;

    const filtered = searchQuery
        ? list.filter(p => p.name.toLowerCase().includes(searchQuery))
        : list;

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 0.85rem;">
                    ${searchQuery ? 'Pemain tidak ditemukan di season ini.' : 'Belum ada data turnamen pada season ini.'}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(player => {
        const p1 = player.month_points?.[m1] || 0;
        const p2 = player.month_points?.[m2] || 0;
        const p3 = player.month_points?.[m3] || 0;

        const rankClass = player.rank === 1 ? 'rank-1' : (player.rank === 2 ? 'rank-2' : (player.rank === 3 ? 'rank-3' : ''));
        const trendHtml = renderTrendBadge(player);

        return `
            <tr>
                <td style="text-align: center;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="slot-rank-num ${rankClass}" style="width: 26px; height: 26px; font-size: 0.8rem;">${player.rank}</span>
                        ${trendHtml}
                    </div>
                </td>
                <td>
                    <strong style="color: #f8fafc; font-size: 0.88rem;">${escapeHtml(player.name)}</strong>
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
                    <span class="total-pts-badge">${player.total_season_points}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 2px;">Pt</span>
                </td>
                <td style="text-align: center; color: var(--text-muted); font-weight: 600;">
                    ${player.tournaments_played || 0}x
                </td>
            </tr>
        `;
    }).join('');
}

/* ──────────────────────────────────────────────────────────────────────────
   4. TAB 3: HADIAH TURNAMEN (PRIZE POOL TOTAL 3 BULAN / SEASON)
   - Akumulasi total biaya 10k per pemain dari seluruh turnamen selama 3 bulan
   - Pembagian 50% - 30% - 20% untuk Top 3 Pemain Klasemen Season (3 Bulan)
   - Rincian histori kontribusi tiket mingguan
   - Pengaturan potongan kas toko & persentase juara
   ────────────────────────────────────────────────────────────────────────── */
function initPrizeTab() {
    const yrSelect = document.getElementById('prizeYearSelect');
    if (yrSelect) {
        yrSelect.innerHTML = availableLeagueYears.map(y => `<option value="${y}" ${y === selectedPrizeYear ? 'selected' : ''}>${y}</option>`).join('');
        yrSelect.addEventListener('change', (e) => {
            selectedPrizeYear = parseInt(e.target.value, 10);
            loadPrizeData();
        });
    }

    document.querySelectorAll('.prize-season-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.prize-season-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedPrizeSeason = parseInt(btn.dataset.season, 10);
            loadPrizeData();
        });
    });

    document.getElementById('modalPrizeClose')?.addEventListener('click', () => {
        UI.closeModal('modalPrizeSettings');
    });
}

async function loadPrizeData() {
    const container = document.getElementById('prizeWeeksContainer');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><div class="spinner-sm" style="margin: 0 auto 8px;"></div>Memuat histori turnamen season...</div>';
    }

    try {
        const res = await API.request('getPrizeData', {
            year: selectedPrizeYear,
            season: selectedPrizeSeason
        });

        currentPrizeData = res || {};

        const tag = document.getElementById('prizePeriodTag');
        if (tag) tag.textContent = res?.season_label || `Season ${selectedPrizeSeason} (${selectedPrizeYear})`;

        // Update summary cards
        const s = res?.summary || {};
        const fee = res?.settings?.entry_fee || 10000;
        document.getElementById('statPrizeGrossPool').textContent = formatRupiah(s.total_gross_pool || 0);
        document.getElementById('statPrizePlayerCount').textContent = `${s.total_players || 0} Tiket Terkumpul (${s.total_tournaments || 0} Turnamen @ ${formatRupiah(fee)})`;
        document.getElementById('statPrizeCut').textContent = formatRupiah(s.prize_cut || 0);
        document.getElementById('statPrizeCutNote').textContent = s.prize_cut_note ? escapeHtml(s.prize_cut_note) : 'Tanpa potongan kas toko';
        document.getElementById('statPrizeNetPool').textContent = formatRupiah(s.total_net_pool || 0);

        // Render Podium Juara Season 3 Bulan
        renderSeasonPrizePodium(res?.winners || {}, res?.settings || {});

        // Render Daftar Histori Turnamen Mingguan Season
        renderPrizeWeeksList(res?.weeks || []);

    } catch (err) {
        console.error('Error loadPrizeData:', err);
        if (container) {
            container.innerHTML = `<div style="text-align: center; padding: 24px; color: #ef4444;">Gagal memuat hadiah season: ${err.message}</div>`;
        }
    }
}

function renderSeasonPrizePodium(winners, settings) {
    const podium = document.getElementById('seasonPrizePodium');
    if (!podium) return;

    const renderBox = (rank, classColor) => {
        const w = winners[rank] || { name: '-', points: 0, pct: rank === 1 ? 50 : (rank === 2 ? 30 : 20), amount: 0, claimed_amount: 0, remaining_balance: 0 };
        const total = w.amount || 0;
        const claimed = w.claimed_amount || 0;
        const remaining = w.remaining_balance !== undefined ? w.remaining_balance : Math.max(0, total - claimed);
        const hasWinner = w.name && w.name !== '-';

        return `
            <div class="prize-podium-box ${classColor}">
                <div class="prize-podium-rank">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>Peringkat ${rank} (${w.pct}%)</span>
                    </div>
                    ${hasWinner ? `
                        <button type="button" class="btn-prize-minus" onclick="openClaimPrizeModal(${rank})" title="Pencairan / Potong Hadiah Pemain (-)">
                            &minus;
                        </button>
                    ` : ''}
                </div>
                
                <div class="prize-podium-player" title="${escapeHtml(w.name)}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>${escapeHtml(w.name)}</span>
                    <small style="color: rgba(255,255,255,0.7); font-size: 0.72rem; margin-left: 4px;">(${w.points || 0} Pt)</small>
                </div>

                <div class="prize-balance-row">
                    <div class="prize-balance-line sub">
                        <span>Total Hadiah:</span>
                        <span>${formatRupiah(total)}</span>
                    </div>
                    <div class="prize-balance-line sub" style="color: ${claimed > 0 ? '#fca5a5' : 'var(--text-muted)'};">
                        <span>Sudah Dicairkan:</span>
                        <span style="font-weight: 600;">${claimed > 0 ? `-${formatRupiah(claimed)}` : 'Rp 0'}</span>
                    </div>
                    ${(() => {
                        const claimsList = w.claims || [];
                        if (!claimsList.length) return '';
                        return `
                            <div class="prize-claims-notes-list" style="margin: 4px 0 6px 0; padding: 5px 8px; background: rgba(0, 0, 0, 0.28); border-radius: 6px; border-left: 2px solid #f87171; display: flex; flex-direction: column; gap: 3px;">
                                ${claimsList.map(c => `
                                    <div style="font-size: 0.72rem; display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                                        <span style="color: #cbd5e1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(c.notes || 'Pencairan')}">
                                            &bull; ${escapeHtml(c.notes || 'Pencairan')}
                                        </span>
                                        <span style="color: #fca5a5; font-size: 0.7rem; font-weight: 600; white-space: nowrap;">-${formatRupiah(c.amount_claimed)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    })()}
                    <div class="prize-balance-line highlight">
                        <span style="color: #f8fafc;">Sisa Hadiah:</span>
                        <strong style="color: #34d399; font-size: 0.95rem;">${formatRupiah(remaining)}</strong>
                    </div>
                </div>
            </div>
        `;
    };

    podium.innerHTML = `
        ${renderBox(1, 'r1')}
        ${renderBox(2, 'r2')}
        ${renderBox(3, 'r3')}
    `;
}

function openLeagueModal(id) {
    if (window.UI && typeof UI.openModal === 'function') {
        UI.openModal(id);
    } else {
        const m = document.getElementById(id);
        if (m) {
            m.style.display = 'flex';
            setTimeout(() => m.classList.add('active'), 10);
        }
    }
}

function closeLeagueModal(id) {
    if (window.UI && typeof UI.closeModal === 'function') {
        UI.closeModal(id);
    } else {
        const m = document.getElementById(id);
        if (m) {
            m.classList.remove('active');
            setTimeout(() => m.style.display = 'none', 300);
        }
    }
}

// ─── Modal Pencairan Hadiah (Tombol Minus) ──────────────────────────────────
window.openClaimPrizeModal = function(rankPos) {
    if (!currentPrizeData || !currentPrizeData.winners) return;
    const w = currentPrizeData.winners[rankPos];
    if (!w || !w.name || w.name === '-') {
        UI.showToast('Belum ada pemenang yang terdata di peringkat ini', 'warning');
        return;
    }

    const modal = document.getElementById('modalClaimPrize');
    if (!modal) return;

    document.getElementById('claimRankPosition').value = rankPos;
    document.getElementById('claimPlayerName').value = w.name;
    document.getElementById('modalClaimPrizeTitle').textContent = `Pencairan Hadiah Peringkat ${rankPos}`;
    document.getElementById('modalClaimPrizePlayer').textContent = `${w.name} (${w.points || 0} Poin)`;

    const total = w.amount || 0;
    const claimed = w.claimed_amount || 0;
    const remaining = w.remaining_balance !== undefined ? w.remaining_balance : Math.max(0, total - claimed);

    document.getElementById('claimModalTotalAmount').textContent = formatRupiah(total);
    document.getElementById('claimModalClaimedAmount').textContent = formatRupiah(claimed);
    document.getElementById('claimModalRemainingAmount').textContent = formatRupiah(remaining);

    const inputAmt = document.getElementById('claimInputAmount');
    if (inputAmt) {
        inputAmt.value = '';
        if (!inputAmt.dataset.boundFormat) {
            inputAmt.dataset.boundFormat = 'true';
            inputAmt.addEventListener('input', function(e) {
                const raw = e.target.value.replace(/\D/g, '');
                if (!raw) {
                    e.target.value = '';
                    return;
                }
                const num = parseInt(raw, 10);
                e.target.value = num.toLocaleString('id-ID');
            });
        }
    }
    const inputNotes = document.getElementById('claimInputNotes');
    if (inputNotes) inputNotes.value = '';

    // Render riwayat klaim juara ini
    const historyContainer = document.getElementById('claimModalHistoryList');
    if (historyContainer) {
        const claims = w.claims || [];
        if (!claims.length) {
            historyContainer.innerHTML = `<span style="font-size: 0.74rem; color: var(--text-muted); font-style: italic;">Belum ada riwayat pencairan.</span>`;
        } else {
            historyContainer.innerHTML = claims.map(cl => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 5px 8px; border-radius: 6px; font-size: 0.76rem;">
                    <div>
                        <strong style="color: #f87171;">-${formatRupiah(cl.amount_claimed)}</strong>
                        <span style="color: var(--text-muted); margin-left: 6px;">${escapeHtml(cl.notes || 'Pencairan')}</span>
                        <div style="font-size: 0.68rem; color: #64748b;">${cl.created_at ? cl.created_at.substring(0, 16) : ''}</div>
                    </div>
                    <button type="button" class="btn-ghost" onclick="deletePrizeClaimItem(${cl.id})" title="Hapus riwayat pencairan ini" style="padding: 2px 6px; color: #ef4444; font-size: 0.75rem; border-color: rgba(239,68,68,0.3);">
                        &times;
                    </button>
                </div>
            `).join('');
        }
    }

    openLeagueModal('modalClaimPrize');
};

window.handleSavePrizeClaim = async function(e) {
    e.preventDefault();
    const rankPos = parseInt(document.getElementById('claimRankPosition').value, 10) || 1;
    const playerName = document.getElementById('claimPlayerName').value;
    const rawAmt = document.getElementById('claimInputAmount').value;
    const amount = parseInt(String(rawAmt).replace(/\D/g, ''), 10) || 0;
    const notes = document.getElementById('claimInputNotes').value.trim();

    if (amount <= 0) {
        UI.showToast('Masukkan nominal pencairan yang valid', 'error');
        return;
    }

    try {
        const res = await API.request('claimPrize', {
            year: selectedPrizeYear,
            season: selectedPrizeSeason,
            rank_position: rankPos,
            player_name: playerName,
            amount_claimed: amount,
            notes: notes
        });

        currentPrizeData = res;
        UI.showToast(`Pencairan ${formatRupiah(amount)} untuk ${playerName} berhasil dicatat`, 'success');
        closeLeagueModal('modalClaimPrize');
        await loadPrizeData();
    } catch (err) {
        console.error('Error claimPrize:', err);
        UI.showToast('Gagal mencatat pencairan: ' + err.message, 'error');
    }
};

window.deletePrizeClaimItem = async function(claimId) {
    if (!confirm('Hapus riwayat pencairan ini dan kembalikan saldo hadiah?')) return;
    try {
        const res = await API.request('deletePrizeClaim', {
            id: claimId,
            year: selectedPrizeYear,
            season: selectedPrizeSeason
        });
        currentPrizeData = res;
        UI.showToast('Riwayat pencairan berhasil dihapus', 'success');
        closeLeagueModal('modalClaimPrize');
        await loadPrizeData();
    } catch (err) {
        console.error('Error deletePrizeClaim:', err);
        UI.showToast('Gagal menghapus klaim: ' + err.message, 'error');
    }
};

function renderPrizeWeeksList(weeks) {
    const container = document.getElementById('prizeWeeksContainer');
    if (!container) return;

    if (!weeks || !weeks.length) {
        container.innerHTML = `
            <div style="padding: 32px; text-align: center; color: var(--text-muted);">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 8px; opacity: 0.5;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <div style="font-size: 0.92rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">Belum Ada Turnamen di Season Ini</div>
                <div style="font-size: 0.78rem;">Turnamen mingguan yang dimasukkan di Tab 1 akan otomatis tercatat dan mengakumulasi hadiah season di sini.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">No</th>
                        <th>Sesi Turnamen</th>
                        <th>Tanggal</th>
                        <th style="text-align: center;">Peserta</th>
                        <th style="text-align: right;">Tiket Terkumpul</th>
                        <th>Juara 1 Minggu Ini</th>
                        <th>Juara 2</th>
                        <th>Juara 3</th>
                    </tr>
                </thead>
                <tbody>
                    ${weeks.map((item, idx) => `
                        <tr>
                            <td style="text-align: center; color: var(--text-muted); font-size: 0.8rem;">${idx + 1}</td>
                            <td>
                                <strong style="color: #38bdf8; font-size: 0.84rem;">Minggu ${item.week}</strong>
                                <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 4px;">(${item.month_name})</span>
                            </td>
                            <td style="font-size: 0.8rem; color: var(--text-muted);">${item.tournament_date || '-'}</td>
                            <td style="text-align: center;">
                                <span class="badge-card-count" style="padding: 3px 8px; font-size: 0.76rem; background: rgba(56,189,248,0.12); color: #38bdf8;">
                                    ${item.player_count} Peserta
                                </span>
                            </td>
                            <td style="text-align: right; font-weight: 700; color: #34d399; font-size: 0.86rem;">
                                ${formatRupiah(item.gross_pool)}
                            </td>
                            <td><strong style="color: #facc15; font-size: 0.82rem;">${escapeHtml(item.winner_1)}</strong></td>
                            <td style="color: #cbd5e1; font-size: 0.82rem;">${escapeHtml(item.winner_2)}</td>
                            <td style="color: #fb923c; font-size: 0.82rem;">${escapeHtml(item.winner_3)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.openPrizeSettingsModal = function() {
    const s = currentPrizeData?.settings || {};
    document.getElementById('modalPrizeTitle').textContent = `Atur Hadiah (${currentPrizeData?.season_label || 'Season'})`;
    document.getElementById('prizeEntryFee').value = s.entry_fee || 10000;
    document.getElementById('prizeCutAmount').value = s.prize_cut || 0;
    document.getElementById('prizeCutNote').value = s.prize_cut_note || '';
    document.getElementById('prizePct1').value = s.prize_pct_1 || 50;
    document.getElementById('prizePct2').value = s.prize_pct_2 || 30;
    document.getElementById('prizePct3').value = s.prize_pct_3 || 20;

    UI.openModal('modalPrizeSettings');
};

window.handleSavePrizeSettings = async function(event) {
    if (event) event.preventDefault();

    const entryFee = parseInt(document.getElementById('prizeEntryFee').value, 10) || 10000;
    const prizeCut = parseInt(document.getElementById('prizeCutAmount').value, 10) || 0;
    const prizeCutNote = document.getElementById('prizeCutNote').value.trim();
    const pct1 = parseInt(document.getElementById('prizePct1').value, 10) || 50;
    const pct2 = parseInt(document.getElementById('prizePct2').value, 10) || 30;
    const pct3 = parseInt(document.getElementById('prizePct3').value, 10) || 20;

    if (pct1 + pct2 + pct3 !== 100) {
        if (!confirm(`Total persentase juara adalah ${pct1 + pct2 + pct3}% (bukan 100%). Tetap simpan?`)) {
            return;
        }
    }

    const btn = document.getElementById('btnSubmitPrizeSettings');
    const origText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';
    }

    try {
        await API.request('savePrizeSettings', {
            year: selectedPrizeYear,
            season: selectedPrizeSeason,
            entry_fee: entryFee,
            prize_cut: prizeCut,
            prize_cut_note: prizeCutNote,
            prize_pct_1: pct1,
            prize_pct_2: pct2,
            prize_pct_3: pct3
        });

        UI.showToast('Pengaturan hadiah season berhasil disimpan!', 'success');
        UI.closeModal('modalPrizeSettings');

        await loadPrizeData();

    } catch (err) {
        UI.showToast('Gagal menyimpan hadiah: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = origText;
        }
    }
};

/* ──────────────────────────────────────────────────────────────────────────
   5. TAB 4: EDIT POIN TURNAMEN
   ────────────────────────────────────────────────────────────────────────── */
function initPointRulesTab() {
    const form = document.getElementById('pointRulesForm');
    form?.addEventListener('submit', handleSavePointRules);

    document.getElementById('btnResetDefaultRules')?.addEventListener('click', resetDefaultPointRules);

    const inputs = ['ruleRank1', 'ruleRank2', 'ruleRank3', 'ruleRank4', 'ruleRank56', 'ruleRank78', 'ruleRank9Plus'];
    inputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', updatePointRulesPreview);
    });
}

async function loadPointRules() {
    try {
        const rules = await API.request('getPointRules');
        if (rules && typeof rules === 'object') {
            currentPointRules = {
                rank_1: parseInt(rules.rank_1 ?? 10, 10),
                rank_2: parseInt(rules.rank_2 ?? 8, 10),
                rank_3: parseInt(rules.rank_3 ?? 6, 10),
                rank_4: parseInt(rules.rank_4 ?? 5, 10),
                rank_5_6: parseInt(rules.rank_5_6 ?? 4, 10),
                rank_7_8: parseInt(rules.rank_7_8 ?? 3, 10),
                rank_9_plus: parseInt(rules.rank_9_plus ?? 2, 10)
            };
        }
        updateInputCardRuleBadges();
        populatePointRulesForm();
    } catch (err) {
        console.warn('Could not load point rules from server:', err);
    }
}

function populatePointRulesForm() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('ruleRank1', currentPointRules.rank_1);
    setVal('ruleRank2', currentPointRules.rank_2);
    setVal('ruleRank3', currentPointRules.rank_3);
    setVal('ruleRank4', currentPointRules.rank_4);
    setVal('ruleRank56', currentPointRules.rank_5_6);
    setVal('ruleRank78', currentPointRules.rank_7_8);
    setVal('ruleRank9Plus', currentPointRules.rank_9_plus);

    updatePointRulesPreview();
}

function updatePointRulesPreview() {
    const getVal = (id, fallback) => {
        const el = document.getElementById(id);
        const v = el ? parseInt(el.value, 10) : NaN;
        return isNaN(v) ? fallback : v;
    };

    const r1 = getVal('ruleRank1', 10);
    const r2 = getVal('ruleRank2', 8);
    const r3 = getVal('ruleRank3', 6);
    const r4 = getVal('ruleRank4', 5);
    const r56 = getVal('ruleRank56', 4);
    const r78 = getVal('ruleRank78', 3);
    const r9 = getVal('ruleRank9Plus', 2);

    const list = document.getElementById('previewBadgeList');
    if (!list) return;

    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 1 (1st)</span>
            <span class="point-rule-tag rule-1">${r1} Pt</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 2 (2nd)</span>
            <span class="point-rule-tag rule-2">${r2} Pt</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 3 (3rd)</span>
            <span class="point-rule-tag rule-3">${r3} Pt</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 4 (4th)</span>
            <span class="point-rule-tag rule-4">${r4} Pt</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 5 - 6 (Top 6)</span>
            <span class="point-rule-tag rule-5">${r56} Pt</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 7 - 8 (Top 8)</span>
            <span class="point-rule-tag rule-7">${r78} Pt</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(15,23,42,0.6); border-radius: 6px;">
            <span style="font-size:0.8rem; color:#cbd5e1;">Peringkat 9+ (Partisipasi)</span>
            <span class="point-rule-tag rule-9">${r9} Pt</span>
        </div>
    `;
}

async function handleSavePointRules(e) {
    if (e) e.preventDefault();

    const getVal = (id, fallback) => {
        const el = document.getElementById(id);
        const v = el ? parseInt(el.value, 10) : NaN;
        return isNaN(v) ? fallback : v;
    };

    const payload = {
        rank_1: getVal('ruleRank1', 10),
        rank_2: getVal('ruleRank2', 8),
        rank_3: getVal('ruleRank3', 6),
        rank_4: getVal('ruleRank4', 5),
        rank_5_6: getVal('ruleRank56', 4),
        rank_7_8: getVal('ruleRank78', 3),
        rank_9_plus: getVal('ruleRank9Plus', 2)
    };

    const btn = document.getElementById('btnSavePointRules');
    const origText = btn ? btn.textContent : '';
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';
    }

    try {
        await API.request('savePointRules', payload);
        currentPointRules = { ...payload };

        UI.showToast('Aturan pembagian poin berhasil disimpan!', 'success');

        updateInputCardRuleBadges();
        renderSlotRows();
        loadLeagueData();

    } catch (err) {
        UI.showToast('Gagal menyimpan aturan poin: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = origText;
        }
    }
}

function resetDefaultPointRules() {
    const defaults = {
        rank_1: 10,
        rank_2: 8,
        rank_3: 6,
        rank_4: 5,
        rank_5_6: 4,
        rank_7_8: 3,
        rank_9_plus: 2
    };

    document.getElementById('ruleRank1').value = defaults.rank_1;
    document.getElementById('ruleRank2').value = defaults.rank_2;
    document.getElementById('ruleRank3').value = defaults.rank_3;
    document.getElementById('ruleRank4').value = defaults.rank_4;
    document.getElementById('ruleRank56').value = defaults.rank_5_6;
    document.getElementById('ruleRank78').value = defaults.rank_7_8;
    document.getElementById('ruleRank9Plus').value = defaults.rank_9_plus;

    updatePointRulesPreview();
    UI.showToast('Form direset ke poin standar. Klik "Simpan Aturan Poin" untuk menerapkan.', 'info');
}

/* ──────────────────────────────────────────────────────────────────────────
   6. MODAL DETAIL PEMAIN & MASTER PEMAIN
   ────────────────────────────────────────────────────────────────────────── */
window.showPlayerDetail = function(playerName) {
    const player = currentLeagueData?.leaderboard?.find(p => p.name === playerName);
    if (!player) return;

    document.getElementById('playerDetailName').textContent = player.name;
    document.getElementById('playerDetailSub').textContent = `Peringkat #${player.rank} • Rekap Total ${player.total_points} Poin Bulan Ini`;

    const body = document.getElementById('playerDetailBody');
    if (!body) return;

    let weekRowsHtml = '';
    for (let w = 1; w <= 5; w++) {
        const wData = player.weeks && player.weeks[w];
        const pts = wData ? wData.points : 0;
        const rk = wData && wData.rank ? `#${wData.rank}` : '-';

        weekRowsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;">
                <span style="font-weight: 600; color: #cbd5e1; font-size: 0.85rem;">Minggu ke-${w}</span>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 0.76rem; color: var(--text-muted);">Finish: <strong>${rk}</strong></span>
                    <span class="week-pts-pill ${pts > 0 ? 'has-pts' : ''}" style="font-size:0.75rem;">${pts} Poin</span>
                </div>
            </div>
        `;
    }

    body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px; margin-bottom: 4px;">
                <div style="flex: 1; padding: 10px; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.25); border-radius: 8px; text-align: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Peringkat</span>
                    <div style="font-family: Outfit; font-size: 1.3rem; font-weight: 800; color: #38bdf8;">#${player.rank}</div>
                </div>
                <div style="flex: 1; padding: 10px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; text-align: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Rekap Total Poin</span>
                    <div style="font-family: Outfit; font-size: 1.3rem; font-weight: 800; color: #34d399;">${player.total_points}</div>
                </div>
                <div style="flex: 1; padding: 10px; background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.25); border-radius: 8px; text-align: center;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Kehadiran</span>
                    <div style="font-family: Outfit; font-size: 1.3rem; font-weight: 800; color: #facc15;">${player.played_count}x</div>
                </div>
            </div>

            <div style="font-size: 0.8rem; font-weight: 700; color: #f1f5f9; margin-top: 4px;">
                Perolehan Poin Tiap Minggu:
            </div>
            ${weekRowsHtml}
        </div>
    `;

    UI.openModal('modalPlayerDetail');
};

function initMasterPlayersEvents() {
    document.getElementById('btnManagePlayers')?.addEventListener('click', openPlayersModal);
    document.getElementById('btnQuickRegisterPlayer')?.addEventListener('click', openPlayersModal);
    document.getElementById('modalPlayersClose')?.addEventListener('click', () => UI.closeModal('modalPlayersManage'));
    document.getElementById('modalPlayerDetailClose')?.addEventListener('click', () => UI.closeModal('modalPlayerDetail'));
    document.getElementById('btnSaveNewPlayer')?.addEventListener('click', saveNewPlayerDirect);
}

async function openPlayersModal() {
    UI.openModal('modalPlayersManage');
    const tbody = document.getElementById('masterPlayersTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);"><div class="spinner-sm" style="margin: 0 auto 6px;"></div>Memuat pemain...</td></tr>';

    try {
        const players = await API.request('getLeaguePlayers');
        if (!players || !players.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">Belum ada pemain terdaftar.</td></tr>';
            return;
        }

        tbody.innerHTML = players.map((p, idx) => `
            <tr>
                <td style="color: var(--text-muted);">${idx + 1}</td>
                <td><strong style="color: #f8fafc;">${p.name}</strong></td>
                <td style="text-align: center;">${p.tournaments_played || 0}x</td>
                <td style="text-align: right; font-weight: 700; color: #34d399;">${p.total_lifetime_points || 0} Poin</td>
            </tr>
        `).join('');
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #ef4444;">Gagal memuat: ${err.message}</td></tr>`;
    }
}

async function saveNewPlayerDirect() {
    const input = document.getElementById('newPlayerNameInput');
    const name = (input?.value || '').trim();
    if (!name) {
        UI.showToast('Masukkan nama pemain terlebih dahulu', 'warning');
        return;
    }

    try {
        await API.request('saveLeaguePlayer', { name });
        UI.showToast(`Pemain "${name}" berhasil ditambahkan!`, 'success');
        if (input) input.value = '';
        await openPlayersModal();
        await loadLeagueData();
    } catch (err) {
        UI.showToast('Gagal menambahkan pemain: ' + err.message, 'error');
    }
}

function formatRupiah(num) {
    const val = parseInt(num, 10) || 0;
    return 'Rp ' + val.toLocaleString('id-ID');
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
