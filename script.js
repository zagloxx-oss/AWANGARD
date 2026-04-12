// ========== AWANGARD CYBER v2.0 ==========
// Версия: 2.0 | Дата: 12.04.2026

const CONFIG = {
    VERSION: '2.0',
    UPDATE_DATE: '12.04.2026',
    DONATION_URL: 'https://www.donationalerts.com/r/limitblitzoffical',
    BOT_TOKEN: '8745985444:AAGA1jByHKR78uThXfkurejklLrIp53bp6M',
    ADMIN_ID: 'ВАШ_TELEGRAM_ID', // ЗАМЕНИТЕ НА ВАШ TELEGRAM ID
    ADMIN_CODE: 'AWANGARD'
};

// Глобальные переменные
let secretCode = '';
let currentFilter = 'all';
let currentReviewFilter = 'all';
let selectedRating = 0;
let spinning = false;
let currentAngle = 0;
let pendingPaymentProduct = null;
let currentTelegramUser = null;
let userLocation = { country: "Unknown", city: "Unknown", ip: "Unknown" };

// ========== ОПРЕДЕЛЕНИЕ УСТРОЙСТВА ==========
function getDeviceFullInfo() {
    const ua = navigator.userAgent;
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
    
    let deviceType = "Desktop";
    if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) {
        deviceType = /iPad|Android(?!.*Mobile)/i.test(ua) ? "Tablet" : "Mobile";
    }
    
    return { os, browser, deviceType };
}

const deviceInfo = getDeviceFullInfo();
const deviceInfoElement = document.getElementById('deviceInfoTextPage');
if (deviceInfoElement) deviceInfoElement.textContent = `${deviceInfo.deviceType} | ${deviceInfo.os} | ${deviceInfo.browser}`;

// ========== УНИКАЛЬНЫЙ ID ==========
function generateUniqueId() { return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }

function getOrCreateUserId() {
    let userId = localStorage.getItem('awangard_user_id');
    if (!userId) { userId = generateUniqueId(); localStorage.setItem('awangard_user_id', userId); registerUser(userId, 'guest', 'Guest'); }
    return userId;
}

async function registerUser(id, type, name, photo = null, telegramId = null) {
    if (!window.db) return;
    try {
        const userRef = window.firestore.doc(window.db, "users", id);
        const userSnap = await window.firestore.getDoc(userRef);
        if (!userSnap.exists()) {
            await window.firestore.setDoc(userRef, {
                id: id,
                type: type,
                name: name,
                photo: photo,
                telegramId: telegramId,
                deviceInfo: deviceInfo,
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                visitCount: 1
            });
        } else {
            await window.firestore.setDoc(userRef, {
                ...userSnap.data(),
                lastSeen: Date.now(),
                visitCount: (userSnap.data().visitCount || 0) + 1
            });
        }
    } catch (error) {
        console.error("Ошибка регистрации пользователя:", error);
    }
}

function updateUserLastSeen(userId) {
    if (!window.db) return;
    window.firestore.setDoc(window.firestore.doc(window.db, "users", userId), { lastSeen: Date.now() }, { merge: true }).catch(console.error);
}

const CURRENT_USER_ID = getOrCreateUserId();

// ========== БАЛАНС ==========
function getUserBalance() { return parseInt(localStorage.getItem('awangard_balance') || '0'); }
function setUserBalance(amount) { localStorage.setItem('awangard_balance', amount); updateBalanceDisplay(); return amount; }
function addUserBalance(amount) { const newBalance = getUserBalance() + amount; setUserBalance(newBalance); showToast(`+${amount} UC`, 'success'); return newBalance; }
function deductUserBalance(amount) { const current = getUserBalance(); if (current < amount) return false; setUserBalance(current - amount); return true; }
function updateBalanceDisplay() { document.querySelectorAll('#userBalance, #profileBalance').forEach(el => { if (el) el.textContent = getUserBalance(); }); }

// ========== TELEGRAM ВХОД ==========
function getTelegramUser() { const saved = localStorage.getItem('awangard_telegram_user'); return saved ? JSON.parse(saved) : null; }

function saveTelegramUser(userData) {
    localStorage.setItem('awangard_telegram_user', JSON.stringify(userData));
    currentTelegramUser = userData;
    registerUser(userData.id.toString(), 'telegram', userData.first_name + ' ' + (userData.last_name || ''), userData.photo_url, userData.id);
    updateUIAfterLogin(userData);
}

window.onTelegramAuth = function(user) {
    if (user && user.id) {
        saveTelegramUser({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || '',
            username: user.username || '',
            photo_url: user.photo_url || ''
        });
        alert(`Welcome, ${user.first_name}!`);
        document.getElementById('profileLink').click();
    }
};

function initTelegramLogin() {
    const container = document.getElementById('telegramLoginPage');
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'telegram-login-wrapper';
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?23';
        script.setAttribute('data-telegram-login', 'awangard_shop_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth');
        script.setAttribute('data-request-access', 'write');
        container.appendChild(wrapper);
        wrapper.appendChild(script);
    }
}

function updateUIAfterLogin(userData) {
    document.getElementById('profilePageName').textContent = userData.first_name + ' ' + (userData.last_name || '');
    document.getElementById('profilePageUsername').textContent = userData.username ? '@' + userData.username : '';
    document.getElementById('profilePageId').textContent = userData.id;
    document.getElementById('profilePageAvatar').src = userData.photo_url || `https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=${userData.first_name}`;
    document.getElementById('telegramLoginPage').style.display = 'none';
    document.getElementById('logoutPageBtn').style.display = 'flex';
    document.getElementById('userBadge').style.display = 'flex';
    document.getElementById('userAvatarMini').src = userData.photo_url || `https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=${userData.first_name}`;
    document.getElementById('userNameMini').textContent = userData.first_name;
    showToast(`Welcome, ${userData.first_name}!`, 'success');
    loadUsersList();
}

function updateUIForGuest() {
    document.getElementById('profilePageName').textContent = 'UNKNOWN';
    document.getElementById('profilePageUsername').textContent = '';
    document.getElementById('profilePageId').textContent = CURRENT_USER_ID.slice(-8);
    document.getElementById('profilePageAvatar').src = 'https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=Guest';
    document.getElementById('telegramLoginPage').style.display = 'block';
    document.getElementById('logoutPageBtn').style.display = 'none';
    document.getElementById('userBadge').style.display = 'none';
}

function logout() { localStorage.removeItem('awangard_telegram_user'); currentTelegramUser = null; updateUIForGuest(); showToast('Logged out', 'info'); }

// ========== ЧАТ ==========
function getCurrentUserId() { return currentTelegramUser ? currentTelegramUser.id.toString() : CURRENT_USER_ID; }
function getCurrentUserName() { return currentTelegramUser ? (currentTelegramUser.first_name + ' ' + (currentTelegramUser.last_name || '')) : 'Guest'; }

function checkUserChat() {
    const userId = getCurrentUserId();
    const messages = JSON.parse(localStorage.getItem(`awangard_chat_${userId}`) || '[]');
    const container = document.getElementById('userChatContainer');
    if (container) container.style.display = messages.length > 0 ? 'block' : 'none';
    renderUserChat(messages);
}

function renderUserChat(messages) {
    const container = document.getElementById('userChatMessages');
    if (!container) return;
    if (messages.length === 0) { container.innerHTML = '<div class="cyber-chat-empty">💬 NO MESSAGES YET</div>'; return; }
    container.innerHTML = messages.map(msg => `
        <div class="cyber-chat-message-${msg.isAdmin ? 'admin' : 'user'}">
            <div class="cyber-message-avatar-${msg.isAdmin ? 'admin' : 'user'}">
                <i class="${msg.isAdmin ? 'fas fa-headset' : 'fas fa-user'}"></i>
            </div>
            <div class="cyber-message-content-${msg.isAdmin ? 'admin' : 'user'}">
                <div class="cyber-message-name-${msg.isAdmin ? 'admin' : 'user'}">${msg.isAdmin ? 'SUPPORT' : 'YOU'}</div>
                <div class="cyber-message-text-${msg.isAdmin ? 'admin' : 'user'}">${escapeHtml(msg.text)}</div>
                <div class="cyber-message-time-${msg.isAdmin ? 'admin' : 'user'}">${msg.time}</div>
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendUserMessage() {
    const input = document.getElementById('userChatInput');
    const text = input.value.trim();
    if (!text) return;
    const userId = getCurrentUserId();
    const messages = JSON.parse(localStorage.getItem(`awangard_chat_${userId}`) || '[]');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    messages.push({ isAdmin: false, text: text, time: timeStr, timestamp: now.toISOString() });
    localStorage.setItem(`awangard_chat_${userId}`, JSON.stringify(messages));
    renderUserChat(messages);
    input.value = '';
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `💬 NEW MESSAGE!\n\nUser: ${getCurrentUserName()}\nID: ${userId}\nMessage: ${text}` })
    }).catch(console.error);
}

// ========== АДМИН-ЧАТ ==========
function loadAdminChat(userId) {
    const messages = JSON.parse(localStorage.getItem(`awangard_chat_${userId}`) || '[]');
    const container = document.getElementById('adminChatMessages');
    if (!container) return;
    if (messages.length === 0) { container.innerHTML = '<div class="cyber-placeholder">NO MESSAGES</div>'; return; }
    container.innerHTML = messages.map(msg => `
        <div class="cyber-admin-chat-message ${msg.isAdmin ? 'cyber-admin-msg' : 'cyber-user-msg'}">
            <div class="cyber-admin-message-header">
                <strong>${msg.isAdmin ? '👑 ADMIN' : '👤 USER'}</strong>
                <span>${msg.time}</span>
            </div>
            <div class="cyber-admin-message-text">${escapeHtml(msg.text)}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendAdminReply() {
    const userId = document.getElementById('adminUserSelect')?.value;
    const text = document.getElementById('adminReplyInput')?.value.trim();
    if (!userId || !text) return;
    const messages = JSON.parse(localStorage.getItem(`awangard_chat_${userId}`) || '[]');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    messages.push({ isAdmin: true, text: text, time: timeStr, timestamp: now.toISOString() });
    localStorage.setItem(`awangard_chat_${userId}`, JSON.stringify(messages));
    document.getElementById('adminReplyInput').value = '';
    loadAdminChat(userId);
    showToast('Reply sent!', 'success');
    if ((currentTelegramUser && currentTelegramUser.id.toString() === userId) || CURRENT_USER_ID === userId) {
        renderUserChat(messages);
        document.getElementById('userChatContainer').style.display = 'block';
    }
}

// ========== FIREBASE: ОТЗЫВЫ (ВИДНЫ ВСЕМ) ==========

async function getReviews() {
    if (!window.db) return JSON.parse(localStorage.getItem('awangard_reviews') || '[]');
    try {
        const q = window.firestore.query(collection(window.db, "reviews"), orderBy("date", "desc"));
        const querySnapshot = await window.firestore.getDocs(q);
        const reviews = [];
        querySnapshot.forEach(doc => {
            reviews.push({ id: doc.id, ...doc.data() });
        });
        return reviews;
    } catch (error) {
        console.error("Ошибка загрузки отзывов:", error);
        return JSON.parse(localStorage.getItem('awangard_reviews') || '[]');
    }
}

async function addReview(userName, rating, text) {
    if (!window.db) {
        const reviews = JSON.parse(localStorage.getItem('awangard_reviews') || '[]');
        reviews.unshift({ id: Date.now(), userName: userName || 'Аноним', rating: rating, text: text, date: new Date().toISOString() });
        localStorage.setItem('awangard_reviews', JSON.stringify(reviews));
        renderReviews();
        showToast('Отзыв добавлен (локально)', 'success');
        return;
    }
    try {
        await window.firestore.addDoc(collection(window.db, "reviews"), {
            userName: userName || 'Аноним',
            rating: rating,
            text: text,
            date: Date.now(),
            avatar: `https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=${userName || 'Аноним'}`
        });
        renderReviews();
        showToast('Отзыв добавлен!', 'success');
    } catch (error) {
        console.error("Ошибка добавления отзыва:", error);
        showToast('Ошибка добавления отзыва', 'error');
    }
}

async function deleteReview(reviewId) {
    if (!window.db) {
        let reviews = JSON.parse(localStorage.getItem('awangard_reviews') || '[]');
        reviews = reviews.filter(r => r.id.toString() !== reviewId);
        localStorage.setItem('awangard_reviews', JSON.stringify(reviews));
        renderReviews();
        renderAdminReviews();
        showToast('Отзыв удалён (локально)', 'info');
        return;
    }
    try {
        await window.firestore.deleteDoc(doc(window.db, "reviews", reviewId));
        renderReviews();
        renderAdminReviews();
        showToast('Отзыв удалён!', 'info');
    } catch (error) {
        console.error("Ошибка удаления отзыва:", error);
        showToast('Ошибка удаления отзыва', 'error');
    }
}

async function renderReviews() {
    const reviews = await getReviews();
    const filtered = currentReviewFilter === 'all' ? reviews : reviews.filter(r => r.rating === parseInt(currentReviewFilter));
    const container = document.getElementById('reviewsList');
    const countSpan = document.getElementById('reviewsCount');
    const avgSpan = document.getElementById('averageRating');
    const starsDiv = document.getElementById('averageStars');
    
    if (countSpan) countSpan.textContent = reviews.length;
    let total = 0; reviews.forEach(r => total += r.rating);
    const avg = reviews.length > 0 ? (total / reviews.length).toFixed(1) : 0;
    if (avgSpan) avgSpan.textContent = avg;
    if (starsDiv) {
        starsDiv.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = i <= Math.round(avg) ? 'fas fa-star' : 'far fa-star';
            starsDiv.appendChild(star);
        }
    }
    if (!container) return;
    if (filtered.length === 0) { container.innerHTML = '<div class="cyber-no-data">[ НЕТ ОТЗЫВОВ ]</div>'; return; }
    container.innerHTML = filtered.map(r => `
        <div class="cyber-review-item">
            <div class="cyber-review-header">
                <img src="${r.avatar || `https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=${r.userName}`}" class="cyber-review-avatar" alt="">
                <div class="cyber-review-user-info">
                    <span class="cyber-review-user-name">${escapeHtml(r.userName)}</span>
                    <div class="cyber-review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
                </div>
                <span class="cyber-review-date">${new Date(r.date).toLocaleDateString()}</span>
            </div>
            <div class="cyber-review-text">${escapeHtml(r.text)}</div>
        </div>
    `).join('');
}

async function renderAdminReviews() {
    const reviews = await getReviews();
    const container = document.getElementById('adminReviewsList');
    if (!container) return;
    if (reviews.length === 0) { container.innerHTML = '<div class="cyber-no-data">NO REVIEWS</div>'; return; }
    container.innerHTML = reviews.map(r => `
        <div class="cyber-admin-review-item">
            <div class="cyber-admin-review-info">
                <strong>${escapeHtml(r.userName)}</strong>
                <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}</div>
                <small>${new Date(r.date).toLocaleString()}</small>
            </div>
            <button class="cyber-delete-review-btn" data-id="${r.id}"><i class="fas fa-trash"></i> DELETE</button>
        </div>
    `).join('');
    container.querySelectorAll('.cyber-delete-review-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteReview(btn.dataset.id));
    });
}

// ========== ЗВЁЗДНЫЙ РЕЙТИНГ ==========
let getSelectedRating = (function() {
    let selected = 0;
    const stars = document.querySelectorAll('#starsInput i');
    stars.forEach(star => {
        star.addEventListener('mouseenter', function() {
            const val = parseInt(this.dataset.value);
            stars.forEach((s, i) => { s.className = i < val ? 'fas fa-star' : 'far fa-star'; });
        });
        star.addEventListener('mouseleave', function() {
            stars.forEach((s, i) => { s.className = i < selected ? 'fas fa-star' : 'far fa-star'; });
        });
        star.addEventListener('click', function() {
            selected = parseInt(this.dataset.value);
            stars.forEach((s, i) => { s.className = i < selected ? 'fas fa-star' : 'far fa-star'; });
        });
    });
    return () => selected;
})();

// ========== КОЛЕСО ФОРТУНЫ ==========
const wheelSegments = [
    { name: "60 UC", value: 60, color: "#00ff41" },
    { name: "325 UC", value: 325, color: "#39ff14" },
    { name: "LOSE", value: 0, color: "#333" },
    { name: "LOSE", value: 0, color: "#444" },
    { name: "LOSE", value: 0, color: "#555" },
    { name: "LOSE", value: 0, color: "#666" },
    { name: "LOSE", value: 0, color: "#777" },
    { name: "LOSE", value: 0, color: "#888" }
];

function initWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawWheel(ctx, canvas);
}

function drawWheel(ctx, canvas) {
    const size = canvas.width;
    const center = size / 2;
    const radius = size / 2 - 5;
    const angleStep = (Math.PI * 2) / wheelSegments.length;
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < wheelSegments.length; i++) {
        const start = i * angleStep + currentAngle;
        const end = (i + 1) * angleStep + currentAngle;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, start, end);
        ctx.fillStyle = wheelSegments[i].color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(start + angleStep / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = wheelSegments[i].name === "LOSE" ? "#aaa" : "#000";
        ctx.font = "bold 10px 'Space Mono'";
        ctx.fillText(wheelSegments[i].name, radius * 0.65, 5);
        ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(center - 8, 8);
    ctx.lineTo(center + 8, 8);
    ctx.lineTo(center, 22);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(center - 8, 8);
    ctx.lineTo(center + 8, 8);
    ctx.lineTo(center, -4);
    ctx.fillStyle = "#ffcc00";
    ctx.fill();
}

function spinWheel() {
    if (spinning) return;
    if (!currentTelegramUser) { showToast('Login to spin!', 'error'); document.getElementById('profileLink').click(); return; }
    if (getUserBalance() < 100) { showToast('Need 100 UC to spin!', 'error'); return; }
    spinning = true;
    deductUserBalance(100);
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const spins = 10 + Math.random() * 10;
    const finalAngle = (Math.PI * 2 * spins) + (Math.random() * Math.PI * 2);
    const startAngle = currentAngle;
    const startTime = performance.now();
    const duration = 2000;
    
    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentAngle = startAngle + finalAngle * easeOut;
        drawWheel(ctx, canvas);
        if (progress < 1) requestAnimationFrame(animate);
        else finishSpin();
    }
    
    function finishSpin() {
        spinning = false;
        const angleStep = (Math.PI * 2) / wheelSegments.length;
        let norm = (currentAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let idx = Math.floor(norm / angleStep);
        const seg = wheelSegments[(wheelSegments.length - idx) % wheelSegments.length];
        const resultDiv = document.getElementById('wheelResult');
        if (seg.value > 0) {
            addUserBalance(seg.value);
            resultDiv.innerHTML = `<span style="color: #00ff41;">🎉 WINNER! +${seg.name} 🎉</span>`;
            showToast(`You won ${seg.name}!`, 'success');
        } else {
            resultDiv.innerHTML = `<span style="color: #ff3366;">😢 LOSE! Try again 😢</span>`;
            showToast(`You lost! Try again`, 'info');
        }
    }
    requestAnimationFrame(animate);
}

// ========== ТОВАРЫ ==========
const products = {
    uc: [
        { id: 'uc1', name: "60 UC", price: "100 ₽", oldPrice: "150 ₽", icon: "UC", category: "uc", value: 60 },
        { id: 'uc2', name: "300+25 UC", price: "450 ₽", oldPrice: "600 ₽", icon: "UC", category: "uc", value: 325 },
        { id: 'uc3', name: "600+60 UC", price: "900 ₽", oldPrice: "1200 ₽", icon: "UC", category: "uc", value: 660 },
        { id: 'uc4', name: "1500+300 UC", price: "2200 ₽", oldPrice: "3000 ₽", icon: "UC", category: "uc", value: 1800 },
        { id: 'uc5', name: "3000+850 UC", price: "4500 ₽", oldPrice: "6000 ₽", icon: "UC", category: "uc", value: 3850 },
        { id: 'uc6', name: "6000+2100 UC", price: "9000 ₽", oldPrice: "12000 ₽", icon: "UC", category: "uc", value: 8100 }
    ],
    currency: [
        { id: 'curr1', name: "1 000 000 METRO", price: "100 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr2', name: "2 000 000 METRO", price: "200 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr3', name: "3 000 000 METRO", price: "300 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr4', name: "4 000 000 METRO", price: "400 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr5', name: "5 000 000 METRO", price: "500 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr6', name: "6 000 000 METRO", price: "600 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr7', name: "7 000 000 METRO", price: "700 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr8', name: "8 000 000 METRO", price: "800 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr9', name: "9 000 000 METRO", price: "900 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr10', name: "10 000 000 METRO", price: "1000 ₽", icon: "M", category: "currency", value: 0 }
    ]
};

function buyProduct(productName, price, productValue, isUc = true) {
    const priceNum = parseInt(price.replace(/[^\d]/g, ''));
    if (getUserBalance() >= priceNum) {
        deductUserBalance(priceNum);
        if (isUc) { addUserBalance(productValue); showToast(`+${productValue} UC added!`, 'success'); }
        else { showToast(`Order placed! Wait for delivery.`, 'success'); }
    } else {
        pendingPaymentProduct = { name: productName, price: price };
        document.getElementById('paymentProductName').textContent = productName;
        document.getElementById('paymentAmount').textContent = price;
        document.getElementById('paymentModal').style.display = 'flex';
    }
}

function closePaymentModals() { document.getElementById('paymentModal').style.display = 'none'; pendingPaymentProduct = null; }
function confirmProductPayment() {
    if (!pendingPaymentProduct) return;
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `✅ PAYMENT CONFIRMED!\n\nProduct: ${pendingPaymentProduct.name}\nAmount: ${pendingPaymentProduct.price}` })
    }).catch(console.error);
    showToast(`Payment confirmed!`, 'success');
    closePaymentModals();
}

function renderProducts(category = 'all') {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    let allProducts = [...products.uc, ...products.currency];
    if (category !== 'all') allProducts = allProducts.filter(p => p.category === category);
    container.innerHTML = allProducts.map(p => `
        <div class="cyber-product-card">
            <div class="cyber-card-letter ${p.icon === 'UC' ? 'cyber-uc-letter' : 'cyber-m-letter'}">${p.icon}</div>
            <div class="cyber-card-info">
                <h3>${p.name}</h3>
                ${p.oldPrice ? `<div class="cyber-old-price">${p.oldPrice}</div>` : ''}
                <div class="cyber-price">${p.price}</div>
                <button class="cyber-buy-btn" data-name="${p.name}" data-price="${p.price}" data-value="${p.value}" data-isuc="${p.category === 'uc'}">
                    <i class="fas fa-shopping-cart"></i> BUY
                </button>
            </div>
        </div>
    `).join('');
    container.querySelectorAll('.cyber-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const isUc = btn.dataset.isuc === 'true';
            buyProduct(btn.dataset.name, btn.dataset.price, parseInt(btn.dataset.value), isUc);
        });
    });
}

// ========== FIREBASE: ЗАЯВКИ НА СОПРОВОЖДЕНИЕ ==========

async function getApplications() {
    if (!window.db) return JSON.parse(localStorage.getItem('awangard_applications_global') || '[]');
    try {
        const q = window.firestore.query(collection(window.db, "applications"), orderBy("date", "desc"));
        const querySnapshot = await window.firestore.getDocs(q);
        const apps = [];
        querySnapshot.forEach(doc => {
            apps.push({ id: doc.id, ...doc.data() });
        });
        return apps;
    } catch (error) {
        console.error("Ошибка загрузки заявок:", error);
        return JSON.parse(localStorage.getItem('awangard_applications_global') || '[]');
    }
}

async function addApplication(nick, userId, stats, screenshot) {
    if (!window.db) {
        const apps = JSON.parse(localStorage.getItem('awangard_applications_global') || '[]');
        apps.unshift({ id: Date.now(), nick, userId, stats, screenshot, date: Date.now() });
        localStorage.setItem('awangard_applications_global', JSON.stringify(apps));
        renderApplicationsAdmin();
        showToast('Заявка отправлена (локально)', 'success');
        return;
    }
    try {
        await window.firestore.addDoc(collection(window.db, "applications"), {
            nick: nick,
            userId: userId,
            stats: stats,
            screenshot: screenshot,
            date: Date.now(),
            status: "pending"
        });
        renderApplicationsAdmin();
        showToast('Заявка отправлена!', 'success');
        
        fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `📝 НОВАЯ ЗАЯВКА!\n\nНик: ${nick}\nID: ${userId}\nСтатистика: ${stats.substring(0, 100)}...` })
        }).catch(console.error);
    } catch (error) {
        console.error("Ошибка отправки заявки:", error);
        showToast('Ошибка отправки заявки', 'error');
    }
}

async function acceptApplication(appId, nick, userId, stats, screenshot) {
    if (!window.db) {
        let apps = JSON.parse(localStorage.getItem('awangard_applications_global') || '[]');
        apps = apps.filter(a => a.id.toString() !== appId);
        localStorage.setItem('awangard_applications_global', JSON.stringify(apps));
        const accepted = JSON.parse(localStorage.getItem('awangard_accepted_supporters_global') || '[]');
        accepted.unshift({ id: Date.now(), nick, userId, stats, screenshot, acceptedDate: Date.now() });
        localStorage.setItem('awangard_accepted_supporters_global', JSON.stringify(accepted));
        renderApplicationsAdmin();
        renderAcceptedSupportersAdmin();
        renderAcceptedSupportersFront();
        showToast(`Сопровождающий ${nick} принят!`, 'success');
        return;
    }
    try {
        await window.firestore.deleteDoc(doc(window.db, "applications", appId));
        await window.firestore.addDoc(collection(window.db, "accepted_supporters"), {
            nick: nick,
            userId: userId,
            stats: stats,
            screenshot: screenshot,
            acceptedDate: Date.now()
        });
        renderApplicationsAdmin();
        renderAcceptedSupportersAdmin();
        renderAcceptedSupportersFront();
        showToast(`Сопровождающий ${nick} принят!`, 'success');
    } catch (error) {
        console.error("Ошибка принятия заявки:", error);
        showToast('Ошибка принятия заявки', 'error');
    }
}

async function rejectApplication(appId) {
    if (!window.db) {
        let apps = JSON.parse(localStorage.getItem('awangard_applications_global') || '[]');
        apps = apps.filter(a => a.id.toString() !== appId);
        localStorage.setItem('awangard_applications_global', JSON.stringify(apps));
        renderApplicationsAdmin();
        showToast('Заявка отклонена', 'info');
        return;
    }
    try {
        await window.firestore.deleteDoc(doc(window.db, "applications", appId));
        renderApplicationsAdmin();
        showToast('Заявка отклонена', 'info');
    } catch (error) {
        console.error("Ошибка отклонения заявки:", error);
        showToast('Ошибка отклонения заявки', 'error');
    }
}

async function getAcceptedSupporters() {
    if (!window.db) return JSON.parse(localStorage.getItem('awangard_accepted_supporters_global') || '[]');
    try {
        const q = window.firestore.query(collection(window.db, "accepted_supporters"), orderBy("acceptedDate", "desc"));
        const querySnapshot = await window.firestore.getDocs(q);
        const supporters = [];
        querySnapshot.forEach(doc => {
            supporters.push({ id: doc.id, ...doc.data() });
        });
        return supporters;
    } catch (error) {
        console.error("Ошибка загрузки сопровождающих:", error);
        return JSON.parse(localStorage.getItem('awangard_accepted_supporters_global') || '[]');
    }
}

async function removeAccepted(supporterId) {
    if (!window.db) {
        let accepted = JSON.parse(localStorage.getItem('awangard_accepted_supporters_global') || '[]');
        accepted = accepted.filter(a => a.id.toString() !== supporterId);
        localStorage.setItem('awangard_accepted_supporters_global', JSON.stringify(accepted));
        renderAcceptedSupportersAdmin();
        renderAcceptedSupportersFront();
        showToast('Сопровождающий удалён', 'info');
        return;
    }
    try {
        await window.firestore.deleteDoc(doc(window.db, "accepted_supporters", supporterId));
        renderAcceptedSupportersAdmin();
        renderAcceptedSupportersFront();
        showToast('Сопровождающий удалён', 'info');
    } catch (error) {
        console.error("Ошибка удаления сопровождающего:", error);
        showToast('Ошибка удаления', 'error');
    }
}

async function renderApplicationsAdmin() {
    const apps = await getApplications();
    const container = document.getElementById('applicationsList');
    if (!container) return;
    if (apps.length === 0) { container.innerHTML = '<div class="cyber-no-data">[ НЕТ ЗАЯВОК ]</div>'; return; }
    container.innerHTML = apps.map(app => `
        <div class="cyber-application-item">
            <div class="cyber-application-info">
                <strong>${escapeHtml(app.nick)}</strong>
                <span>ID: ${escapeHtml(app.userId)}</span>
                <span>📊 ${escapeHtml(app.stats?.substring(0, 100) || '')}${app.stats?.length > 100 ? '...' : ''}</span>
                <small>${new Date(app.date).toLocaleString()}</small>
                ${app.screenshot ? `<div class="cyber-screenshot-thumb"><img src="${app.screenshot}" alt="Screenshot" onclick="window.open(this.src)"></div>` : ''}
            </div>
            <div class="cyber-application-actions">
                <button class="cyber-accept-btn" data-id="${app.id}" data-nick="${escapeHtml(app.nick)}" data-userid="${escapeHtml(app.userId)}" data-stats="${escapeHtml(app.stats || '')}" data-screenshot="${app.screenshot || ''}">ПРИНЯТЬ</button>
                <button class="cyber-reject-btn" data-id="${app.id}">ОТКЛОНИТЬ</button>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.cyber-accept-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            acceptApplication(btn.dataset.id, btn.dataset.nick, btn.dataset.userid, btn.dataset.stats, btn.dataset.screenshot);
        });
    });
    container.querySelectorAll('.cyber-reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectApplication(btn.dataset.id));
    });
}

async function renderAcceptedSupportersAdmin() {
    const accepted = await getAcceptedSupporters();
    const container = document.getElementById('adminAcceptedList');
    if (!container) return;
    if (accepted.length === 0) { container.innerHTML = '<div class="cyber-no-data">[ НЕТ ПРИНЯТЫХ ]</div>'; return; }
    container.innerHTML = accepted.map(s => `
        <div class="cyber-accepted-item">
            <div class="cyber-accepted-info">
                <strong>${escapeHtml(s.nick)}</strong>
                <span>ID: ${escapeHtml(s.userId)}</span>
                <span>📊 ${escapeHtml(s.stats?.substring(0, 100) || '')}${s.stats?.length > 100 ? '...' : ''}</span>
                <small>Принят: ${new Date(s.acceptedDate).toLocaleString()}</small>
                ${s.screenshot ? `<div class="cyber-screenshot-thumb"><img src="${s.screenshot}" alt="Screenshot" onclick="window.open(this.src)"></div>` : ''}
            </div>
            <button class="cyber-remove-btn" data-id="${s.id}">УДАЛИТЬ</button>
        </div>
    `).join('');
    container.querySelectorAll('.cyber-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeAccepted(btn.dataset.id));
    });
}

async function renderAcceptedSupportersFront() {
    const accepted = await getAcceptedSupporters();
    const container = document.getElementById('acceptedSupportersList');
    if (!container) return;
    if (accepted.length === 0) { container.innerHTML = '<div class="cyber-no-data">[ НЕТ АКТИВНЫХ СОПРОВОЖДАЮЩИХ ]</div>'; return; }
    container.innerHTML = accepted.map(s => `
        <div class="cyber-supporter-card">
            <div class="cyber-supporter-avatar"><i class="fas fa-user-shield"></i></div>
            <div class="cyber-supporter-info">
                <div class="cyber-supporter-nick">${escapeHtml(s.nick)}</div>
                <div class="cyber-supporter-id">ID: ${escapeHtml(s.userId)}</div>
                <div class="cyber-supporter-stats">📊 ${escapeHtml(s.stats?.substring(0, 60) || '')}${s.stats?.length > 60 ? '...' : ''}</div>
            </div>
        </div>
    `).join('');
}

// ========== АДМИН-ПАНЕЛЬ ==========
function openAdminPanel() { document.getElementById('adminPanel').style.display = 'flex'; document.getElementById('adminOverlay').style.display = 'block'; document.body.style.overflow = 'hidden'; loadAdminData(); }
function closeAdminPanel() { document.getElementById('adminPanel').style.display = 'none'; document.getElementById('adminOverlay').style.display = 'none'; document.body.style.overflow = 'auto'; }

document.addEventListener('keydown', function(e) {
    if (e.key.length === 1 && /[A-Za-z0-9]/.test(e.key)) {
        secretCode += e.key.toUpperCase();
        if (secretCode.length > CONFIG.ADMIN_CODE.length) secretCode = secretCode.slice(-CONFIG.ADMIN_CODE.length);
        if (secretCode === CONFIG.ADMIN_CODE) { openAdminPanel(); secretCode = ''; }
    }
});

async function loadAdminData() { 
    await loadUsersList(); 
    loadAdminUserSelect(); 
    loadAdminBalanceSelect(); 
    await updateStats(); 
    await renderAdminReviews(); 
    await renderApplicationsAdmin(); 
    await renderAcceptedSupportersAdmin(); 
}

async function loadUsersList() {
    if (!window.db) return;
    try {
        const querySnapshot = await window.firestore.getDocs(collection(window.db, "users"));
        const users = [];
        querySnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        const search = document.getElementById('adminUserSearch')?.value.toLowerCase() || '';
        const filtered = users.filter(u => u.name?.toLowerCase().includes(search) || u.id.toString().includes(search));
        const container = document.getElementById('adminUsersList');
        if (!container) return;
        if (filtered.length === 0) { container.innerHTML = '<div class="cyber-no-data">NO USERS</div>'; return; }
        container.innerHTML = filtered.map(u => `
            <div class="cyber-user-item" onclick="window.selectUserForChat('${u.id}')">
                <img src="${u.photo || `https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=${u.name || 'Guest'}`}" alt="">
                <div class="cyber-user-info-mini">
                    <div class="cyber-user-name-mini">${u.name || 'Guest'}</div>
                    <div class="cyber-user-id-mini">ID: ${typeof u.id === 'number' ? u.id : u.id.slice(-12)}</div>
                    <div class="cyber-user-device-mini"><i class="fas fa-microchip"></i> ${u.deviceInfo?.deviceType || 'Desktop'} | ${u.deviceInfo?.os || 'Unknown'}</div>
                </div>
                <div class="cyber-user-type-badge ${u.type === 'telegram' ? 'cyber-telegram-badge' : 'cyber-guest-badge'}">
                    ${u.type === 'telegram' ? '<i class="fab fa-telegram"></i> TG' : '<i class="fas fa-user"></i> GUEST'}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Ошибка загрузки пользователей:", error);
    }
}

window.selectUserForChat = function(userId) {
    document.querySelector('.cyber-admin-tab[data-tab="chats"]').click();
    const select = document.getElementById('adminUserSelect');
    if (select) { select.value = userId; loadAdminChat(userId); loadAdminUserInfo(userId); }
};

function loadAdminUserInfo(userId) {
    const usersData = localStorage.getItem('awangard_users_temp');
    if (usersData) {
        const users = JSON.parse(usersData);
        const user = users.find(u => u.id === userId);
        const infoDiv = document.getElementById('adminSelectedUserInfo');
        if (infoDiv) {
            infoDiv.innerHTML = user ? `
                <div class="cyber-admin-user-card">
                    <img src="${user.photo || `https://ui-avatars.com/api/?background=0a0a0a&color=00ff41&bold=true&name=User`}" alt="">
                    <div>
                        <strong>${user.name || 'Guest'}</strong><br>
                        <small>${user.type === 'telegram' ? 'TG ID: ' + user.id : 'Guest'}</small><br>
                        <small><i class="fas fa-microchip"></i> ${user.deviceInfo?.deviceType || '?'} | ${user.deviceInfo?.os || '?'}</small>
                    </div>
                </div>
            ` : '';
        }
    }
}

function loadAdminUserSelect() {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const select = document.getElementById('adminUserSelect');
    if (select) {
        select.innerHTML = '<option value="">-- SELECT --</option>' + users.map(u => `<option value="${u.chatId || u.id}">${u.name || 'Guest'} (${u.type === 'telegram' ? 'TG' : 'Guest'})</option>`).join('');
    }
}

function loadAdminBalanceSelect() {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const select = document.getElementById('adminBalanceUserSelect');
    if (select) {
        select.innerHTML = '<option value="">-- SELECT --</option>' + users.map(u => `<option value="${u.id}">${u.name} (${typeof u.id === 'number' ? u.id : u.id.slice(-8)})</option>`).join('');
    }
}

function modifyUserBalance(userId, amount) {
    let balances = JSON.parse(localStorage.getItem('awangard_user_balances') || '{}');
    const current = balances[userId] || 0;
    balances[userId] = Math.max(0, current + amount);
    localStorage.setItem('awangard_user_balances', JSON.stringify(balances));
    if (currentTelegramUser && currentTelegramUser.id.toString() === userId) setUserBalance(balances[userId]);
    showToast(`${amount > 0 ? '+' : ''}${amount} UC`, 'success');
}

function addAdminBalance() {
    const userId = document.getElementById('adminBalanceUserSelect')?.value;
    if (!userId) { showToast('Select user', 'error'); return; }
    modifyUserBalance(userId, 100);
}

function removeAdminBalance() {
    const userId = document.getElementById('adminBalanceUserSelect')?.value;
    if (!userId) { showToast('Select user', 'error'); return; }
    modifyUserBalance(userId, -100);
}

async function updateStats() {
    if (!window.db) return;
    try {
        const usersSnapshot = await window.firestore.getDocs(collection(window.db, "users"));
        const users = [];
        usersSnapshot.forEach(doc => users.push(doc.data()));
        const reviews = await getReviews();
        const apps = await getApplications();
        const accepted = await getAcceptedSupporters();
        
        document.getElementById('statTotalUsers').textContent = users.length;
        document.getElementById('statTelegramUsers').textContent = users.filter(u => u.type === 'telegram').length;
        document.getElementById('statGuestUsers').textContent = users.filter(u => u.type !== 'telegram').length;
        document.getElementById('statTotalReviews').textContent = reviews.length;
        document.getElementById('statTotalApplications').textContent = apps.length;
        document.getElementById('statTotalAccepted').textContent = accepted.length;
    } catch (error) {
        console.error("Ошибка обновления статистики:", error);
    }
}

// ========== ЧАСТИЦЫ ==========
function createParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;
    for (let i = 0; i < 80; i++) {
        const p = document.createElement('div');
        p.className = 'cyber-particle';
        const size = Math.random() * 3 + 1;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 8 + 's';
        p.style.animationDuration = 2 + Math.random() * 5 + 's';
        p.style.background = `radial-gradient(circle, ${Math.random() > 0.5 ? '#00ff41' : '#39ff14'}, transparent)`;
        container.appendChild(p);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast-notification ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== НАВИГАЦИЯ ==========
function initNavigation() {
    const homeLink = document.getElementById('homeLink');
    const supportersLink = document.getElementById('supportersLink');
    const wheelLink = document.getElementById('wheelLink');
    const profileLink = document.getElementById('profileLink');
    const reviewsLink = document.getElementById('reviewsLink');
    const aboutLink = document.getElementById('aboutLink');
    const supportLink = document.getElementById('supportLink');
    const mainContent = document.getElementById('mainContent');
    const supportersContent = document.getElementById('supportersContent');
    const wheelContent = document.getElementById('wheelContent');
    const profileContent = document.getElementById('profileContent');
    const reviewsContent = document.getElementById('reviewsContent');
    const aboutContainer = document.getElementById('aboutContainer');
    
    function showHome() {
        mainContent.style.display = 'block'; supportersContent.style.display = 'none'; wheelContent.style.display = 'none';
        profileContent.style.display = 'none'; reviewsContent.style.display = 'none'; aboutContainer.style.display = 'none';
        [homeLink, supportersLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        homeLink.classList.add('active'); renderProducts(currentFilter);
        renderAcceptedSupportersFront();
    }
    function showSupporters() {
        mainContent.style.display = 'none'; supportersContent.style.display = 'block'; wheelContent.style.display = 'none';
        profileContent.style.display = 'none'; reviewsContent.style.display = 'none'; aboutContainer.style.display = 'none';
        [homeLink, supportersLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        supportersLink.classList.add('active');
    }
    function showWheel() {
        mainContent.style.display = 'none'; supportersContent.style.display = 'none'; wheelContent.style.display = 'block';
        profileContent.style.display = 'none'; reviewsContent.style.display = 'none'; aboutContainer.style.display = 'none';
        [homeLink, supportersLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        wheelLink.classList.add('active'); setTimeout(() => initWheel(), 100);
    }
    function showProfile() {
        mainContent.style.display = 'none'; supportersContent.style.display = 'none'; wheelContent.style.display = 'none';
        profileContent.style.display = 'block'; reviewsContent.style.display = 'none'; aboutContainer.style.display = 'none';
        [homeLink, supportersLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        profileLink.classList.add('active'); checkUserChat();
    }
    function showReviews() {
        mainContent.style.display = 'none'; supportersContent.style.display = 'none'; wheelContent.style.display = 'none';
        profileContent.style.display = 'none'; reviewsContent.style.display = 'block'; aboutContainer.style.display = 'none';
        [homeLink, supportersLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        reviewsLink.classList.add('active'); renderReviews();
    }
    function showAbout() {
        mainContent.style.display = 'none'; supportersContent.style.display = 'none'; wheelContent.style.display = 'none';
        profileContent.style.display = 'none'; reviewsContent.style.display = 'none'; aboutContainer.style.display = 'block';
        [homeLink, supportersLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        aboutLink.classList.add('active');
    }
    
    homeLink.addEventListener('click', (e) => { e.preventDefault(); showHome(); });
    supportersLink.addEventListener('click', (e) => { e.preventDefault(); showSupporters(); });
    wheelLink.addEventListener('click', (e) => { e.preventDefault(); showWheel(); });
    profileLink.addEventListener('click', (e) => { e.preventDefault(); showProfile(); });
    reviewsLink.addEventListener('click', (e) => { e.preventDefault(); showReviews(); });
    aboutLink.addEventListener('click', (e) => { e.preventDefault(); showAbout(); });
    supportLink.addEventListener('click', (e) => { e.preventDefault(); window.open('https://t.me/l_AWANGARD_l', '_blank'); });
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.cat;
            renderProducts(currentFilter);
        });
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReviewFilter = btn.dataset.filter;
            renderReviews();
        });
    });
}

// ========== ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log(`AWANGARD CYBER v${CONFIG.VERSION} | ${CONFIG.UPDATE_DATE}`);
    initTelegramLogin();
    createParticles();
    initNavigation();
    
    const savedUser = getTelegramUser();
    if (savedUser) { currentTelegramUser = savedUser; updateUIAfterLogin(savedUser); }
    else { updateUIForGuest(); }
    
    await renderReviews();
    await renderAcceptedSupportersFront();
    renderProducts('all');
    updateBalanceDisplay();
    checkUserChat();
    
    document.getElementById('logoutPageBtn')?.addEventListener('click', logout);
    document.getElementById('userSendMessageBtn')?.addEventListener('click', sendUserMessage);
    document.getElementById('userChatInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendUserMessage(); });
    document.getElementById('spinWheelBtn')?.addEventListener('click', spinWheel);
    document.getElementById('closePaymentModal')?.addEventListener('click', closePaymentModals);
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', confirmProductPayment);
    document.getElementById('paymentModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('paymentModal')) closePaymentModals(); });
    
    // Отправка отзыва
    document.getElementById('submitReviewBtn')?.addEventListener('click', async () => {
        const rating = getSelectedRating();
        if (rating === 0) { showToast('Select rating!', 'error'); return; }
        const name = document.getElementById('reviewName')?.value.trim() || 'Anonymous';
        const text = document.getElementById('reviewText')?.value.trim();
        if (!text) { showToast('Write review!', 'error'); return; }
        await addReview(name, rating, text);
        document.getElementById('reviewText').value = '';
        document.getElementById('reviewName').value = '';
        showToast('Thank you for review!', 'success');
        document.getElementById('reviewsLink').click();
    });
    
    // Заявка на сопровождение
    document.getElementById('submitApplicationBtn')?.addEventListener('click', () => {
        const nick = document.getElementById('supporterNick')?.value.trim();
        const userId = document.getElementById('supporterId')?.value.trim();
        const stats = document.getElementById('supporterStats')?.value.trim();
        const file = document.getElementById('supporterScreenshot')?.files[0];
        if (!nick || !userId || !stats) { showToast('Fill all fields!', 'error'); return; }
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                await addApplication(nick, userId, stats, e.target.result);
                document.getElementById('supporterNick').value = '';
                document.getElementById('supporterId').value = '';
                document.getElementById('supporterStats').value = '';
                document.getElementById('screenshotPreview').innerHTML = '';
                showToast('Application sent!', 'success');
                document.getElementById('homeLink').click();
            };
            reader.readAsDataURL(file);
        } else {
            addApplication(nick, userId, stats, '');
            document.getElementById('supporterNick').value = '';
            document.getElementById('supporterId').value = '';
            document.getElementById('supporterStats').value = '';
            showToast('Application sent!', 'success');
            document.getElementById('homeLink').click();
        }
    });
    
    // Предпросмотр скриншота
    document.getElementById('supporterScreenshot')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                document.getElementById('screenshotPreview').innerHTML = `<img src="${event.target.result}" style="max-width: 120px; border-radius: 4px; border: 1px solid #00ff41;">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Админ-панель
    const adminTabs = document.querySelectorAll('.cyber-admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('adminUsersTab').style.display = 'none';
            document.getElementById('adminBalanceTab').style.display = 'none';
            document.getElementById('adminSupportersTab').style.display = 'none';
            document.getElementById('adminChatsTab').style.display = 'none';
            document.getElementById('adminReviewsTab').style.display = 'none';
            document.getElementById('adminStatsTab').style.display = 'none';
            const target = tab.dataset.tab;
            if (target === 'users') { document.getElementById('adminUsersTab').style.display = 'block'; await loadUsersList(); }
            else if (target === 'balance') { document.getElementById('adminBalanceTab').style.display = 'block'; loadAdminBalanceSelect(); }
            else if (target === 'supporters') { document.getElementById('adminSupportersTab').style.display = 'block'; await renderApplicationsAdmin(); await renderAcceptedSupportersAdmin(); }
            else if (target === 'chats') { document.getElementById('adminChatsTab').style.display = 'block'; loadAdminUserSelect(); }
            else if (target === 'reviews') { document.getElementById('adminReviewsTab').style.display = 'block'; await renderAdminReviews(); }
            else if (target === 'stats') { document.getElementById('adminStatsTab').style.display = 'block'; await updateStats(); }
        });
    });
    
    document.getElementById('adminUserSearch')?.addEventListener('input', () => loadUsersList());
    document.getElementById('adminUserSelect')?.addEventListener('change', (e) => { if (e.target.value) { loadAdminChat(e.target.value); loadAdminUserInfo(e.target.value); } });
    document.getElementById('sendReplyBtn')?.addEventListener('click', sendAdminReply);
    document.getElementById('adminReplyInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAdminReply(); });
    document.getElementById('closeAdminBtn')?.addEventListener('click', closeAdminPanel);
    document.getElementById('adminOverlay')?.addEventListener('click', closeAdminPanel);
    document.getElementById('add100BalanceBtn')?.addEventListener('click', addAdminBalance);
    document.getElementById('remove100BalanceBtn')?.addEventListener('click', removeAdminBalance);
    
    showToast(`AWANGARD CYBER v${CONFIG.VERSION} READY`, 'success');
});