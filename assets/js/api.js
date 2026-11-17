/**
 * API Layer - NitipPro Card Inventory
 * Backend: MySQL REST API (api.php)
 * Mode: Localhost & Hosting (ProFreeHost / cPanel)
 */

const API = {

    // ─── Helper ──────────────────────────────────────────────────────────────
    delay: (ms) => new Promise(r => setTimeout(r, ms)),

    async request(action, payload = {}) {
        if (CONFIG.USE_LOCAL) {
            return this._localHandler(action, payload);
        }

        const cacheKey = 'ag_cache_' + action;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
            const body = JSON.stringify({ 
                action, 
                _auth_user: currentUser ? (currentUser.email || currentUser.username) : '',
                _auth_role: currentUser ? currentUser.role : '',
                ...payload 
            });
            const apiUrl = CONFIG.API_URL || 'api.php';
            const res = await fetch(apiUrl, {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/json;charset=utf-8' },
                credentials: 'include',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await res.json();
            if (json.status === 'error') throw new Error(json.message);

            // Simpan cache jika berhasil untuk request pembacaan data
            if (['getInventory', 'getAuctions', 'getStats'].includes(action) && json.data) {
                try { localStorage.setItem(cacheKey, JSON.stringify(json.data)); } catch(e){}
            }
            return json.data;

        } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`[API] Fetch '${action}' error:`, err.message);

            // Fallback ke data cache lokal jika offline
            if (['getInventory', 'getAuctions', 'getStats'].includes(action)) {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        console.info(`[API] Menggunakan cache lokal untuk '${action}'`);
                        return JSON.parse(cached);
                    } catch(e){}
                }
            }
            throw err;
        }
    },

    // ─── Seed Data ───────────────────────────────────────────────────────────
    _seed() {
        if (!localStorage.getItem('ag_inventory')) {
            const data = [
                { id: 'C001', name: 'Dragonic Overlord', grade: '3', set: 'V-PR Promo Pack Vol. 1', type: 'JP', nation: 'Dragon Empire', owner: 'Budi', date: '2026-07-15', status: 'Available', image: 'V-PR-001.jpg' },
                { id: 'C002', name: 'Alfred Early', grade: '2', set: 'V-PR Promo Pack Vol. 1', type: 'EN', nation: 'Keter Sanctuary', owner: 'Andi', date: '2026-07-16', status: 'Sold', buyer: 'Citra', price: 150000, soldDate: '2026-07-18', image: 'V-PR-005.jpg' },
                { id: 'C003', name: 'Sylvan Horned Beast, Charis', grade: '1', set: 'V-PR Promo Pack Vol. 1', type: 'JP', nation: 'Stoicheia', owner: 'Budi', date: '2026-07-17', status: 'Waiting Shipment', buyer: 'Doni', price: 120000, soldDate: '2026-07-19', image: 'V-PR-006.jpg' },
                { id: 'C004', name: 'Vairina Liber', grade: '2', set: 'V-PR Promo Pack Vol. 1', type: 'EN', nation: 'Dragon Empire', owner: 'Citra', date: '2026-07-18', status: 'Available', image: 'V-PR-004.jpg' },
                { id: 'C005', name: 'Phantom Blaster Dragon', grade: '3', set: 'V-PR Promo Pack Vol. 1', type: 'JP', nation: 'Dark States', owner: 'Andi', date: '2026-07-19', status: 'Waiting Payment', buyer: 'Eko', price: 200000, soldDate: '2026-07-20', shipDate: '2026-07-21', trackingNumber: 'JX123456789ID', image: 'V-PR-003.jpg' }
            ];
            localStorage.setItem('ag_inventory', JSON.stringify(data));
        } else {
            // Migrate existing inventory items to ensure type, grade, set, and image exist
            try {
                let items = JSON.parse(localStorage.getItem('ag_inventory') || '[]');
                let modified = false;
                items.forEach(c => {
                    if (!c.type) {
                        c.type = (c.language || c.image || 'JP').toString().toUpperCase() === 'EN' ? 'EN' : 'JP';
                        modified = true;
                    }
                    if (window.CardDB) {
                        const matched = CardDB.findByName(c.name);
                        if (matched) {
                            if (!c.grade && matched.grade) { c.grade = matched.grade; modified = true; }
                            if (!c.set && matched.set) { c.set = matched.set; modified = true; }
                            if ((!c.image || c.image === 'JP' || c.image === 'EN') && matched.image) { c.image = matched.image; modified = true; }
                        }
                    }
                });
                if (modified) localStorage.setItem('ag_inventory', JSON.stringify(items));
            } catch(e) {}
        }
        if (!localStorage.getItem('ag_auctions')) {
            localStorage.setItem('ag_auctions', JSON.stringify([]));
        }
        if (!localStorage.getItem('ag_users')) {
            const defaultUsers = [
                { id: 1, username: 'admin', password: 'admin123', name: 'Pacar Alya', role: 'Pacar Alya' }
            ];
            localStorage.setItem('ag_users', JSON.stringify(defaultUsers));
        }
    },

    // ─── LocalStorage Handler ─────────────────────────────────────────────────
    async _localHandler(action, payload) {
        await this.delay(200);
        this._seed();

        const inv = () => JSON.parse(localStorage.getItem('ag_inventory') || '[]');
        const aucs = () => JSON.parse(localStorage.getItem('ag_auctions') || '[]');
        const users = () => JSON.parse(localStorage.getItem('ag_users') || '[]');
        const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

        switch (action) {
            // Auth
            case 'login': {
                const { username, password } = payload;
                const userList = users();
                const matched = userList.find(u => 
                    u.username.toLowerCase() === (username || '').toLowerCase() && 
                    u.password === password
                );
                if (matched) {
                    return { id: matched.id, username: matched.username, name: matched.name, role: matched.role };
                }
                if (username === 'admin' && password === 'admin123')
                    return { id: 1, username: 'admin', name: 'Pacar Alya', role: 'Pacar Alya' };
                throw new Error('Username atau password salah.');
            }

            // User Management
            case 'getUsers': {
                return users();
            }
            case 'saveUser': {
                let list = users();
                const targetU = (payload.username || '').trim().toLowerCase();
                if (!targetU) throw new Error('Username wajib diisi');
                const idx = list.findIndex(u => u.username.toLowerCase() === targetU);
                if (idx !== -1) {
                    list[idx] = { ...list[idx], ...payload, username: list[idx].username };
                    save('ag_users', list);
                    return list[idx];
                } else {
                    const newUser = {
                        id: Date.now(),
                        username: payload.username.trim(),
                        password: payload.password || '123456',
                        name: payload.name || payload.username,
                        role: payload.role || 'Admin'
                    };
                    list.push(newUser);
                    save('ag_users', list);
                    return newUser;
                }
            }
            case 'deleteUser': {
                let list = users();
                const targetU = (payload.username || '').trim().toLowerCase();
                if (targetU === 'admin') {
                    throw new Error('Admin utama tidak dapat dihapus');
                }
                list = list.filter(u => u.username.toLowerCase() !== targetU);
                save('ag_users', list);
                return true;
            }

            // Inventory
            case 'getInventory': return inv();
            case 'saveCard': {
                let list = inv();
                payload.type = (payload.type || 'JP').toUpperCase();
                if (payload.id) {
                    const i = list.findIndex(c => c.id === payload.id);
                    if (i !== -1) list[i] = { ...list[i], ...payload };
                } else {
                    payload.id = 'C' + Date.now().toString().slice(-5);
                    payload.status = 'Available';
                    list.unshift(payload);
                }
                save('ag_inventory', list);
                return payload;
            }
            case 'deleteCard': {
                let list = inv().filter(c => c.id !== payload.id);
                save('ag_inventory', list);
                return true;
            }
            case 'updateCardStatus': {
                let list = inv();
                const i = list.findIndex(c => c.id === payload.id);
                if (i !== -1) {
                    list[i] = { ...list[i], status: payload.status, ...payload.extra };
                    if (payload.extra && payload.extra.commission !== undefined) {
                        list[i].commission = payload.extra.commission;
                    }
                    save('ag_inventory', list);
                    return list[i];
                }
                throw new Error('Card not found');
            }
            case 'batchUpdateCardStatus': {
                // Update banyak kartu sekaligus dengan status & extra yang sama
                let list = inv();
                const ids = payload.ids || [];
                let updatedCount = 0;
                for (const id of ids) {
                    const idx = list.findIndex(c => c.id === id);
                    if (idx !== -1) {
                        list[idx] = { ...list[idx], status: payload.status, ...payload.extra };
                        if (payload.extra && payload.extra.commissions && payload.extra.commissions[id] !== undefined) {
                            list[idx].commission = payload.extra.commissions[id];
                        } else if (payload.extra && payload.extra.commission !== undefined) {
                            list[idx].commission = payload.extra.commission;
                        }
                        updatedCount++;
                    }
                }
                save('ag_inventory', list);
                return { updated: updatedCount };
            }
            case 'cancelSale': {
                let list = inv();
                const idx = list.findIndex(c => c.id === payload.id);
                if (idx !== -1) {
                    list[idx].status = 'Available';
                    list[idx].buyer = '';
                    list[idx].price = 0;
                    list[idx].soldDate = null;
                    list[idx].shipDate = null;
                    list[idx].trackingNumber = null;
                    list[idx].commission = 0;
                    list[idx].payoutDate = null;
                    list[idx].payoutProofUrl = null;
                    save('ag_inventory', list);
                    return { success: true };
                }
                throw new Error('Card not found');
            }
            case 'getLastSoldPrices': {
                const map = load('ag_last_sold_prices') || {};
                return map;
            }
            case 'saveLastSoldPrice': {
                const map = load('ag_last_sold_prices') || {};
                const name = payload.card_name || payload.name;
                if (name) {
                    map[name] = {
                        price: Number(payload.price || 0),
                        updated_at: new Date().toISOString()
                    };
                    save('ag_last_sold_prices', map);
                }
                return { card_name: name, price: payload.price, updated_at: new Date().toISOString() };
            }

            // Auctions
            case 'getAuctions': return aucs();
            case 'saveAuction': {
                let list = aucs();
                const auc = {
                    ...payload,
                    id: 'A' + Date.now(),
                    status: 'Active',
                    date: new Date().toISOString().split('T')[0]
                };
                list.unshift(auc);
                save('ag_auctions', list);
                // Set cards to Auction
                for (const cid of (payload.cardIds || [])) {
                    await this._localHandler('updateCardStatus', { id: cid, status: 'Auction', extra: {} });
                }
                return auc;
            }
            case 'finishAuction': {
                let list = aucs();
                const i = list.findIndex(a => a.id === payload.auctionId);
                if (i !== -1) {
                    list[i].status = 'Finished';
                    list[i].results = payload.results;
                    save('ag_auctions', list);
                    for (const r of payload.results) {
                        if (r.sold) {
                            await this._localHandler('updateCardStatus', {
                                id: r.cardId, status: 'Waiting Shipment',
                                extra: { buyer: r.buyer, price: r.price, soldDate: new Date().toISOString().split('T')[0] }
                            });
                        } else {
                            await this._localHandler('updateCardStatus', { id: r.cardId, status: 'Available', extra: {} });
                        }
                    }
                }
                return true;
            }

            // Dashboard Stats
            case 'getStats': {
                const cards = inv();
                const auctionList = aucs();
                return {
                    total:         cards.length,
                    available:     cards.filter(c => c.status === 'Available').length,
                    sold:          cards.filter(c => c.status === 'Sold').length,
                    auction:       cards.filter(c => c.status === 'Auction').length,
                    shipment:      cards.filter(c => c.status === 'Waiting Shipment').length,
                    shipped:       cards.filter(c => c.status === 'Shipped').length,
                    payment:       cards.filter(c => c.status === 'Waiting Payment').length,
                    completed:     cards.filter(c => c.status === 'Completed').length,
                    auctionActive: auctionList.filter(a => a.status === 'Active').length,
                    auctionDone:   auctionList.filter(a => a.status === 'Finished').length
                };
            }

            case 'getIncomeStats': {
                const cards = inv();
                const filterYr = payload?.year ? parseInt(payload.year) : 0;
                const filterMo = payload?.month ? parseInt(payload.month) : 0;

                let totalSales = 0, totalCommission = 0, soldCount = 0, commCount = 0;
                let completedSales = 0, completedCommission = 0, pendingSales = 0, pendingCommission = 0;
                const yearsSet = new Set();
                const currentYr = new Date().getFullYear();
                yearsSet.add(currentYr);

                cards.forEach(c => {
                    const dStr = c.soldDate || c.sold_date || c.date || c.createdAt || '';
                    if (dStr) {
                        const dObj = new Date(dStr);
                        if (!isNaN(dObj.getTime())) {
                            yearsSet.add(dObj.getFullYear());
                        }
                    }

                    if (filterYr > 0 && dStr) {
                        const dObj = new Date(dStr);
                        if (!isNaN(dObj.getTime()) && dObj.getFullYear() !== filterYr) return;
                    }
                    if (filterMo > 0 && dStr) {
                        const dObj = new Date(dStr);
                        if (!isNaN(dObj.getTime()) && (dObj.getMonth() + 1) !== filterMo) return;
                    }

                    const price = Number(c.price || 0);
                    const comm = Number(c.commission || 0);
                    if (price > 0) {
                        totalSales += price;
                        soldCount++;
                        if (c.status === 'Completed') completedSales += price;
                        if (['Waiting Payment', 'Waiting Shipment'].includes(c.status)) pendingSales += price;
                    }
                    if (comm > 0) {
                        totalCommission += comm;
                        commCount++;
                        if (c.status === 'Completed') completedCommission += comm;
                        if (['Waiting Payment', 'Waiting Shipment'].includes(c.status)) pendingCommission += comm;
                    }
                });

                return {
                    totalSales, totalCommission, soldCount, commCount,
                    completedSales, completedCommission, pendingSales, pendingCommission,
                    availableYears: [...yearsSet].sort((a,b) => b - a),
                    filterYear: filterYr,
                    filterMonth: filterMo
                };
            }

            case 'getIncomeTransactions': {
                const cards = inv();
                return cards.filter(c => Number(c.price || 0) > 0 || Number(c.commission || 0) > 0 || ['Waiting Payment', 'Waiting Shipment', 'Completed', 'Sold'].includes(c.status));
            }

            case 'saveIncomeTransaction': {
                let list = inv();
                const idx = list.findIndex(c => c.id === payload.id);
                if (idx !== -1) {
                    list[idx].price = Number(payload.price || 0);
                    list[idx].commission = Number(payload.commission || 0);
                    list[idx].buyer = payload.buyer || '';
                    list[idx].status = payload.status || 'Completed';
                    if (payload.sold_date) list[idx].sold_date = payload.sold_date;
                    if (payload.payout_date) list[idx].payout_date = payload.payout_date;
                    if (payload.owner) list[idx].owner = payload.owner;
                    save('ag_inventory', list);
                    return list[idx];
                }
                throw new Error('Card not found');
            }

            case 'deleteIncomeTransaction': {
                let list = inv();
                const idx = list.findIndex(c => c.id === payload.id);
                if (idx !== -1) {
                    list[idx].price = 0;
                    list[idx].commission = 0;
                    list[idx].buyer = '';
                    list[idx].status = 'Available';
                    list[idx].sold_date = null;
                    list[idx].payout_date = null;
                    save('ag_inventory', list);
                    return { id: payload.id, status: 'Available' };
                }
                throw new Error('Card not found');
            }

            // --- League & Tournament Fallback ---
            case 'getLeagueData': {
                const year = payload.year ? parseInt(payload.year) : new Date().getFullYear();
                const month = payload.month ? parseInt(payload.month) : (new Date().getMonth() + 1);
                const tourneys = JSON.parse(localStorage.getItem('ag_league_tournaments') || '[]');
                const scores = JSON.parse(localStorage.getItem('ag_league_scores') || '[]');
                const players = JSON.parse(localStorage.getItem('ag_league_players') || '[]');

                const filteredTourneys = tourneys.filter(t => t.year === year && t.month === month);
                const tourneyIds = filteredTourneys.map(t => t.id);
                const filteredScores = scores.filter(s => tourneyIds.includes(s.tournament_id));

                const calcPts = (r) => {
                    const pos = parseInt(r);
                    if (pos === 1) return 10;
                    if (pos === 2) return 8;
                    if (pos === 3) return 6;
                    if (pos === 4) return 5;
                    if (pos === 5 || pos === 6) return 4;
                    if (pos === 7 || pos === 8) return 3;
                    if (pos >= 9) return 2;
                    return 0;
                };

                const playerMap = {};
                filteredScores.forEach(sc => {
                    const pName = sc.player_name;
                    if (!playerMap[pName]) {
                        playerMap[pName] = {
                            name: pName,
                            total_points: 0,
                            played_count: 0,
                            weeks: {
                                1: { points: 0, rank: null },
                                2: { points: 0, rank: null },
                                3: { points: 0, rank: null },
                                4: { points: 0, rank: null },
                                5: { points: 0, rank: null }
                            },
                            best_rank: 999
                        };
                    }
                    const t = tourneys.find(x => x.id === sc.tournament_id);
                    const w = t ? t.week : 1;
                    const pts = sc.points || calcPts(sc.rank_position);
                    if (playerMap[pName].weeks[w]) {
                        playerMap[pName].weeks[w].points += pts;
                        if (playerMap[pName].weeks[w].rank === null || sc.rank_position < playerMap[pName].weeks[w].rank) {
                            playerMap[pName].weeks[w].rank = sc.rank_position;
                        }
                    }
                    playerMap[pName].total_points += pts;
                    playerMap[pName].played_count += 1;
                    if (sc.rank_position < playerMap[pName].best_rank) {
                        playerMap[pName].best_rank = sc.rank_position;
                    }
                });

                const leaderboard = Object.values(playerMap).sort((a,b) => b.total_points - a.total_points || a.best_rank - b.best_rank);
                leaderboard.forEach((p, idx) => {
                    p.rank = idx + 1;
                    p.trend_type = 'same';
                    p.trend_value = 0;
                });

                return {
                    year, month,
                    available_years: [new Date().getFullYear()],
                    tournaments: filteredTourneys,
                    leaderboard,
                    players_master: players.map(p => p.name || p),
                    summary: {
                        total_tournaments: filteredTourneys.length,
                        total_players: leaderboard.length,
                        weeks_count: filteredTourneys.length
                    }
                };
            }

            case 'saveTournament': {
                let tourneys = JSON.parse(localStorage.getItem('ag_league_tournaments') || '[]');
                let scores = JSON.parse(localStorage.getItem('ag_league_scores') || '[]');
                let players = JSON.parse(localStorage.getItem('ag_league_players') || '[]');

                const calcPts = (r) => {
                    const pos = parseInt(r);
                    if (pos === 1) return 10;
                    if (pos === 2) return 8;
                    if (pos === 3) return 6;
                    if (pos === 4) return 5;
                    if (pos === 5 || pos === 6) return 4;
                    if (pos === 7 || pos === 8) return 3;
                    if (pos >= 9) return 2;
                    return 0;
                };

                let tId = payload.id ? parseInt(payload.id) : Date.now();
                const tDate = payload.tournament_date || new Date().toISOString().split('T')[0];
                const dObj = new Date(tDate);
                const year = payload.year || dObj.getFullYear();
                const month = payload.month || (dObj.getMonth() + 1);
                const week = payload.week || 1;

                const tourneyObj = {
                    id: tId,
                    title: payload.title || `Turnamen Mingguan (Minggu ${week})`,
                    tournament_date: tDate,
                    year, month, week,
                    notes: payload.notes || ''
                };

                const existingIdx = tourneys.findIndex(t => t.id === tId);
                if (existingIdx !== -1) {
                    tourneys[existingIdx] = tourneyObj;
                    scores = scores.filter(s => s.tournament_id !== tId);
                } else {
                    tourneys.push(tourneyObj);
                }

                (payload.scores || []).forEach((sc, i) => {
                    const pName = (sc.player_name || '').trim();
                    if (!pName) return;
                    const r = sc.rank_position || (i + 1);
                    scores.push({
                        id: Date.now() + i,
                        tournament_id: tId,
                        player_name: pName,
                        rank_position: r,
                        points: calcPts(r),
                        notes: sc.notes || ''
                    });

                    if (!players.some(p => (p.name || p) === pName)) {
                        players.push({ id: Date.now() + i, name: pName });
                    }
                });

                localStorage.setItem('ag_league_tournaments', JSON.stringify(tourneys));
                localStorage.setItem('ag_league_scores', JSON.stringify(scores));
                localStorage.setItem('ag_league_players', JSON.stringify(players));

                return tourneyObj;
            }

            case 'deleteTournament': {
                let tourneys = JSON.parse(localStorage.getItem('ag_league_tournaments') || '[]');
                let scores = JSON.parse(localStorage.getItem('ag_league_scores') || '[]');
                const tId = parseInt(payload.id);
                tourneys = tourneys.filter(t => t.id !== tId);
                scores = scores.filter(s => s.tournament_id !== tId);
                localStorage.setItem('ag_league_tournaments', JSON.stringify(tourneys));
                localStorage.setItem('ag_league_scores', JSON.stringify(scores));
                return { id: tId };
            }

            case 'getLeaguePlayers': {
                const players = JSON.parse(localStorage.getItem('ag_league_players') || '[]');
                return players;
            }

            case 'saveLeaguePlayer': {
                let players = JSON.parse(localStorage.getItem('ag_league_players') || '[]');
                const pName = (payload.name || '').trim();
                if (pName && !players.some(p => (p.name || p) === pName)) {
                    players.push({ id: Date.now(), name: pName, phone: payload.phone || '' });
                    localStorage.setItem('ag_league_players', JSON.stringify(players));
                }
                return { name: pName };
            }

            case 'getPointRules': {
                const defaultRules = {
                    rank_1: 10,
                    rank_2: 8,
                    rank_3: 6,
                    rank_4: 5,
                    rank_5_6: 4,
                    rank_7_8: 3,
                    rank_9_plus: 2
                };
                const saved = JSON.parse(localStorage.getItem('ag_league_point_rules') || 'null');
                return saved || defaultRules;
            }

            case 'savePointRules': {
                const rules = {
                    rank_1: Math.max(0, parseInt(payload.rank_1 ?? 10)),
                    rank_2: Math.max(0, parseInt(payload.rank_2 ?? 8)),
                    rank_3: Math.max(0, parseInt(payload.rank_3 ?? 6)),
                    rank_4: Math.max(0, parseInt(payload.rank_4 ?? 5)),
                    rank_5_6: Math.max(0, parseInt(payload.rank_5_6 ?? 4)),
                    rank_7_8: Math.max(0, parseInt(payload.rank_7_8 ?? 3)),
                    rank_9_plus: Math.max(0, parseInt(payload.rank_9_plus ?? 2))
                };
                localStorage.setItem('ag_league_point_rules', JSON.stringify(rules));
                return rules;
            }

            case 'getSeasonData': {
                const year = payload.year ? parseInt(payload.year) : new Date().getFullYear();
                let season = payload.season ? parseInt(payload.season) : 1;
                if (season < 1 || season > 4) season = 1;

                const seasonMonthsMap = {
                    1: [1, 2, 3],
                    2: [4, 5, 6],
                    3: [7, 8, 9],
                    4: [10, 11, 12]
                };
                const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                const months = seasonMonthsMap[season];

                const tourneys = JSON.parse(localStorage.getItem('ag_league_tournaments') || '[]');
                const scores = JSON.parse(localStorage.getItem('ag_league_scores') || '[]');

                const validTourneys = tourneys.filter(t => t.year === year && months.includes(t.month));
                const tourneyMonthMap = {};
                validTourneys.forEach(t => { tourneyMonthMap[t.id] = t.month; });

                const playerMap = {};
                scores.forEach(s => {
                    const m = tourneyMonthMap[s.tournament_id];
                    if (!m) return;
                    const pName = (s.player_name || '').trim();
                    if (!pName) return;

                    if (!playerMap[pName]) {
                        playerMap[pName] = {
                            name: pName,
                            month_points: { [months[0]]: 0, [months[1]]: 0, [months[2]]: 0 },
                            total_season_points: 0,
                            tournaments_played: 0,
                            first_place_count: 0,
                            best_rank: 999
                        };
                    }

                    const pts = parseInt(s.points) || 0;
                    const pos = parseInt(s.rank_position) || 999;

                    if (playerMap[pName].month_points[m] !== undefined) {
                        playerMap[pName].month_points[m] += pts;
                    }
                    playerMap[pName].total_season_points += pts;
                    playerMap[pName].tournaments_played += 1;
                    if (pos === 1) playerMap[pName].first_place_count += 1;
                    if (pos < playerMap[pName].best_rank) playerMap[pName].best_rank = pos;
                });

                const leaderboard = Object.values(playerMap);
                leaderboard.sort((a, b) => {
                    if (b.total_season_points !== a.total_season_points) return b.total_season_points - a.total_season_points;
                    if (b.first_place_count !== a.first_place_count) return b.first_place_count - a.first_place_count;
                    return a.best_rank - b.best_rank;
                });

                leaderboard.forEach((p, idx) => { p.rank = idx + 1; });

                return {
                    year,
                    season,
                    season_name: `Season ${season} (${monthNames[months[0]]} – ${monthNames[months[2]]} ${year})`,
                    months: [
                        { number: months[0], name: monthNames[months[0]] },
                        { number: months[1], name: monthNames[months[1]] },
                        { number: months[2], name: monthNames[months[2]] }
                    ],
                    leaderboard,
                    total_players: leaderboard.length
                };
            }

            case 'getPrizeData': {
                const year = payload.year ? parseInt(payload.year) : new Date().getFullYear();
                const month = payload.month ? parseInt(payload.month) : (new Date().getMonth() + 1);
                const tourneys = JSON.parse(localStorage.getItem('ag_league_tournaments') || '[]');
                const scores = JSON.parse(localStorage.getItem('ag_league_scores') || '[]');

                const validTourneys = tourneys.filter(t => t.year === year && t.month === month);
                validTourneys.sort((a, b) => a.week - b.week);

                let totalGross = 0;
                let totalCut = 0;
                let totalNet = 0;
                let totalPlayers = 0;

                const weeks = validTourneys.map(t => {
                    const tScores = scores.filter(s => s.tournament_id === t.id);
                    tScores.sort((a, b) => (parseInt(a.rank_position) || 0) - (parseInt(b.rank_position) || 0));

                    const pCount = tScores.length;
                    const fee = parseInt(t.entry_fee) || 10000;
                    const gross = pCount * fee;
                    const cut = parseInt(t.prize_cut) || 0;
                    const cutNote = t.prize_cut_note || '';
                    const net = Math.max(0, gross - cut);

                    const p1 = tScores.find(s => parseInt(s.rank_position) === 1);
                    const p2 = tScores.find(s => parseInt(s.rank_position) === 2);
                    const p3 = tScores.find(s => parseInt(s.rank_position) === 3);

                    const pct1 = t.prize_pct_1 !== undefined ? parseInt(t.prize_pct_1) : 50;
                    const pct2 = t.prize_pct_2 !== undefined ? parseInt(t.prize_pct_2) : 30;
                    const pct3 = t.prize_pct_3 !== undefined ? parseInt(t.prize_pct_3) : 20;

                    totalGross += gross;
                    totalCut += cut;
                    totalNet += net;
                    totalPlayers += pCount;

                    return {
                        id: t.id,
                        week: t.week,
                        title: t.title,
                        tournament_date: t.tournament_date,
                        player_count: pCount,
                        entry_fee: fee,
                        gross_pool: gross,
                        prize_cut: cut,
                        prize_cut_note: cutNote,
                        net_pool: net,
                        pct_1: pct1,
                        pct_2: pct2,
                        pct_3: pct3,
                        winner_1: p1 ? p1.player_name : '-',
                        prize_1: Math.round((net * pct1) / 100),
                        winner_2: p2 ? p2.player_name : '-',
                        prize_2: Math.round((net * pct2) / 100),
                        winner_3: p3 ? p3.player_name : '-',
                        prize_3: Math.round((net * pct3) / 100)
                    };
                });

                return {
                    year,
                    month,
                    summary: {
                        total_tournaments: validTourneys.length,
                        total_players: totalPlayers,
                        total_gross_pool: totalGross,
                        total_cut: totalCut,
                        total_net_pool: totalNet
                    },
                    weeks
                };
            }

            case 'savePrizeSettings': {
                const tourneys = JSON.parse(localStorage.getItem('ag_league_tournaments') || '[]');
                const tId = parseInt(payload.id);
                const idx = tourneys.findIndex(t => t.id === tId);
                if (idx !== -1) {
                    tourneys[idx].entry_fee = parseInt(payload.entry_fee) || 10000;
                    tourneys[idx].prize_cut = parseInt(payload.prize_cut) || 0;
                    tourneys[idx].prize_cut_note = payload.prize_cut_note || '';
                    tourneys[idx].prize_pct_1 = payload.prize_pct_1 !== undefined ? parseInt(payload.prize_pct_1) : 50;
                    tourneys[idx].prize_pct_2 = payload.prize_pct_2 !== undefined ? parseInt(payload.prize_pct_2) : 30;
                    tourneys[idx].prize_pct_3 = payload.prize_pct_3 !== undefined ? parseInt(payload.prize_pct_3) : 20;
                    localStorage.setItem('ag_league_tournaments', JSON.stringify(tourneys));
                }
                return { id: tId };
            }

            default:
                throw new Error('Unknown action: ' + action);
        }
    }
};

