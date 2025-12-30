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
            <div class="toast-message">${message}</div>
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

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
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

    if (!URL_REGEX.test(cleaned)) {
        return { valid: false, message: 'Invalid URL format. Must include domain (e.g., https://example.com)', cleaned };
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

        return `
            <div class="history-item" data-url="${item.url}">
                <div class="history-item-main">
                    ${item.preview?.favicon ? `<img src="${item.preview.favicon}" class="history-item-favicon" alt="">` : ''}
                    <div class="history-item-content">
                        <div class="history-item-domain">${displayTitle}</div>
                        <div class="history-item-meta">
                            <span class="history-item-date">
                                <span>📅</span>
                                <span>${formatDate(item.timestamp)}</span>
                            </span>
                            ${item.preview?.statusCode ? `<span class="history-item-status">${item.preview.statusCode}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button class="history-item-delete" data-url="${item.url}" title="Delete">×</button>
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
                const langSelect = form.querySelector('select[name="language"]');
                if (langSelect) langSelect.value = langParam;
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

// Social media icons mapping
const SOCIAL_ICONS = {
    facebook: '📘',
    x: '𝕏',
    linkedin: '💼',
    instagram: '📷',
    youtube: '📹',
    tiktok: '🎵',
    github: '🐙',
    pinterest: '📌',
    trustpilot: '⭐',
    discord: '💬',
    telegram: '✈️',
    whatsapp: '💬',
    medium: '📝',
    reddit: '🔴',
    threads: '🧵',
    mastodon: '🦣',
    twitch: '🎮',
    vimeo: '📹',
    spotify: '🎵',
    snapchat: '👻'
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
        displayValue = `<a href="${escapeHtml(value)}" target="_blank" class="data-value-link">${escapeHtml(value)}</a>`;
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
                    <button class="json-action-btn" id="copyJsonBtn">
                        <span>📋</span>
                        <span>Copy JSON</span>
                    </button>
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
                <a href="${escapeHtml(url)}" target="_blank" class="social-link-item">
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
                <a href="${escapeHtml(item.url)}" target="_blank" class="media-link">View Full Size</a>
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
            <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>
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
    const copyJsonBtn = document.getElementById('copyJsonBtn');
    const viewJsonBtn = document.getElementById('viewJsonBtn');
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');

    if (copyJsonBtn) {
        copyJsonBtn.addEventListener('click', copyJsonToClipboard);
    }

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

        showToast('JSON copied to clipboard', 'success', 3000);
    }).catch(err => {
        showToast('Failed to copy JSON to clipboard', 'error', 5000);
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
