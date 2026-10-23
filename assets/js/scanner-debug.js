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
  const scanEngine = document.getElementById('scanEngine');
  const quickCodeNumber = document.getElementById('quickCodeNumber');
  const switchCustomPrefix = document.getElementById('switchCustomPrefix');
  const prefixBadge = document.getElementById('prefixBadge');
  const btnQuickSearch = document.getElementById('btnQuickSearch');

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

    // Toggle teks tombol scan saat engine dipilih
    if (scanEngine) {
      scanEngine.addEventListener('change', () => {
        if (scanEngine.value === 'ocr') {
          btnScanText.textContent = 'Scan Kartu';
        } else {
          btnScanText.textContent = 'Scan Kartu (Gemini AI)';
        }
      });
    }

    // Event Quick Code Search
    function getFullQuickCode() {
      const val = (quickCodeNumber?.value || '').trim();
      if (!val) return '';
      if (switchCustomPrefix?.checked) {
        return val;
      }
      if (val.includes('/') || val.includes('-')) return val;
      return 'D-PR/' + val;
    }

    if (switchCustomPrefix) {
      switchCustomPrefix.addEventListener('change', () => {
        if (switchCustomPrefix.checked) {
          if (prefixBadge) prefixBadge.style.display = 'none';
        } else {
          if (prefixBadge) {
            prefixBadge.style.display = 'flex';
            prefixBadge.textContent = 'D-PR/';
          }
        }
        quickCodeNumber?.focus();
      });
    }

    if (btnQuickSearch) {
      btnQuickSearch.addEventListener('click', () => {
        handleQuickSearch(getFullQuickCode());
      });
    }

    if (quickCodeNumber) {
      quickCodeNumber.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleQuickSearch(getFullQuickCode());
        }
      });
    }

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

  // PENCARIAN CEPAT KODE KARTU (Autofill Wiki Langsung)
  async function handleQuickSearch(code) {
    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      alert('Ketik kode kartu terlebih dahulu (cth: D-PR/1705 atau DZ-BT01/001)!');
      return;
    }

    setStatus(`Mencari data resmi kartu "${cleanCode}" di Fandom Wiki...`, 'loading');
    try {
      const wikiData = await lookupFandom(cleanCode, '');
      cardCode.value = cleanCode;

      const detectedSet = detectPromoSet(cleanCode);
      if (detectedSet) cardSet.value = detectedSet;

      if (wikiData && wikiData.title && !wikiData.title.toLowerCase().includes('list of')) {
        nameEn.value = wikiData.title;
        if (wikiData.grade && ['0', '1', '2', '3', '4'].includes(String(wikiData.grade).trim())) {
          grade.value = String(wikiData.grade).trim();
        }
        if (wikiData.nation) {
          nation.value = normalizeNation(wikiData.nation);
        }
        if (power && wikiData.power) {
          power.value = wikiData.power;
        }
        if (shield && wikiData.shield) {
          shield.value = wikiData.shield;
        }
        setStatus(`Berhasil menemukan: "${wikiData.title}" (${cleanCode})`, 'success');
      } else {
        setStatus(`Kode "${cleanCode}" tersimpan, namun tidak ditemukan di Fandom Wiki. Silakan lengkapi sisa form manual.`, 'error');
      }
    } catch (err) {
      console.error(err);
      setStatus(`Pencarian Wiki gagal: ${err.message}`, 'error');
    }
  }

  // Eksekusi Scan Kartu (Router OCR atau AI)
  async function scanCard() {
    const mode = (scanEngine ? scanEngine.value : 'ocr') || 'ocr';

    if (mode === 'ocr') {
      await scanCardOcr();
    } else {
      await scanCardGemini();
    }
  }

  // 1. SCAN OCR LOKAL (Tesseract.js - Tanpa AI)
  async function scanCardOcr() {
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
    setStatus('Memproses OCR...', 'loading');

    try {
      const ocrResult = await scanWithTesseract(cardPreview);
      console.log('[OCR Local Output]', ocrResult);

      let foundCode = ocrResult.cardCode;
      let foundGrade = ocrResult.grade;

      if (!foundCode) {
        setStatus('Teks kode belum terdeteksi jelas. Silakan masukkan kode di kotak "Cari Cepat" di atas.', 'error');
        return;
      }

      cardCode.value = foundCode;
      if (quickCodeInput) quickCodeInput.value = foundCode;

      const autoSet = detectPromoSet(foundCode);
      if (autoSet) cardSet.value = autoSet;

      if (foundGrade && ['0', '1', '2', '3', '4'].includes(foundGrade)) {
        grade.value = foundGrade;
      }

      // Langsung cari ke Fandom Wiki
      setStatus(`Kode terdeteksi "${foundCode}". Mengambil data resmi dari Fandom Wiki...`, 'loading');
      try {
        const wikiData = await lookupFandom(foundCode, '');
        if (wikiData && wikiData.title && !wikiData.title.toLowerCase().includes('list of')) {
          nameEn.value = wikiData.title;
          if (wikiData.grade && ['0', '1', '2', '3', '4'].includes(String(wikiData.grade).trim())) {
            grade.value = String(wikiData.grade).trim();
          }
          if (wikiData.nation) {
            nation.value = normalizeNation(wikiData.nation);
          }
          setStatus(`Scan OCR Berhasil: "${wikiData.title}" (${foundCode})`, 'success');
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
      btnScanText.textContent = 'Scan Kartu';
    }
  }

  // Engine Pemrosesan Canvas & Tesseract.js
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

    // Preprocessing kontras sederhana
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

  // 2. SCAN GEMINI VISION AI (Mode Cadangan)
  async function scanCardGemini() {
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
    btnScanText.textContent = 'Sedang Memindai via AI...';
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

      const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-flash-latest'
      ];

      let resJson = null;
      let lastErr = null;

      for (const m of modelsToTry) {
        try {
          console.log(`[Gemini Vision] Menghubungi model: ${m}...`);
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            resJson = data;
            break;
          }

          const errMsg = data.error?.message || `HTTP ${res.status}`;

          if (errMsg.toLowerCase().includes('leak') || errMsg.toLowerCase().includes('api_key_invalid')) {
            const newKey = prompt(
              'API Key ini dinonaktifkan oleh Google karena terdeteksi bocor di GitHub.\n\nSilakan buat API Key baru secara gratis di:\nhttps://aistudio.google.com/app/apikey\n\nMasukkan API Key baru Anda di sini:'
            );
            if (newKey && newKey.trim()) {
              localStorage.setItem('gemini_api_key', newKey.trim());
              if (typeof CONFIG !== 'undefined') CONFIG.GEMINI_API_KEY = newKey.trim();
              alert('API Key baru berhasil disimpan! Silakan klik tombol "Scan Kartu" kembali.');
            }
            throw new Error(errMsg);
          }

          if (errMsg.toLowerCase().includes('high demand') || res.status === 503 || res.status === 429 || res.status === 404) {
            console.warn(`[Gemini Vision] Model ${m} sedang sibuk (${errMsg}), beralih ke model berikutnya...`);
            setStatus(`Model ${m} sedang antre, otomatis beralih ke model cadangan...`, 'loading');
            lastErr = new Error(errMsg);
            continue;
          }

          lastErr = new Error(errMsg);
        } catch (e) {
          if (e.message && (e.message.toLowerCase().includes('leak') || e.message.toLowerCase().includes('api_key_invalid'))) {
            throw e;
          }
          lastErr = e;
        }
      }

      if (!resJson) {
        throw lastErr || new Error('Semua model AI sedang sibuk. Silakan coba klik Scan lagi.');
      }

      let textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      textOutput = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();

      const aiData = JSON.parse(textOutput);
      const isJp = (aiData.language || 'JP').toUpperCase().startsWith('J');

      let finalEnglishName = aiData.name_en || aiData.card_name_raw || '';
      let finalGrade = aiData.grade !== undefined && aiData.grade !== null ? String(aiData.grade).replace(/\D/g, '') : '1';
      let finalNation = aiData.nation || 'Dark States';
      let finalCode = aiData.card_code || '';

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

      nameEn.value = finalEnglishName;
      cardCode.value = finalCode;
      if (typeof language !== 'undefined' && language) { language.value = isJp ? 'JP' : 'EN'; }

      if (['0', '1', '2', '3', '4'].includes(finalGrade)) {
        grade.value = finalGrade;
      } else {
        grade.value = '1';
      }

      nation.value = normalizeNation(finalNation);
      power.value = aiData.power || '';
      shield.value = aiData.shield || '';

      const autoSet = detectPromoSet(finalCode);
      if (autoSet) {
        cardSet.value = autoSet;
      }

      setStatus(`Scan AI selesai! Terdeteksi: ${finalEnglishName} (Grade ${grade.value}, ${nation.value})`, 'success');

    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message, 'error');
    } finally {
      btnScan.disabled = false;
      btnScanText.textContent = 'Scan Kartu (Gemini AI)';
    }
  }

  // Lookup Fandom Wiki (Cari via Backend Proxy terlebih dahulu agar bebas AdBlock/CORS, lalu fallback)
  async function lookupFandom(code, jpName) {
    // 1. Coba melalui backend API ProJastip (Bebas blokir CORS & aman dari adblocker)
    if (typeof API !== 'undefined' && API.request) {
      try {
        const resp = await API.request('searchWiki', { code, jpName });
        if (resp && resp.title) {
          return resp;
        }
      } catch (backendErr) {
        console.warn('Backend wiki search fallback to direct/proxy:', backendErr);
      }
    }

    // Helper fetch dengan fallback ke public CORS proxy
    const safeFetchJson = async (url) => {
      try {
        const r1 = await fetch(url + '&origin=*');
        if (r1.ok) return await r1.json();
      } catch (e1) {}

      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const r2 = await fetch(proxyUrl);
        if (r2.ok) return await r2.json();
      } catch (e2) {}

      return null;
    };

    let hits = [];
    if (code) {
      const json = await safeFetchJson(`https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(code)}&format=json`);
      hits = json?.query?.search || [];
    }

    let cardHit = hits.find(h => !h.title.toLowerCase().startsWith('list of') && !h.title.startsWith('Card Gallery:') && !h.title.startsWith('File:'));
    if (!cardHit && jpName) {
      const jsonJp = await safeFetchJson(`https://cardfight.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(jpName)}&format=json`);
      const hitsJp = jsonJp?.query?.search || [];
      cardHit = hitsJp.find(h => !h.title.toLowerCase().startsWith('list of') && !h.title.startsWith('Card Gallery:') && !h.title.startsWith('File:'));
    }

    if (!cardHit) return null;
    const pageTitle = cardHit.title;

    const parseJson = await safeFetchJson(`https://cardfight.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=wikitext&format=json`);
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

    // Upload & simpan file fisik WebP ke folder server: assets/images/cards/
    if (rawDataUrl && typeof API !== 'undefined' && API.request) {
      try {
        await API.request('uploadCardImage', {
          cardId: cId,
          image_base64: rawDataUrl
        });
      } catch (err) {
        console.warn('Upload gambar kartu ke server:', err);
      }
    }

    const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    const currentUserName = currentUser ? (currentUser.name || currentUser.username) : 'Admin';

    const cardItem = {
      id: cId,
      name: cName,
      grade: String(grade.value),
      nation: nation.value,
      language: (typeof language !== 'undefined' && language) ? language.value : 'JP',
      set: cardSet.value.trim() || detectPromoSet(cId) || 'Promo',
      power: (power && power.value) ? power.value.trim() : '',
      shield: (shield && shield.value) ? shield.value.trim() : '',
      image: imageKey,
      createdBy: currentUserName,
      createdAt: new Date().toISOString()
    };

    // Update jika ID sudah ada, atau tambahkan kartu baru ke MySQL server
    const existing = CardDB.getById(cId);
    if (existing) {
      await CardDB.updateCard(cId, cardItem);
      setStatus(`Kartu "${cardItem.name}" (${cardItem.id}) berhasil diperbarui di database server!`, 'success');
      alert(`Kartu "${cardItem.name}" (${cardItem.id}) berhasil diperbarui di Database Server!`);
    } else {
      await CardDB.addCard(cardItem);
      setStatus(`Kartu baru "${cardItem.name}" (${cardItem.id}) berhasil ditambahkan ke database server!`, 'success');
      alert(`Kartu baru "${cardItem.name}" (${cardItem.id}) berhasil ditambahkan ke Database Server!`);
    }

    populatePromoSetDatalist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
