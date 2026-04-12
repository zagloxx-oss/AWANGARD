// ========== AWANGARD NEON v1.0 ==========
// КОНФИГУРАЦИЯ
const CONFIG = {
    VERSION: '1.0',
    DONATION_URL: 'https://www.donationalerts.com/r/limitblitzoffical',
    BOT_TOKEN: '8745985444:AAGA1jByHKR78uThXfkurejklLrIp53bp6M',
    ADMIN_ID: 'ВАШ_TELEGRAM_ID', // ЗАМЕНИТЕ НА ВАШ TELEGRAM ID
    ADMIN_CODE: 'AWANGARD'
};

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let secretCode = '';
let currentFilter = 'all';
let currentReviewFilter = 'all';
let selectedRating = 0;
let userLocation = { country: "Неизвестно", city: "Неизвестно", ip: "Неизвестно" };
let spinning = false;
let wheelCanvas = null;
let ctx = null;
let currentAngle = 0;
let pendingPayment = null;
let pendingWheelPayment = false;

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

// ========== ПРОВЕРКА ОПЛАТЫ ==========
let pendingPaymentProduct = null;

function showPaymentModal(productName, price, isWheel = false) {
    if (isWheel) {
        pendingWheelPayment = true;
        document.getElementById('wheelPaymentModal').style.display = 'flex';
    } else {
        pendingPaymentProduct = { name: productName, price: price };
        document.getElementById('paymentProductName').textContent = productName;
        document.getElementById('paymentAmount').textContent = price;
        document.getElementById('paymentModal').style.display = 'flex';
    }
}

function closePaymentModals() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('wheelPaymentModal').style.display = 'none';
    pendingPaymentProduct = null;
    pendingWheelPayment = false;
}

// Подтверждение оплаты товара
function confirmProductPayment() {
    if (!pendingPaymentProduct) return;
    
    // Отправляем уведомление админу о подтверждении
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chat_id: CONFIG.ADMIN_ID, 
            text: `✅ ПОДТВЕРЖДЕНИЕ ОПЛАТЫ!\n\n📦 Товар: ${pendingPaymentProduct.name}\n💰 Сумма: ${pendingPaymentProduct.price}\n👤 Пользователь подтвердил оплату.\n\nПроверьте DonationAlerts и выдайте товар!` 
        })
    }).catch(console.error);
    
    showToast(`Оплата подтверждена! Ожидайте выдачи товара в течение 5-10 минут.`, 'success');
    closePaymentModals();
}

// Подтверждение оплаты колеса
function confirmWheelPayment() {
    if (!pendingWheelPayment) return;
    
    fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            chat_id: CONFIG.ADMIN_ID, 
            text: `🎡 ПОДТВЕРЖДЕНИЕ ОПЛАТЫ КОЛЕСА!\n\n💰 Сумма: 100 ₽\n👤 Пользователь подтвердил оплату.\n\nПроверьте DonationAlerts и разрешите вращение!` 
        })
    }).catch(console.error);
    
    pendingWheelPayment = false;
    closePaymentModals();
    // Разрешаем вращение
    spinWheel();
}

// ========== КОЛЕСО ФОРТУНЫ ==========
function initWheel() {
    wheelCanvas = document.getElementById('wheelCanvas');
    if (!wheelCanvas) return;
    ctx = wheelCanvas.getContext('2d');
    drawWheel();
}

function drawWheel() {
    if (!ctx || !wheelCanvas) return;
    const size = wheelCanvas.width;
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
        
        // Текст
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
    
    const user = getTelegramUser();
    if (!user) {
        showToast('Для вращения колеса необходимо авторизоваться!', 'error');
        document.getElementById('profileLink').click();
        return;
    }
    
    spinning = true;
    const spinBtn = document.getElementById('spinWheelBtn');
    spinBtn.disabled = true;
    
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
        drawWheel();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            finishSpin();
        }
    }
    
    function finishSpin() {
        spinning = false;
        spinBtn.disabled = false;
        
        // Определяем выигрыш
        const segmentIndex = getCurrentSegment();
        const prize = wheelSegments[segmentIndex];
        const resultDiv = document.getElementById('wheelResult');
        
        if (prize.value > 0) {
            addUserBalance(prize.value);
            resultDiv.innerHTML = `<span style="color: #00ff88;">🎉 ПОЗДРАВЛЯЕМ! Вы выиграли ${prize.name}! 🎉</span>`;
            showToast(`Вы выиграли ${prize.name}!`, 'success');
            
            fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `🎉 ВЫИГРЫШ В КОЛЕСЕ!\n\n👤 Пользователь: ${user.first_name}\n🎁 Выигрыш: ${prize.name}\n💰 Начислено на баланс!` })
            }).catch(console.error);
        } else {
            resultDiv.innerHTML = `<span style="color: #ff6666;">😢 К сожалению, ${prize.name}. Попробуйте ещё раз! 😢</span>`;
            showToast(`К сожалению, ${prize.name}. Попробуйте ещё раз!`, 'info');
        }
    }
    
    requestAnimationFrame(animate);
}

function getCurrentSegment() {
    const angleStep = (Math.PI * 2) / wheelSegments.length;
    let normalizedAngle = (currentAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    let index = Math.floor(normalizedAngle / angleStep);
    return (wheelSegments.length - index) % wheelSegments.length;
}

// ========== ОПЛАТА ТОВАРОВ ==========
function buyWithBalance(productName, price, productValue, isUc = true) {
    const priceNum = parseInt(price.replace(/[^\d]/g, ''));
    const balance = getUserBalance();
    
    if (balance >= priceNum) {
        deductUserBalance(priceNum);
        if (isUc) {
            addUserBalance(productValue);
            showToast(`✅ Вы купили ${productName}! +${productValue} UC на баланс`, 'success');
        } else {
            showToast(`✅ Вы купили ${productName}! Ожидайте выдачи от администратора.`, 'success');
            fetch(`https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CONFIG.ADMIN_ID, text: `🛍️ ПОКУПКА С БАЛАНСА!\n\n📦 Товар: ${productName}\n💰 Списано с баланса: ${priceNum} UC\n👤 Пользователь: ${getTelegramUser()?.first_name || 'Гость'}\n📦 Выдайте товар!` })
            }).catch(console.error);
        }
    } else {
        showPaymentModal(productName, price, false);
    }
}

// ========== ОСТАЛЬНЫЕ ФУНКЦИИ ==========
// ... (здесь остаются все предыдущие функции: геолокация, устройство, отзывы, админка и т.д.)
// Для краткости я не повторяю весь код, но он должен быть полностью сохранён

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    initWheel();
    updateBalanceDisplay();
    
    // Кнопки модальных окон
    document.getElementById('closePaymentModal')?.addEventListener('click', closePaymentModals);
    document.getElementById('closeWheelPaymentModal')?.addEventListener('click', closePaymentModals);
    document.getElementById('confirmPaymentBtn')?.addEventListener('click', confirmProductPayment);
    document.getElementById('confirmWheelPaymentBtn')?.addEventListener('click', confirmWheelPayment);
    document.getElementById('spinWheelBtn')?.addEventListener('click', () => {
        const user = getTelegramUser();
        if (!user) {
            showToast('Авторизуйтесь для вращения колеса!', 'error');
            document.getElementById('profileLink').click();
            return;
        }
        const balance = getUserBalance();
        if (balance >= 100) {
            deductUserBalance(100);
            spinWheel();
        } else {
            showPaymentModal('Вращение колеса фортуны', '100 ₽', true);
        }
    });
    
    // Закрытие модальных окон по клику на оверлей
    document.querySelectorAll('.payment-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePaymentModals();
        });
    });
    
    // Остальная инициализация...
});