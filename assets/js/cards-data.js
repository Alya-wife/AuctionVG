/**
 * Card Database Layer - NitipPro Vanguard Cards Catalog
 * Database kartu per promo set untuk inventaris tanpa database server
 * Gambar disimpan di: assets/images/cards/[nama_file]
 */

const DEFAULT_CARD_DATABASE = [
  {
    "id": "D-PR-001",
    "name": "Chakrabarthi True Dragon, Mahar Nirvana",
    "grade": "3",
    "set": "D-PR 2024 Promo Series",
    "nation": "Dragon Empire",
    "language": "JP",
    "image": "D-PR-001.webp"
  },
  {
    "id": "D-PR-002",
    "name": "Apex Ruler, Bastion",
    "grade": "3",
    "set": "D-PR 2024 Promo Series",
    "nation": "Keter Sanctuary",
    "language": "JP",
    "image": "D-PR-002.webp"
  },
  {
    "id": "D-PR-003",
    "name": "Diabolos, \"Violence\" Bruce",
    "grade": "3",
    "set": "D-PR 2024 Promo Series",
    "nation": "Dark States",
    "language": "EN",
    "image": "D-PR-003.webp"
  },
  {
    "id": "D-PR-004",
    "name": "Sylvan Horned Beast King, Magnolia",
    "grade": "3",
    "set": "D-PR 2024 Promo Series",
    "nation": "Stoicheia",
    "language": "JP",
    "image": "D-PR-004.webp"
  },
  {
    "id": "D-PR-005",
    "name": "Aurora Fierce Princess, Seraph Purelight",
    "grade": "4",
    "set": "D-PR 2024 Promo Series",
    "nation": "Brandt Gate",
    "language": "EN",
    "image": "D-PR-005.webp"
  },
  {
    "id": "D-PR-006",
    "name": "Heartfelt Song, Loronerol",
    "grade": "3",
    "set": "D-PR 2024 Promo Series",
    "nation": "Lyrical Monasterio",
    "language": "JP",
    "image": "D-PR-006.webp"
  },
  {
    "id": "D-PR-007",
    "name": "Trickstar",
    "grade": "0",
    "set": "D-PR 2024 Promo Series",
    "nation": "Dragon Empire",
    "language": "JP",
    "image": "D-PR-007.webp"
  },
  {
    "id": "D-PR-008",
    "name": "Knight of Heavenly Bow, Base",
    "grade": "1",
    "set": "D-PR 2024 Promo Series",
    "nation": "Keter Sanctuary",
    "language": "JP",
    "image": "D-PR-008.webp"
  },
  {
    "id": "V-PR-001",
    "name": "Dragonic Overlord",
    "grade": "3",
    "set": "V-PR Promo Pack Vol. 1",
    "nation": "Dragon Empire",
    "language": "JP",
    "image": "V-PR-001.webp"
  },
  {
    "id": "V-PR-002",
    "name": "Blaster Blade",
    "grade": "2",
    "set": "V-PR Promo Pack Vol. 1",
    "nation": "Keter Sanctuary",
    "language": "EN",
    "image": "V-PR-002.webp"
  },
  {
    "id": "V-PR-003",
    "name": "Phantom Blaster Dragon",
    "grade": "3",
    "set": "V-PR Promo Pack Vol. 1",
    "nation": "Dark States",
    "language": "JP",
    "image": "V-PR-003.webp"
  },
  {
    "id": "V-PR-004",
    "name": "Vairina Liber",
    "grade": "2",
    "set": "V-PR Promo Pack Vol. 1",
    "nation": "Dragon Empire",
    "language": "EN",
    "image": "V-PR-004.webp"
  },
  {
    "id": "V-PR-005",
    "name": "Alfred Early",
    "grade": "2",
    "set": "V-PR Promo Pack Vol. 1",
    "nation": "Keter Sanctuary",
    "language": "EN",
    "image": "V-PR-005.webp"
  },
  {
    "id": "V-PR-006",
    "name": "Sylvan Horned Beast, Charis",
    "grade": "1",
    "set": "V-PR Promo Pack Vol. 1",
    "nation": "Stoicheia",
    "language": "JP",
    "image": "V-PR-006.webp"
  },
  {
    "id": "SHOP-PR-001",
    "name": "Dragheart, Luquier",
    "grade": "3",
    "set": "Shop Tournament PR 2024",
    "nation": "Dark States",
    "language": "JP",
    "image": "SHOP-PR-001.webp"
  },
  {
    "id": "SHOP-PR-002",
    "name": "Cardinal Deus, Orfist",
    "grade": "3",
    "set": "Shop Tournament PR 2024",
    "nation": "Brandt Gate",
    "language": "EN",
    "image": "SHOP-PR-002.webp"
  },
  {
    "id": "SHOP-PR-003",
    "name": "Prism Bird",
    "grade": "1",
    "set": "Shop Tournament PR 2024",
    "nation": "Lyrical Monasterio",
    "language": "JP",
    "image": "SHOP-PR-003.webp"
  },
  {
    "id": "SHOP-PR-004",
    "name": "Triglav",
    "grade": "0",
    "set": "Shop Tournament PR 2024",
    "nation": "Dragon Empire",
    "language": "JP",
    "image": "SHOP-PR-004.webp"
  },
  {
    "id": "VGD-PR-001",
    "name": "Youthberk \"RevolForm: Gust\"",
    "grade": "3",
    "set": "Vanguard Day Promo Special",
    "nation": "Keter Sanctuary",
    "language": "JP",
    "image": "VGD-PR-001.webp"
  },
  {
    "id": "VGD-PR-002",
    "name": "Drajeweled, \"Ignis\"",
    "grade": "3",
    "set": "Vanguard Day Promo Special",
    "nation": "Dark States",
    "language": "JP",
    "image": "VGD-PR-002.webp"
  },
  {
    "id": "VGD-PR-003",
    "name": "Lianorn \"Vivace\"",
    "grade": "3",
    "set": "Vanguard Day Promo Special",
    "nation": "Stoicheia",
    "language": "EN",
    "image": "VGD-PR-003.webp"
  }
];

const CardDB = {
  _cards: null,

  init() {
    if (!this._cards) {
      try {
        const stored = localStorage.getItem('nitip_card_database');
        if (stored) {
          this._cards = JSON.parse(stored);
          let modified = false;
          this._cards.forEach(c => {
            if (c.image && (c.image.endsWith('.jpg') || c.image.endsWith('.jpeg') || c.image.endsWith('.png'))) {
              c.image = c.image.replace(/\.(jpg|jpeg|png)$/i, '.webp');
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
          }
        } else {
          this._cards = [...DEFAULT_CARD_DATABASE];
          localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
        }
      } catch (e) {
        this._cards = [...DEFAULT_CARD_DATABASE];
      }
      this.migrateCacheToWebp();
    }
    return this._cards;
  },

  async migrateCacheToWebp() {
    try {
      const cacheStr = localStorage.getItem('ag_card_webp_cache');
      if (!cacheStr) return;
      const cache = JSON.parse(cacheStr);
      let changed = false;
      for (const key of Object.keys(cache)) {
        let newKey = key;
        if (key.match(/\.(jpg|jpeg|png)$/i)) {
          newKey = key.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          cache[newKey] = cache[key];
          delete cache[key];
          changed = true;
        }
        if (typeof cache[newKey] === 'string' && cache[newKey].startsWith('data:image/') && !cache[newKey].startsWith('data:image/webp')) {
          if (window.UI && typeof window.UI.convertDataUrlToWebP === 'function') {
            try {
              cache[newKey] = await window.UI.convertDataUrlToWebP(cache[newKey]);
              changed = true;
            } catch (err) {}
          }
        }
      }
      if (changed) {
        localStorage.setItem('ag_card_webp_cache', JSON.stringify(cache));
      }
    } catch (e) {}
  },

  getAll() {
    this.init();
    return this._cards;
  },

  getSets() {
    this.init();
    const sets = [...new Set(this._cards.map(c => c.set).filter(Boolean))];
    return sets.sort();
  },

  getBySet(setName) {
    this.init();
    if (!setName) return this._cards;
    return this._cards.filter(c => c.set === setName);
  },

  getById(id) {
    this.init();
    return this._cards.find(c => c.id === id);
  },

  findByName(name) {
    if (!name) return null;
    this.init();
    const clean = name.toLowerCase().trim();
    return this._cards.find(c => c.name.toLowerCase().trim() === clean);
  },

  search(query, setName = '') {
    this.init();
    const q = (query || '').toLowerCase().trim();
    return this._cards.filter(c => {
      const matchSet = !setName || c.set === setName;
      const matchQ = !q || c.name.toLowerCase().includes(q) || (c.id && c.id.toLowerCase().includes(q));
      return matchSet && matchQ;
    });
  },

  getImageUrl(imageFileName) {
    if (!imageFileName) return 'assets/images/cards/placeholder_card.svg';
    // Check local webp cache
    try {
      const cacheMap = JSON.parse(localStorage.getItem('ag_card_webp_cache') || '{}');
      const webpKey = imageFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (cacheMap[webpKey]) return cacheMap[webpKey];
      if (cacheMap[imageFileName]) return cacheMap[imageFileName];
    } catch (e) {}
    // If it's already a full URL or data URI
    if (imageFileName.startsWith('http://') || imageFileName.startsWith('https://') || imageFileName.startsWith('data:')) {
      return imageFileName;
    }
    // If it already contains path
    if (imageFileName.includes('/')) {
      return imageFileName;
    }
    const cleanName = imageFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    return `assets/images/cards/${cleanName}`;
  },

  updateCard(id, updatedData) {
    this.init();
    const idx = this._cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      this._cards[idx] = { ...this._cards[idx], ...updatedData };
      try {
        localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
      } catch (e) {}
      return this._cards[idx];
    }
    return null;
  },

  deleteCard(id) {
    this.init();
    this._cards = this._cards.filter(c => c.id !== id);
    try {
      localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
    } catch (e) {}
    return true;
  },

  addCard(card) {
    this.init();
    this._cards.push(card);
    try {
      localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
    } catch (e) {}
    return card;
  }
};

// Expose globally
window.CardDB = CardDB;
CardDB.init();
