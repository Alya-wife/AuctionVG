/**
 * API Layer - NitipPro Card Inventory
 * Mode saat ini: LocalStorage (localhost)
 * Untuk switch ke Google Apps Script: ubah CONFIG.USE_LOCAL = false
 * dan isi CONFIG.GAS_URL dengan URL deployment Apps Script Anda.
 *
 * GAS akan membaca/tulis ke Google Sheets:
 *   - Login  : Sheet "Users"  di spreadsheet SHEET_LOGIN_ID
 *   - Data   : Sheet "Inventory", "Auctions", "AuctionItems", "Shipment", "Payments", "Owners", "History", "Logs"
 *              di spreadsheet SHEET_DATA_ID
 */

const API = {

    // ─── Helper ──────────────────────────────────────────────────────────────
    delay: (ms) => new Promise(r => setTimeout(r, ms)),

    async request(action, payload = {}) {
        if (CONFIG.USE_LOCAL) {
            return this._localHandler(action, payload);
        }
        // GAS request
        const body = JSON.stringify({ action, ...payload });
        const res = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error('GAS Raw Response:', text);
            if (text.includes('Script function not found: doGet')) {
                throw new Error('Google Apps Script belum memiliki fungsi doGet(e). Silakan perbarui kode backend.gs di Google Apps Script dan Deploy ulang (New Deployment).');
            }
            throw new Error('Gagal memproses respon server: Respon bukan JSON yang valid.');
        }
        if (json.status === 'error') throw new Error(json.message);
        return json.data;
    },

    // ─── Seed Data ───────────────────────────────────────────────────────────
    _seed() {
        if (!localStorage.getItem('ag_inventory')) {
            const data = [
                { id: 'C001', name: 'Dragonic Overlord', type: 'JP', nation: 'Dragon Empire', owner: 'Budi', date: '2026-07-15', status: 'Available' },
                { id: 'C002', name: 'Alfred Early', type: 'EN', nation: 'Keter Sanctuary', owner: 'Andi', date: '2026-07-16', status: 'Sold', buyer: 'Citra', price: 150000, soldDate: '2026-07-18' },
                { id: 'C003', name: 'Sylvan Horned Beast', type: 'JP', nation: 'Stoicheia', owner: 'Budi', date: '2026-07-17', status: 'Waiting Shipment', buyer: 'Doni', price: 120000, soldDate: '2026-07-19' },
                { id: 'C004', name: 'Vairina Liber', type: 'EN', nation: 'Dragon Empire', owner: 'Citra', date: '2026-07-18', status: 'Available' },
                { id: 'C005', name: 'Phantom Blaster Dragon', type: 'JP', nation: 'Dark States', owner: 'Andi', date: '2026-07-19', status: 'Waiting Payment', buyer: 'Eko', price: 200000, soldDate: '2026-07-20', shipDate: '2026-07-21', trackingNumber: 'JX123456789ID' }
            ];
            localStorage.setItem('ag_inventory', JSON.stringify(data));
        } else {
            // Migrate existing inventory items to ensure type property exists
            try {
                let items = JSON.parse(localStorage.getItem('ag_inventory') || '[]');
                let modified = false;
                items.forEach(c => {
                    if (!c.type) {
                        c.type = (c.language || c.image || 'JP').toString().toUpperCase() === 'EN' ? 'EN' : 'JP';
                        modified = true;
                    }
                });
                if (modified) localStorage.setItem('ag_inventory', JSON.stringify(items));
            } catch(e) {}
        }
        if (!localStorage.getItem('ag_auctions')) {
            localStorage.setItem('ag_auctions', JSON.stringify([]));
        }
    },

    // ─── LocalStorage Handler ─────────────────────────────────────────────────
    async _localHandler(action, payload) {
        await this.delay(200);
        this._seed();

        const inv = () => JSON.parse(localStorage.getItem('ag_inventory') || '[]');
        const aucs = () => JSON.parse(localStorage.getItem('ag_auctions') || '[]');
        const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

        switch (action) {
            // Auth
            case 'login': {
                const { username, password } = payload;
                if (username === 'admin' && password === 'admin123')
                    return { id: 1, username: 'admin', name: 'Pacar Alya', role: 'Pacar Alya' };
                throw new Error('Username atau password salah.');
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
                    save('ag_inventory', list);
                    return list[i];
                }
                throw new Error('Card not found');
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

            default:
                throw new Error('Unknown action: ' + action);
        }
    }
};

