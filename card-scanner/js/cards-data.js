/**
 * Standalone Card Database Layer & Image Utilities
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
  }
];

const CardDB = {
  _cards: null,

  init() {
    if (!this._cards) {
      try {
        const stored = localStorage.getItem('standalone_card_database');
        if (stored) {
          this._cards = JSON.parse(stored);
        } else {
          this._cards = [...DEFAULT_CARD_DATABASE];
          localStorage.setItem('standalone_card_database', JSON.stringify(this._cards));
        }
      } catch (e) {
        this._cards = [...DEFAULT_CARD_DATABASE];
      }
    }
    return this._cards;
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

  updateCard(id, updatedData) {
    this.init();
    const idx = this._cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      this._cards[idx] = { ...this._cards[idx], ...updatedData };
      try {
        localStorage.setItem('standalone_card_database', JSON.stringify(this._cards));
      } catch (e) {}
      return this._cards[idx];
    }
    return null;
  },

  addCard(card) {
    this.init();
    this._cards.unshift(card);
    try {
      localStorage.setItem('standalone_card_database', JSON.stringify(this._cards));
    } catch (e) {}
    return card;
  },

  deleteCard(id) {
    this.init();
    this._cards = this._cards.filter(c => c.id !== id);
    try {
      localStorage.setItem('standalone_card_database', JSON.stringify(this._cards));
    } catch (e) {}
    return true;
  }
};

/**
 * Konversi DataURL gambar ke format WebP terkompresi
 */
function convertDataUrlToWebP(dataUrl, quality = 0.82) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return resolve(dataUrl);
    }
    if (dataUrl.startsWith('data:image/webp')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Inisialisasi
CardDB.init();
