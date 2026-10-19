/**
 * Standalone Card Scanner - Configuration
 */
const CONFIG = {
    // Google Gemini API Key untuk Card Scanner (Vision AI)
    // Disimpan di LocalStorage browser agar aman dan tidak ter-commit ke GitHub
    GEMINI_API_KEY: localStorage.getItem('gemini_api_key') || '',

    // Default Vision Model
    GEMINI_MODEL: 'gemini-2.5-flash',

    // Fandom Wiki Base URL
    WIKI_BASE_URL: 'https://cardfight.fandom.com/wiki/'
};

// Helper untuk memperbarui API Key
function setGeminiApiKey(key) {
    if (key) {
        localStorage.setItem('gemini_api_key', key.trim());
        CONFIG.GEMINI_API_KEY = key.trim();
    }
}
