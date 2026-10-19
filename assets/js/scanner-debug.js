/**
 * Scanner Kartu Vanguard - NitipPro
 */
(function() {
  'use strict';

  function getApiKey() {
    return localStorage.getItem('gemini_api_key') || (typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : '') || '';
  }

  // Konfigurasi Range Set Promo
  // Range umum berdasarkan digit nomor kartu (cth: D-PR/1662 -> D-PR/1600-1700, D-PR/1705 -> D-PR/1700-1800)
  const PROMO_SET_RANGES = [
    { prefix: 'D-PR', min: 1800, max: 1899, name: 'D-PR/1800-1900' },
    { prefix: 'D-PR', min: 1700, max: 1799, name: 'D-PR/1700-1800' },
    { prefix: 'D-PR', min: 1600, max: 1699, name: 'D-PR/1600-1700' },
    { prefix: 'D-PR', min: 1500, max: 1599, name: 'D-PR/1500-1600' },
    { prefix: 'D-PR', min: 1400, max: 1499, name: 'D-PR/1400-1500' },
    { prefix: 'D-PR', min: 1300, max: 1399, name: 'D-PR/1300-1400' },
    { prefix: 'D-PR', min: 1200, max: 1299, name: 'D-PR/1200-1300' },
    { prefix: 'D-PR', min: 1100, max: 1199, name: 'D-PR/1100-1200' },
    { prefix: 'D-PR', min: 1000, max: 1099, name: 'D-PR/1000-1100' },
    { prefix: 'D-PR', min: 1,    max: 999,  name: 'D-PR 2024 Promo Series' },
    { prefix: 'DZ-BT', min: 1,   max: 999,  name: 'DZ Booster Set' },
    { prefix: 'D-BT',  min: 1,   max: 999,  name: 'D Booster Set' },
    { prefix: 'V-PR',  min: 1,   max: 999,  name: 'V-PR Promo Pack' }
  ];

  // DOM Elements
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const cardPreview = document.getElementById('cardPreview');
  const btnScan = document.getElementById('btnScan');
  const btnScanText = document.getElementById('btnScanText');
  const statusMsg = document.getElementById('statusMsg');

  // Form Elements (Hanya 1 field nama English)
  const nameEn = document.getElementById('nameEn');
  const cardCode = document.getElementById('cardCode');
  const language = document.getElementById('language');
  const grade = document.getElementById('grade');
  const nation = document.getElementById('nation');
  const power = document.getElementById('power');
  const shield = document.getElementById('shield');
  const cardSet = document.getElementById('cardSet');
  const setPromoList = document.getElementById('setPromoList');
  const btnSave = document.getElementById('btnSave');
  const btnClear = document.getElementById('btnClear');

  let currentBase64 = null;
  let currentMime = 'image/png';

  // Inisialisasi
  function init() {
    if (typeof UI !== 'undefined' && UI.init) {
      UI.init();
    }
    setupImageHandlers();
    setupActions();
    populatePromoSetDatalist();
    loadDefaultImageBase64();
  }

  function setStatus(text, type = 'loading') {
    statusMsg.className = `scan-status-msg ${type}`;
    statusMsg.textContent = text;
    statusMsg.style.display = 'block';
  }

  function hideStatus() {
    statusMsg.style.display = 'none';
  }

  // Isi datalist Set Promo
  function populatePromoSetDatalist() {
    if (!setPromoList) return;
    const dbSets = (typeof CardDB !== 'undefined' && CardDB.getSets) ? CardDB.getSets() : [];
    const rangeSets = PROMO_SET_RANGES.map(r => r.name);
    const combined = [...new Set([...rangeSets, ...dbSets])].filter(Boolean);
    setPromoList.innerHTML = combined.map(s => `<option value="${s}">`).join('');
  }

  // Tentukan Set Promo otomatis dari nomor digit kode kartu
  function detectPromoSet(code) {
    if (!code) return '';
    const cleanCode = code.trim().toUpperCase();
    const match = cleanCode.match(/([A-Z0-9]+-[A-Z]+)[/-](\d+)/i);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      const found = PROMO_SET_RANGES.find(r => r.prefix === prefix && num >= r.min && num <= r.max);
      if (found) return found.name;
      // Auto range ratusan (cth: D-PR/1600-1700)
      const floor = Math.floor(num / 100) * 100;
      return `${prefix}/${floor}-${floor + 100}`;
    }
    return '';
  }

  // Pre-load default preview sebagai base64 via canvas
  function loadDefaultImageBase64() {
    if (cardPreview.complete && cardPreview.naturalWidth > 0) {
      extractBase64FromImage(cardPreview);
    } else {
      cardPreview.onload = () => extractBase64FromImage(cardPreview);
    }
  }

  function extractBase64FromImage(imgEl) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgEl.naturalWidth || 400;
      canvas.height = imgEl.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0);
      currentBase64 = canvas.toDataURL('image/png').split(',')[1];
      currentMime = 'image/png';
    } catch (e) {
      fetch(imgEl.src)
        .then(r => r.blob())
        .then(b => {
          currentMime = b.type || 'image/png';
          const reader = new FileReader();
          reader.onload = ev => {
            currentBase64 = ev.target.result.split(',')[1];
          };
          reader.readAsDataURL(b);
        })
        .catch(() => {});
    }
  }

  // Handle Input Gambar (File, Drag/Drop, Paste)
  function setupImageHandlers() {
    // Klik area dropzone
    dropArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadFile(e.target.files[0]);
      }
    });

    // Drag & Drop
    [dropArea, cardPreview.parentElement].forEach(el => {
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.background = 'rgba(79, 142, 247, 0.2)';
      });
      el.addEventListener('dragleave', () => {
        dropArea.style.background = '';
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.background = '';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadFile(e.dataTransfer.files[0]);
        }
      });
    });

    // Paste Clipboard (Ctrl + V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          loadFile(blob);
          break;
        }
      }
    });
  }

  function loadFile(file) {
    currentMime = file.type || 'image/png';
    const reader = new FileReader();
    reader.onload = (e) => {
      cardPreview.src = e.target.result;
      currentBase64 = e.target.result.split(',')[1];
      setStatus('Gambar berhasil dimuat. Klik "Scan Kartu".', 'success');
    };
    reader.readAsDataURL(file);
  }

  function setupActions() {
    btnScan.addEventListener('click', scanCard);
    btnClear.addEventListener('click', clearForm);
    btnSave.addEventListener('click', saveCardToDatabase);

    const btnApiKey = document.getElementById('btnApiKey');
    if (btnApiKey) {
      btnApiKey.addEventListener('click', () => {
        const current = getApiKey();
        const input = prompt(
          'Masukkan Google Gemini API Key Anda:\n(Dapatkan API Key baru secara gratis di https://aistudio.google.com/app/apikey)',
          current
        );
        if (input !== null) {
          if (input.trim()) {
            localStorage.setItem('gemini_api_key', input.trim());
            if (typeof CONFIG !== 'undefined') CONFIG.GEMINI_API_KEY = input.trim();
            alert('API Key berhasil disimpan di browser!');
          } else {
            localStorage.removeItem('gemini_api_key');
            alert('API Key dihapus dari browser.');
          }
        }
      });
    }
  }

  function clearForm() {
    nameEn.value = '';
    cardCode.value = '';
    power.value = '';
    shield.value = '';
    cardSet.value = '';
    grade.value = '1';
    hideStatus();
  }

  // Eksekusi Scan Kartu
  async function scanCard() {
    let activeKey = getApiKey();
    if (!activeKey) {
      const input = prompt(
        'Google Gemini API Key belum disetel.\n\nSilakan masukkan Gemini API Key Anda (dapatkan gratis di https://aistudio.google.com/app/apikey):'
      );
      if (input && input.trim()) {
        localStorage.setItem('gemini_api_key', input.trim());
        if (typeof CONFIG !== 'undefined') CONFIG.GEMINI_API_KEY = input.trim();
        activeKey = input.trim();
      } else {
        setStatus('Scan dibatalkan: API Key diperlukan.', 'error');
        return;
      }
    }

    if (!currentBase64) {
      loadDefaultImageBase64();
      if (!currentBase64) {
        setStatus('Pilih gambar kartu terlebih dahulu!', 'error');
        return;
      }
    }

    btnScan.disabled = true;
    btnScanText.textContent = 'Sedang Memindai...';
    setStatus('Menganalisa kartu dengan AI Vision...', 'loading');

    try {
      const prompt = `Analyze this Cardfight!! Vanguard card image very carefully following game layout specifications:

1. TOP-LEFT CORNER (GRADE):
- Read the Grade number located in the top-left corner icon/shield (directly above or beside the word 'グレード' or 'GRADE').
- It is ALWAYS a single digit: 0, 1, 2, 3, or 4.
- Make sure to extract this number even if the icon is green, blue, yellow, etc.
- Output 'grade' as integer (0, 1, 2, 3, or 4).

2. CARD NAME & TRANSLATION:
- Read the card name text in the central white oval/banner near the bottom.
- If the card is in Japanese (JP): determine its official English name (or accurate translation) and put it in 'name_en'. Also provide the Japanese text in 'name_jp'.
- If the card is in English (EN): put the name in 'name_en'.

3. BOTTOM-LEFT CORNER (CARD CODE):
- Read the card serial number printed at the bottom-left edge (e.g. D-PR/1662, D-PR/1705, DZ-BT01/001, etc.).
- Output as 'card_code'.

4. CARD TYPE & NATION:
- Check if it is a Normal Unit or an Order card (labeled 'ノーマルオーダー', 'ブリッツオーダー', or 'セットオーダー' on bottom-left).
- FOR NORMAL UNITS: Nation ribbon is located at the BOTTOM-RIGHT corner.
- FOR ORDER CARDS: Nation ribbon is located DIRECTLY UNDERNEATH the white card name banner in the center! (e.g. green oval 'ストイケイア' = Stoicheia).
- Determine Nation by color & text:
  * Dark Blue (biru tua) = "Dark States"
  * Red (merah) = "Dragon Empire"
  * Pink (merah muda) = "Lyrical Monasterio"
  * Green (hijau) = "Stoicheia"
  * Grey / Slate (abu-abu) = "Brandt Gate"
  * Yellow / Gold (kuning) = "Keter Sanctuary"
- Output 'nation' matching one of the 6 exact names above.

5. POWER & SHIELD:
- Normal units have Power (e.g. 8000, 13000) and Shield (e.g. 5000, 10000).
- Order cards DO NOT have Power or Shield (return null or empty).

Return ONLY valid JSON:
{
  "grade": 1,
  "language": "JP",
  "name_en": "In the Forest Flourishing in Silverwhite",
  "name_jp": "白銀に茂る森で",
  "card_code": "D-PR/1662",
  "nation": "Stoicheia",
  "is_order": true,
  "power": null,
  "shield": null
}`;

      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: currentMime, data: currentBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
      };

      // Panggil Gemini Vision API (coba gemini-2.5-flash, gemini-1.5-flash, gemini-flash-latest)
      let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${activeKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const resJson = await res.json();
      if (!res.ok) {
        const errMsg = resJson.error?.message || 'Gagal memanggil Gemini API';
        if (errMsg.toLowerCase().includes('leak') || errMsg.toLowerCase().includes('api_key_invalid')) {
          const newKey = prompt(
            'API Key ini dinonaktifkan oleh Google karena terdeteksi bocor di GitHub.\n\nSilakan buat API Key baru secara gratis di:\nhttps://aistudio.google.com/app/apikey\n\nMasukkan API Key baru Anda di sini:'
          );
          if (newKey && newKey.trim()) {
            localStorage.setItem('gemini_api_key', newKey.trim());
            if (typeof CONFIG !== 'undefined') CONFIG.GEMINI_API_KEY = newKey.trim();
            alert('API Key baru berhasil disimpan! Silakan klik tombol "Scan Kartu" kembali.');
          }
        }
        throw new Error(errMsg);
      }

      let textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      textOutput = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();

      const aiData = JSON.parse(textOutput);
      const isJp = (aiData.language || 'JP').toUpperCase().startsWith('J');

      let finalEnglishName = aiData.name_en || aiData.card_name_raw || '';
      let finalGrade = aiData.grade !== undefined && aiData.grade !== null ? String(aiData.grade).replace(/\D/g, '') : '1';
      let finalNation = aiData.nation || 'Dark States';
      let finalCode = aiData.card_code || '';

      // Jika JP, lakukan pencarian ke Fandom Wiki untuk validasi nama English resmi
      if (isJp && (finalCode || aiData.name_jp)) {
        setStatus('Mencocokkan nama resmi di Fandom Wiki...', 'loading');
        try {
          const wikiData = await lookupFandom(finalCode, aiData.name_jp || aiData.card_name_raw);
          if (wikiData) {
            if (wikiData.title && !wikiData.title.toLowerCase().includes('list of')) {
              finalEnglishName = wikiData.title;
            }
            if (wikiData.nation) finalNation = wikiData.nation;
            if (wikiData.grade && String(wikiData.grade).trim() !== '') {
              const parsedG = String(wikiData.grade).replace(/\D/g, '');
              if (['0', '1', '2', '3', '4'].includes(parsedG)) {
                finalGrade = parsedG;
              }
            }
            if (wikiData.power) aiData.power = wikiData.power;
            if (wikiData.shield) aiData.shield = wikiData.shield;
          }
        } catch (e) {
          console.warn('Fandom lookup:', e);
        }
      }

      // 1. Nama Kartu (Hanya English)
      nameEn.value = finalEnglishName;

      // 2. Kode Kartu
      cardCode.value = finalCode;

      // 3. Bahasa
      language.value = isJp ? 'JP' : 'EN';

      // 4. Grade (Fix Bug 1: Pastikan angka terpilih di dropdown)
      if (['0', '1', '2', '3', '4'].includes(finalGrade)) {
        grade.value = finalGrade;
      } else {
        grade.value = '1';
      }

      // 5. Nation
      nation.value = normalizeNation(finalNation);

      // 6. Power & Shield
      power.value = aiData.power || '';
      shield.value = aiData.shield || '';

      // 7. Set Promo Otomatis Berdasarkan Digit Nomor Kartu
      const autoSet = detectPromoSet(finalCode);
      if (autoSet) {
        cardSet.value = autoSet;
      }

      setStatus(`Scan selesai! Terdeteksi: ${finalEnglishName} (Grade ${grade.value}, ${nation.value})`, 'success');

    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message, 'error');
    } finally {
      btnScan.disabled = false;
      btnScanText.textContent = 'Scan Kartu';
    }
  }

  // Lookup Fandom Wiki (Cari via Kode lalu via Nama JP jika perlu)
  async function lookupFandom(code, jpName) {
    let hits = [];

    // Cari via Kode Kartu
    if (code) {
      const res = await fetch(`https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(code)}&format=json&origin=*`);
      if (res.ok) {
        const json = await res.json();
        hits = json?.query?.search || [];
      }
    }

    // Jika kode tidak ketemu artikel spesifik kartu, cari via nama JP
    let cardHit = hits.find(h => !h.title.toLowerCase().startsWith('list of') && !h.title.startsWith('Card Gallery:') && !h.title.startsWith('File:'));
    if (!cardHit && jpName) {
      const resJp = await fetch(`https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(jpName)}&format=json&origin=*`);
      if (resJp.ok) {
        const jsonJp = await resJp.json();
        const hitsJp = jsonJp?.query?.search || [];
        cardHit = hitsJp.find(h => !h.title.toLowerCase().startsWith('list of') && !h.title.startsWith('Card Gallery:') && !h.title.startsWith('File:'));
      }
    }

    if (!cardHit) return null;
    const pageTitle = cardHit.title;

    // Parse wikitext
    const parseRes = await fetch(`https://cardfight.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json&origin=*`);
    if (!parseRes.ok) return { title: pageTitle };
    const parseJson = await parseRes.json();
    const wikitext = parseJson?.parse?.wikitext?.['*'] || '';

    const matchVal = (key) => {
      const m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*(.*?)(?=\\n\\||\\n\\}\\}|$)`, 'i'));
      return m ? m[1].trim() : '';
    };

    return {
      title: pageTitle,
      grade: matchVal('grade'),
      nation: matchVal('nation'),
      power: matchVal('power'),
      shield: matchVal('shield')
    };
  }

  function normalizeNation(str) {
    const s = (str || '').toLowerCase();
    if (s.includes('dark')) return 'Dark States';
    if (s.includes('dragon')) return 'Dragon Empire';
    if (s.includes('lyrical')) return 'Lyrical Monasterio';
    if (s.includes('stoicheia') || s.includes('ストイケイア')) return 'Stoicheia';
    if (s.includes('brandt')) return 'Brandt Gate';
    if (s.includes('keter') || s.includes('leter')) return 'Keter Sanctuary';
    return 'Dark States';
  }

  // Simpan Kartu ke Database Pusat (Fix Bug 2: Masuk ke CardDB / nitip_card_database)
  async function saveCardToDatabase() {
    const cName = nameEn.value.trim();
    const cId = cardCode.value.trim();

    if (!cName || !cId) {
      alert('Nama Kartu dan Kode Kartu wajib diisi!');
      return;
    }

    // Pastikan CardDB sudah siap
    if (typeof CardDB === 'undefined') {
      alert('Error: Database kartu (CardDB) tidak ditemukan.');
      return;
    }

    CardDB.init();

    // Simpan thumbnail gambar ke cache webp/localStorage agar bisa tampil di inventory & cards
    const imageKey = `${cId.replace(/[/\\?%*:|"<>]/g, '_')}.webp`;
    let rawDataUrl = null;
    if (cardPreview.src && cardPreview.src.startsWith('data:')) {
      rawDataUrl = cardPreview.src;
    } else if (currentBase64) {
      rawDataUrl = `data:${currentMime};base64,${currentBase64}`;
    }

    if (rawDataUrl && window.UI && typeof window.UI.convertDataUrlToWebP === 'function') {
      try {
        rawDataUrl = await window.UI.convertDataUrlToWebP(rawDataUrl);
      } catch (e) {
        console.warn('WebP conversion fallback:', e);
      }
    }

    try {
      const cacheMap = JSON.parse(localStorage.getItem('ag_card_webp_cache') || '{}');
      if (rawDataUrl) {
        cacheMap[imageKey] = rawDataUrl;
        localStorage.setItem('ag_card_webp_cache', JSON.stringify(cacheMap));
      }
    } catch (e) {
      console.warn('Cache image error:', e);
    }

    const cardItem = {
      id: cId,
      name: cName,
      grade: String(grade.value),
      nation: nation.value,
      language: language.value,
      set: cardSet.value.trim() || detectPromoSet(cId) || 'Promo',
      image: imageKey
    };

    // Update jika ID sudah ada, atau tambahkan kartu baru
    const existing = CardDB.getById(cId);
    if (existing) {
      CardDB.updateCard(cId, cardItem);
      setStatus(`Kartu "${cardItem.name}" (${cardItem.id}) berhasil diperbarui di database!`, 'success');
      alert(`Kartu "${cardItem.name}" (${cardItem.id}) berhasil diperbarui di Database!`);
    } else {
      CardDB.addCard(cardItem);
      setStatus(`Kartu baru "${cardItem.name}" (${cardItem.id}) berhasil ditambahkan ke database!`, 'success');
      alert(`Kartu baru "${cardItem.name}" (${cardItem.id}) berhasil ditambahkan ke Database!`);
    }

    populatePromoSetDatalist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
