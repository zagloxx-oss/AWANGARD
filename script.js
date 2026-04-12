// ========== AWANGARD GRADIENT NEON v3.0 ==========
const CONFIG = {
    VERSION: '3.0',
    DONATION_URL: 'https://www.donationalerts.com/r/limitblitzoffical',
    BOT_TOKEN: '8745985444:AAGA1jByHKR78uThXfkurejklLrIp53bp6M',
    ADMIN_ID: 'ВАШ_TELEGRAM_ID', // ЗАМЕНИТЕ НА ВАШ TELEGRAM ID
    ADMIN_CODE: 'AWANGARD'
};

let secretCode = '';
let currentFilter = 'all';
let currentReviewFilter = 'all';
let selectedRating = 0;
let spinning = false;
let currentAngle = 0;
let pendingProduct = null;
let currentUser = null;
let firebaseReady = false;

// ========== ОПРЕДЕЛЕНИЕ УСТРОЙСТВА ==========
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = "Unknown";
    if (/Windows NT 10/.test(ua)) os = "Windows 10";
    else if (/Mac OS X/.test(ua)) os = "macOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    let deviceType = /Mobi|Android|iPhone|iPad|iPod/.test(ua) ? "Mobile" : "Desktop";
    return { os, deviceType, full: `${deviceType} | ${os}` };
}

const deviceInfo = getDeviceInfo();
const deviceInfoEl = document.getElementById('deviceInfoText');
if (deviceInfoEl) deviceInfoEl.textContent = deviceInfo.full;

// ========== ID ПОЛЬЗОВАТЕЛЯ ==========
function getUserId() {
    let id = localStorage.getItem('awangard_user_id');
    if (!id) {
        id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        localStorage.setItem('awangard_user_id', id);
        registerUser(id, 'guest', 'Гость');
    }
    return id;
}
const CURRENT_USER_ID = getUserId();

async function registerUser(id, type, name, photo = null, telegramId = null) {
    if (!firebaseReady || !window.db) return;
    try {
        const userRef = doc(window.db, "users", id);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { id, type, name, photo, telegramId, deviceInfo, firstSeen: Date.now(), lastSeen: Date.now(), visitCount: 1 });
        } else {
            await setDoc(userRef, { ...userSnap.data(), lastSeen: Date.now(), visitCount: (userSnap.data().visitCount || 0) + 1 }, { merge: true });
        }
    } catch (e) { console.error("Ошибка регистрации:", e); }
}

// ========== БАЛАНС ==========
function getBalance() { return parseInt(localStorage.getItem('awangard_balance') || '0'); }
function setBalance(amount) { localStorage.setItem('awangard_balance', amount); updateBalanceUI(); }
function addBalance(amount) { setBalance(getBalance() + amount); showToast(`+${amount} UC`, 'success'); }
function deductBalance(amount) { if (getBalance() >= amount) { setBalance(getBalance() - amount); return true; } return false; }
function updateBalanceUI() { document.querySelectorAll('#userBalance, #profileBalance').forEach(el => { if (el) el.textContent = getBalance(); }); }

// ========== TELEGRAM ВХОД ==========
function getTelegramUser() {
    const saved = localStorage.getItem('awangard_telegram');
    return saved ? JSON.parse(saved) : null;
}
function saveTelegramUser(user) {
    localStorage.setItem('awangard_telegram', JSON.stringify(user));
    currentUser = user;
    updateProfileUI(user);
    registerUser(user.id.toString(), 'telegram', user.name, user.photo, user.id);
}
window.onTelegramAuth = function(user) {
    if (user && user.id) {
        saveTelegramUser({
            id: user.id,
            name: user.first_name + ' ' + (user.last_name || ''),
            username: user.username || '',
            photo: user.photo_url || ''
        });
        showToast(`Добро пожаловать, ${user.first_name}!`, 'success');
        document.getElementById('profileLink').click();
    }
};
function initTelegram() {
    const container = document.getElementById('telegramLoginBlock');
    if (container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'telegram-wrapper';
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
function updateProfileUI(user) {
    if (user) {
        const nameEl = document.getElementById('profileName');
        const usernameEl = document.getElementById('profileUsername');
        const idEl = document.getElementById('profileId');
        const avatarEl = document.getElementById('profileAvatar');
        const telegramBlock = document.getElementById('telegramLoginBlock');
        const logoutBtn = document.getElementById('logoutBtn');
        const userBadge = document.getElementById('userBadge');
        const avatarMini = document.getElementById('userAvatarMini');
        const nameMini = document.getElementById('userNameMini');
        if (nameEl) nameEl.textContent = user.name;
        if (usernameEl) usernameEl.textContent = user.username ? '@' + user.username : '';
        if (idEl) idEl.textContent = user.id;
        if (avatarEl) avatarEl.src = user.photo || `https://ui-avatars.com/api/?background=667eea&color=fff&bold=true&name=${user.name}`;
        if (telegramBlock) telegramBlock.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (userBadge) userBadge.style.display = 'flex';
        if (avatarMini) avatarMini.src = user.photo || `https://ui-avatars.com/api/?background=667eea&color=fff&bold=true&name=${user.name}`;
        if (nameMini) nameMini.textContent = user.name.split(' ')[0];
    } else {
        const nameEl = document.getElementById('profileName');
        const usernameEl = document.getElementById('profileUsername');
        const idEl = document.getElementById('profileId');
        const avatarEl = document.getElementById('profileAvatar');
        const telegramBlock = document.getElementById('telegramLoginBlock');
        const logoutBtn = document.getElementById('logoutBtn');
        const userBadge = document.getElementById('userBadge');
        if (nameEl) nameEl.textContent = 'Гость';
        if (usernameEl) usernameEl.textContent = '';
        if (idEl) idEl.textContent = CURRENT_USER_ID.slice(-8);
        if (avatarEl) avatarEl.src = 'https://ui-avatars.com/api/?background=667eea&color=fff&bold=true&name=Guest';
        if (telegramBlock) telegramBlock.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userBadge) userBadge.style.display = 'none';
    }
}
function logout() {
    localStorage.removeItem('awangard_telegram');
    currentUser = null;
    updateProfileUI(null);
    showToast('Вы вышли', 'info');
}

// ========== FIREBASE: ОТЗЫВЫ ==========
async function getReviews() {
    if (!firebaseReady || !window.db) {
        console.log("Firebase не готов, возвращаем пустой массив");
        return [];
    }
    try {
        const q = query(collection(window.db, "reviews"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        const reviews = [];
        snap.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        console.log("Загружено отзывов:", reviews.length);
        return reviews;
    } catch (e) { 
        console.error("Ошибка загрузки отзывов:", e); 
        return []; 
    }
}

async function addReview(name, rating, text) {
    if (!firebaseReady || !window.db) { 
        showToast('Firebase не подключен! Проверьте консоль.', 'error'); 
        return false;
    }
    try {
        const newReview = {
            userName: name || 'Аноним',
            rating: rating,
            text: text,
            date: Date.now(),
            avatar: `https://ui-avatars.com/api/?background=667eea&color=fff&bold=true&name=${encodeURIComponent(name || 'Аноним')}`
        };
        const docRef = await addDoc(collection(window.db, "reviews"), newReview);
        console.log("Отзыв добавлен, ID:", docRef.id);
        await renderReviews();
        showToast('Отзыв добавлен!', 'success');
        return true;
    } catch (e) { 
        console.error("Ошибка добавления отзыва:", e); 
        showToast('Ошибка: ' + e.message, 'error'); 
        return false;
    }
}

async function deleteReview(id) {
    if (!firebaseReady || !window.db) return;
    try {
        await deleteDoc(doc(window.db, "reviews", id));
        await renderReviews();
        await renderAdminReviews();
        showToast('Отзыв удалён', 'info');
    } catch (e) { console.error(e); }
}

async function renderReviews() {
    const reviews = await getReviews();
    const filtered = currentReviewFilter === 'all' ? reviews : reviews.filter(r => r.rating === parseInt(currentReviewFilter));
    const container = document.getElementById('reviewsList');
    const countSpan = document.getElementById('reviewsCount');
    const avgSpan = document.getElementById('avgRating');
    const starsDiv = document.getElementById('avgStars');
    
    if (countSpan) countSpan.textContent = reviews.length;
    let total = 0; 
    reviews.forEach(r => total += r.rating);
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
    if (filtered.length === 0) { 
        container.innerHTML = '<div class="empty-state">Нет отзывов. Будьте первым!</div>'; 
        return; 
    }
    container.innerHTML = filtered.map(r => `
        <div class="review-card">
            <div class="review-header">
                <img src="${r.avatar}" class="review-avatar">
                <div class="review-user">
                    <div class="review-name">${escapeHtml(r.userName)}</div>
                    <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
                </div>
                <div class="review-date">${new Date(r.date).toLocaleDateString()}</div>
            </div>
            <div class="review-text">${escapeHtml(r.text)}</div>
        </div>
    `).join('');
}

async function renderAdminReviews() {
    const reviews = await getReviews();
    const container = document.getElementById('adminReviewsList');
    if (!container) return;
    if (reviews.length === 0) { 
        container.innerHTML = '<div class="empty-state">Нет отзывов</div>'; 
        return; 
    }
    container.innerHTML = reviews.map(r => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-name">${escapeHtml(r.userName)}</div>
                <div>⭐ ${r.rating}/5</div>
                <div class="user-id">${escapeHtml(r.text.substring(0, 100))}...</div>
            </div>
            <button class="remove-btn" data-id="${r.id}">Удалить</button>
        </div>
    `).join('');
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteReview(btn.dataset.id));
    });
}

// ========== ЗВЁЗДЫ ДЛЯ ОТЗЫВОВ ==========
function initStars() {
    const stars = document.querySelectorAll('#starsInput i');
    let selected = 0;
    stars.forEach(star => {
        star.addEventListener('mouseenter', function() {
            const val = parseInt(this.dataset.val);
            stars.forEach((s, i) => { s.className = i < val ? 'fas fa-star' : 'far fa-star'; });
        });
        star.addEventListener('mouseleave', function() {
            stars.forEach((s, i) => { s.className = i < selected ? 'fas fa-star' : 'far fa-star'; });
        });
        star.addEventListener('click', function() {
            selected = parseInt(this.dataset.val);
            stars.forEach((s, i) => { s.className = i < selected ? 'fas fa-star' : 'far fa-star'; });
        });
    });
    return () => selected;
}
let getSelectedRating = initStars();

// ========== FIREBASE: ЗАЯВКИ ==========
async function getApplications() {
    if (!firebaseReady || !window.db) return [];
    try {
        const q = query(collection(window.db, "applications"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        const apps = [];
        snap.forEach(doc => apps.push({ id: doc.id, ...doc.data() }));
        console.log("Загружено заявок:", apps.length);
        return apps;
    } catch (e) { console.error(e); return []; }
}

async function addApplication(nick, userId, stats, screenshot) {
    if (!firebaseReady || !window.db) { 
        showToast('Firebase не подключен!', 'error'); 
        return false;
    }
    try {
        await addDoc(collection(window.db, "applications"), { 
            nick, userId, stats, screenshot, 
            date: Date.now(), 
            status: "pending" 
        });
        await renderApplications();
        showToast('Заявка отправлена!', 'success');
        
        fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: CONFIG.ADMIN_ID, 
                text: `📝 Новая заявка на сопровождение!\n\nНик: ${nick}\nID: ${userId}\nСтатистика: ${stats.substring(0, 100)}` 
            })
        }).catch(console.error);
        return true;
    } catch (e) { 
        console.error("Ошибка:", e); 
        showToast('Ошибка отправки', 'error'); 
        return false;
    }
}

async function acceptApplication(id, nick, userId, stats, screenshot) {
    if (!firebaseReady || !window.db) return;
    try {
        await deleteDoc(doc(window.db, "applications", id));
        await addDoc(collection(window.db, "accepted_supporters"), { 
            nick, userId, stats, screenshot, 
            acceptedDate: Date.now() 
        });
        await renderApplications();
        await renderAccepted();
        await renderAcceptedFront();
        showToast(`Сопровождающий ${nick} принят`, 'success');
    } catch (e) { console.error(e); }
}

async function rejectApplication(id) {
    if (!firebaseReady || !window.db) return;
    try {
        await deleteDoc(doc(window.db, "applications", id));
        await renderApplications();
        showToast('Заявка отклонена', 'info');
    } catch (e) { console.error(e); }
}

async function getAccepted() {
    if (!firebaseReady || !window.db) return [];
    try {
        const q = query(collection(window.db, "accepted_supporters"), orderBy("acceptedDate", "desc"));
        const snap = await getDocs(q);
        const acc = [];
        snap.forEach(doc => acc.push({ id: doc.id, ...doc.data() }));
        return acc;
    } catch (e) { return []; }
}

async function removeAccepted(id) {
    if (!firebaseReady || !window.db) return;
    try {
        await deleteDoc(doc(window.db, "accepted_supporters", id));
        await renderAccepted();
        await renderAcceptedFront();
        showToast('Удалён', 'info');
    } catch (e) { console.error(e); }
}

async function renderApplications() {
    const apps = await getApplications();
    const container = document.getElementById('applicationsList');
    if (!container) return;
    if (apps.length === 0) { 
        container.innerHTML = '<div class="empty-state">Нет заявок</div>'; 
        return; 
    }
    container.innerHTML = apps.map(app => `
        <div class="application-item">
            <div class="application-info">
                <strong>${escapeHtml(app.nick)}</strong>
                <div>ID: ${escapeHtml(app.userId)}</div>
                <div class="application-stats">${escapeHtml(app.stats?.substring(0, 80))}...</div>
                <small>${new Date(app.date).toLocaleString()}</small>
                ${app.screenshot ? `<div class="screenshot-thumb"><img src="${app.screenshot}" onclick="window.open(this.src)"></div>` : ''}
            </div>
            <div class="application-actions">
                <button class="accept-btn" data-id="${app.id}" data-nick="${escapeHtml(app.nick)}" data-userid="${escapeHtml(app.userId)}" data-stats="${escapeHtml(app.stats || '')}" data-screenshot="${app.screenshot || ''}">Принять</button>
                <button class="reject-btn" data-id="${app.id}">Отклонить</button>
            </div>
        </div>
    `).join('');
    container.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            acceptApplication(btn.dataset.id, btn.dataset.nick, btn.dataset.userid, btn.dataset.stats, btn.dataset.screenshot);
        });
    });
    container.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectApplication(btn.dataset.id));
    });
}

async function renderAccepted() {
    const acc = await getAccepted();
    const container = document.getElementById('acceptedList');
    if (!container) return;
    if (acc.length === 0) { 
        container.innerHTML = '<div class="empty-state">Нет принятых</div>'; 
        return; 
    }
    container.innerHTML = acc.map(a => `
        <div class="accepted-item">
            <div class="accepted-info">
                <strong>${escapeHtml(a.nick)}</strong>
                <div>ID: ${escapeHtml(a.userId)}</div>
                <div class="accepted-date">Принят: ${new Date(a.acceptedDate).toLocaleString()}</div>
            </div>
            <button class="remove-btn" data-id="${a.id}">Удалить</button>
        </div>
    `).join('');
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeAccepted(btn.dataset.id));
    });
}

async function renderAcceptedFront() {
    const acc = await getAccepted();
    const container = document.getElementById('acceptedSupportersList');
    if (!container) return;
    if (acc.length === 0) { 
        container.innerHTML = '<div class="empty-state">Нет активных сопровождающих</div>'; 
        return; 
    }
    container.innerHTML = acc.map(a => `
        <div class="supporter-card">
            <div class="supporter-avatar"><i class="fas fa-user-shield"></i></div>
            <div class="supporter-info">
                <div class="supporter-name">${escapeHtml(a.nick)}</div>
                <div class="supporter-id">ID: ${escapeHtml(a.userId)}</div>
                <div class="supporter-stats">${escapeHtml(a.stats?.substring(0, 50))}...</div>
            </div>
        </div>
    `).join('');
}

// ========== ТОВАРЫ ==========
const products = {
    uc: [
        { name: "60 UC", price: "100 ₽", oldPrice: "150 ₽", icon: "UC", value: 60 },
        { name: "300+25 UC", price: "450 ₽", oldPrice: "600 ₽", icon: "UC", value: 325 },
        { name: "600+60 UC", price: "900 ₽", oldPrice: "1200 ₽", icon: "UC", value: 660 },
        { name: "1500+300 UC", price: "2200 ₽", oldPrice: "3000 ₽", icon: "UC", value: 1800 },
        { name: "3000+850 UC", price: "4500 ₽", oldPrice: "6000 ₽", icon: "UC", value: 3850 },
        { name: "6000+2100 UC", price: "9000 ₽", oldPrice: "12000 ₽", icon: "UC", value: 8100 }
    ],
    currency: [
        { name: "1 000 000 метровалюты", price: "100 ₽", icon: "M" },
        { name: "2 000 000 метровалюты", price: "200 ₽", icon: "M" },
        { name: "3 000 000 метровалюты", price: "300 ₽", icon: "M" },
        { name: "4 000 000 метровалюты", price: "400 ₽", icon: "M" },
        { name: "5 000 000 метровалюты", price: "500 ₽", icon: "M" },
        { name: "6 000 000 метровалюты", price: "600 ₽", icon: "M" },
        { name: "7 000 000 метровалюты", price: "700 ₽", icon: "M" },
        { name: "8 000 000 метровалюты", price: "800 ₽", icon: "M" },
        { name: "9 000 000 метровалюты", price: "900 ₽", icon: "M" },
        { name: "10 000 000 метровалюты", price: "1000 ₽", icon: "M" }
    ]
};

function buyProduct(name, price, value, isUc) {
    const priceNum = parseInt(price.replace(/[^\d]/g, ''));
    if (getBalance() >= priceNum) {
        deductBalance(priceNum);
        if (isUc) { addBalance(value); showToast(`+${value} UC начислено!`, 'success'); }
        else { showToast(`Заказ оформлен! Ожидайте выдачи.`, 'success'); }
    } else {
        pendingProduct = { name, price };
        document.getElementById('paymentProduct').textContent = name;
        document.getElementById('paymentAmount').textContent = price;
        document.getElementById('paymentModal').style.display = 'flex';
    }
}

function closeModal() { 
    document.getElementById('paymentModal').style.display = 'none'; 
    pendingProduct = null; 
}

function confirmPayment() {
    if (pendingProduct) {
        fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: CONFIG.ADMIN_ID, 
                text: `✅ Подтверждение оплаты!\nТовар: ${pendingProduct.name}\nСумма: ${pendingProduct.price}` 
            })
        }).catch(console.error);
        showToast('Оплата подтверждена!', 'success');
        closeModal();
    }
}

function renderProducts(category = 'all') {
    const container = document.getElementById('cardsContainer');
    if (!container) return;
    let all = [...products.uc, ...products.currency];
    if (category !== 'all') all = all.filter(p => p.icon === (category === 'uc' ? 'UC' : 'M'));
    container.innerHTML = all.map(p => `
        <div class="product-card">
            <div class="product-icon ${p.icon === 'UC' ? 'uc' : 'm'}">${p.icon}</div>
            <div class="product-title">${p.name}</div>
            ${p.oldPrice ? `<div class="product-old-price">${p.oldPrice}</div>` : ''}
            <div class="product-price">${p.price}</div>
            <button class="buy-btn" data-name="${p.name}" data-price="${p.price}" data-value="${p.value || 0}" data-isuc="${p.icon === 'UC'}">Купить</button>
        </div>
    `).join('');
    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            buyProduct(btn.dataset.name, btn.dataset.price, parseInt(btn.dataset.value), btn.dataset.isuc === 'true');
        });
    });
}

// ========== КОЛЕСО ФОРТУНЫ ==========
const segments = [
    { name: "60 UC", value: 60, color: "#667eea" }, { name: "325 UC", value: 325, color: "#764ba2" },
    { name: "LOSE", value: 0, color: "#333" }, { name: "LOSE", value: 0, color: "#444" },
    { name: "LOSE", value: 0, color: "#555" }, { name: "LOSE", value: 0, color: "#666" },
    { name: "LOSE", value: 0, color: "#777" }, { name: "LOSE", value: 0, color: "#888" }
];

function initWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    drawWheel(canvas);
}

function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width, center = size / 2, radius = size / 2 - 5;
    const angleStep = (Math.PI * 2) / segments.length;
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < segments.length; i++) {
        const start = i * angleStep + currentAngle;
        const end = (i + 1) * angleStep + currentAngle;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, start, end);
        ctx.fillStyle = segments[i].color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(start + angleStep / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = segments[i].name === "LOSE" ? "#aaa" : "#fff";
        ctx.font = "bold 10px 'Inter'";
        ctx.fillText(segments[i].name, radius * 0.65, 5);
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
    ctx.fillStyle = "#f5b042";
    ctx.fill();
}

function spinWheel() {
    if (spinning) return;
    if (!currentUser) { showToast('Войдите через Telegram!', 'error'); document.getElementById('profileLink').click(); return; }
    if (getBalance() < 100) { showToast('Нужно 100 UC!', 'error'); return; }
    spinning = true;
    deductBalance(100);
    const canvas = document.getElementById('wheelCanvas');
    const spins = 10 + Math.random() * 10;
    const finalAngle = (Math.PI * 2 * spins) + (Math.random() * Math.PI * 2);
    const startAngle = currentAngle;
    const startTime = performance.now();
    const duration = 2000;
    
    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        currentAngle = startAngle + finalAngle * ease;
        drawWheel(canvas);
        if (progress < 1) requestAnimationFrame(animate);
        else finish();
    }
    
    function finish() {
        spinning = false;
        const angleStep = (Math.PI * 2) / segments.length;
        let norm = (currentAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let idx = Math.floor(norm / angleStep);
        const seg = segments[(segments.length - idx) % segments.length];
        const resultDiv = document.getElementById('wheelResult');
        if (seg.value > 0) {
            addBalance(seg.value);
            resultDiv.innerHTML = `<span style="color: #43e97b;">🎉 ВЫ ВЫИГРАЛИ ${seg.name}! 🎉</span>`;
            showToast(`Вы выиграли ${seg.name}!`, 'success');
        } else {
            resultDiv.innerHTML = `<span style="color: #f5576c;">😢 К сожалению, проигрыш. Попробуйте ещё! 😢</span>`;
            showToast(`Проигрыш!`, 'info');
        }
    }
    requestAnimationFrame(animate);
}

// ========== АДМИН-ПАНЕЛЬ ==========
function openAdmin() {
    document.getElementById('adminPanel').style.display = 'flex';
    document.getElementById('adminOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
    loadAdminData();
}
function closeAdmin() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}
document.addEventListener('keydown', (e) => {
    if (e.key.length === 1 && /[A-Za-z0-9]/.test(e.key)) {
        secretCode += e.key.toUpperCase();
        if (secretCode.length > CONFIG.ADMIN_CODE.length) secretCode = secretCode.slice(-CONFIG.ADMIN_CODE.length);
        if (secretCode === CONFIG.ADMIN_CODE) { openAdmin(); secretCode = ''; }
    }
});
async function loadAdminData() {
    await loadUsers();
    await renderApplications();
    await renderAccepted();
    await renderAdminReviews();
    await updateStats();
}
async function loadUsers() {
    if (!firebaseReady || !window.db) return;
    try {
        const snap = await getDocs(collection(window.db, "users"));
        const users = [];
        snap.forEach(doc => users.push(doc.data()));
        const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const filtered = users.filter(u => u.name?.toLowerCase().includes(search) || u.id.includes(search));
        const container = document.getElementById('usersList');
        if (!container) return;
        if (filtered.length === 0) { container.innerHTML = '<div class="empty-state">Нет пользователей</div>'; return; }
        container.innerHTML = filtered.map(u => `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">${escapeHtml(u.name || 'Гость')}</div>
                    <div class="user-id">ID: ${u.id}</div>
                    <div>${u.deviceInfo?.deviceType || 'Desktop'} | ${u.deviceInfo?.os || 'Unknown'}</div>
                </div>
                <div class="user-badge ${u.type === 'telegram' ? 'telegram' : 'guest'}">${u.type === 'telegram' ? 'Telegram' : 'Гость'}</div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}
async function updateStats() {
    if (!firebaseReady || !window.db) return;
    try {
        const usersSnap = await getDocs(collection(window.db, "users"));
        const users = []; usersSnap.forEach(d => users.push(d.data()));
        const reviews = await getReviews();
        const apps = await getApplications();
        const acc = await getAccepted();
        const statUsers = document.getElementById('statUsers');
        const statTelegram = document.getElementById('statTelegram');
        const statReviews = document.getElementById('statReviews');
        const statApps = document.getElementById('statApps');
        const statAccepted = document.getElementById('statAccepted');
        if (statUsers) statUsers.textContent = users.length;
        if (statTelegram) statTelegram.textContent = users.filter(u => u.type === 'telegram').length;
        if (statReviews) statReviews.textContent = reviews.length;
        if (statApps) statApps.textContent = apps.length;
        if (statAccepted) statAccepted.textContent = acc.length;
    } catch (e) { console.error(e); }
}

// ========== ЧАСТИЦЫ ==========
function createParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 5 + 's';
        p.style.animationDuration = 2 + Math.random() * 4 + 's';
        container.appendChild(p);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== НАВИГАЦИЯ ==========
function initNav() {
    const home = document.getElementById('homeLink');
    const supporters = document.getElementById('supportersLink');
    const wheel = document.getElementById('wheelLink');
    const profile = document.getElementById('profileLink');
    const reviews = document.getElementById('reviewsLink');
    const about = document.getElementById('aboutLink');
    const support = document.getElementById('supportLink');
    const main = document.getElementById('mainContent');
    const supportersCont = document.getElementById('supportersContent');
    const wheelCont = document.getElementById('wheelContent');
    const profileCont = document.getElementById('profileContent');
    const reviewsCont = document.getElementById('reviewsContent');
    const aboutCont = document.getElementById('aboutContent');
    
    function showMain() { 
        main.style.display = 'block'; supportersCont.style.display = 'none'; wheelCont.style.display = 'none'; 
        profileCont.style.display = 'none'; reviewsCont.style.display = 'none'; aboutCont.style.display = 'none'; 
        [home, supporters, wheel, profile, reviews, about].forEach(l => l?.classList.remove('active')); 
        home.classList.add('active'); 
        renderProducts(currentFilter); 
        renderAcceptedFront(); 
    }
    function showSupporters() { 
        main.style.display = 'none'; supportersCont.style.display = 'block'; wheelCont.style.display = 'none'; 
        profileCont.style.display = 'none'; reviewsCont.style.display = 'none'; aboutCont.style.display = 'none'; 
        [home, supporters, wheel, profile, reviews, about].forEach(l => l?.classList.remove('active')); 
        supporters.classList.add('active'); 
    }
    function showWheel() { 
        main.style.display = 'none'; supportersCont.style.display = 'none'; wheelCont.style.display = 'block'; 
        profileCont.style.display = 'none'; reviewsCont.style.display = 'none'; aboutCont.style.display = 'none'; 
        [home, supporters, wheel, profile, reviews, about].forEach(l => l?.classList.remove('active')); 
        wheel.classList.add('active'); 
        setTimeout(() => initWheel(), 100); 
    }
    function showProfile() { 
        main.style.display = 'none'; supportersCont.style.display = 'none'; wheelCont.style.display = 'none'; 
        profileCont.style.display = 'block'; reviewsCont.style.display = 'none'; aboutCont.style.display = 'none'; 
        [home, supporters, wheel, profile, reviews, about].forEach(l => l?.classList.remove('active')); 
        profile.classList.add('active'); 
    }
    function showReviews() { 
        main.style.display = 'none'; supportersCont.style.display = 'none'; wheelCont.style.display = 'none'; 
        profileCont.style.display = 'none'; reviewsCont.style.display = 'block'; aboutCont.style.display = 'none'; 
        [home, supporters, wheel, profile, reviews, about].forEach(l => l?.classList.remove('active')); 
        reviews.classList.add('active'); 
        renderReviews(); 
    }
    function showAbout() { 
        main.style.display = 'none'; supportersCont.style.display = 'none'; wheelCont.style.display = 'none'; 
        profileCont.style.display = 'none'; reviewsCont.style.display = 'none'; aboutCont.style.display = 'block'; 
        [home, supporters, wheel, profile, reviews, about].forEach(l => l?.classList.remove('active')); 
        about.classList.add('active'); 
    }
    
    if (home) home.addEventListener('click', (e) => { e.preventDefault(); showMain(); });
    if (supporters) supporters.addEventListener('click', (e) => { e.preventDefault(); showSupporters(); });
    if (wheel) wheel.addEventListener('click', (e) => { e.preventDefault(); showWheel(); });
    if (profile) profile.addEventListener('click', (e) => { e.preventDefault(); showProfile(); });
    if (reviews) reviews.addEventListener('click', (e) => { e.preventDefault(); showReviews(); });
    if (about) about.addEventListener('click', (e) => { e.preventDefault(); showAbout(); });
    if (support) support.addEventListener('click', (e) => { e.preventDefault(); window.open('https://t.me/l_AWANGARD_l', '_blank'); });
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('AWANGARD GRADIENT NEON v3.0');
    
    // Ждём Firebase
    document.addEventListener('firebase-ready', async () => {
        console.log("Firebase готов!");
        firebaseReady = true;
        await renderReviews();
        await renderAcceptedFront();
        await loadAdminData();
        showToast('Firebase подключен!', 'success');
    });
    
    // Если Firebase уже готов
    if (window.db) {
        firebaseReady = true;
        await renderReviews();
        await renderAcceptedFront();
        await loadAdminData();
    }
    
    initTelegram();
    createParticles();
    initNav();
    
    const saved = getTelegramUser();
    if (saved) { currentUser = saved; updateProfileUI(saved); }
    else { updateProfileUI(null); }
    
    renderProducts('all');
    updateBalanceUI();
    
    // Обработчики кнопок
    const logoutBtn = document.getElementById('logoutBtn');
    const spinBtn = document.getElementById('spinWheelBtn');
    const closeModalBtns = document.querySelectorAll('.modal-close');
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const paymentModal = document.getElementById('paymentModal');
    
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (spinBtn) spinBtn.addEventListener('click', spinWheel);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmPayment);
    if (paymentModal) paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closeModal(); });
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    
    // Отправка отзыва
    const submitReview = document.getElementById('submitReviewBtn');
    if (submitReview) {
        submitReview.addEventListener('click', async () => {
            const rating = getSelectedRating();
            if (rating === 0) { showToast('Выберите оценку!', 'error'); return; }
            const name = document.getElementById('reviewName')?.value.trim() || 'Аноним';
            const text = document.getElementById('reviewText')?.value.trim();
            if (!text) { showToast('Напишите отзыв!', 'error'); return; }
            await addReview(name, rating, text);
            document.getElementById('reviewText').value = '';
            document.getElementById('reviewName').value = '';
            showToast('Спасибо за отзыв!', 'success');
            document.getElementById('reviewsLink').click();
        });
    }
    
    // Отправка заявки
    const submitApp = document.getElementById('submitApplicationBtn');
    if (submitApp) {
        submitApp.addEventListener('click', () => {
            const nick = document.getElementById('supporterNick')?.value.trim();
            const userId = document.getElementById('supporterId')?.value.trim();
            const stats = document.getElementById('supporterStats')?.value.trim();
            const file = document.getElementById('supporterScreenshot')?.files[0];
            if (!nick || !userId || !stats) { showToast('Заполните все поля!', 'error'); return; }
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    await addApplication(nick, userId, stats, e.target.result);
                    document.getElementById('supporterNick').value = '';
                    document.getElementById('supporterId').value = '';
                    document.getElementById('supporterStats').value = '';
                    document.getElementById('screenshotPreview').innerHTML = '';
                    document.getElementById('homeLink').click();
                };
                reader.readAsDataURL(file);
            } else {
                addApplication(nick, userId, stats, '');
                document.getElementById('supporterNick').value = '';
                document.getElementById('supporterId').value = '';
                document.getElementById('supporterStats').value = '';
                document.getElementById('homeLink').click();
            }
        });
    }
    
    // Предпросмотр скриншота
    const screenshotInput = document.getElementById('supporterScreenshot');
    if (screenshotInput) {
        screenshotInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('screenshotPreview').innerHTML = `<img src="${event.target.result}" style="max-width: 100px; border-radius: 12px; border: 1px solid #667eea;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Счётчик символов
    const reviewText = document.getElementById('reviewText');
    if (reviewText) {
        reviewText.addEventListener('input', function() {
            const counter = document.getElementById('charCounter');
            if (counter) counter.textContent = this.value.length + '/500';
        });
    }
    
    // Админ-панель
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.admin-content').forEach(c => c.style.display = 'none');
            const targetId = `admin${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}Tab`;
            const target = document.getElementById(targetId);
            if (target) target.style.display = 'block';
        });
    });
    
    const closeAdmin = document.getElementById('closeAdminBtn');
    const adminOverlay = document.getElementById('adminOverlay');
    const userSearch = document.getElementById('userSearch');
    const addBalance = document.getElementById('addBalanceBtn');
    const removeBalance = document.getElementById('removeBalanceBtn');
    const balanceSelect = document.getElementById('balanceUserSelect');
    
    if (closeAdmin) closeAdmin.addEventListener('click', () => {
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminOverlay').style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    if (adminOverlay) adminOverlay.addEventListener('click', () => {
        document.getElementById('adminPanel').style.display = 'none';
        adminOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    if (userSearch) userSearch.addEventListener('input', () => loadUsers());
    if (addBalance) {
        addBalance.addEventListener('click', () => {
            const userId = balanceSelect?.value;
            if (userId) {
                let balances = JSON.parse(localStorage.getItem('awangard_balances') || '{}');
                balances[userId] = (balances[userId] || 0) + 100;
                localStorage.setItem('awangard_balances', JSON.stringify(balances));
                if (currentUser && currentUser.id === userId) setBalance(balances[userId]);
                showToast('+100 UC', 'success');
            }
        });
    }
    if (removeBalance) {
        removeBalance.addEventListener('click', () => {
            const userId = balanceSelect?.value;
            if (userId) {
                let balances = JSON.parse(localStorage.getItem('awangard_balances') || '{}');
                balances[userId] = Math.max(0, (balances[userId] || 0) - 100);
                localStorage.setItem('awangard_balances', JSON.stringify(balances));
                if (currentUser && currentUser.id === userId) setBalance(balances[userId]);
                showToast('-100 UC', 'info');
            }
        });
    }
    
    showToast('Добро пожаловать в AWANGARD!', 'success');
});