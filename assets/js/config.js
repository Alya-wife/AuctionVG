const CONFIG = {
    // Google Apps Script URL
    GAS_URL: 'https://script.google.com/macros/s/AKfycbyJZ73LFhvOXTQzjFy1oIVVSSr0VFhZwHYy_SO4uFYZyhRF3d9aIReXVWZJrk415jmGvg/exec',

    // Google Sheets IDs
    SHEET_LOGIN_ID: '1Q8BJBbL-Rk0QEq5HeroP4AMM4G3pmI1qW3i9RC7qrvs',
    SHEET_DATA_ID: '1CcD1CAkXkus0iHLg4Q07RutGx85nsaB6-hBGPU-qGKI',

    // Mode: true = pakai LocalStorage (localhost), false = pakai GAS
    USE_LOCAL: false,

    // Google Gemini API Key untuk Card Scanner (Vision AI)
    // Disimpan di LocalStorage browser agar aman dan tidak ter-commit ke GitHub
    GEMINI_API_KEY: localStorage.getItem('gemini_api_key') || ''
};
