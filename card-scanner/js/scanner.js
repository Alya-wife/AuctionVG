/**
 * Standalone Card Scanner - Core Logic
 * Vanguard Card Recognition with Google Gemini Vision AI & Fandom Wiki
 */
(function() {
  'use strict';

  // Range Set Promo umum
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
  const scanEngine = document.getElementById('scanEngine');
  const quickCodeInput = document.getElementById('quickCodeInput');
  const btnQuickSearch = document.getElementById('btnQuickSearch');

  // Form Elements
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
  const btnExport = document.getElementById('btnExport');
  const btnApiKey = document.getElementById('btnApiKey');

  let currentBase64 = null;
  let currentMime = 'image/png';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupImageHandlers();
    setupActions();
    populatePromoSetDatalist();
    loadDefaultImageBase64();
  }

  function getApiKey() {
    return localStorage.getItem('gemini_api_key') || (window.CONFIG ? window.CONFIG.GEMINI_API_KEY : '') || '';
  }

  function setStatus(text, type = 'loading') {
    statusMsg.className = `scan-status-msg ${type}`;
    statusMsg.textContent = text;
    statusMsg.style.display = 'block';
  }

  function hideStatus() {
    statusMsg.style.display = 'none';
  }

  function populatePromoSetDatalist() {
    if (!setPromoList) return;
    const dbSets = (typeof CardDB !== 'undefined' && CardDB.getSets) ? CardDB.getSets() : [];
    const rangeSets = PROMO_SET_RANGES.map(r => r.name);
    const combined = [...new Set([...rangeSets, ...dbSets])].filter(Boolean);
    setPromoList.innerHTML = combined.map(s => `<option value="${s}">`).join('');
  }

  function detectPromoSet(code) {
    if (!code) return '';
    const cleanCode = code.trim().toUpperCase();
    const match = cleanCode.match(/([A-Z0-9]+-[A-Z]+)[/-](\d+)/i);
    if (match) {
      const prefix = match[1];
      const num = parseInt(match[2], 10);
      const found = PROMO_SET_RANGES.find(r => r.prefix === prefix && num >= r.min && num <= r.max);
      if (found) return found.name;
      const floor = Math.floor(num / 100) * 100;
      return `${prefix}/${floor}-${floor + 100}`;
    }
    return '';
  }

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

  function setupImageHandlers() {
    if (dropArea) dropArea.addEventListener('click', () => fileInput.click());

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          loadFile(e.target.files[0]);
        }
      });
    }

    if (dropArea) {
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
    }

    // Paste event
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          loadFile(item.getAsFile());
          break;
        }
      }
    });

    // Sample picker buttons
    document.querySelectorAll('[data-sample-img]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const src = btn.getAttribute('data-sample-img');
        cardPreview.src = src;
        cardPreview.onload = () => extractBase64FromImage(cardPreview);
        setStatus(`Gambar sampel "${btn.textContent.trim()}" dimuat. Klik "Scan Kartu".`, 'success');
      });
    });
  }

  async function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      let dataUrl = e.target.result;
      // Otomatis ubah gambar yang diupload menjadi WebP
      if (typeof convertDataUrlToWebP === 'function') {
        try {
          dataUrl = await convertDataUrlToWebP(dataUrl, 0.85);
        } catch (err) {
          console.warn('WebP conversion fallback:', err);
        }
      }
      cardPreview.src = dataUrl;
      currentMime = dataUrl.startsWith('data:image/webp') ? 'image/webp' : file.type;
      currentBase64 = dataUrl.split(',')[1];
      setStatus('Gambar berhasil dimuat dan dioptimasi ke WebP. Klik "Scan Kartu".', 'success');
    };
    reader.readAsDataURL(file);
  }

  function setupActions() {
    btnScan.addEventListener('click', handleScan);
    btnSave.addEventListener('click', saveCardToDatabase);
    btnClear.addEventListener('click', () => {
      document.getElementById('cardResultForm').reset();
      hideStatus();
    });

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const data = CardDB.getAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vanguard_cards_database_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (btnApiKey) {
      btnApiKey.addEventListener('click', () => {
        const current = getApiKey();
        const newKey = prompt('Masukkan Google Gemini API Key Anda:', current);
        if (newKey !== null) {
          if (newKey.trim()) {
            localStorage.setItem('gemini_api_key', newKey.trim());
            if (window.CONFIG) window.CONFIG.GEMINI_API_KEY = newKey.trim();
            alert('API Key berhasil disimpan!');
          } else {
            localStorage.removeItem('gemini_api_key');
            alert('API Key dikembalikan ke default.');
          }
        }
      });
    }

    // Auto set promo saat cardCode berubah
    cardCode.addEventListener('input', () => {
      const detected = detectPromoSet(cardCode.value);
      if (detected && !cardSet.value) {
        cardSet.value = detected;
      }
    });

    // Toggle teks tombol scan saat engine dipilih
    if (scanEngine) {
      scanEngine.addEventListener('change', () => {
        if (scanEngine.value === 'ocr') {
          btnScanText.textContent = 'Scan Kartu (OCR Biasa)';
        } else {
          btnScanText.textContent = 'Scan Kartu (Gemini AI)';
        }
      });
    }

    // Event Quick Code Search
    if (btnQuickSearch) {
      btnQuickSearch.addEventListener('click', () => {
        handleQuickSearch(quickCodeInput ? quickCodeInput.value : '');
      });
    }

    if (quickCodeInput) {
      quickCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleQuickSearch(quickCodeInput.value);
        }
      });
    }
  }

  // PENCARIAN CEPAT VIA KODE KARTU (Autofill Wiki Langsung)
  async function handleQuickSearch(code) {
    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      alert('Ketik kode kartu terlebih dahulu (cth: D-PR/1705 atau DZ-BT01/001)!');
      return;
    }

    setStatus(`Mencari data resmi kartu "${cleanCode}" di Fandom Wiki...`, 'loading');
    try {
      const wikiData = await searchFandomWiki(cleanCode);
      cardCode.value = cleanCode;

      const detectedSet = detectPromoSet(cleanCode);
      if (detectedSet) cardSet.value = detectedSet;

      if (wikiData && wikiData.englishName) {
        nameEn.value = wikiData.englishName;
        if (wikiData.grade !== null && wikiData.grade !== undefined && wikiData.grade !== '') {
          const gOpts = Array.from(grade.options).map(o => o.value);
          const parsedG = String(wikiData.grade).replace(/\D/g, '');
          if (gOpts.includes(parsedG)) grade.value = parsedG;
        }
        if (wikiData.nation) {
          nation.value = normalizeNation(wikiData.nation);
        }
        setStatus(`Berhasil menemukan: "${wikiData.englishName}" (${cleanCode})`, 'success');
      } else {
        setStatus(`Kode "${cleanCode}" tersimpan, namun tidak ditemukan di Fandom Wiki. Silakan lengkapi sisa form manual.`, 'error');
      }
    } catch (err) {
      console.error(err);
      setStatus(`Pencarian Wiki gagal: ${err.message}`, 'error');
    }
  }

  // ALGORITMA SCAN (OCR Biasa ATAU Gemini AI)
  async function handleScan() {
    const mode = (scanEngine ? scanEngine.value : 'ocr') || 'ocr';

    if (mode === 'ocr') {
      await handleScanOcr();
    } else {
      await handleScanGemini();
    }
  }

  // 1. SCAN OCR BIASA (Tesseract.js - Offline / Tanpa AI)
  async function handleScanOcr() {
    if (!cardPreview || !cardPreview.complete || cardPreview.naturalWidth === 0) {
      alert('Pilih gambar kartu terlebih dahulu!');
      return;
    }

    if (typeof Tesseract === 'undefined') {
      alert('Library OCR Tesseract.js sedang dimuat. Pastikan Anda terhubung ke internet saat pertama kali membuka halaman.');
      return;
    }

    btnScan.disabled = true;
    btnScanText.textContent = 'Membaca OCR...';
    setStatus('Mempersiapkan engine OCR lokal...', 'loading');

    try {
      const ocrResult = await scanWithTesseract(cardPreview);
      console.log('[OCR Result]', ocrResult);

      let foundCode = ocrResult.cardCode;
      let foundGrade = ocrResult.grade;

      if (!foundCode) {
        setStatus('Teks kode belum terdeteksi jelas. Silakan masukkan kode di kotak "Cari Cepat" di atas.', 'error');
        return;
      }

      cardCode.value = foundCode;
      if (quickCodeInput) quickCodeInput.value = foundCode;

      const detectedSet = detectPromoSet(foundCode);
      if (detectedSet) cardSet.value = detectedSet;

      if (foundGrade) {
        const gradeOpts = Array.from(grade.options).map(o => o.value);
        if (gradeOpts.includes(foundGrade)) grade.value = foundGrade;
      }

      // Langsung cari detail resmi di Fandom Wiki berdasarkan kode kartu hasil OCR
      setStatus(`Kode terdeteksi "${foundCode}". Mengambil data resmi dari Fandom Wiki...`, 'loading');
      try {
        const wikiData = await searchFandomWiki(foundCode);
        if (wikiData && wikiData.englishName) {
          nameEn.value = wikiData.englishName;
          if (wikiData.grade) {
            const parsedG = String(wikiData.grade).replace(/\D/g, '');
            if (parsedG) grade.value = parsedG;
          }
          if (wikiData.nation) {
            nation.value = normalizeNation(wikiData.nation);
          }
          setStatus(`Scan OCR Berhasil: "${wikiData.englishName}" (${foundCode})`, 'success');
        } else {
          setStatus(`Kode terdeteksi: ${foundCode}. Data Wiki belum ditemukan, silakan ketik nama manual.`, 'success');
        }
      } catch (wErr) {
        console.warn('Wiki lookup error:', wErr);
        setStatus(`Kode terdeteksi: ${foundCode}. (Wiki lookup error)`, 'success');
      }

    } catch (err) {
      console.error(err);
      setStatus(`Gagal scan OCR: ${err.message}`, 'error');
    } finally {
      btnScan.disabled = false;
      btnScanText.textContent = 'Scan Kartu (OCR Biasa)';
    }
  }

  // Engine Pemrosesan Gambar & Tesseract.js
  async function scanWithTesseract(imgEl) {
    const naturalW = imgEl.naturalWidth || 600;
    const naturalH = imgEl.naturalHeight || 850;

    // 1. Crop area bawah kartu (posisi umum kode kartu Vanguard: 28% dari bawah)
    const cropH = Math.round(naturalH * 0.28);
    const canvasB = document.createElement('canvas');
    canvasB.width = naturalW;
    canvasB.height = cropH;
    const ctxB = canvasB.getContext('2d');
    ctxB.drawImage(imgEl, 0, naturalH - cropH, naturalW, cropH, 0, 0, naturalW, cropH);

    // Filter kontras sederhana pada kanvas
    try {
      const imgData = ctxB.getImageData(0, 0, naturalW, cropH);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = gray > 130 ? 255 : (gray < 70 ? 0 : gray);
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
      ctxB.putImageData(imgData, 0, 0);
    } catch(e) {}

    setStatus('Membaca teks kode kartu pada gambar...', 'loading');
    const worker = await Tesseract.createWorker('eng');
    const retBottom = await worker.recognize(canvasB);
    const bottomText = retBottom.data ? retBottom.data.text : '';
    console.log('[Tesseract Bottom Raw]', bottomText);

    let detectedCode = extractCardCode(bottomText);

    // Jika belum ketemu di crop bawah, coba baca seluruh gambar
    if (!detectedCode) {
      setStatus('Mencoba membaca area kartu lengkap...', 'loading');
      const retFull = await worker.recognize(imgEl);
      const fullText = retFull.data ? retFull.data.text : '';
      console.log('[Tesseract Full Raw]', fullText);
      detectedCode = extractCardCode(fullText);
    }

    // Baca Grade (Pojok Kiri Atas kartu)
    let detectedGrade = null;
    try {
      const gW = Math.round(naturalW * 0.25);
      const gH = Math.round(naturalH * 0.22);
      const canvasG = document.createElement('canvas');
      canvasG.width = gW;
      canvasG.height = gH;
      const ctxG = canvasG.getContext('2d');
      ctxG.drawImage(imgEl, 0, 0, gW, gH, 0, 0, gW, gH);
      const retG = await worker.recognize(canvasG);
      const gMatch = (retG.data ? retG.data.text : '').match(/\b([0-4])\b/);
      if (gMatch) detectedGrade = gMatch[1];
    } catch(e) {}

    await worker.terminate();

    return {
      cardCode: detectedCode,
      grade: detectedGrade,
      rawText: bottomText
    };
  }

  // Regex extractor untuk Kode Kartu Cardfight!! Vanguard
  function extractCardCode(raw) {
    if (!raw) return null;
    let clean = raw.toUpperCase()
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s*([/-])\s*/g, '$1');

    // 1. Pola standar: D-PR/1705, DZ-BT01/001, V-PR/001, D-SS01/001
    const m1 = clean.match(/([A-Z0-9]{1,4}-[A-Z0-9]{1,5}[/-][0-9]{1,4}[A-Z]?)/i);
    if (m1) return sanitizeCardCode(m1[1]);

    // 2. Pola dengan spasi: D-PR 1705
    const m2 = clean.match(/([A-Z0-9]{1,4}-[A-Z0-9]{1,5}\s+[0-9]{1,4})/i);
    if (m2) return sanitizeCardCode(m2[1].replace(/\s+/, '/'));

    // 3. Pola promo PR: PR/1705 -> D-PR/1705
    const m3 = clean.match(/\b(PR[/-][0-9]{3,4})\b/i);
    if (m3) return 'D-' + sanitizeCardCode(m3[1]);

    return null;
  }

  function sanitizeCardCode(code) {
    if (!code) return '';
    let s = code.trim().toUpperCase();
    // Koreksi OCR bila I / L tertukar digit 1 setelah slash/minus
    s = s.replace(/([/-])([I|L])(\d+)/i, '$11$3');
    // Koreksi OCR bila huruf O tertukar digit 0 di deretan angka
    s = s.replace(/(\d+)O(\d*)/gi, '$10$2');
    return s;
  }

  // 2. SCAN GEMINI VISION AI (Mode Opsional / Cadangan)
  async function handleScanGemini() {
    let key = getApiKey();
    if (!key) {
      const input = prompt(
        'Google Gemini API Key belum disetel.\n\nSilakan masukkan Gemini API Key Anda (dapatkan gratis di https://aistudio.google.com/app/apikey):'
      );
      if (input && input.trim()) {
        localStorage.setItem('gemini_api_key', input.trim());
        if (window.CONFIG) window.CONFIG.GEMINI_API_KEY = input.trim();
        key = input.trim();
      } else {
        setStatus('Scan dibatalkan: API Key diperlukan.', 'error');
        return;
      }
    }

    if (!currentBase64) {
      alert('Pilih gambar kartu terlebih dahulu!');
      return;
    }

    btnScan.disabled = true;
    btnScanText.textContent = 'Menganalisis kartu via AI...';
    setStatus('Sedang memindai dengan Google Gemini Vision AI...', 'loading');

    try {
      const aiResult = await scanWithGemini(currentBase64, currentMime, key);
      console.log('[Vision AI Output]', aiResult);

      let finalName = aiResult.nameEnglish || aiResult.name || '';
      let finalGrade = aiResult.grade !== undefined && aiResult.grade !== null ? String(aiResult.grade).replace(/\D/g, '') : '1';
      let finalNation = aiResult.nation || 'Dark States';
      let finalCode = aiResult.cardCode || '';
      let finalLanguage = (aiResult.language || 'JP').toUpperCase();

      if (finalCode && (finalLanguage === 'JP' || !finalName || finalName.length < 3)) {
        setStatus(`Mencari data resmi kartu "${finalCode}" di Fandom Wiki...`, 'loading');
        try {
          const wikiData = await searchFandomWiki(finalCode);
          if (wikiData) {
            if (wikiData.englishName) finalName = wikiData.englishName;
            if (wikiData.nation) finalNation = wikiData.nation;
            if (wikiData.grade && String(wikiData.grade).trim() !== '') {
              const parsedG = String(wikiData.grade).replace(/\D/g, '');
              if (parsedG !== '') finalGrade = parsedG;
            }
          }
        } catch (e) {
          console.warn('Wiki search fallback error:', e);
        }
      }

      nameEn.value = finalName;
      cardCode.value = finalCode;
      language.value = finalLanguage === 'EN' ? 'EN' : 'JP';
      
      const gradeOpts = Array.from(grade.options).map(o => o.value);
      grade.value = gradeOpts.includes(finalGrade) ? finalGrade : '3';

      nation.value = normalizeNation(finalNation);
      power.value = aiResult.power || '';
      shield.value = aiResult.shield || '';

      const detectedSet = detectPromoSet(finalCode);
      cardSet.value = detectedSet || aiResult.set || 'Promo';

      setStatus(`Scan AI Berhasil: "${finalName}" (${finalCode || 'Promo'})`, 'success');

    } catch (err) {
      console.error(err);
      setStatus(`Gagal memindai AI: ${err.message}`, 'error');
    } finally {
      btnScan.disabled = false;
      btnScanText.textContent = 'Scan Kartu (Gemini AI)';
    }
  }

  // Panggilan Gemini Vision API
  async function scanWithGemini(base64Data, mimeType, key) {
    const model = (window.CONFIG && window.CONFIG.GEMINI_MODEL) ? window.CONFIG.GEMINI_MODEL : 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const promptText = `
You are an expert Cardfight!! Vanguard OCR and card analyzer. Analyze this Cardfight!! Vanguard card image accurately.
Follow these exact instructions:

1. GRADE:
   - Located at the TOP-LEFT corner of the card inside a circle/icon.
   - Values: 0, 1, 2, 3, or 4.
   - For Order cards (Normal Order, Blitz Order, Set Order), the grade is also shown at the top-left corner.
   - Always extract the integer grade (e.g. 0, 1, 2, 3, 4).

2. CARD CODE / ID:
   - Located at the BOTTOM-LEFT corner in small print (e.g., "D-PR/1705", "D-PR/1662", "V-PR/001", "DZ-BT01/001").
   - Extract the exact string including prefix, slashes, and numbers.

3. CARD NAME:
   - Located in the bottom text box banner (above the skill text / bottom frame).
   - If the card text is in English, read the English name directly.
   - If the card is in JAPANESE (Kanji/Kana):
     * Read the Japanese name.
     * Translate/map it to the OFFICIAL English card name on Cardfight!! Vanguard Wiki fandom.
     * Put the English name in "nameEnglish".

4. NATION:
   - For Unit cards: located at the bottom-right or bottom banner.
   - For Order cards: located below the card name banner.
   - Detect either from text or background nation icon color:
     * Dark blue / Purple / Black = "Dark States"
     * Red / Crimson = "Dragon Empire"
     * Pink / Magenta = "Lyrical Monasterio"
     * Green = "Stoicheia"
     * Slate / Gray / White = "Brandt Gate"
     * Yellow / Gold = "Keter Sanctuary"
   - Must be one of: "Dragon Empire", "Dark States", "Keter Sanctuary", "Stoicheia", "Brandt Gate", "Lyrical Monasterio".

5. LANGUAGE:
   - "JP" if text is Japanese, "EN" if text is English.

6. POWER & SHIELD:
   - Power at bottom left/center (e.g. 5000, 8000, 9000, 10000, 13000). (Empty if Order card).
   - Shield on the left edge (e.g. 5000, 10000). (Empty if Order card or Grade 3/4 without shield).

Return strictly JSON without markdown backticks:
{
  "name": "Original Name on card",
  "nameEnglish": "Official English card name",
  "cardCode": "Extracted Code (e.g. D-PR/1705)",
  "grade": 1,
  "nation": "Dark States",
  "language": "JP",
  "power": "8000",
  "shield": "5000",
  "isOrder": false
}
    `.trim();

    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-flash-latest'
    ];

    let lastError = null;

    for (const m of modelsToTry) {
      try {
        console.log(`[Card Scanner] Menghubungi model: ${m}...`);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: "application/json"
            }
          })
        });

        const errJson = await response.json().catch(() => ({}));

        if (response.ok && errJson.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = errJson.candidates[0].content.parts[0].text;
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }

        const errMsg = errJson.error?.message || `HTTP ${response.status}`;

        if (errMsg.toLowerCase().includes('leak') || errMsg.toLowerCase().includes('api_key_invalid')) {
          const newKey = prompt(
            'API Key ini dinonaktifkan oleh Google karena terdeteksi bocor di GitHub.\n\nSilakan buat API Key baru gratis di:\nhttps://aistudio.google.com/app/apikey\n\nMasukkan API Key baru Anda di sini:'
          );
          if (newKey && newKey.trim()) {
            localStorage.setItem('gemini_api_key', newKey.trim());
            if (window.CONFIG) window.CONFIG.GEMINI_API_KEY = newKey.trim();
            alert('API Key baru berhasil disimpan! Silakan klik tombol "Scan Kartu" kembali.');
          }
          throw new Error(errMsg);
        }

        if (errMsg.toLowerCase().includes('high demand') || response.status === 503 || response.status === 429 || response.status === 404) {
          console.warn(`[Card Scanner] Model ${m} sedang sibuk (${errMsg}), mencoba model berikutnya...`);
          setStatus(`Model ${m} sedang antre, mencoba model cadangan...`, 'loading');
          lastError = new Error(errMsg);
          continue;
        }

        lastError = new Error(errMsg);
      } catch (err) {
        if (err.message && (err.message.toLowerCase().includes('leak') || err.message.toLowerCase().includes('api_key_invalid'))) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('Semua model AI sedang sibuk. Silakan coba klik Scan kembali.');
  }

  // Fandom Wiki API Lookup
  async function searchFandomWiki(cardCode) {
    const clean = cardCode.trim();
    const wikiUrl = `https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean)}&format=json&origin=*`;

    const res = await fetch(wikiUrl);
    if (!res.ok) return null;
    const json = await res.json();
    const hit = json.query?.search?.[0];
    if (!hit) return null;

    const pageTitle = hit.title;
    const parseUrl = `https://cardfight.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext|text&format=json&origin=*`;
    const pRes = await fetch(parseUrl);
    if (!pRes.ok) return { englishName: pageTitle };
    const pJson = await pRes.json();
    const wikitext = pJson.parse?.wikitext?.['*'] || '';

    const gradeMatch = wikitext.match(/\|\s*grade\s*=\s*([0-4])/i);
    const nationMatch = wikitext.match(/\|\s*nation\s*=\s*([^\n|]+)/i);

    return {
      englishName: pageTitle,
      grade: gradeMatch ? gradeMatch[1].trim() : null,
      nation: nationMatch ? normalizeNation(nationMatch[1].trim()) : null
    };
  }

  function normalizeNation(input) {
    if (!input) return 'Dark States';
    const s = input.toLowerCase();
    if (s.includes('dragon')) return 'Dragon Empire';
    if (s.includes('dark')) return 'Dark States';
    if (s.includes('lyrical')) return 'Lyrical Monasterio';
    if (s.includes('stoicheia') || s.includes('ストイケイア')) return 'Stoicheia';
    if (s.includes('brandt')) return 'Brandt Gate';
    if (s.includes('keter') || s.includes('leter')) return 'Keter Sanctuary';
    return 'Dark States';
  }

  // Simpan Kartu ke Database Pusat
  async function saveCardToDatabase() {
    const cName = nameEn.value.trim();
    const cId = cardCode.value.trim();

    if (!cName || !cId) {
      alert('Nama Kartu dan Kode Kartu wajib diisi!');
      return;
    }

    if (typeof CardDB === 'undefined') {
      alert('Error: Database kartu (CardDB) tidak ditemukan.');
      return;
    }

    CardDB.init();

    const imageKey = `${cId.replace(/[/\\?%*:|"<>]/g, '_')}.webp`;
    let rawDataUrl = null;
    if (cardPreview.src && cardPreview.src.startsWith('data:')) {
      rawDataUrl = cardPreview.src;
    } else if (currentBase64) {
      rawDataUrl = `data:${currentMime};base64,${currentBase64}`;
    }

    if (rawDataUrl && typeof convertDataUrlToWebP === 'function') {
      try {
        rawDataUrl = await convertDataUrlToWebP(rawDataUrl, 0.85);
      } catch (e) {
        console.warn('WebP conversion fallback:', e);
      }
    }

    try {
      const cacheMap = JSON.parse(localStorage.getItem('standalone_card_webp_cache') || '{}');
      if (rawDataUrl) {
        cacheMap[imageKey] = rawDataUrl;
        localStorage.setItem('standalone_card_webp_cache', JSON.stringify(cacheMap));
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
      image: imageKey,
      createdBy: (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()) ? (Auth.getUser().name || Auth.getUser().username) : 'Scanner User',
      createdAt: new Date().toISOString()
    };

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
  }

})();
