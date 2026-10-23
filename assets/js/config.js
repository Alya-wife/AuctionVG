const CONFIG = {
    // MySQL REST API URL (otomatis mendeteksi jika dipanggil dari dalam folder views/)
    API_URL: (window.location.pathname.includes('/views/') ? '../' : '') + 'api.php',

    // Mode: false = pakai Database MySQL via api.php, true = mode offline LocalStorage
    USE_LOCAL: false,

    // Google Sign-In Client ID
    GOOGLE_CLIENT_ID: '711651834929-ijkh41k8k47jaaags97dp8tiohipgji2.apps.googleusercontent.com',

    // Google Gemini API Key untuk Card Scanner (Vision AI)
    // Disimpan di LocalStorage browser agar aman
    GEMINI_API_KEY: localStorage.getItem('gemini_api_key') || ''
};
