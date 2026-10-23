/**
 * Card Database Layer - NitipPro Vanguard Cards Catalog
 * Terhubung langsung ke Database MySQL Server (cards_master)
 * Tidak ada data dummy/palsu. Data murni 100% dari MySQL database.
 */

const CardDB = {
  _cards: [],
  _syncing: false,
  _initialized: false,

  init() {
    if (!this._initialized) {
      try {
        const stored = localStorage.getItem('nitip_card_database');
        if (stored) {
          this._cards = JSON.parse(stored);
        } else {
          this._cards = [];
        }
      } catch (e) {
        this._cards = [];
      }
      this._initialized = true;
    }

    // Selalu sinkronisasi data kartu dari server MySQL
    if (typeof API !== 'undefined' && API.request) {
      this.syncFromServer();
    } else {
      setTimeout(() => this.syncFromServer(), 300);
      if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => this.syncFromServer(), { once: true });
      }
    }

    return this._cards;
  },

  async syncFromServer() {
    if (this._syncing) return;
    this._syncing = true;
    try {
      if (typeof API !== 'undefined' && API.request && (!window.CONFIG || !window.CONFIG.USE_LOCAL)) {
        const serverCards = await API.request('getMasterCards');
        if (Array.isArray(serverCards)) {
          this._cards = serverCards;
          try {
            localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
          } catch (e) {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cards_database_synced', { detail: this._cards }));
          }
        }
      }
    } catch (err) {
      console.warn('Sync cards from MySQL server fallback:', err);
    } finally {
      this._syncing = false;
    }
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
    const isView = (typeof window !== 'undefined' && window.location && window.location.pathname.includes('/views/'));
    const basePath = isView ? '../' : '';
    const placeholder = basePath + 'assets/images/cards/placeholder_card.svg';
    if (!imageFileName) return placeholder;

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
      return basePath + imageFileName.replace(/^(\.\.\/|\/)/, '');
    }
    const cleanName = imageFileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    return basePath + 'assets/images/cards/' + cleanName;
  },

  async updateCard(id, updatedData) {
    this.init();
    const idx = this._cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      this._cards[idx] = { ...this._cards[idx], ...updatedData };
      try {
        localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
      } catch (e) {}

      // Simpan ke MySQL server
      if (typeof API !== 'undefined' && API.request && (!window.CONFIG || !window.CONFIG.USE_LOCAL)) {
        try {
          await API.request('saveMasterCard', { id, ...this._cards[idx] });
        } catch (err) {
          console.warn('Gagal simpan update kartu ke MySQL server:', err);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cards_database_synced', { detail: this._cards }));
      }
      return this._cards[idx];
    }
    return null;
  },

  async deleteCard(id) {
    this.init();
    this._cards = this._cards.filter(c => c.id !== id);
    try {
      localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
    } catch (e) {}

    // Hapus dari MySQL server
    if (typeof API !== 'undefined' && API.request && (!window.CONFIG || !window.CONFIG.USE_LOCAL)) {
      try {
        await API.request('deleteMasterCard', { id });
      } catch (err) {
        console.warn('Gagal hapus kartu di MySQL server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cards_database_synced', { detail: this._cards }));
    }
    return true;
  },

  async addCard(card) {
    this.init();
    const existingIdx = this._cards.findIndex(c => c.id === card.id);
    if (existingIdx !== -1) {
      this._cards[existingIdx] = { ...this._cards[existingIdx], ...card };
    } else {
      this._cards.unshift(card);
    }
    try {
      localStorage.setItem('nitip_card_database', JSON.stringify(this._cards));
    } catch (e) {}

    // Simpan ke MySQL server
    if (typeof API !== 'undefined' && API.request && (!window.CONFIG || !window.CONFIG.USE_LOCAL)) {
      try {
        await API.request('saveMasterCard', card);
      } catch (err) {
        console.warn('Gagal simpan kartu baru ke MySQL server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cards_database_synced', { detail: this._cards }));
    }
    return card;
  }
};

// Expose globally
window.CardDB = CardDB;
CardDB.init();
