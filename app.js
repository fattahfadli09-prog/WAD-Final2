// ============================================
// MARKETPLACE CHAT - LOCAL VERSION (NO FIREBASE)
// ============================================

// Global State
let currentMessageId = null;
let sellerResponses = [false, false, false];
let buyerProfile = {
    name: '',
    phone: '',
    address: ''
};
let currentCheckoutData = null;

// Seller Contact Info
const sellerContacts = {
    1: { name: 'Seller 1', phone: '0812-3456-7890', location: 'Jakarta Selatan' },
    2: { name: 'Seller 2', phone: '0813-9876-5432', location: 'Jakarta Pusat' },
    3: { name: 'Seller 3', phone: '0814-5555-6666', location: 'Jakarta Barat' }
};

// DOM Elements
const buyerInput = document.getElementById('buyerInput');
const sendBtn = document.getElementById('sendBtn');
const buyerMessages = document.getElementById('buyerMessages');
const livePreview = document.getElementById('livePreview');

// Load buyer profile from localStorage
function loadBuyerProfile() {
    const saved = localStorage.getItem('buyerProfile');
    if (saved) {
        buyerProfile = JSON.parse(saved);
        document.getElementById('buyerName').value = buyerProfile.name || '';
        document.getElementById('buyerPhone').value = buyerProfile.phone || '';
        document.getElementById('buyerAddress').value = buyerProfile.address || '';
    }
}

// ============================================
// BUYER PROFILE MODAL
// ============================================
function showBuyerProfile() {
    document.getElementById('buyerProfileModal').style.display = 'block';
}

function closeBuyerProfile() {
    document.getElementById('buyerProfileModal').style.display = 'none';
}

function saveBuyerProfile() {
    buyerProfile = {
        name: document.getElementById('buyerName').value.trim(),
        phone: document.getElementById('buyerPhone').value.trim(),
        address: document.getElementById('buyerAddress').value.trim()
    };

    if (!buyerProfile.name || !buyerProfile.phone || !buyerProfile.address) {
        alert('⚠️ Semua field harus diisi!');
        return;
    }

    localStorage.setItem('buyerProfile', JSON.stringify(buyerProfile));
    alert('✅ Profile berhasil disimpan!');
    closeBuyerProfile();
}

// ============================================
// BUYER: LIVE PREVIEW (Typing)
// ============================================
let typingTimeout;

buyerInput.addEventListener('input', () => {
    clearTimeout(typingTimeout);

    const text = buyerInput.value.trim();

    if (text) {
        livePreview.innerHTML = `
            <div class="preview-active">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <div class="preview-text">Buyer mencari: "${text}"</div>
            </div>
        `;

        typingTimeout = setTimeout(() => {
            livePreview.innerHTML = '<div class="preview-idle">💤 Menunggu buyer mengetik...</div>';
        }, 2000);
    } else {
        livePreview.innerHTML = '<div class="preview-idle">💤 Menunggu buyer mengetik...</div>';
    }
});

// ============================================
// BUYER: SEND MESSAGE
// ============================================
function sendMessage() {
    const text = buyerInput.value.trim();
    if (!text) return;

    console.log('📤 Sending message:', text);

    buyerInput.value = '';
    livePreview.innerHTML = '<div class="preview-idle">💤 Menunggu buyer mengetik...</div>';

    // Add message to buyer chat
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.innerHTML = `<div class="bubble user-bubble">${text}</div>`;
    buyerMessages.appendChild(messageDiv);

    // Generate new ID
    currentMessageId = 'msg_' + Date.now();

    // Create 3 placeholder bubbles
    const placeholderContainer = document.createElement('div');
    placeholderContainer.className = 'placeholders-container';
    placeholderContainer.id = `placeholders-${currentMessageId}`;

    for (let i = 0; i < 3; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'bot-message';
        placeholder.innerHTML = `
            <div class="avatar">🏪</div>
            <div class="bubble placeholder-bubble" id="placeholder-${currentMessageId}-${i}">
                <div class="placeholder-dots">
                    <span></span><span></span><span></span>
                </div>
                <span class="placeholder-text">Menunggu Seller ${i + 1}...</span>
            </div>
        `;
        placeholderContainer.appendChild(placeholder);
    }

    buyerMessages.appendChild(placeholderContainer);
    buyerMessages.scrollTop = buyerMessages.scrollHeight;

    // Reset and enable seller forms
    sellerResponses = [false, false, false];
    for (let i = 1; i <= 3; i++) {
        // Reset Product & Price (Stock is fixed)
        document.getElementById(`seller${i}Product`).disabled = false;
        document.getElementById(`seller${i}Product`).value = '';

        document.getElementById(`seller${i}Price`).disabled = false;
        document.getElementById(`seller${i}Price`).value = '';

        // Button
        const btn = document.getElementById(`sellerBtn${i}`);
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Kirim Penawaran';
        }

        // Status
        const status = document.getElementById(`seller${i}Status`);
        if (status) {
            status.textContent = 'Siap';
            status.className = 'seller-status';
        }
    }

    console.log('✅ Message sent, sellers ready');
}

sendBtn.addEventListener('click', sendMessage);
buyerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// ============================================
// SELLER: SUBMIT RESPONSE
// ============================================
function submitResponse(sellerNum) {
    if (!currentMessageId) {
        alert('⚠️ Belum ada pesan dari buyer!');
        return;
    }

    if (sellerResponses[sellerNum - 1]) {
        alert('Anda sudah memberikan penawaran!');
        return;
    }

    const product = document.getElementById(`seller${sellerNum}Product`).value.trim();
    const price = parseInt(document.getElementById(`seller${sellerNum}Price`).value);
    const stock = 20; // Fixed stock

    if (!product || !price) {
        alert('⚠️ Nama Produk dan Harga harus diisi!');
        return;
    }

    if (price <= 0) {
        alert('⚠️ Harga harus lebih dari 0!');
        return;
    }

    console.log(`📤 Seller ${sellerNum} submitting:`, { product, price, stock });

    // Create Response Data
    const responseData = {
        sellerNum: sellerNum,
        sellerName: sellerContacts[sellerNum].name,
        sellerPhone: sellerContacts[sellerNum].phone,
        sellerLocation: sellerContacts[sellerNum].location,
        product: product,
        price: price,
        stock: stock,
        timestamp: Date.now()
    };

    // Find slot index (0, 1, or 2)
    const slotIndex = sellerNum - 1; // Map seller ID directly to slot for simplicity in this version

    // Update UI
    fillPlaceholder(slotIndex, responseData);

    // Disable form
    document.getElementById(`seller${sellerNum}Product`).disabled = true;
    document.getElementById(`seller${sellerNum}Price`).disabled = true;

    const btn = document.getElementById(`sellerBtn${sellerNum}`);
    if (btn) btn.disabled = true;

    const status = document.getElementById(`seller${sellerNum}Status`);
    if (status) {
        status.textContent = '✓ Terkirim';
        status.className = 'seller-status success';
    }

    sellerResponses[sellerNum - 1] = true;
}

// Add Enter key support for sellers
for (let i = 1; i <= 3; i++) {
    ['Product', 'Price'].forEach(field => {
        const el = document.getElementById(`seller${i}${field}`);
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    submitResponse(i);
                }
            });
        }
    });
}

// ============================================
// FILL PLACEHOLDER WITH SELLER RESPONSE
// ============================================
function fillPlaceholder(slotIndex, responseData) {
    const placeholder = document.getElementById(`placeholder-${currentMessageId}-${slotIndex}`);

    if (!placeholder) {
        console.error(`❌ Placeholder not found for message ${currentMessageId} slot ${slotIndex}`);
        return;
    }

    console.log(`🎨 Filling placeholder ${slotIndex}`);

    placeholder.className = 'bubble filled-bubble';
    placeholder.innerHTML = `
        <div class="response-header">
            <span class="seller-badge">${responseData.sellerName}</span>
            <span class="response-time">${new Date(responseData.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="product-info">
            <div class="product-name">📦 ${responseData.product}</div>
            <div class="product-details">
                <span class="price">💰 Rp ${responseData.price.toLocaleString('id-ID')}</span>
                <span class="stock">📊 Stok: ${responseData.stock}</span>
            </div>
            <div class="seller-contact">
                📞 ${responseData.sellerPhone} | 📍 ${responseData.sellerLocation}
            </div>
        </div>
        <button class="checkout-btn" onclick='openCheckout(${slotIndex}, ${JSON.stringify(responseData).replace(/'/g, "\\'")})'> 
            🛒 Checkout
        </button>
    `;

    console.log(`✅ Placeholder ${slotIndex} filled!`);
}

// ============================================
// CHECKOUT MODAL
// ============================================
function openCheckout(slotIndex, responseData) {
    // Check if buyer profile is complete
    if (!buyerProfile.name || !buyerProfile.phone || !buyerProfile.address) {
        alert('⚠️ Lengkapi profile Anda terlebih dahulu!\n\nKlik tombol "👤 Profile" di kanan atas.');
        showBuyerProfile();
        return;
    }

    currentCheckoutData = {
        slotIndex: slotIndex,
        ...responseData
    };

    // Update checkout details
    document.getElementById('checkoutDetails').innerHTML = `
        <div class="checkout-info">
            <h3>Detail Pesanan:</h3>
            <p><strong>Seller:</strong> ${responseData.sellerName}</p>
            <p><strong>Produk:</strong> ${responseData.product}</p>
            <p><strong>Harga Satuan:</strong> Rp ${responseData.price.toLocaleString('id-ID')}</p>
            <p><strong>Stok Tersedia:</strong> ${responseData.stock}</p>
            <hr>
            <p><strong>Pembeli:</strong> ${buyerProfile.name}</p>
            <p><strong>Telepon:</strong> ${buyerProfile.phone}</p>
            <p><strong>Alamat:</strong> ${buyerProfile.address}</p>
        </div>
    `;

    // Set max quantity (Fixed to 20 or remaining stock logic if needed, but simple is 20)
    document.getElementById('orderQuantity').max = 20;
    document.getElementById('orderQuantity').value = 1;

    updateCheckoutTotal();

    document.getElementById('checkoutModal').style.display = 'block';
}

function closeCheckout() {
    document.getElementById('checkoutModal').style.display = 'none';
    currentCheckoutData = null;
}

function updateCheckoutTotal() {
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 1;
    const unitPrice = currentCheckoutData.price;
    const total = unitPrice * quantity;

    document.getElementById('unitPrice').textContent = `Rp ${unitPrice.toLocaleString('id-ID')}`;
    document.getElementById('quantityDisplay').textContent = quantity;
    document.getElementById('totalPrice').textContent = `Rp ${total.toLocaleString('id-ID')}`;
}

function confirmCheckout() {
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (quantity > 20) {
        alert(`⚠️ Stok tidak cukup! Maksimal: 20`);
        return;
    }

    const total = currentCheckoutData.price * quantity;

    closeCheckout();

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.className = 'bot-message';
    successDiv.innerHTML = `
        <div class="avatar">✅</div>
        <div class="bubble success-bubble">
            <strong>🎉 Pesanan Berhasil!</strong><br><br>
            <strong>Detail Pesanan:</strong><br>
            📦 ${currentCheckoutData.product}<br>
            💰 Rp ${total.toLocaleString('id-ID')} (${quantity}x)<br>
            💳 ${paymentMethod.toUpperCase()}<br><br>
            <strong>Seller akan menghubungi Anda:</strong><br>
            📞 ${currentCheckoutData.sellerPhone}<br>
            📍 ${currentCheckoutData.sellerLocation}<br><br>
            <em>Terima kasih telah berbelanja!</em>
        </div>
    `;
    buyerMessages.appendChild(successDiv);
    buyerMessages.scrollTop = buyerMessages.scrollHeight;

    // Disable all checkout buttons
    document.querySelectorAll('.checkout-btn').forEach(btn => {
        btn.disabled = true;
        btn.textContent = '✓ Terpilih';
    });
}

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target.className === 'modal') {
        event.target.style.display = 'none';
    }
}

// Initialize
loadBuyerProfile();
console.log('✅ Local App initialized');
