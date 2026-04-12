// ========== AWANGARD NEON v1.0 ==========
// КОНФИГУРАЦИЯ
const CONFIG = {
    VERSION: '1.0',
    DONATION_URL: 'https://www.donationalerts.com/r/limitblitzoffical',
    BOT_TOKEN: '8403893049:AAHbnFG-2PfMyj2fmhgRq0ELePOiK0VgIn0', // Новый токен
    ADMIN_ID: 'ВАШ_TELEGRAM_ID', // ЗАМЕНИТЕ НА ВАШ TELEGRAM ID
    ADMIN_CODE: 'AWANGARD'
};

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let secretCode = '';
let currentFilter = 'all';
let currentReviewFilter = 'all';
let selectedRating = 0;
let spinning = false;
let currentAngle = 0;
let pendingPaymentProduct = null;
let currentTelegramUser = null;

// Сектора колеса фортуны
const wheelSegments = [
    { name: "60 UC", value: 60, color: "#bf4bf6" },
    { name: "325 UC", value: 325, color: "#ff44cc" },
    { name: "ПРОИГРЫШ", value: 0, color: "#333" },
    { name: "ПРОИГРЫШ", value: 0, color: "#444" },
    { name: "ПРОИГРЫШ", value: 0, color: "#555" },
    { name: "ПРОИГРЫШ", value: 0, color: "#666" },
    { name: "ПРОИГРЫШ", value: 0, color: "#777" },
    { name: "ПРОИГРЫШ", value: 0, color: "#888" }
];

// ========== БАЛАНС ПОЛЬЗОВАТЕЛЯ ==========
function getUserBalance() {
    const balance = localStorage.getItem('awangard_balance');
    return balance ? parseInt(balance) : 0;
}

function setUserBalance(amount) {
    localStorage.setItem('awangard_balance', amount);
    updateBalanceDisplay();
    return amount;
}

function addUserBalance(amount) {
    const current = getUserBalance();
    const newBalance = current + amount;
    setUserBalance(newBalance);
    showToast(`+${amount} UC начислено на баланс!`, 'success');
    return newBalance;
}

function deductUserBalance(amount) {
    const current = getUserBalance();
    if (current < amount) return false;
    setUserBalance(current - amount);
    updateBalanceDisplay();
    return true;
}

function updateBalanceDisplay() {
    const balance = getUserBalance();
    const balanceSpans = document.querySelectorAll('#userBalance, #profileBalance, #userBalanceStat');
    balanceSpans.forEach(span => {
        if (span) span.textContent = balance;
    });
}

// ========== TELEGRAM ВХОД ==========
function getTelegramUser() {
    const saved = localStorage.getItem('awangard_telegram_user');
    return saved ? JSON.parse(saved) : null;
}

function saveTelegramUser(userData) {
    localStorage.setItem('awangard_telegram_user', JSON.stringify(userData));
    currentTelegramUser = userData;
    updateUIAfterLogin(userData);
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
    showToast(`Добро пожаловать, ${userData.first_name}!`, 'success');
}

function updateUIForGuest() {
    document.getElementById('profileNameLarge').textContent = 'Гость';
    document.getElementById('profileUsernameLarge').textContent = '';
    document.getElementById('profileIdLarge').textContent = 'guest';
    document.getElementById('profileAvatarLarge').src = 'https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=Guest';
    document.getElementById('telegramLoginEnhanced').style.display = 'block';
    document.getElementById('logoutEnhancedBtn').style.display = 'none';
    document.getElementById('userBadge').style.display = 'none';
}

function logout() {
    localStorage.removeItem('awangard_telegram_user');
    currentTelegramUser = null;
    updateUIForGuest();
    showToast('Вы вышли из аккаунта', 'info');
}

// МАКСИМАЛЬНО ВИДИМАЯ КНОПКА TELEGRAM
function initTelegramLogin() {
    const container = document.getElementById('telegramLoginEnhanced');
    if (container) {
        container.innerHTML = '';
        
        // Создаём кастомную обёртку для кнопки
        const wrapper = document.createElement('div');
        wrapper.className = 'telegram-login-wrapper';
        
        // Добавляем иконку и текст
        const icon = document.createElement('i');
        icon.className = 'fab fa-telegram';
        icon.style.marginRight = '8px';
        
        const text = document.createElement('span');
        text.textContent = 'Войти через Telegram';
        
        // Создаём виджет
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?23';
        script.setAttribute('data-telegram-login', 'Awangard_shops_bot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-onauth', 'onTelegramAuth');
        script.setAttribute('data-request-access', 'write');
        
        container.appendChild(wrapper);
        wrapper.appendChild(script);
    }
}

// Слушаем событие от глобальной функции
document.addEventListener('telegramAuth', (e) => {
    const user = e.detail;
    if (user && user.id) {
        const userData = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || '',
            username: user.username || '',
            photo_url: user.photo_url || ''
        };
        saveTelegramUser(userData);
    }
});

// ========== ОПЛАТА И ТОВАРЫ ==========
function showPaymentModal(productName, price) {
    pendingPaymentProduct = { name: productName, price: price };
    document.getElementById('paymentProductName').textContent = productName;
    document.getElementById('paymentAmount').textContent = price;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModals() {
    document.getElementById('paymentModal').style.display = 'none';
    pendingPaymentProduct = null;
}

function confirmProductPayment() {
    if (!pendingPaymentProduct) return;
    
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chat_id: CONFIG.ADMIN_ID, 
            text: `✅ ПОДТВЕРЖДЕНИЕ ОПЛАТЫ!\n\n📦 Товар: ${pendingPaymentProduct.name}\n💰 Сумма: ${pendingPaymentProduct.price}\n👤 Пользователь: ${currentTelegramUser?.first_name || 'Гость'}\n\nПроверьте DonationAlerts и выдайте товар!` 
        })
    }).catch(console.error);
    
    showToast(`Оплата подтверждена! Ожидайте выдачи товара.`, 'success');
    closePaymentModals();
}

function buyProduct(productName, price, productValue, isUc = true) {
    const priceNum = parseInt(price.replace(/[^\d]/g, ''));
    const balance = getUserBalance();
    
    if (balance >= priceNum) {
        deductUserBalance(priceNum);
        if (isUc) {
            addUserBalance(productValue);
            showToast(`✅ Вы купили ${productName}! +${productValue} UC на баланс`, 'success');
        } else {
            showToast(`✅ Вы купили ${productName}! Ожидайте выдачи.`, 'success');
            fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `🛍️ ПОКУПКА!\n\n📦 Товар: ${productName}\n💰 Списано: ${priceNum} UC\n👤 Пользователь: ${currentTelegramUser?.first_name || 'Гость'}` })
            }).catch(console.error);
        }
    } else {
        showPaymentModal(productName, price);
    }
}

// ========== КОЛЕСО ФОРТУНЫ ==========
function initWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawWheel(ctx, canvas);
}

function drawWheel(ctx, canvas) {
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 5;
    const angleStep = (Math.PI * 2) / wheelSegments.length;
    
    ctx.clearRect(0, 0, size, size);
    
    for (let i = 0; i < wheelSegments.length; i++) {
        const startAngle = i * angleStep + currentAngle;
        const endAngle = (i + 1) * angleStep + currentAngle;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.fillStyle = wheelSegments[i].color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + angleStep / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = wheelSegments[i].name === "ПРОИГРЫШ" ? "#aaa" : "#fff";
        ctx.font = "bold 12px 'Inter'";
        ctx.fillText(wheelSegments[i].name, radius * 0.7, 5);
        ctx.restore();
    }
    
    // Стрелка
    ctx.beginPath();
    ctx.moveTo(centerX - 10, 10);
    ctx.lineTo(centerX + 10, 10);
    ctx.lineTo(centerX, 30);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(centerX - 10, 10);
    ctx.lineTo(centerX + 10, 10);
    ctx.lineTo(centerX, -5);
    ctx.fillStyle = "#ffcc00";
    ctx.fill();
}

function spinWheel() {
    if (spinning) return;
    
    if (!currentTelegramUser) {
        showToast('Для вращения колеса авторизуйтесь!', 'error');
        document.getElementById('profileLink').click();
        return;
    }
    
    const balance = getUserBalance();
    if (balance < 100) {
        showToast('Недостаточно UC для вращения! Пополните баланс.', 'error');
        return;
    }
    
    spinning = true;
    const spinBtn = document.getElementById('spinWheelBtn');
    spinBtn.disabled = true;
    
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
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            finishSpin();
        }
    }
    
    function finishSpin() {
        spinning = false;
        spinBtn.disabled = false;
        
        const angleStep = (Math.PI * 2) / wheelSegments.length;
        let normalizedAngle = (currentAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let index = Math.floor(normalizedAngle / angleStep);
        const segmentIndex = (wheelSegments.length - index) % wheelSegments.length;
        const prize = wheelSegments[segmentIndex];
        const resultDiv = document.getElementById('wheelResult');
        
        if (prize.value > 0) {
            addUserBalance(prize.value);
            resultDiv.innerHTML = `<span style="color: #00ff88;">🎉 ПОЗДРАВЛЯЕМ! Вы выиграли ${prize.name}! 🎉</span>`;
            showToast(`Вы выиграли ${prize.name}!`, 'success');
            
            fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `🎉 ВЫИГРЫШ В КОЛЕСЕ!\n\n👤 Пользователь: ${currentTelegramUser?.first_name}\n🎁 Выигрыш: ${prize.name}` })
            }).catch(console.error);
        } else {
            resultDiv.innerHTML = `<span style="color: #ff6666;">😢 К сожалению, ${prize.name}. Попробуйте ещё раз! 😢</span>`;
            showToast(`К сожалению, ${prize.name}. Попробуйте ещё раз!`, 'info');
        }
    }
    
    requestAnimationFrame(animate);
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

function loadAdminData() {
    loadUsersList();
    loadAdminUserSelect();
    loadAdminBalanceSelect();
    updateStats();
    renderAdminReviews();
}

function loadUsersList() {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
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
                <div class="admin-user-device"><i class="fas fa-desktop"></i> ${u.deviceInfo || 'Неизвестно'}</div>
                <div class="admin-user-location"><i class="fas fa-map-marker-alt"></i> ${u.location || 'Неизвестно'}</div>
            </div>
            <div class="admin-user-badge ${u.type === 'telegram' ? 'tg-badge' : 'guest-badge'}">${u.type === 'telegram' ? '<i class="fab fa-telegram"></i> Telegram' : '<i class="fas fa-user"></i> Гость'}</div>
        </div>
    `).join('');
}

function loadAdminBalanceSelect() {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const select = document.getElementById('adminBalanceUserSelect');
    if (select) {
        select.innerHTML = '<option value="">-- Выберите пользователя --</option>' + 
            users.filter(u => u.type === 'telegram').map(u => `<option value="${u.id}">${u.name} (ID: ${u.id})</option>`).join('');
    }
}

function modifyUserBalance(userId, amount) {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    
    let userBalances = JSON.parse(localStorage.getItem('awangard_user_balances') || '{}');
    const currentBalance = userBalances[userId] || 0;
    const newBalance = Math.max(0, currentBalance + amount);
    userBalances[userId] = newBalance;
    localStorage.setItem('awangard_user_balances', JSON.stringify(userBalances));
    
    if (currentTelegramUser && currentTelegramUser.id.toString() === userId) {
        setUserBalance(newBalance);
    }
    
    return true;
}

function addAdminBalance() {
    const select = document.getElementById('adminBalanceUserSelect');
    const userId = select.value;
    if (!userId) { showToast('Выберите пользователя', 'error'); return; }
    
    modifyUserBalance(userId, 100);
    showToast('Начислено 100 UC пользователю!', 'success');
    document.getElementById('adminBalanceInfo').innerHTML = `<span style="color: #00ff88;">✅ Начислено 100 UC!</span>`;
    setTimeout(() => { document.getElementById('adminBalanceInfo').innerHTML = ''; }, 3000);
}

function removeAdminBalance() {
    const select = document.getElementById('adminBalanceUserSelect');
    const userId = select.value;
    if (!userId) { showToast('Выберите пользователя', 'error'); return; }
    
    modifyUserBalance(userId, -100);
    showToast('Списано 100 UC у пользователя!', 'info');
    document.getElementById('adminBalanceInfo').innerHTML = `<span style="color: #ff6666;">✅ Списано 100 UC!</span>`;
    setTimeout(() => { document.getElementById('adminBalanceInfo').innerHTML = ''; }, 3000);
}

function loadAdminUserSelect() {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const select = document.getElementById('adminUserSelect');
    if (select) {
        select.innerHTML = '<option value="">-- Выберите пользователя --</option>' + users.map(u => `<option value="${u.chatId || u.id}">${u.name || 'Гость'} (${u.type === 'telegram' ? 'TG' : 'Guest'})</option>`).join('');
    }
}

function loadAdminChat(userId) {
    const messages = JSON.parse(localStorage.getItem('awangard_chat_' + userId) || '[]');
    const container = document.getElementById('adminChatMessages');
    if (!container) return;
    if (!messages.length) { container.innerHTML = '<div class="placeholder">Нет сообщений</div>'; return; }
    container.innerHTML = messages.map(m => `
        <div class="admin-chat-msg ${m.isUser ? 'user' : 'admin'}">
            <div class="msg-header"><strong>${m.isUser ? '👤 Пользователь' : (m.isAdminReply ? '👑 Админ' : '🤖 Поддержка')}</strong><span>${m.time}</span></div>
            <div class="msg-text">${escapeHtml(m.text)}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendAdminReply() {
    const userId = document.getElementById('adminUserSelect')?.value;
    const text = document.getElementById('adminReplyInput')?.value.trim();
    if (!userId || !text) return;
    
    let messages = JSON.parse(localStorage.getItem('awangard_chat_' + userId) || '[]');
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    messages.push({ isUser: false, isAdminReply: true, text, time: timeStr });
    localStorage.setItem('awangard_chat_' + userId, JSON.stringify(messages));
    
    document.getElementById('adminReplyInput').value = '';
    loadAdminChat(userId);
    showToast('Ответ отправлен!', 'success');
}

function updateStats() {
    const users = JSON.parse(localStorage.getItem('awangard_all_users') || '[]');
    const reviews = JSON.parse(localStorage.getItem('awangard_reviews') || '[]');
    document.getElementById('statTotalUsers').textContent = users.length;
    document.getElementById('statTelegramUsers').textContent = users.filter(u => u.type === 'telegram').length;
    document.getElementById('statGuestUsers').textContent = users.filter(u => u.type !== 'telegram').length;
    document.getElementById('statTotalReviews').textContent = reviews.length;
    let totalRating = 0;
    reviews.forEach(r => totalRating += r.rating);
    const avg = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    document.getElementById('statAvgRating').textContent = avg;
}

// ========== ОТЗЫВЫ ==========
function getReviews() { return JSON.parse(localStorage.getItem('awangard_reviews') || '[]'); }
function saveReviews(reviews) { localStorage.setItem('awangard_reviews', JSON.stringify(reviews)); }

function addReview(userName, rating, text) {
    const reviews = getReviews();
    reviews.unshift({ 
        id: Date.now(), 
        userId: currentTelegramUser?.id || 'guest',
        userName: userName || 'Аноним', 
        rating: rating, 
        text: text, 
        date: new Date().toISOString(), 
        avatar: `https://ui-avatars.com/api/?background=1a0a2e&color=bf4bf6&bold=true&name=${userName || 'Аноним'}`
    });
    saveReviews(reviews);
    renderReviews();
    updateStats();
}

function deleteReview(reviewId) {
    let reviews = getReviews();
    reviews = reviews.filter(r => r.id !== reviewId);
    saveReviews(reviews);
    renderReviews();
    renderAdminReviews();
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
    if (filtered.length === 0) { container.innerHTML = '<div class="no-reviews-enhanced">😢 Пока нет отзывов. Будьте первым!</div>'; return; }
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
        { id: 'curr1', name: "1 000 000 метровалюты", price: "100 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr2', name: "2 000 000 метровалюты", price: "200 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr3', name: "3 000 000 метровалюты", price: "300 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr4', name: "4 000 000 метровалюты", price: "400 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr5', name: "5 000 000 метровалюты", price: "500 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr6', name: "6 000 000 метровалюты", price: "600 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr7', name: "7 000 000 метровалюты", price: "700 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr8', name: "8 000 000 метровалюты", price: "800 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr9', name: "9 000 000 метровалюты", price: "900 ₽", icon: "M", category: "currency", value: 0 },
        { id: 'curr10', name: "10 000 000 метровалюты", price: "1000 ₽", icon: "M", category: "currency", value: 0 }
    ]
};

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
                <button class="product-buy-btn" data-name="${p.name}" data-price="${p.price}" data-value="${p.value}" data-isuc="${p.category === 'uc'}">
                    <i class="fas fa-shopping-cart"></i> Купить
                </button>
            </div>
        </div>
    `).join('');
    
    container.querySelectorAll('.product-buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isUc = btn.dataset.isuc === 'true';
            const value = parseInt(btn.dataset.value);
            buyProduct(btn.dataset.name, btn.dataset.price, value, isUc);
        });
    });
}

// ========== НАВИГАЦИЯ ==========
function initNavigation() {
    const homeLink = document.getElementById('homeLink');
    const wheelLink = document.getElementById('wheelLink');
    const profileLink = document.getElementById('profileLink');
    const reviewsLink = document.getElementById('reviewsLink');
    const aboutLink = document.getElementById('aboutLink');
    const supportLink = document.getElementById('supportLink');
    const mainContent = document.getElementById('mainContent');
    const wheelContent = document.getElementById('wheelContent');
    const profileContent = document.getElementById('profileContent');
    const reviewsContent = document.getElementById('reviewsContent');
    const aboutContainer = document.getElementById('aboutContainer');
    
    function showHome() { 
        mainContent.style.display = 'block';
        wheelContent.style.display = 'none';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'none';
        [homeLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        homeLink.classList.add('active');
        renderProducts(currentFilter);
    }
    function showWheel() { 
        mainContent.style.display = 'none';
        wheelContent.style.display = 'block';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'none';
        [homeLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        wheelLink.classList.add('active');
        setTimeout(() => initWheel(), 100);
    }
    function showProfile() { 
        mainContent.style.display = 'none';
        wheelContent.style.display = 'none';
        profileContent.style.display = 'block';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'none';
        [homeLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        profileLink.classList.add('active');
    }
    function showReviews() { 
        mainContent.style.display = 'none';
        wheelContent.style.display = 'none';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'block';
        aboutContainer.style.display = 'none';
        [homeLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        reviewsLink.classList.add('active');
        renderReviews();
    }
    function showAbout() { 
        mainContent.style.display = 'none';
        wheelContent.style.display = 'none';
        profileContent.style.display = 'none';
        reviewsContent.style.display = 'none';
        aboutContainer.style.display = 'block';
        [homeLink, wheelLink, profileLink, reviewsLink, aboutLink].forEach(l => l?.classList.remove('active'));
        aboutLink.classList.add('active');
    }
    
    homeLink.addEventListener('click', (e) => { e.preventDefault(); showHome(); });
    wheelLink.addEventListener('click', (e) => { e.preventDefault(); showWheel(); });
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
        for (let i = 0; i < 80; i++) {
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log(`AWANGARD NEON v${CONFIG.VERSION} загружен`);
    
    initParticleCanvas();
    initTelegramLogin();
    initStarsInput();
    initNavigation();
    
    const savedUser = getTelegramUser();
    if (savedUser) {
        currentTelegramUser = savedUser;
        updateUIAfterLogin(savedUser);
    } else {
        updateUIForGuest();
    }
    
    renderReviews();
    renderProducts('all');
    updateBalanceDisplay();
    
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
    
    // Модальные окна
    document.getElementById('closePaymentModal')?.addEventListener('click', closePaymentModals);
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', confirmProductPayment);
    document.getElementById('paymentModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('paymentModal')) closePaymentModals(); });
    
    // Колесо фортуны
    document.getElementById('spinWheelBtn')?.addEventListener('click', spinWheel);
    
    // Админ-панель
    document.querySelectorAll('.admin-tab-enhanced').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab-enhanced').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('adminUsersTab').style.display = 'none';
            document.getElementById('adminBalanceTab').style.display = 'none';
            document.getElementById('adminChatsTab').style.display = 'none';
            document.getElementById('adminReviewsTab').style.display = 'none';
            document.getElementById('adminStatsTab').style.display = 'none';
            const target = tab.dataset.tab;
            if (target === 'users') { document.getElementById('adminUsersTab').style.display = 'block'; loadUsersList(); }
            else if (target === 'balance') { document.getElementById('adminBalanceTab').style.display = 'block'; loadAdminBalanceSelect(); }
            else if (target === 'chats') { document.getElementById('adminChatsTab').style.display = 'block'; loadAdminUserSelect(); }
            else if (target === 'reviews') { document.getElementById('adminReviewsTab').style.display = 'block'; renderAdminReviews(); }
            else if (target === 'stats') { document.getElementById('adminStatsTab').style.display = 'block'; updateStats(); }
        });
    });
    
    document.getElementById('adminUserSearch')?.addEventListener('input', () => loadUsersList());
    document.getElementById('adminUserSelect')?.addEventListener('change', (e) => { if (e.target.value) loadAdminChat(e.target.value); });
    document.getElementById('sendReplyBtn')?.addEventListener('click', sendAdminReply);
    document.getElementById('adminReplyInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAdminReply(); });
    document.getElementById('closeAdminBtn')?.addEventListener('click', closeAdminPanel);
    document.getElementById('adminOverlay')?.addEventListener('click', closeAdminPanel);
    document.getElementById('add100BalanceBtn')?.addEventListener('click', addAdminBalance);
    document.getElementById('remove100BalanceBtn')?.addEventListener('click', removeAdminBalance);
    
    showToast(`AWANGARD NEON v${CONFIG.VERSION} готов к работе!`, 'success');
});