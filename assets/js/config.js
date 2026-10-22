const CONFIG = {
    // MySQL REST API URL (otomatis mendeteksi jika dipanggil dari dalam folder views/)
    API_URL: (window.location.pathname.includes('/views/') ? '../' : '') + 'api.php',

    // Mode: false = pakai Database MySQL via api.php, true = mode offline LocalStorage
    USE_LOCAL: false,

    // Google Gemini API Key untuk Card Scanner (Vision AI)
    // Disimpan di LocalStorage browser agar aman
    GEMINI_API_KEY: localStorage.getItem('gemini_api_key') || ''
};
