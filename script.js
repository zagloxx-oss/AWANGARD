// ========== AWANGARD NEON v1.0 ==========
// Основной файл JavaScript

// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    VERSION: '1.0',
    DONATION_URL: 'https://www.donationalerts.com/r/limitblitzoffical',
    BOT_TOKEN: '8745985444:AAGA1jByHKR78uThXfkurejklLrIp53bp6M',
    ADMIN_ID: 'ВАШ_TELEGRAM_ID', // ЗАМЕНИТЕ НА ВАШ TELEGRAM ID
    ADMIN_CODE: 'AWANGARD',
    SITE_NAME: 'AWANGARD NEON'
};

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let secretCode = '';
let currentFilter = 'all';
let currentReviewFilter = 'all';
let selectedRating = 0;
let userLocation = { country: "Неизвестно", city: "Неизвестно", ip: "Неизвестно" };

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast-notification ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ОПРЕДЕЛЕНИЕ ГЕОЛОКАЦИИ ==========
async function getUserLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        userLocation = {
            country: data.country_name || "Неизвестно",
            city: data.city || "Неизвестно",
            ip: data.ip || "Неизвестно",
            region: data.region || "Неизвестно"
        };
        return userLocation;
    } catch (error) {
        console.error('Ошибка получения геолокации:', error);
        userLocation = { country: "Неизвестно", city: "Неизвестно", ip: "Неизвестно" };
        return userLocation;
    }
}

// ========== ОПРЕДЕЛЕНИЕ УСТРОЙСТВА ==========
function getDeviceFullInfo() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenResolution = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    let os = "Unknown";
    if (/Windows NT 10/.test(ua)) os = "Windows 10";
    else if (/Windows NT 6.1/.test(ua)) os = "Windows 7";
    else if (/Mac OS X/.test(ua)) os = "macOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Linux/.test(ua)) os = "Linux";
    
    let browser = "Unknown";
    if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
    else if (/Firefox/.test(ua)) browser = "Firefox";
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
    else if (/Edg/.test(ua)) browser = "Edge";
    else if (/Opera|OPR/.test(ua)) browser = "Opera";
    
    let deviceType = "Desktop";
    if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) {
        deviceType = /iPad|Android(?!.*Mobile)/i.test(ua) ? "Tablet" : "Mobile";
    }
    
    return { os, browser, deviceType, platform, language, screenResolution, timezone, userAgent: ua.substring(0, 200) };
}

// ========== УПРАВЛЕНИЕ ДАННЫМИ ==========
function generateUniqueId() { return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }

function getOrCreateUserId() {
    let userId = localStorage.getItem('awangard_user_id');
    if (!userId) {
        userId = generateUniqueId();
        localStorage.setItem('awangard_user_id', userId);
        registerUserWithLocation(userId, 'guest', 'Гость');
    }
    return userId;
}

async function registerUserWithLocation(id, type, name, photo = null, telegramId = null) {
    let users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const deviceInfo = getDeviceFullInfo();
    const location = await getUserLocation();
    
    if (!users.find(u => u.id === id)) {
        const newUser = { 
            id, type, name, photo, telegramId, 
            deviceInfo: deviceInfo,
            location: location,
            firstSeen: new Date().toISOString(), 
            lastSeen: new Date().toISOString(), 
            chatId: id, 
            orders: 0,
            visitCount: 1
        };
        users.push(newUser);
        localStorage.setItem('awangard_all_users', JSON.stringify(users));
    } else {
        const userIndex = users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            users[userIndex].lastSeen = new Date().toISOString();
            users[userIndex].visitCount = (users[userIndex].visitCount || 0) + 1;
            localStorage.setItem('awangard_all_users', JSON.stringify(users));
        }
    }
}

function updateUserLastSeen(userId) {
    let users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const user = users.find(u => u.id === userId);
    if (user) { user.lastSeen = new Date().toISOString(); localStorage.setItem('awangard_all_users', JSON.stringify(users)); }
}

const CURRENT_USER_ID = getOrCreateUserId();
const CHAT_STORAGE_PREFIX = 'awangard_chat_';
const USERS_STORAGE_KEY = 'awangard_all_users';
const TELEGRAM_USER_KEY = 'awangard_telegram_user';
const REVIEWS_STORAGE_KEY = 'awangard_reviews';

function getTelegramUser() { const saved = localStorage.getItem(TELEGRAM_USER_KEY); return saved ? JSON.parse(saved) : null; }

function saveTelegramUser(userData) {
    localStorage.setItem(TELEGRAM_USER_KEY, JSON.stringify(userData));
    let users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const existing = users.find(u => u.id === userData.id.toString());
    if (existing) {
        existing.type = 'telegram';
        existing.name = userData.first_name + ' ' + (userData.last_name || '');
        existing.photo = userData.photo_url;
        existing.telegramId = userData.id;
        existing.lastSeen = new Date().toISOString();
        existing.visitCount = (existing.visitCount || 0) + 1;
    } else {
        users.push({ id: userData.id.toString(), type: 'telegram', name: userData.first_name + ' ' + (userData.last_name || ''), photo: userData.photo_url, telegramId: userData.id, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), chatId: userData.id.toString(), orders: 0, visitCount: 1, deviceInfo: getDeviceFullInfo() });
        getUserLocation().then(loc => {
            const userIndex = users.findIndex(u => u.id === userData.id.toString());
            if (userIndex !== -1) users[userIndex].location = loc;
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        });
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function updateUIAfterLogin(userData) {
    document.getElementById('profileNameLarge').textContent = userData.first_name + ' ' + (userData.last_name || '');
    document.getElementById('profileUsernameLarge').textContent = userData.username ? '@' + userData.username : '';
    document.getElementById('profileIdLarge').textContent = userData.id;
    document.getElementById('profileAvatarLarge').src = userData.photo_url || `https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=${userData.first_name}`;
    document.getElementById('telegramLoginEnhanced').style.display = 'none';
    document.getElementById('logoutEnhancedBtn').style.display = 'flex';
    document.getElementById('userBadge').style.display = 'flex';
    document.getElementById('userAvatarMini').src = userData.photo_url || `https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=${userData.first_name}`;
    document.getElementById('userNameMini').textContent = userData.first_name;
    loadUsersList();
    updateUserActivity();
}

function updateUIForGuest() {
    document.getElementById('profileNameLarge').textContent = 'Гость';
    document.getElementById('profileUsernameLarge').textContent = '';
    document.getElementById('profileIdLarge').textContent = CURRENT_USER_ID.slice(-8);
    document.getElementById('profileAvatarLarge').src = 'https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=Guest';
    document.getElementById('telegramLoginEnhanced').style.display = 'block';
    document.getElementById('logoutEnhancedBtn').style.display = 'none';
    document.getElementById('userBadge').style.display = 'none';
}

function logout() { localStorage.removeItem(TELEGRAM_USER_KEY); updateUIForGuest(); showToast('Вы вышли из аккаунта', 'info'); }

function updateUserActivity() {
    const user = getTelegramUser();
    if (!user) return;
    const reviews = getReviews();
    const userReviews = reviews.filter(r => r.userId === user.id.toString());
    document.getElementById('userReviewsCount').textContent = userReviews.length;
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const userData = users.find(u => u.id === user.id.toString());
    document.getElementById('userOrdersCount').textContent = userData?.orders || 0;
}

// ========== TELEGRAM ВХОД ==========
window.onTelegramAuth = function(user) {
    if (user && user.id) {
        const userData = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || '',
            username: user.username || '',
            photo_url: user.photo_url || ''
        };
        saveTelegramUser(userData);
        updateUIAfterLogin(userData);
        updateUserLastSeen(user.id.toString());
        showToast(`Добро пожаловать, ${user.first_name}!`, 'success');
        document.getElementById('homeLink').click();
    }
};

function initTelegramLogin() {
    const container = document.getElementById('telegramLoginEnhanced');
    if (container) {
        container.innerHTML = '';
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?23';
        script.setAttribute('data-telegram-login', 'awangard_shop_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        container.appendChild(script);
    }
}

// ========== ОТЗЫВЫ ==========
function getReviews() { return JSON.parse(localStorage.getItem(REVIEWS_STORAGE_KEY) || '[]'); }
function saveReviews(reviews) { localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews)); }

function addReview(userName, rating, text) {
    const user = getTelegramUser();
    const reviews = getReviews();
    reviews.unshift({ 
        id: Date.now(), 
        userId: user ? user.id.toString() : 'guest_' + CURRENT_USER_ID,
        userName: userName || 'Аноним', 
        rating: rating, 
        text: text, 
        date: new Date().toISOString(), 
        avatar: `https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=${userName || 'Аноним'}`
    });
    saveReviews(reviews);
    renderReviews();
    updateStats();
    updateUserActivity();
}

function deleteReview(reviewId) {
    let reviews = getReviews();
    reviews = reviews.filter(r => r.id !== reviewId);
    saveReviews(reviews);
    renderReviews();
    if (document.getElementById('adminReviewsTab').style.display !== 'none') renderAdminReviews();
    updateStats();
    showToast('Отзыв удалён', 'info');
}

function renderReviews() {
    const reviews = getReviews();
    const filtered = currentReviewFilter === 'all' ? reviews : reviews.filter(r => r.rating === parseInt(currentReviewFilter));
    const container = document.getElementById('reviewsListEnhanced');
    const reviewsCount = document.getElementById('reviewsCountLarge');
    const avgRatingSpan = document.getElementById('averageRatingLarge');
    const starsContainer = document.getElementById('ratingStarsLarge');
    
    if (reviewsCount) reviewsCount.textContent = reviews.length;
    let totalRating = 0;
    reviews.forEach(r => totalRating += r.rating);
    const average = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    if (avgRatingSpan) avgRatingSpan.textContent = average;
    if (starsContainer) {
        starsContainer.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = i <= Math.round(average) ? 'fas fa-star' : 'far fa-star';
            starsContainer.appendChild(star);
        }
    }
    
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-reviews-enhanced">😢 Пока нет отзывов. Будьте первым!</div>';
        return;
    }
    container.innerHTML = filtered.map(r => `
        <div class="review-card-enhanced">
            <div class="review-header-enhanced">
                <img src="${r.avatar}" class="review-avatar-enhanced" alt="">
                <div class="review-user-enhanced">
                    <span class="review-name-enhanced">${escapeHtml(r.userName)}</span>
                    <div class="review-stars-enhanced">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
                </div>
                <span class="review-date-enhanced">${new Date(r.date).toLocaleDateString()}</span>
            </div>
            <div class="review-text-enhanced">${escapeHtml(r.text)}</div>
        </div>
    `).join('');
}

function renderAdminReviews() {
    const reviews = getReviews();
    const container = document.getElementById('adminReviewsList');
    if (!container) return;
    if (reviews.length === 0) { container.innerHTML = '<div class="no-reviews">Нет отзывов</div>'; return; }
    container.innerHTML = reviews.map(r => `
        <div class="admin-review-card">
            <div class="admin-review-info">
                <strong>${escapeHtml(r.userName)}</strong>
                <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}</div>
                <p>${escapeHtml(r.text.substring(0, 100))}${r.text.length > 100 ? '...' : ''}</p>
                <small>${new Date(r.date).toLocaleString()}</small>
            </div>
            <button class="admin-delete-btn" data-id="${r.id}"><i class="fas fa-trash"></i> Удалить</button>
        </div>
    `).join('');
    container.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteReview(parseInt(btn.dataset.id)));
    });
}

// ========== АДМИН-ПАНЕЛЬ ==========
function openAdminPanel() {
    document.getElementById('adminPanel').style.display = 'flex';
    document.getElementById('adminOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
    loadAdminData();
}

function closeAdminPanel() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', function(e) {
    if (e.key.length === 1 && /[A-Za-z0-9]/.test(e.key)) {
        secretCode += e.key.toUpperCase();
        if (secretCode.length > CONFIG.ADMIN_CODE.length) secretCode = secretCode.slice(-CONFIG.ADMIN_CODE.length);
        if (secretCode === CONFIG.ADMIN_CODE) { openAdminPanel(); secretCode = ''; }
    }
});

function loadAdminData() { loadUsersList(); loadAdminUserSelect(); updateStats(); renderAdminReviews(); }

function loadUsersList() {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const search = document.getElementById('adminUserSearch')?.value.toLowerCase() || '';
    const filtered = users.filter(u => u.name?.toLowerCase().includes(search) || u.id.toString().includes(search));
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    
    if (filtered.length === 0) { container.innerHTML = '<div class="no-data">Нет пользователей</div>'; return; }
    
    container.innerHTML = filtered.map(u => `
        <div class="admin-user-card" onclick="window.selectUserForChat?.('${u.chatId || u.id}')">
            <img src="${u.photo || `https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=${u.name || 'Guest'}`}" alt="">
            <div class="admin-user-info">
                <div class="admin-user-name">${u.name || 'Гость'}</div>
                <div class="admin-user-id">ID: ${typeof u.id === 'number' ? u.id : u.id.slice(-8)}</div>
                <div class="admin-user-device">
                    <i class="fas ${u.deviceInfo?.deviceType === 'Mobile' ? 'fa-mobile-alt' : (u.deviceInfo?.deviceType === 'Tablet' ? 'fa-tablet-alt' : 'fa-desktop')}"></i>
                    ${u.deviceInfo?.deviceType || 'Desktop'} | ${u.deviceInfo?.os || 'Unknown'} | ${u.deviceInfo?.browser || 'Unknown'}
                </div>
                <div class="admin-user-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${u.location?.city || 'Неизвестно'}, ${u.location?.country || 'Неизвестно'}
                    <span class="admin-user-ip">IP: ${u.location?.ip || 'скрыт'}</span>
                </div>
                <div class="admin-user-stats">
                    <span><i class="fas fa-calendar"></i> Впервые: ${new Date(u.firstSeen).toLocaleDateString()}</span>
                    <span><i class="fas fa-clock"></i> Последний визит: ${new Date(u.lastSeen).toLocaleString()}</span>
                    <span><i class="fas fa-chart-simple"></i> Визитов: ${u.visitCount || 1}</span>
                </div>
            </div>
            <div class="admin-user-badge ${u.type === 'telegram' ? 'tg-badge' : 'guest-badge'}">
                ${u.type === 'telegram' ? '<i class="fab fa-telegram"></i> Telegram' : '<i class="fas fa-user"></i> Гость'}
            </div>
        </div>
    `).join('');
}

window.selectUserForChat = function(userId) {
    document.querySelector('.admin-tab-enhanced[data-tab="chats"]').click();
    const select = document.getElementById('adminUserSelect');
    if (select) { select.value = userId; loadAdminChat(userId); loadAdminUserInfo(userId); }
};

function loadAdminUserInfo(userId) {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const user = users.find(u => (u.chatId || u.id).toString() === userId);
    const container = document.getElementById('adminSelectedUserInfo');
    if (container) {
        container.innerHTML = user ? `
            <div class="admin-user-detail">
                <img src="${user.photo || 'https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=User'}" alt="">
                <div class="admin-user-detail-info">
                    <strong>${user.name || 'Гость'}</strong>
                    <small>${user.type === 'telegram' ? 'Telegram ID: ' + user.id : 'Гость'}</small>
                    <div class="detail-device">
                        <i class="fas ${user.deviceInfo?.deviceType === 'Mobile' ? 'fa-mobile-alt' : 'fa-desktop'}"></i>
                        ${user.deviceInfo?.deviceType || 'Desktop'} | ${user.deviceInfo?.os || 'Unknown'} | ${user.deviceInfo?.browser || 'Unknown'}
                    </div>
                    <div class="detail-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${user.location?.city || 'Неизвестно'}, ${user.location?.country || 'Неизвестно'}
                        <span class="detail-ip">IP: ${user.location?.ip || 'скрыт'}</span>
                    </div>
                    <div class="detail-screen">
                        <i class="fas fa-desktop"></i> Экран: ${user.deviceInfo?.screenResolution || 'Неизвестно'}
                    </div>
                    <div class="detail-timezone">
                        <i class="fas fa-globe"></i> Часовой пояс: ${user.deviceInfo?.timezone || 'Неизвестно'}
                    </div>
                    <div class="detail-stats">
                        <span><i class="fas fa-calendar"></i> Впервые: ${new Date(user.firstSeen).toLocaleString()}</span>
                        <span><i class="fas fa-clock"></i> Последний визит: ${new Date(user.lastSeen).toLocaleString()}</span>
                        <span><i class="fas fa-chart-simple"></i> Всего визитов: ${user.visitCount || 1}</span>
                    </div>
                </div>
            </div>
        ` : '';
    }
}

function loadAdminUserSelect() {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const select = document.getElementById('adminUserSelect');
    if (select) {
        select.innerHTML = '<option value="">-- Выберите пользователя --</option>' + users.map(u => `<option value="${u.chatId || u.id}">${u.name || 'Гость'} (${u.type === 'telegram' ? 'TG' : 'Guest'})</option>`).join('');
    }
}

function loadAdminChat(userId) {
    const messages = JSON.parse(localStorage.getItem(CHAT_STORAGE_PREFIX + userId) || '[]');
    const container = document.getElementById('adminChatMessages');
    if (!container) return;
    if (!messages.length) { container.innerHTML = '<div class="placeholder">Нет сообщений от этого пользователя</div>'; return; }
    container.innerHTML = messages.map(m => `
        <div class="admin-chat-msg ${m.isUser ? 'user' : 'admin'}">
            <div class="msg-header">
                <strong>${m.isUser ? '👤 Пользователь' : (m.isAdminReply ? '👑 Администратор' : '🤖 Поддержка')}</strong>
                <span>${m.time}</span>
            </div>
            <div class="msg-text">${escapeHtml(m.text)}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function addAdminMessageToUser(userId, text) {
    const messages = JSON.parse(localStorage.getItem(CHAT_STORAGE_PREFIX + userId) || '[]');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    messages.push({ isUser: false, isAdminReply: true, text, time: timeStr });
    localStorage.setItem(CHAT_STORAGE_PREFIX + userId, JSON.stringify(messages));
}

function sendAdminReply() {
    const userId = document.getElementById('adminUserSelect')?.value;
    const text = document.getElementById('adminReplyInput')?.value.trim();
    if (!userId || !text) return;
    addAdminMessageToUser(userId, text);
    document.getElementById('adminReplyInput').value = '';
    loadAdminChat(userId);
    showToast('Ответ отправлен!', 'success');
}

function updateStats() {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const reviews = getReviews();
    document.getElementById('statTotalUsers').textContent = users.length;
    document.getElementById('statTelegramUsers').textContent = users.filter(u => u.type === 'telegram').length;
    document.getElementById('statGuestUsers').textContent = users.filter(u => u.type !== 'telegram').length;
    document.getElementById('statTotalReviews').textContent = reviews.length;
    let totalRating = 0;
    reviews.forEach(r => totalRating += r.rating);
    const avg = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    document.getElementById('statAvgRating').textContent = avg;
}

// ========== ТОВАРЫ ==========
const products = {
    uc: [
        { id: 'uc1', name: "60 UC", price: "100 ₽", oldPrice: "150 ₽", icon: "UC", category: "uc" },
        { id: 'uc2', name: "300+25 UC", price: "450 ₽", oldPrice: "600 ₽", icon: "UC", category: "uc" },
        { id: 'uc3', name: "600+60 UC", price: "900 ₽", oldPrice: "1200 ₽", icon: "UC", category: "uc" },
        { id: 'uc4', name: "1500+300 UC", price: "2200 ₽", oldPrice: "3000 ₽", icon: "UC", category: "uc" },
        { id: 'uc5', name: "3000+850 UC", price: "4500 ₽", oldPrice: "6000 ₽", icon: "UC", category: "uc" },
        { id: 'uc6', name: "6000+2100 UC", price: "9000 ₽", oldPrice: "12000 ₽", icon: "UC", category: "uc" }
    ],
    currency: [
        { id: 'curr1', name: "1 000 000 метровалюты", price: "100 ₽", icon: "M", category: "currency" },
        { id: 'curr2', name: "2 000 000 метровалюты", price: "200 ₽", icon: "M", category: "currency" },
        { id: 'curr3', name: "3 000 000 метровалюты", price: "300 ₽", icon: "M", category: "currency" },
        { id: 'curr4', name: "4 000 000 метровалюты", price: "400 ₽", icon: "M", category: "currency" },
        { id: 'curr5', name: "5 000 000 метровалюты", price: "500 ₽", icon: "M", category: "currency" },
        { id: 'curr6', name: "6 000 000 метровалюты", price: "600 ₽", icon: "M", category: "currency" },
        { id: 'curr7', name: "7 000 000 метровалюты", price: "700 ₽", icon: "M", category: "currency" },
        { id: 'curr8', name: "8 000 000 метровалюты", price: "800 ₽", icon: "M", category: "currency" },
        { id: 'curr9', name: "9 000 000 метровалюты", price: "900 ₽", icon: "M", category: "currency" },
        { id: 'curr10', name: "10 000 000 метровалюты", price: "1000 ₽", icon: "M", category: "currency" }
    ]
};

function showPaymentPopup(productName, price) {
    window.open(CONFIG.DONATION_URL, '_blank');
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `🛍️ НОВЫЙ ЗАКАЗ!\n\n📦 Товар: ${productName}\n💰 Цена: ${price}\n\nПользователь перешёл к оплате` })
    }).catch(console.error);
    showToast(`Заказ оформлен! Переход на оплату...`, 'success');
    
    const user = getTelegramUser();
    if (user) {
        let users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
        const userIndex = users.findIndex(u => u.id === user.id.toString());
        if (userIndex !== -1) {
            users[userIndex].orders = (users[userIndex].orders || 0) + 1;
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
            updateUserActivity();
        }
    }
}

function renderProducts(category = 'all') {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    let allProducts = [...products.uc, ...products.currency];
    if (category !== 'all') {
        allProducts = allProducts.filter(p => p.category === category);
    }
    container.innerHTML = allProducts.map(p => `
        <div class="product-card-enhanced" data-category="${p.category}">
            <div class="product-icon ${p.icon === 'UC' ? 'uc-icon' : 'm-icon'}">${p.icon}</div>
            <div class="product-info">
                <h3>${p.name}</h3>
                ${p.oldPrice ? `<div class="product-old-price">${p.oldPrice}</div>` : ''}
                <div class="product-price">${p.price}</div>
                <button class="product-buy-btn" data-name="${p.name}" data-price="${p.price}">
                    <i class="fas fa-shopping-cart"></i> Купить
                </button>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.product-buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showPaymentPopup(btn.dataset.name, btn.dataset.price);
        });
    });
}

// ========== АНИМАЦИЯ ЧАСТИЦ ==========
function initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            alpha: Math.random() * 0.5 + 0.2,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.3,
            color: `hsl(${Math.random() * 60 + 260}, 70%, 60%)`
        };
    }
    
    function initParticles() {
        particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push(createParticle());
        }
    }
    
    function drawParticles() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            
            p.x += p.speedX;
            p.y += p.speedY;
            
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        });
        animationId = requestAnimationFrame(drawParticles);
    }
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });
    
    resizeCanvas();
    initParticles();
    drawParticles();
    
    return () => cancelAnimationFrame(animationId);
}

// ========== ЗВЁЗДНЫЙ РЕЙТИНГ ==========
function initStarsInput() {
    const stars = document.querySelectorAll('#starsInputEnhanced i');
    stars.forEach(star => {
        star.addEventListener('mouseenter', function() {
            const value = parseInt(this.dataset.value);
            stars.forEach((s, i) => { s.className = i < value ? 'fas fa-star' : 'far fa-star'; });
        });
        star.addEventListener('mouseleave', function() {
            stars.forEach((s, i) => { s.className = i < selectedRating ? 'fas fa-star' : 'far fa-star'; });
        });
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            stars.forEach((s, i) => { s.className = i < selectedRating ? 'fas fa-star' : 'far fa-star'; });
        });
    });
}

// ========== НАВИГАЦИЯ ==========
function initNavigation() {
    const homeLink = document.getElementById('homeLink');
    const profileLink = document.getElementById('profileLink');
    const reviewsLink = document.getElementById('reviewsLink');
    const aboutLink = document.getElementById('aboutLink');
    const supportLink = document.getElementById('supportLink');
    const mainContent = document.getElementById('mainContent');
    const profileContent = document.getElementById('profileContent');
    const reviewsContent = document.getElementById('reviewsContent');
    const aboutContainer = document.getElementById('aboutContainer');
    
    function showHome() { 
        mainContent.style.display = 'block';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'none';
        [homeLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        homeLink.classList.add('active');
        renderProducts(currentFilter);
    }
    function showProfile() { 
        mainContent.style.display = 'none';
        profileContent.style.display = 'block';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'none';
        [homeLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        profileLink.classList.add('active');
        updateUserActivity();
    }
    function showReviews() { 
        mainContent.style.display = 'none';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'block';
        aboutContainer.style.display = 'none';
        [homeLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        reviewsLink.classList.add('active');
        renderReviews();
    }
    function showAbout() { 
        mainContent.style.display = 'none';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'block';
        [homeLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        aboutLink.classList.add('active');
    }
    
    homeLink.addEventListener('click', (e) => { e.preventDefault(); showHome(); });
    profileLink.addEventListener('click', (e) => { e.preventDefault(); showProfile(); });
    reviewsLink.addEventListener('click', (e) => { e.preventDefault(); showReviews(); });
    aboutLink.addEventListener('click', (e) => { e.preventDefault(); showAbout(); });
    supportLink.addEventListener('click', (e) => { e.preventDefault(); window.open('https://t.me/l_AWANGARD_l', '_blank'); });
    
    // Категории товаров
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.cat;
            renderProducts(currentFilter);
        });
    });
    
    // Фильтры отзывов
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReviewFilter = btn.dataset.filter;
            renderReviews();
        });
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log(`AWANGARD NEON v${CONFIG.VERSION} загружен`);
    
    // Инициализация компонентов
    initParticleCanvas();
    initTelegramLogin();
    initStarsInput();
    initNavigation();
    
    // Информация об устройстве
    const deviceInfoSpan = document.getElementById('deviceInfoLarge');
    if (deviceInfoSpan) {
        const isMobile = document.documentElement.classList.contains('mobile');
        deviceInfoSpan.textContent = isMobile ? '📱 Мобильное устройство' : '💻 Компьютер';
    }
    
    // Загрузка пользователя
    const telegramUser = getTelegramUser();
    if (telegramUser) updateUIAfterLogin(telegramUser);
    else updateUIForGuest();
    
    // Отзывы и товары
    renderReviews();
    renderProducts('all');
    
    // Кнопка выхода
    document.getElementById('logoutEnhancedBtn')?.addEventListener('click', logout);
    
    // Отправка отзыва
    const submitBtn = document.getElementById('submitReviewEnhancedBtn');
    const reviewName = document.getElementById('reviewNameEnhanced');
    const reviewText = document.getElementById('reviewTextEnhanced');
    const charCounter = document.querySelector('.char-counter-enhanced');
    
    reviewText?.addEventListener('input', function() {
        if (charCounter) charCounter.textContent = this.value.length + '/500';
    });
    
    submitBtn?.addEventListener('click', () => {
        if (selectedRating === 0) { showToast('Поставьте оценку от 1 до 5 звёзд', 'error'); return; }
        const name = reviewName?.value.trim() || 'Аноним';
        const text = reviewText?.value.trim();
        if (!text) { showToast('Напишите текст отзыва', 'error'); return; }
        addReview(name, selectedRating, text);
        if (reviewText) reviewText.value = '';
        if (reviewName) reviewName.value = '';
        selectedRating = 0;
        document.querySelectorAll('#starsInputEnhanced i').forEach(s => s.className = 'far fa-star');
        if (charCounter) charCounter.textContent = '0/500';
        showToast('Спасибо за отзыв!', 'success');
        document.getElementById('reviewsLink').click();
    });
    
    // Админ-панель табы
    document.querySelectorAll('.admin-tab-enhanced').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab-enhanced').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('adminUsersTab').style.display = 'none';
            document.getElementById('adminChatsTab').style.display = 'none';
            document.getElementById('adminReviewsTab').style.display = 'none';
            document.getElementById('adminStatsTab').style.display = 'none';
            const target = tab.dataset.tab;
            if (target === 'users') { document.getElementById('adminUsersTab').style.display = 'block'; loadUsersList(); }
            else if (target === 'chats') { document.getElementById('adminChatsTab').style.display = 'block'; loadAdminUserSelect(); }
            else if (target === 'reviews') { document.getElementById('adminReviewsTab').style.display = 'block'; renderAdminReviews(); }
            else if (target === 'stats') { document.getElementById('adminStatsTab').style.display = 'block'; updateStats(); }
        });
    });
    
    document.getElementById('adminUserSearch')?.addEventListener('input', () => loadUsersList());
    document.getElementById('adminUserSelect')?.addEventListener('change', (e) => { if (e.target.value) { loadAdminChat(e.target.value); loadAdminUserInfo(e.target.value); } });
    document.getElementById('sendReplyBtn')?.addEventListener('click', sendAdminReply);
    document.getElementById('adminReplyInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAdminReply(); });
    document.getElementById('closeAdminBtn')?.addEventListener('click', closeAdminPanel);
    document.getElementById('adminOverlay')?.addEventListener('click', closeAdminPanel);
    
    showToast(`AWANGARD NEON v${CONFIG.VERSION} готов к работе!`, 'success');
});