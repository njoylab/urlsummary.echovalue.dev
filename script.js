// DOM Elements
const form = document.getElementById('analyzerForm');
const advancedToggle = document.getElementById('advancedToggle');
const advancedOptions = document.getElementById('advancedOptions');
const resultsContainer = document.getElementById('resultsContainer');
const urlInput = document.getElementById('url');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

const API_ENDPOINT = '__API_ENDPOINT__';

// Toast and Confirmation Elements
const toastContainer = document.getElementById('toastContainer');
const confirmationOverlay = document.getElementById('confirmationOverlay');
const confirmationTitle = document.getElementById('confirmationTitle');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmationCancel = document.getElementById('confirmationCancel');
const confirmationConfirm = document.getElementById('confirmationConfirm');

// ===============================================
// Toast Notification System
// ===============================================

let toastCounter = 0;

const TOAST_TYPES = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
};

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @returns {HTMLElement} The toast element
 */
function showToast(message, type = 'info', duration = 5000) {
    const toastId = `toast-${++toastCounter}`;
    const icon = TOAST_TYPES[type] || TOAST_TYPES.info;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${icon}</span>
        <div class="toast-content">
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" aria-label="Close notification">×</button>
        ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
    `;

    toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(toast));

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    if (duration > 0) {
        setTimeout(() => {
            dismissToast(toast);
        }, duration);
    }

    return toast;
}

/**
 * Dismiss a toast notification
 * @param {HTMLElement} toast - The toast element to dismiss
 */
function dismissToast(toast) {
    if (!toast || !toast.classList.contains('toast')) return;

    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Dismiss all toasts
 */
function dismissAllToasts() {
    const toasts = toastContainer.querySelectorAll('.toast');
    toasts.forEach(toast => dismissToast(toast));
}

// ===============================================
// Confirmation Modal System
// ===============================================

let confirmResolve = null;

/**
 * Show a confirmation dialog
 * @param {string} message - The confirmation message
 * @param {string} title - The dialog title (optional)
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
function showConfirmation(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        confirmResolve = resolve;

        confirmationTitle.textContent = title;
        confirmationMessage.textContent = message;

        confirmationOverlay.style.display = 'flex';
        requestAnimationFrame(() => {
            confirmationOverlay.classList.add('show');
        });

        setTimeout(() => {
            confirmationConfirm.focus();
        }, 100);
    });
}

/**
 * Hide the confirmation dialog
 * @param {boolean} confirmed - Whether the action was confirmed
 */
function hideConfirmation(confirmed) {
    confirmationOverlay.classList.remove('show');

    setTimeout(() => {
        confirmationOverlay.style.display = 'none';
        if (confirmResolve) {
            confirmResolve(confirmed);
            confirmResolve = null;
        }
    }, 300);
}

confirmationCancel.addEventListener('click', () => hideConfirmation(false));
confirmationConfirm.addEventListener('click', () => hideConfirmation(true));

confirmationOverlay.addEventListener('click', (e) => {
    if (e.target === confirmationOverlay) {
        hideConfirmation(false);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmationOverlay.style.display === 'flex') {
        hideConfirmation(false);
    }
});

// ===============================================
// URL Validation System
// ===============================================

const analyzeBtn = document.getElementById('analyzeBtn');
const urlError = document.getElementById('url-error');

const VALIDATION_DEBOUNCE_MS = 300;

let validationTimeout = null;
let lastValidationState = null;

/**
 * Validates URL input and returns validation result
 * @param {string} input - Raw URL input
 * @returns {Object} { valid: boolean, message: string, cleaned: string }
 */
function validateURL(input) {
    if (!input || input.trim() === '') {
        return { valid: true, message: '', cleaned: '' };
    }

    let cleaned = input.trim();

    // Auto-prepend https:// if no protocol
    if (!cleaned.match(/^https?:\/\//i)) {
        cleaned = 'https://' + cleaned;
    }

    // Validation checks
    if (cleaned.includes(' ')) {
        return { valid: false, message: 'URL cannot contain spaces', cleaned };
    }

    if (cleaned.length < 10) {
        return { valid: false, message: 'URL is too short', cleaned };
    }

    if (cleaned.length > 2048) {
        return { valid: false, message: 'URL is too long (maximum 2048 characters)', cleaned };
    }

    let parsedUrl = null;
    try {
        parsedUrl = new URL(cleaned);
    } catch (e) {
        return { valid: false, message: 'Invalid URL format. Must include domain (e.g., https://example.com)', cleaned };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { valid: false, message: 'URL must start with http:// or https://', cleaned };
    }

    if (!parsedUrl.hostname || !parsedUrl.hostname.includes('.')) {
        return { valid: false, message: 'URL must include a valid domain (e.g., https://example.com)', cleaned };
    }

    return { valid: true, message: '', cleaned };
}

/**
 * Updates UI based on validation state
 * @param {Object} validation - Validation result object
 * @param {boolean} showNeutral - Whether to show neutral state for empty input
 */
function updateValidationUI(validation, showNeutral = false) {
    const isEmpty = !urlInput.value.trim();

    // Clear all states first
    urlInput.classList.remove('valid', 'invalid');
    urlError.classList.remove('show');
    urlInput.setAttribute('aria-invalid', 'false');

    if (isEmpty && showNeutral) {
        analyzeBtn.disabled = false;
        urlError.textContent = '';
        lastValidationState = null;
        return;
    }

    if (!validation.valid && !isEmpty) {
        // Invalid state
        urlInput.classList.add('invalid');
        urlInput.setAttribute('aria-invalid', 'true');
        urlError.textContent = validation.message;
        urlError.classList.add('show');
        analyzeBtn.disabled = true;
        lastValidationState = false;
    } else if (validation.valid && !isEmpty) {
        // Valid state
        urlInput.classList.add('valid');
        urlError.textContent = '';
        analyzeBtn.disabled = false;
        lastValidationState = true;
    } else {
        // Default state (empty)
        analyzeBtn.disabled = false;
        urlError.textContent = '';
        lastValidationState = null;
    }
}

/**
 * Handles real-time validation with debouncing
 */
function handleInputValidation() {
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }

    // Clear error immediately when user starts typing (if there was an error)
    if (lastValidationState === false) {
        urlInput.classList.remove('invalid');
        urlError.classList.remove('show');
        urlInput.setAttribute('aria-invalid', 'false');
    }

    // Debounce validation
    validationTimeout = setTimeout(() => {
        const validation = validateURL(urlInput.value);
        updateValidationUI(validation, true);

        // Auto-add protocol if valid
        if (validation.valid && validation.cleaned && validation.cleaned !== urlInput.value) {
            urlInput.value = validation.cleaned;
        }
    }, VALIDATION_DEBOUNCE_MS);
}

// Real-time URL validation
urlInput.addEventListener('input', handleInputValidation);

// Clear validation state on focus (better UX)
urlInput.addEventListener('focus', () => {
    if (!urlInput.value.trim()) {
        updateValidationUI({ valid: true, message: '', cleaned: '' }, true);
    }
});

// Validate on blur
urlInput.addEventListener('blur', () => {
    const validation = validateURL(urlInput.value);
    updateValidationUI(validation, false);
});

let currentOptions = null;
let currentApiResponse = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, payload, turnstileToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (turnstileToken) {
            headers['X-Turnstile-Token'] = turnstileToken;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        const raw = await response.text();
        let data = null;

        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (e) {
                throw new Error('Invalid JSON response from API');
            }
        }

        if (!response.ok) {
            const message = data?.error || `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function callScraperApi(url, options, turnstileToken) {
    // Determine if AI summary should be generated based on summaryLength
    const summaryLength = options.summaryLength || 'short';
    const generateSummary = summaryLength !== 'none';

    const payload = {
        url: url,
        ignoreRobots: options.ignoreRobots || false,
        ignoreExternalLinks: options.ignoreExternalLinks || false,
        ignoreInteralLinks: options.ignoreInternalLinks || false,  // Note: typo in backend API
        generateSummary: generateSummary,
        extractKeyFacts: options.extractKeyFacts || false
    };

    // Add language only if not 'auto'
    if (options.language && options.language !== 'auto') {
        payload.language = options.language;
    }

    // Add summaryLength only if generateSummary is true
    if (generateSummary) {
        payload.summaryLength = summaryLength;
    }

    // Add summaryLanguage only if not 'auto'
    if (options.language && options.language !== 'auto') {
        payload.summaryLanguage = options.language;
    }

    return await fetchWithTimeout(API_ENDPOINT, payload, turnstileToken);
}

function getTurnstileToken() {
    const formData = new FormData(form);
    const token = formData.get('cf-turnstile-response');

    if (token) {
        return String(token);
    }

    if (window.turnstile && typeof window.turnstile.getResponse === 'function') {
        return window.turnstile.getResponse();
    }

    return '';
}

// Advanced options toggle
advancedToggle.addEventListener('click', () => {
    advancedToggle.classList.toggle('active');
    advancedOptions.classList.toggle('active');
});

// History toggle
historyToggle.addEventListener('click', () => {
    historyToggle.classList.toggle('active');
    historyPanel.classList.toggle('active');
});

// History management
const HISTORY_KEY = 'url-scraper-history';
const MAX_HISTORY_ITEMS = 20;

function getFormOptions() {
    const formData = new FormData(form);
    const options = {
        language: 'auto',
        ignoreRobots: false,
        ignoreExternalLinks: false,
        ignoreInternalLinks: false,
        summaryLength: 'short',
        extractKeyFacts: true,
        summaryLanguage: 'auto'
    };

    options.language = formData.get('language') || 'auto';
    options.ignoreRobots = formData.get('ignoreRobots') === 'on';
    options.ignoreExternalLinks = formData.get('ignoreExternalLinks') === 'on';
    options.ignoreInternalLinks = formData.get('ignoreInternalLinks') === 'on';
    options.summaryLength = formData.get('summaryLength') || 'short';
    options.extractKeyFacts = options.summaryLength !== 'none';
    options.summaryLanguage = options.language;

    return options;
}

function saveToHistory(url, options, previewData) {
    let history = getHistory();

    // Remove duplicate if exists
    history = history.filter(item => item.url !== url);

    // Add new entry at the beginning
    history.unshift({
        url: url,
        options: options,
        timestamp: new Date().toISOString(),
        preview: {
            title: previewData?.seo?.title || url,
            statusCode: previewData?.technical?.statusCode,
            favicon: previewData?.media?.favicon
        }
    });

    // Limit history size
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function getHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        return [];
    }
}

function deleteHistoryItem(url) {
    let history = getHistory();
    history = history.filter(item => item.url !== url);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

async function clearHistory() {
    const confirmed = await showConfirmation(
        'Are you sure you want to clear all search history? This action cannot be undone.',
        'Clear Search History'
    );

    if (confirmed) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showToast('Search history cleared successfully', 'success', 3000);
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

function renderHistory() {
    const history = getHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No search history yet</div>';
        historyCount.style.display = 'none';
        return;
    }

    // Update counter
    historyCount.textContent = history.length;
    historyCount.style.display = 'inline-block';

    // Render items
    historyList.innerHTML = history.map(item => {
        const title = item.preview?.title || item.url;
        const displayTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
        const safeTitle = escapeHtml(displayTitle);
        const safeUrl = escapeHtml(item.url);
        const safeFavicon = item.preview?.favicon ? escapeHtml(item.preview.favicon) : '';
        const safeStatus = item.preview?.statusCode ? escapeHtml(String(item.preview.statusCode)) : '';

        return `
            <div class="history-item" data-url="${safeUrl}">
                <div class="history-item-main">
                    ${safeFavicon ? `<img src="${safeFavicon}" class="history-item-favicon" alt="">` : ''}
                    <div class="history-item-content">
                        <div class="history-item-domain">${safeTitle}</div>
                        <div class="history-item-meta">
                            <span class="history-item-date">
                                <span>📅</span>
                                <span>${formatDate(item.timestamp)}</span>
                            </span>
                            ${safeStatus ? `<span class="history-item-status">${safeStatus}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button class="history-item-delete" data-url="${safeUrl}" title="Delete">×</button>
            </div>
        `;
    }).join('');

    // Add event listeners
    historyList.querySelectorAll('.history-item').forEach(item => {
        const mainArea = item.querySelector('.history-item-main');
        mainArea.addEventListener('click', () => {
            const url = item.dataset.url;
            const historyItem = history.find(h => h.url === url);
            if (historyItem) {
                loadFromHistory(historyItem);
            }
        });
    });

    historyList.querySelectorAll('.history-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.dataset.url;
            deleteHistoryItem(url);
        });
    });
}

function loadFromHistory(historyItem) {
    // Set URL
    urlInput.value = historyItem.url;

    // Trigger validation
    const validation = validateURL(historyItem.url);
    updateValidationUI(validation, true);

    // Set options if available
    if (historyItem.options) {
        const options = historyItem.options;

        // Set language (custom select)
        if (options.language) {
            const langSelect = document.querySelector('.custom-select[data-name="language"]');
            if (langSelect) {
                const langOption = langSelect.querySelector(`.custom-select-option[data-value="${options.language}"]`);
                if (langOption) {
                    langOption.click();
                }
            }
        }

        // Set toggles
        const setToggle = (name, value) => {
            const input = form.querySelector(`input[name="${name}"]`);
            if (input) input.checked = value;
        };

        setToggle('ignoreRobots', options.ignoreRobots);
        setToggle('ignoreExternalLinks', options.ignoreExternalLinks);
        setToggle('ignoreInternalLinks', options.ignoreInternalLinks);

        // Set summary length (custom select)
        if (options.summaryLength) {
            const summarySelect = document.querySelector('.custom-select[data-name="summaryLength"]');
            if (summarySelect) {
                const summaryOption = summarySelect.querySelector(`.custom-select-option[data-value="${options.summaryLength}"]`);
                if (summaryOption) {
                    summaryOption.click();
                }
            }
        }
    }

    // Close history panel
    historyToggle.classList.remove('active');
    historyPanel.classList.remove('active');

    // Focus URL input
    urlInput.focus();
}

// Clear history button
clearHistoryBtn.addEventListener('click', clearHistory);

// Initialize history on page load
renderHistory();

// Initialize from URL parameters
function initializeFromURL() {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    const langParam = params.get('lang');

    if (urlParam) {
        try {
            const decodedUrl = decodeURIComponent(urlParam);
            urlInput.value = decodedUrl;

            if (langParam) {
                const langSelect = document.querySelector('.custom-select[data-name="language"]');
                if (langSelect) {
                    const langOption = langSelect.querySelector(`.custom-select-option[data-value="${langParam}"]`);
                    if (langOption) {
                        langOption.click();
                    }
                }
            }

            // Trigger validation
            const validation = validateURL(decodedUrl);
            updateValidationUI(validation, true);
        } catch (e) {
            console.error('Invalid URL parameter', e);
        }
    }
}

function updateURLWithResult(url, options) {
    const params = new URLSearchParams();
    params.set('url', url);
    if (options.language && options.language !== 'en-US') {
        params.set('lang', options.language);
    }
    params.set('share', '1');

    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newURL);
}

// Initialize from URL on page load
initializeFromURL();

// ===============================================
// Custom Select Dropdown
// ===============================================

const customSelects = document.querySelectorAll('.custom-select');

customSelects.forEach(select => {
    const trigger = select.querySelector('.custom-select-trigger');
    const options = select.querySelectorAll('.custom-select-option');
    const valueDisplay = select.querySelector('.custom-select-value');
    const hiddenInput = select.querySelector('input[type="hidden"]');
    const selectName = select.dataset.name;

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close other selects
        customSelects.forEach(s => {
            if (s !== select) s.classList.remove('active');
        });

        select.classList.toggle('active');
    });

    // Select option
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();

            const value = option.dataset.value;
            const text = option.textContent;

            // Update UI
            valueDisplay.textContent = text;
            hiddenInput.value = value;

            // Update selected state
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            // Close dropdown
            select.classList.remove('active');
        });
    });
});

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    customSelects.forEach(select => {
        select.classList.remove('active');
    });
});

// Close dropdowns on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        customSelects.forEach(select => {
            select.classList.remove('active');
        });
    }
});

// Social media icons mapping (SVG paths from Simple Icons)
const SOCIAL_ICONS = {
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>',
    trustpilot: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l3.708 7.514 8.292 1.206-6 5.846 1.416 8.253L12 18.9l-7.416 3.919L6 14.566 0 8.72l8.292-1.206z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
    medium: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
    threads: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.744-1.757-.513-.59-1.293-.91-2.32-.95a4.53 4.53 0 0 0-2.438.633c-.369.222-.618.498-.736.821l-1.9-.477c.185-.736.557-1.371 1.106-1.888.88-.825 2.117-1.273 3.577-1.296 1.852.023 3.25.56 4.155 1.595.658.753 1.074 1.774 1.238 3.038.397.07.778.158 1.14.263 1.668.48 3.01 1.355 3.89 2.535.895 1.202 1.24 2.696.997 4.322-.24 1.61-.96 2.99-2.14 4.102-1.39 1.314-3.34 2.032-5.797 2.134-.08.003-.159.004-.239.004Z"/></svg>',
    mastodon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/></svg>',
    twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
    vimeo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 003.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    snapchat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>'
};

// ===============================================
// Results Rendering Functions
// ===============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderCollapsibleSection(id, icon, title, badge, content) {
    return `
        <div class="results-section" id="${id}">
            <div class="section-header" data-collapsible aria-expanded="true">
                <h3 class="section-title">
                    <span class="section-icon">${icon}</span>
                    <span>${escapeHtml(title)}</span>
                    ${badge}
                </h3>
                <button class="collapse-toggle" aria-label="Toggle section">▼</button>
            </div>
            <div class="section-content">
                ${content}
            </div>
        </div>
    `;
}

function renderDataItem(label, value, type = 'text') {
    if (!value) return '';

    let displayValue = '';

    if (type === 'link') {
        displayValue = `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer" class="data-value-link">${escapeHtml(value)}</a>`;
    } else if (Array.isArray(value)) {
        displayValue = `<span class="data-value">${value.map(v => escapeHtml(v)).join(', ')}</span>`;
    } else {
        displayValue = `<span class="data-value">${escapeHtml(String(value))}</span>`;
    }

    return `
        <div class="data-item">
            <div class="data-label">${escapeHtml(label)}</div>
            ${displayValue}
        </div>
    `;
}

function renderSummaryHeader(technical, seo) {
    const statusCode = technical?.statusCode || '—';
    const loadTime = technical?.loadTime ? `${technical.loadTime}ms` : '—';
    const isSecure = technical?.isSecure ? '🔒 Secure' : '🔓 Not Secure';
    const title = seo?.title || 'No title found';
    const url = technical?.originalUrl || '';

    return `
        <div class="summary-header">
            <div class="summary-header-top">
                <h2 class="summary-title">${escapeHtml(title)}</h2>
                <div class="json-actions">
                    <div class="json-action-dropdown">
                        <button class="json-action-btn dropdown-trigger" id="copyDropdownBtn">
                            <span>📋</span>
                            <span>Copy</span>
                            <span class="dropdown-arrow">▼</span>
                        </button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item" id="copyJsonBtn" data-action="copy-json">
                                <span>📄</span>
                                <span>Copy as JSON</span>
                            </button>
                            <button class="dropdown-item" data-action="copy-markdown">
                                <span>📝</span>
                                <span>Copy as Markdown for AI</span>
                            </button>
                        </div>
                    </div>
                    <button class="json-action-btn" id="viewJsonBtn">
                        <span>👁️</span>
                        <span>View JSON</span>
                    </button>
                    <button class="json-action-btn" id="downloadJsonBtn">
                        <span>💾</span>
                        <span>Download JSON</span>
                    </button>
                </div>
            </div>
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="stat-label">Status</span>
                    <span class="stat-value status-${statusCode}">${statusCode}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Load Time</span>
                    <span class="stat-value">${loadTime}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Security</span>
                    <span class="stat-value">${isSecure}</span>
                </div>
            </div>
        </div>
    `;
}

function renderSEOSection(seo) {
    if (!seo || Object.keys(seo).length === 0) return '';

    const content = `
        <div class="data-grid">
            ${renderDataItem('Title', seo.title)}
            ${renderDataItem('Description', seo.description)}
            ${renderDataItem('Keywords', seo.keywords)}
            ${renderDataItem('Canonical URL', seo.canonical, 'link')}
            ${renderDataItem('Robots', seo.robots)}
            ${renderDataItem('Language', seo.language)}
            ${renderDataItem('Viewport', seo.viewport)}
        </div>
    `;

    return renderCollapsibleSection('seo-section', '🔍', 'SEO Metadata', '', content);
}

function renderOpenGraphSection(og) {
    if (!og || Object.keys(og).filter(k => og[k]).length === 0) return '';

    const content = `
        <div class="data-grid">
            ${renderDataItem('Title', og.title)}
            ${renderDataItem('Description', og.description)}
            ${renderDataItem('Image', og.image, 'link')}
            ${renderDataItem('URL', og.url, 'link')}
            ${renderDataItem('Type', og.type)}
            ${renderDataItem('Site Name', og.siteName)}
        </div>
    `;

    return renderCollapsibleSection('og-section', '📊', 'Open Graph', '', content);
}

function renderTwitterCardSection(twitter) {
    if (!twitter || Object.keys(twitter).filter(k => twitter[k]).length === 0) return '';

    const content = `
        <div class="data-grid">
            ${renderDataItem('Card Type', twitter.card)}
            ${renderDataItem('Site', twitter.site)}
            ${renderDataItem('Creator', twitter.creator)}
            ${renderDataItem('Title', twitter.title)}
            ${renderDataItem('Description', twitter.description)}
            ${renderDataItem('Image', twitter.image, 'link')}
        </div>
    `;

    return renderCollapsibleSection('twitter-section', '🐦', 'Twitter Card', '', content);
}

function renderSocialMediaSection(social) {
    if (!social) return '';

    const links = Object.entries(social)
        .filter(([_, url]) => url)
        .map(([platform, url]) => {
            const icon = SOCIAL_ICONS[platform] || '🔗';
            const displayName = platform.charAt(0).toUpperCase() + platform.slice(1);
            return `
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="social-link-item">
                    <span class="social-icon">${icon}</span>
                    <span class="social-platform">${escapeHtml(displayName)}</span>
                </a>
            `;
        });

    if (links.length === 0) return '';

    const content = `<div class="social-links-grid">${links.join('')}</div>`;
    const badge = `<span class="badge">${links.length}</span>`;

    return renderCollapsibleSection('social-section', '🌐', 'Social Media Links', badge, content);
}

function renderContactSection(contact) {
    if (!contact || Object.keys(contact).filter(k => contact[k]).length === 0) return '';

    const content = `
        <div class="data-grid">
            ${renderDataItem('Email', contact.email, 'link')}
            ${renderDataItem('Phone', contact.phone)}
            ${renderDataItem('Address', contact.address)}
        </div>
    `;

    return renderCollapsibleSection('contact-section', '📧', 'Contact Information', '', content);
}

function renderTechnicalSection(technical) {
    if (!technical) return '';

    const content = `
        <div class="data-grid">
            ${renderDataItem('Status Code', technical.statusCode)}
            ${renderDataItem('Final URL', technical.finalUrl, 'link')}
            ${renderDataItem('Original URL', technical.originalUrl, 'link')}
            ${renderDataItem('Robots Allowed', technical.robotsAllowed ? 'Yes' : 'No')}
            ${renderDataItem('Load Time', technical.loadTime ? `${technical.loadTime}ms` : null)}
            ${renderDataItem('Secure (HTTPS)', technical.isSecure ? 'Yes' : 'No')}
            ${renderDataItem('Content Type', technical.contentType)}
        </div>
    `;

    return renderCollapsibleSection('technical-section', '⚙️', 'Technical Information', '', content);
}

function renderMediaSection(media) {
    if (!media || Object.keys(media).filter(k => media[k]).length === 0) return '';

    const items = [
        { label: 'Favicon', url: media.favicon, type: 'favicon' },
        { label: 'Apple Touch Icon', url: media.appleTouchIcon, type: 'icon' },
        { label: 'Featured Image', url: media.featuredImage, type: 'image' },
        { label: 'Logo', url: media.logo, type: 'logo' }
    ].filter(item => item.url).map(item => `
        <div class="media-item">
            <div class="media-label">${escapeHtml(item.label)}</div>
            <div class="media-preview">
                <img src="${escapeHtml(item.url)}"
                     alt="${escapeHtml(item.label)}"
                     class="media-image media-image-${item.type}"
                     loading="lazy"
                     onerror="this.style.display='none'">
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="media-link">View Full Size</a>
            </div>
        </div>
    `);

    if (items.length === 0) return '';

    const content = `<div class="media-grid">${items.join('')}</div>`;

    return renderCollapsibleSection('media-section', '🖼️', 'Media Assets', '', content);
}

function renderLinksSection(links) {
    if (!links) return '';

    const totalLinks = (links.internal?.total || 0) + (links.external?.total || 0);

    const stats = `
        <div class="links-stats">
            <div class="stat-card">
                <div class="stat-value">${totalLinks}</div>
                <div class="stat-label">Total Links</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${links.internal?.total || 0}</div>
                <div class="stat-label">Internal</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${links.external?.total || 0}</div>
                <div class="stat-label">External</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${links.external?.domains?.length || 0}</div>
                <div class="stat-label">Domains</div>
            </div>
        </div>
    `;

    const internalLinks = renderLinksList('Internal Links', links.internal?.urls || [], 20);
    const externalLinks = renderLinksList('External Links', links.external?.urls || [], 20);
    const mailtoLinks = renderContactLinksList('Email Links', links.mailto || []);
    const telLinks = renderContactLinksList('Phone Links', links.tel || []);

    const content = stats + internalLinks + externalLinks + mailtoLinks + telLinks;

    return renderCollapsibleSection('links-section', '🔗', 'Links Analysis', '', content);
}

function renderLinksList(title, urls, limit = 20) {
    if (!urls || urls.length === 0) return '';

    const displayUrls = urls.slice(0, limit);
    const hasMore = urls.length > limit;

    const items = displayUrls.map(url => `
        <div class="link-item">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
        </div>
    `).join('');

    const moreInfo = hasMore ? `<div class="links-more">+${urls.length - limit} more links</div>` : '';

    return `
        <div class="links-list">
            <div class="links-list-header">${escapeHtml(title)} (${urls.length})</div>
            <div class="links-list-items">${items}</div>
            ${moreInfo}
        </div>
    `;
}

function renderContactLinksList(title, links) {
    if (!links || links.length === 0) return '';

    const items = links.map(link => `
        <div class="link-item">
            <span>${escapeHtml(link)}</span>
        </div>
    `).join('');

    return `
        <div class="links-list">
            <div class="links-list-header">${escapeHtml(title)} (${links.length})</div>
            <div class="links-list-items">${items}</div>
        </div>
    `;
}

function renderStructuredDataSection(structuredData) {
    if (!structuredData || structuredData.length === 0) return '';

    const jsonString = JSON.stringify(structuredData, null, 2);
    const content = `
        <div class="json-viewer">
            <pre><code>${escapeHtml(jsonString)}</code></pre>
        </div>
    `;

    const badge = `<span class="badge">${structuredData.length}</span>`;

    return renderCollapsibleSection('structured-data-section', '📋', 'Structured Data (JSON-LD)', badge, content);
}

function renderAISection(ai) {
    if (!ai || (!ai.summary && !ai.keyFacts)) return '';

    let summaryHtml = '';
    if (ai.summary) {
        const summaryText = ai.summary.long || ai.summary.medium || ai.summary.short || '';
        summaryHtml = `
            <div class="ai-summary">
                <h4 class="ai-summary-title">AI Summary</h4>
                <div class="ai-summary-text">${escapeHtml(summaryText)}</div>
            </div>
        `;
    }

    let keyFactsHtml = '';
    if (ai.keyFacts) {
        const factEntries = Object.entries(ai.keyFacts).filter(([_, value]) => value && String(value).trim());

        if (factEntries.length > 0) {
            const facts = factEntries.map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
                const displayValue = Array.isArray(value) ? value.join(', ') : value;
                return `
                    <div class="key-fact-item">
                        <div class="data-label">${escapeHtml(displayLabel)}</div>
                        <div class="data-value">${escapeHtml(String(displayValue))}</div>
                    </div>
                `;
            }).join('');

            keyFactsHtml = `
                <div class="key-facts">
                    <h4 class="key-facts-title">Key Facts</h4>
                    <div class="key-facts-grid">${facts}</div>
                </div>
            `;
        }
    }

    const errorHtml = ai.error ? `<div class="ai-error">⚠️ ${escapeHtml(ai.error)}</div>` : '';

    const content = summaryHtml + keyFactsHtml + errorHtml;
    const badge = ai.error ? '<span class="badge badge-warning">Partial</span>' : '';

    return renderCollapsibleSection('ai-section', '🤖', 'AI Analysis', badge, content);
}

function displayResults(data) {
    const sections = [
        renderSummaryHeader(data.technical, data.seo),
        renderAISection(data.ai),
        renderSEOSection(data.seo),
        renderOpenGraphSection(data.openGraph),
        renderTwitterCardSection(data.twitterCard),
        renderSocialMediaSection(data.social),
        renderContactSection(data.contact),
        renderTechnicalSection(data.technical),
        renderMediaSection(data.media),
        renderLinksSection(data.links),
        renderStructuredDataSection(data.structuredData)
    ].filter(Boolean);

    resultsContainer.innerHTML = sections.join('');
    resultsContainer.style.display = 'block';

    // Attach collapsible handlers
    attachCollapsibleHandlers();

    // Attach JSON action button handlers
    const copyDropdownBtn = document.getElementById('copyDropdownBtn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    const viewJsonBtn = document.getElementById('viewJsonBtn');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');

    // Dropdown toggle handler
    if (copyDropdownBtn && dropdownMenu) {
        copyDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.json-action-dropdown')) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Dropdown item handlers
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;

            if (action === 'copy-json') {
                copyJsonToClipboard();
            } else if (action === 'copy-markdown') {
                copyMarkdownToClipboard();
            }

            // Close dropdown after action
            if (dropdownMenu) {
                dropdownMenu.classList.remove('show');
            }
        });
    });

    if (viewJsonBtn) {
        viewJsonBtn.addEventListener('click', viewJsonFile);
    }

    if (downloadJsonBtn) {
        downloadJsonBtn.addEventListener('click', downloadJsonFile);
    }

    // Update URL with result
    updateURLWithResult(data.technical.originalUrl, currentOptions);

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function attachCollapsibleHandlers() {
    const headers = resultsContainer.querySelectorAll('[data-collapsible]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', !isExpanded);
        });
    });
}

// ===============================================
// Form Submit Handler
// ===============================================

const LOADING_MESSAGES = [
    'Fetching webpage...',
    'Parsing HTML structure...',
    'Extracting metadata...',
    'Analyzing social media links...',
    'Discovering media assets...',
    'Mapping internal links...',
    'Processing external references...'
];

let loadingMessageInterval = null;
let currentMessageIndex = 0;

function showLoadingState() {
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('loading');

    currentMessageIndex = 0;
    const btnText = analyzeBtn.querySelector('.btn-text');
    btnText.textContent = LOADING_MESSAGES[0];

    loadingMessageInterval = setInterval(() => {
        currentMessageIndex = (currentMessageIndex + 1) % LOADING_MESSAGES.length;
        btnText.textContent = LOADING_MESSAGES[currentMessageIndex];
    }, 3000);
}

function hideLoadingState() {
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove('loading');
    analyzeBtn.querySelector('.btn-text').textContent = 'Analyze';

    if (loadingMessageInterval) {
        clearInterval(loadingMessageInterval);
        loadingMessageInterval = null;
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate URL
    const validation = validateURL(urlInput.value);
    if (!validation.valid) {
        updateValidationUI(validation, false);
        showToast(validation.message, 'error', 5000);
        return;
    }

    if (!API_ENDPOINT || API_ENDPOINT === '__API_ENDPOINT__') {
        showToast('API endpoint not configured. Please set URL_SCRAPER_API_ENDPOINT and rebuild.', 'error', 8000);
        return;
    }

    const url = validation.cleaned;
    const options = getFormOptions();
    const turnstileToken = getTurnstileToken();

    if (!turnstileToken) {
        showToast('Please complete the Cloudflare Turnstile challenge', 'warning', 5000);
        return;
    }

    currentOptions = options;
    showLoadingState();
    dismissAllToasts();

    try {
        const response = await callScraperApi(url, options, turnstileToken);

        if (response.success && response.data) {
            currentApiResponse = response;
            displayResults(response.data);
            saveToHistory(url, options, response.data);
            showToast('URL analysis completed successfully', 'success', 5000);
        } else {
            throw new Error(response.error || 'Analysis failed');
        }
    } catch (error) {
        console.error('Analysis error:', error);

        let errorMessage = 'Failed to analyze URL. ';
        if (error.message.includes('aborted')) {
            errorMessage += 'Request timeout. The target website may be slow or unresponsive.';
        } else if (error.message.includes('fetch')) {
            errorMessage += 'Network error. Please check your connection.';
        } else {
            errorMessage += error.message;
        }

        showToast(errorMessage, 'error', 10000);
        resultsContainer.style.display = 'none';
    } finally {
        hideLoadingState();

        // Reset Turnstile
        if (window.turnstile && typeof window.turnstile.reset === 'function') {
            window.turnstile.reset();
        }
    }
});

// Confirmation modal
function showConfirmModal(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');

        messageEl.textContent = message;
        modal.style.display = 'flex';

        const handleConfirm = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// Handle Ignore robots.txt confirmation
const ignoreRobotsCheckbox = form.querySelector('input[name="ignoreRobots"]');
if (ignoreRobotsCheckbox) {
    ignoreRobotsCheckbox.addEventListener('change', async (e) => {
        if (e.target.checked) {
            const confirmed = await showConfirmModal(
                'Are you authorized to bypass robots.txt restrictions for this website? Only proceed if you have explicit permission or are conducting authorized security testing.'
            );

            if (!confirmed) {
                e.target.checked = false;
            }
        }
    });
}

// Copy JSON to clipboard
function copyJsonToClipboard() {
    if (!currentApiResponse) {
        showToast('No analysis data available to copy', 'warning', 4000);
        return;
    }

    const jsonString = JSON.stringify(currentApiResponse, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
        // Visual feedback
        const btn = document.getElementById('copyJsonBtn');
        if (btn) {
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span>✓</span><span>Copied!</span>';
            btn.style.background = 'var(--color-success)';
            btn.style.borderColor = 'var(--color-success)';
            btn.style.color = 'var(--color-bg)';

            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
            }, 2000);
        }

        showToast('JSON copied to clipboard', 'success', 3000);
    }).catch(err => {
        showToast('Failed to copy JSON to clipboard', 'error', 5000);
        console.error('Clipboard error:', err);
    });
}

// Generate Markdown report optimized for LLM prompts
function generateMarkdownReport() {
    if (!currentApiResponse || !currentApiResponse.data) {
        return '';
    }

    const data = currentApiResponse.data;
    const url = data.technical?.originalUrl || 'Unknown URL';
    const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const status = data.technical?.statusCode || '—';
    const loadTime = data.technical?.loadTime ? `${data.technical.loadTime}ms` : '—';
    const statusEmoji = status >= 200 && status < 300 ? '✅' : status >= 300 && status < 400 ? '⚠️' : '❌';

    let md = `# Website Analysis Report\n\n`;
    md += `**URL**: ${url}\n`;
    md += `**Analysis Date**: ${timestamp}\n`;
    md += `**Status**: ${statusEmoji} ${status} (${loadTime})\n\n`;

    md += `## Overview\n\n`;
    md += `This report contains comprehensive metadata extracted from the website, including SEO data, social media links, contact information, technical details, and more.\n\n`;
    md += `---\n\n`;

    // SEO Metadata
    if (data.seo && Object.keys(data.seo).some(k => data.seo[k])) {
        md += `## SEO Metadata\n\n`;
        if (data.seo.title) md += `- **Title**: ${data.seo.title}\n`;
        if (data.seo.description) md += `- **Description**: ${data.seo.description}\n`;
        if (data.seo.keywords) md += `- **Keywords**: ${data.seo.keywords}\n`;
        if (data.seo.canonical) md += `- **Canonical URL**: ${data.seo.canonical}\n`;
        if (data.seo.robots) md += `- **Robots**: ${data.seo.robots}\n`;
        if (data.seo.language) md += `- **Language**: ${data.seo.language}\n`;
        if (data.seo.viewport) md += `- **Viewport**: ${data.seo.viewport}\n`;
        md += `\n`;
    }

    // Social Media Presence
    if (data.social && Object.keys(data.social).some(k => data.social[k])) {
        md += `## Social Media Presence\n\n`;
        Object.entries(data.social).forEach(([platform, url]) => {
            if (url) {
                const displayName = platform.charAt(0).toUpperCase() + platform.slice(1);
                md += `- **${displayName}**: [${url}](${url})\n`;
            }
        });
        md += `\n`;
    }

    // Contact Information
    if (data.contact && Object.keys(data.contact).some(k => data.contact[k])) {
        md += `## Contact Information\n\n`;
        if (data.contact.email) md += `- **Email**: ${data.contact.email}\n`;
        if (data.contact.phone) md += `- **Phone**: ${data.contact.phone}\n`;
        if (data.contact.address) md += `- **Address**: ${data.contact.address}\n`;
        md += `\n`;
    }

    // Technical Details
    if (data.technical) {
        md += `## Technical Details\n\n`;
        if (data.technical.statusCode) md += `- **HTTP Status**: ${data.technical.statusCode}\n`;
        if (data.technical.loadTime) md += `- **Load Time**: ${data.technical.loadTime}ms\n`;
        if (data.technical.isSecure !== undefined) md += `- **HTTPS**: ${data.technical.isSecure ? 'Yes ✅' : 'No ❌'}\n`;
        if (data.technical.finalUrl) md += `- **Final URL**: ${data.technical.finalUrl}\n`;
        if (data.technical.robotsAllowed !== undefined) md += `- **Robots Allowed**: ${data.technical.robotsAllowed ? 'Yes' : 'No'}\n`;
        if (data.technical.contentType) md += `- **Content Type**: ${data.technical.contentType}\n`;
        md += `\n`;
    }

    // Open Graph
    if (data.openGraph && Object.keys(data.openGraph).some(k => data.openGraph[k])) {
        md += `## Open Graph Metadata\n\n`;
        if (data.openGraph.title) md += `- **OG Title**: ${data.openGraph.title}\n`;
        if (data.openGraph.description) md += `- **OG Description**: ${data.openGraph.description}\n`;
        if (data.openGraph.image) md += `- **OG Image**: [${data.openGraph.image}](${data.openGraph.image})\n`;
        if (data.openGraph.url) md += `- **OG URL**: ${data.openGraph.url}\n`;
        if (data.openGraph.type) md += `- **OG Type**: ${data.openGraph.type}\n`;
        if (data.openGraph.siteName) md += `- **OG Site Name**: ${data.openGraph.siteName}\n`;
        md += `\n`;
    }

    // Twitter Card
    if (data.twitterCard && Object.keys(data.twitterCard).some(k => data.twitterCard[k])) {
        md += `## Twitter Card Metadata\n\n`;
        if (data.twitterCard.card) md += `- **Card Type**: ${data.twitterCard.card}\n`;
        if (data.twitterCard.site) md += `- **Site**: ${data.twitterCard.site}\n`;
        if (data.twitterCard.creator) md += `- **Creator**: ${data.twitterCard.creator}\n`;
        if (data.twitterCard.title) md += `- **Title**: ${data.twitterCard.title}\n`;
        if (data.twitterCard.description) md += `- **Description**: ${data.twitterCard.description}\n`;
        if (data.twitterCard.image) md += `- **Image**: [${data.twitterCard.image}](${data.twitterCard.image})\n`;
        md += `\n`;
    }

    // Media Assets
    if (data.media && Object.keys(data.media).some(k => data.media[k])) {
        md += `## Media Assets\n\n`;
        if (data.media.favicon) md += `- **Favicon**: [${data.media.favicon}](${data.media.favicon})\n`;
        if (data.media.appleTouchIcon) md += `- **Apple Touch Icon**: [${data.media.appleTouchIcon}](${data.media.appleTouchIcon})\n`;
        if (data.media.featuredImage) md += `- **Featured Image**: [${data.media.featuredImage}](${data.media.featuredImage})\n`;
        if (data.media.logo) md += `- **Logo**: [${data.media.logo}](${data.media.logo})\n`;
        md += `\n`;
    }

    // Links Summary
    if (data.links) {
        md += `## Links Analysis\n\n`;
        const totalLinks = (data.links.internal?.total || 0) + (data.links.external?.total || 0);
        md += `- **Total Links**: ${totalLinks}\n`;
        md += `- **Internal Links**: ${data.links.internal?.total || 0}\n`;
        md += `- **External Links**: ${data.links.external?.total || 0}\n`;
        md += `- **External Domains**: ${data.links.external?.domains?.length || 0}\n`;
        md += `\n`;
    }

    // AI Analysis
    if (data.ai && (data.ai.summary || data.ai.keyFacts)) {
        md += `## AI Analysis\n\n`;

        if (data.ai.summary) {
            const summaryText = data.ai.summary.long || data.ai.summary.medium || data.ai.summary.short || '';
            if (summaryText) {
                md += `### AI-Generated Summary\n\n`;
                md += `${summaryText}\n\n`;
            }
        }

        if (data.ai.keyFacts) {
            const facts = Object.entries(data.ai.keyFacts).filter(([_, v]) => v && String(v).trim());
            if (facts.length > 0) {
                md += `### Key Facts\n\n`;
                facts.forEach(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, ' $1').trim();
                    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
                    const displayValue = Array.isArray(value) ? value.join(', ') : value;
                    md += `- **${displayLabel}**: ${displayValue}\n`;
                });
                md += `\n`;
            }
        }

        if (data.ai.error) {
            md += `*Note: ${data.ai.error}*\n\n`;
        }
    }

    md += `---\n\n`;
    md += `*Generated by [URL Summary Scraper](https://urlsummary.echovalue.dev) on ${timestamp}*\n`;

    return md;
}

// Copy Markdown to clipboard
function copyMarkdownToClipboard() {
    if (!currentApiResponse) {
        showToast('No analysis data available to copy', 'warning', 4000);
        return;
    }

    const markdown = generateMarkdownReport();

    navigator.clipboard.writeText(markdown).then(() => {
        showToast('Markdown copied to clipboard', 'success', 3000);
    }).catch(err => {
        showToast('Failed to copy Markdown to clipboard', 'error', 5000);
        console.error('Clipboard error:', err);
    });
}

// View JSON file in JSONLint
function viewJsonFile() {
    if (!currentApiResponse) {
        showToast('No analysis data available to view', 'warning', 4000);
        return;
    }

    try {
        // Compress JSON using LZString
        const jsonString = JSON.stringify(currentApiResponse);
        const compressed = LZString.compressToEncodedURIComponent(jsonString);

        // Create a temporary link and click it (prevents popup blockers)
        const url = `https://jsonlint.echovalue.dev/?json=${compressed}`;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Visual feedback
        const btn = document.getElementById('viewJsonBtn');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span>✓</span><span>Opened!</span>';
        btn.style.background = 'var(--color-success)';
        btn.style.borderColor = 'var(--color-success)';
        btn.style.color = 'var(--color-bg)';

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    } catch (error) {
        showToast('Failed to compress JSON. Please try again.', 'error', 5000);
        console.error('Compression error:', error);
    }
}

// Download JSON file
function downloadJsonFile() {
    if (!currentApiResponse) {
        showToast('No analysis data available to download', 'warning', 4000);
        return;
    }

    const jsonString = JSON.stringify(currentApiResponse, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);

    // Generate filename from URL and timestamp
    const url = currentApiResponse.data?.technical?.originalUrl || 'analysis';
    const hostname = url.replace(/^https?:\/\//, '').replace(/\//g, '_').replace(/:/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${hostname}_${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);

    // Visual feedback
    const btn = document.getElementById('downloadJsonBtn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span>✓</span><span>Downloaded!</span>';
    btn.style.background = 'var(--color-success)';
    btn.style.borderColor = 'var(--color-success)';
    btn.style.color = 'var(--color-bg)';

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
    }, 2000);

    showToast('JSON file downloaded', 'success', 3000);
}

// FAQ accordion (landing page)
const faqQuestions = document.querySelectorAll('.faq-question');
if (faqQuestions.length > 0) {
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            const isActive = faqItem.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
                const toggle = item.querySelector('.faq-question');
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });

            if (!isActive) {
                faqItem.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}
