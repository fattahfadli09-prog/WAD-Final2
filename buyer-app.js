// ============================================
// BUYER APP - WITH FIREBASE INTEGRATION & CONFIRM DELIVERY
// ============================================

let buyerProfile = { name: '', phone: '', address: '' };
let currentCheckoutData = null;
let pendingConfirmOrder = null;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const buyerInput = document.getElementById('buyerInput');
const sendBtn = document.getElementById('sendBtn');
const buyerMessages = document.getElementById('buyerMessages');

function loadBuyerProfile() {
    const saved = localStorage.getItem('buyerProfile');
    if (saved) {
        buyerProfile = JSON.parse(saved);
        document.getElementById('buyerName').value = buyerProfile.name || '';
        document.getElementById('buyerPhone').value = buyerProfile.phone || '';
        document.getElementById('buyerAddress').value = buyerProfile.address || '';
    }
}

function showBuyerProfile() { document.getElementById('profileModal').style.display = 'flex'; }
function closeBuyerProfile() { document.getElementById('profileModal').style.display = 'none'; }

function saveBuyerProfile() {
    buyerProfile = {
        name: document.getElementById('buyerName').value.trim(),
        phone: document.getElementById('buyerPhone').value.trim(),
        address: document.getElementById('buyerAddress').value.trim()
    };
    if (!buyerProfile.name || !buyerProfile.phone || !buyerProfile.address) {
        alert('⚠️ All fields must be filled!');
        return;
    }
    localStorage.setItem('buyerProfile', JSON.stringify(buyerProfile));
    alert('✅ Profile saved successfully!');
    closeBuyerProfile();
}

function resetBuyerProfile() {
    if (!confirm('⚠️ RESET PROFILE?\n\nAll your profile data will be deleted.\n\nContinue?')) return;
    localStorage.removeItem('buyerProfile');
    buyerProfile = { name: '', phone: '', address: '' };
    document.getElementById('buyerName').value = '';
    document.getElementById('buyerPhone').value = '';
    document.getElementById('buyerAddress').value = '';
    alert('✅ Profile has been reset!');
}

function clearBuyerOrders() {
    if (!buyerProfile.phone || !buyerProfile.name) {
        alert('⚠️ Please complete your profile first!');
        showBuyerProfile();
        return;
    }
    rtdb.ref('orders').orderByChild('buyer/phone').equalTo(buyerProfile.phone).once('value')
        .then((snapshot) => {
            const orderCount = snapshot.numChildren();
            if (orderCount === 0) { alert('📭 No orders found to clear!'); return; }
            if (!confirm(`⚠️ CLEAR ALL YOUR ORDERS?\n\nYou are about to delete ${orderCount} order(s).\n\n⚠️ This action CANNOT be undone!\n\nContinue?`)) return;
            const deletePromises = [];
            snapshot.forEach((childSnapshot) => {
                const orderId = childSnapshot.key;
                const orderData = childSnapshot.val();
                const sellerNum = orderData.seller?.sellerNum || 1;
                deletePromises.push(rtdb.ref('orders/' + orderId).remove());
                deletePromises.push(rtdb.ref('sellerOrders/seller' + sellerNum + '/' + orderId).remove());
            });
            Promise.all(deletePromises).then(() => {
                alert(`✅ Successfully cleared ${orderCount} order(s)!`);
                if (typeof loadOrderHistory === 'function') loadOrderHistory();
            }).catch(() => alert('⚠️ Failed to clear some orders.'));
        }).catch(() => alert('⚠️ Failed to load orders.'));
}

function closeOrdersAndOpenProfile() {
    document.getElementById('chatContainer').style.display = 'block';
    document.getElementById('ordersContainer').style.display = 'none';
    document.querySelectorAll('.sidebar .nav-item').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    document.querySelectorAll('.bottom-nav .nav-item').forEach((btn, i) => btn.classList.toggle('active', i === 0));
    document.getElementById('profileModal').style.display = 'flex';
}

function sendMessage() {
    const text = buyerInput.value.trim();
    if (!text) return;
    buyerInput.value = '';
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) welcomeMessage.remove();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
    buyerMessages.appendChild(messageDiv);
    const messageId = 'msg_' + Date.now();
    const placeholderContainer = document.createElement('div');
    placeholderContainer.className = 'placeholders-container';
    placeholderContainer.id = `placeholders-${messageId}`;
    for (let i = 0; i < 4; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'bot-message';
        placeholder.innerHTML = `<div class="avatar">🏪</div><div class="bubble placeholder-bubble" id="placeholder-${messageId}-${i}"><div class="placeholder-dots"><span></span><span></span><span></span></div><span class="placeholder-text">Waiting for Seller ${i + 1}...</span></div>`;
        placeholderContainer.appendChild(placeholder);
    }
    buyerMessages.appendChild(placeholderContainer);
    buyerMessages.scrollTop = buyerMessages.scrollHeight;
    if (typeof rtdb === 'undefined') {
        alert('⚠️ Firebase not connected!');
        return;
    }
    rtdb.ref('messages/' + messageId).set({ text: text, timestamp: Date.now(), buyerProfile: buyerProfile })
        .then(() => { listenForSellerResponses(messageId); })
        .catch((err) => { console.error(err); alert('⚠️ Failed to send message.'); });
}
sendBtn.addEventListener('click', sendMessage);
buyerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

function listenForSellerResponses(messageId) {
    rtdb.ref('responses/' + messageId).on('child_added', (snapshot) => {
        const responseData = snapshot.val();
        fillPlaceholder(messageId, responseData.sellerNum - 1, responseData);
    });
    rtdb.ref('responses/' + messageId).on('child_removed', (snapshot) => {
        const responseData = snapshot.val();
        removePlaceholder(messageId, responseData.sellerNum - 1);
    });
}

function fillPlaceholder(messageId, slotIndex, responseData) {
    const placeholder = document.getElementById(`placeholder-${messageId}-${slotIndex}`);
    if (!placeholder) return;
    let imageHtml = responseData.imageBase64 ? `<div style="margin-bottom:14px;border-radius:12px;overflow:hidden;"><img src="${responseData.imageBase64}" style="width:100%;max-height:200px;object-fit:cover;"></div>` : '';
    let notesHtml = responseData.notes ? `<div class="seller-notes" style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.07);border-left:3px solid #F59E0B;border-radius:6px;font-size:13px;color:#D1D5DB;">📝 ${escapeHtml(responseData.notes)}</div>` : '';
    placeholder.className = 'bubble filled-bubble';
    placeholder.innerHTML = `
        <div class="response-header"><span class="seller-badge">${responseData.sellerName}</span><span class="response-time">${new Date(responseData.timestamp).toLocaleTimeString()}</span></div>
        ${imageHtml}<div class="product-info"><div class="product-name">📦 ${responseData.product}</div>
        <div class="product-details"><span class="price">💰 Rp ${responseData.price.toLocaleString('en-US')}</span><span class="stock">📊 Stock: ${responseData.stock}</span></div>
        <div class="seller-contact">📞 ${responseData.sellerPhone} | 📍 ${responseData.sellerLocation}</div>${notesHtml}</div>
        <button class="checkout-btn" data-slot="${slotIndex}" data-response='${JSON.stringify(responseData).replace(/'/g, "&#39;")}'>🛒 Checkout</button>
    `;
    const checkoutBtn = placeholder.querySelector('.checkout-btn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', function() {
        openCheckout(slotIndex, JSON.parse(this.dataset.response.replace(/&#39;/g, "'")));
    });
}

function removePlaceholder(messageId, slotIndex) {
    const placeholder = document.getElementById(`placeholder-${messageId}-${slotIndex}`);
    if (!placeholder) return;
    placeholder.className = 'bubble placeholder-bubble';
    placeholder.innerHTML = `<div class="placeholder-dots"><span></span><span></span><span></span></div><span class="placeholder-text">Waiting for Seller ${slotIndex + 1}...</span>`;
}

function openCheckout(slotIndex, responseData) {
    if (!responseData?.product || !responseData?.price) { alert('⚠️ Product data is invalid.'); return; }
    if (!buyerProfile.name || !buyerProfile.phone || !buyerProfile.address) {
        alert('⚠️ Please complete your profile first!');
        showBuyerProfile();
        return;
    }
    currentCheckoutData = {
        sellerNum: responseData.sellerNum || (slotIndex + 1),
        sellerName: responseData.sellerName,
        sellerPhone: responseData.sellerPhone,
        sellerLocation: responseData.sellerLocation,
        product: responseData.product,
        price: responseData.price,
        stock: responseData.stock || 0,
        notes: responseData.notes || '',
        slotIndex: slotIndex
    };
    document.getElementById('checkoutDetails').innerHTML = `
        <div class="checkout-info"><h3>Order Details:</h3>
        <p><strong>Seller:</strong> ${escapeHtml(responseData.sellerName)}</p>
        <p><strong>Product:</strong> ${escapeHtml(responseData.product)}</p>
        <p><strong>Unit Price:</strong> Rp ${responseData.price.toLocaleString('en-US')}</p>
        <p><strong>Available Stock:</strong> ${responseData.stock || 0}</p><hr>
        <p><strong>Buyer:</strong> ${escapeHtml(buyerProfile.name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(buyerProfile.phone)}</p>
        <p><strong>Address:</strong> ${escapeHtml(buyerProfile.address)}</p></div>
    `;
    document.getElementById('orderQuantity').max = responseData.stock || 0;
    document.getElementById('orderQuantity').value = 1;
    updateCheckoutTotal();
    document.getElementById('checkoutModal').style.display = 'flex';
}

function closeCheckout() { document.getElementById('checkoutModal').style.display = 'none'; currentCheckoutData = null; }

function updateCheckoutTotal() {
    if (!currentCheckoutData?.price) return;
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 1;
    const total = currentCheckoutData.price * quantity;
    document.getElementById('unitPrice').textContent = `Rp ${currentCheckoutData.price.toLocaleString('en-US')}`;
    document.getElementById('quantityDisplay').textContent = quantity;
    document.getElementById('totalPrice').textContent = `Rp ${total.toLocaleString('en-US')}`;
    const qrisTotal = document.getElementById('qrisTotal');
    if (qrisTotal) qrisTotal.textContent = `Rp ${total.toLocaleString('en-US')}`;
}

function confirmCheckout() {
    console.log('🛒 confirmCheckout called');
    console.log('🛒 currentCheckoutData:', currentCheckoutData);
    
    if (!currentCheckoutData) {
        alert('⚠️ Checkout data is invalid. Please try again.');
        closeCheckout();
        return;
    }

    if (!currentCheckoutData.product || !currentCheckoutData.price) {
        alert('⚠️ Product data is incomplete. Please try again.');
        closeCheckout();
        return;
    }

    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    
    if (!paymentMethod) {
        alert('⚠️ Please select a payment method first!');
        return;
    }

    if (quantity > (currentCheckoutData.stock || 0)) {
        alert(`⚠️ Insufficient stock! Maximum: ${currentCheckoutData.stock || 0}`);
        return;
    }

    const total = currentCheckoutData.price * quantity;
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const timestamp = Date.now();
    const sellerNum = currentCheckoutData.sellerNum || 1;
    
    console.log('📦 Creating order:', orderId);

    const orderData = {
        orderId: orderId,
        timestamp: timestamp,
        status: 'pending',
        buyer: {
            name: buyerProfile.name || 'N/A',
            phone: buyerProfile.phone || 'N/A',
            address: buyerProfile.address || 'N/A'
        },
        seller: {
            sellerNum: sellerNum,
            name: currentCheckoutData.sellerName || 'Unknown Seller',
            phone: currentCheckoutData.sellerPhone || 'N/A',
            location: currentCheckoutData.sellerLocation || 'N/A'
        },
        product: {
            name: currentCheckoutData.product,
            price: currentCheckoutData.price,
            quantity: quantity,
            total: total
        },
        payment: {
            method: paymentMethod.value,
            status: 'pending'
        }
    };

    console.log('📤 Saving order to Firebase...');

    const ordersRef = rtdb.ref('orders/' + orderId);
    const sellerOrdersRef = rtdb.ref('sellerOrders/seller' + sellerNum + '/' + orderId);
    
    ordersRef.set(orderData)
        .then(() => {
            console.log('✅ Order saved to orders/');
            return sellerOrdersRef.set(orderData);
        })
        .then(() => {
            console.log('✅ Order saved to sellerOrders/');
            
            const productName = currentCheckoutData.product;
            const sellerPhone = currentCheckoutData.sellerPhone;
            const sellerLocation = currentCheckoutData.sellerLocation;
            const sellerName = currentCheckoutData.sellerName;
            
            closeCheckout();
            
            const successDiv = document.createElement('div');
            successDiv.className = 'bot-message';
            
            if (paymentMethod.value === 'qris') {
                successDiv.innerHTML = `
                    <div class="avatar">✅</div>
                    <div class="bubble success-bubble">
                        <strong>🎉 Order Successfully Created!</strong><br><br>
                        <div style="background: rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px; margin: 10px 0;">
                            <strong>Order ID:</strong> <span style="font-family: monospace; font-size: 16px;">${orderId}</span>
                        </div>
                        <strong>Order Details:</strong><br>
                        📦 ${escapeHtml(productName)}<br>
                        💰 Rp ${total.toLocaleString('en-US')} (${quantity}x)<br>
                        💳 QRIS Payment<br><br>
                        <div style="background: #1A1A1A; padding: 16px; border-radius: 12px; margin: 16px 0; text-align: center; border: 1px solid #FFD70030;">
                            <div style="margin-bottom: 12px; color: #FFD700; font-weight: 600;">📱 Scan QRIS to Complete Payment</div>
                            <div style="background: white; padding: 16px; border-radius: 12px; display: inline-block;">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 120px; height: 120px;">
                                    <div style="background: #000;"></div><div style="background: #fff;"></div><div style="background: #000;"></div>
                                    <div style="background: #fff;"></div><div style="background: #000;"></div><div style="background: #fff;"></div>
                                    <div style="background: #000;"></div><div style="background: #fff;"></div><div style="background: #000;"></div>
                                </div>
                            </div>
                            <p style="color: #AAAAAA; font-size: 12px; margin-top: 12px;">Total: Rp ${total.toLocaleString('en-US')}</p>
                        </div>
                        <button onclick="openDirectChat('${orderId}', ${sellerNum}, '${escapeHtml(sellerName)}', '${escapeHtml(sellerPhone)}')" 
                            style="width: 100%; padding: 12px; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px; margin-bottom: 8px;">
                            💬 Chat with Seller
                        </button>
                        <strong>You can contact the seller via the "Chat with Seller" button above or WhatsApp:</strong><br>
                        📞 ${escapeHtml(sellerPhone)}<br>
                        📍 ${escapeHtml(sellerLocation)}<br><br>
                        <em>Save your Order ID for order tracking!</em>
                    </div>
                `;
            } else {
                successDiv.innerHTML = `
                    <div class="avatar">✅</div>
                    <div class="bubble success-bubble">
                        <strong>🎉 Order Successfully Created!</strong><br><br>
                        <div style="background: rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px; margin: 10px 0;">
                            <strong>Order ID:</strong> <span style="font-family: monospace; font-size: 16px;">${orderId}</span>
                        </div>
                        <strong>Order Details:</strong><br>
                        📦 ${escapeHtml(productName)}<br>
                        💰 Rp ${total.toLocaleString('en-US')} (${quantity}x)<br>
                        💳 ${paymentMethod.value.toUpperCase()}<br><br>
                        <button onclick="openDirectChat('${orderId}', ${sellerNum}, '${escapeHtml(sellerName)}', '${escapeHtml(sellerPhone)}')" 
                            style="width: 100%; padding: 12px; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px; margin-bottom: 8px;">
                            💬 Chat with Seller
                        </button>
                        <strong>You can contact the seller via the "Chat with Seller" button above or WhatsApp:</strong><br>
                        📞 ${escapeHtml(sellerPhone)}<br>
                        📍 ${escapeHtml(sellerLocation)}<br><br>
                        <em>Save your Order ID for order tracking!</em>
                    </div>
                `;
            }
            
            buyerMessages.appendChild(successDiv);
            buyerMessages.scrollTop = buyerMessages.scrollHeight;
            
            document.querySelectorAll('.checkout-btn').forEach(btn => {
                btn.disabled = true;
                btn.textContent = '✓ Selected';
            });
            
            setTimeout(() => showContinueShoppingPopup(), 1000);
        })
        .catch((error) => {
            console.error('❌ Firebase write error:', error);
            alert('⚠️ Failed to save order. Error: ' + (error.message || 'Unknown error'));
        });
}

// ============================================
// BUYER CHAT WITH IMAGE UPLOAD
// ============================================
let currentChatOrderId = null, chatListenerRef = null;

function openDirectChat(orderId, sellerNum, sellerName, sellerPhone) {
    currentChatOrderId = orderId;
    let chatModal = document.getElementById('directChatModal');
    if (!chatModal) {
        chatModal = document.createElement('div');
        chatModal.id = 'directChatModal';
        chatModal.className = 'modal-overlay';
        chatModal.style.cssText = 'display: flex; justify-content: center; align-items: center;';
        chatModal.innerHTML = `
            <div class="modal-container" style="max-width: 550px; max-height: 80vh; width: 90%; display: flex; flex-direction: column;">
                <div class="modal-header">
                    <h2>💬 Chat with <span id="chatSellerName"></span></h2>
                    <span class="modal-close" onclick="closeDirectChat()">&times;</span>
                </div>
                <div id="directChatMessages" style="flex: 1; overflow-y: auto; max-height: 50vh; padding: 16px; color: #fff; min-height: 200px;">
                    <div style="text-align: center; color: #888; padding: 20px;">Loading messages...</div>
                </div>
                <div style="padding: 12px 16px; border-top: 1px solid #FFD70030;">
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="directChatInput" class="form-input" placeholder="Type your message..." style="margin: 0; flex: 1;">
                        <label for="buyerChatImage" style="background: #1A1A1A; padding: 12px 16px; border-radius: 12px; cursor: pointer; border: 1px solid #FFD70030;">📷</label>
                        <input type="file" id="buyerChatImage" accept="image/*" style="display: none;" onchange="sendBuyerImage()">
                        <button onclick="sendDirectMessage()" style="padding: 12px 20px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #0A0A0A; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;">Send</button>
                    </div>
                    <div id="buyerImagePreview" style="font-size: 12px; color: #888; display: none;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(chatModal);
    }
    chatModal.style.display = 'flex';
    document.getElementById('chatSellerName').textContent = sellerName;
    loadDirectMessages(orderId);
    setTimeout(() => { const inp = document.getElementById('directChatInput'); if (inp) inp.onkeypress = (e) => { if (e.key === 'Enter') sendDirectMessage(); }; }, 500);
}

function closeDirectChat() {
    const modal = document.getElementById('directChatModal');
    if (modal) modal.style.display = 'none';
    if (chatListenerRef && rtdb) rtdb.ref('chats/' + currentChatOrderId).off('child_added', chatListenerRef);
}

function loadDirectMessages(orderId) {
    const container = document.getElementById('directChatMessages');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Loading messages...</div>';
    if (chatListenerRef && rtdb) rtdb.ref('chats/' + orderId).off('child_added', chatListenerRef);
    chatListenerRef = (snapshot) => {
        const msg = snapshot.val();
        const isBuyer = msg.sender === 'buyer';
        if (container.querySelector('div')?.textContent === 'Loading messages...') container.innerHTML = '';
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `display:flex;justify-content:${isBuyer ? 'flex-end' : 'flex-start'};margin-bottom:10px;`;
        
        let contentHtml = '';
        if (msg.imageBase64) {
            contentHtml = `<img src="${msg.imageBase64}" style="max-width: 200px; max-height: 150px; border-radius: 12px; margin-bottom: 4px;"><br>`;
        }
        contentHtml += `<div>${escapeHtml(msg.text || '')}</div>`;
        
        msgDiv.innerHTML = `
            <div style="max-width:80%;padding:10px 16px;border-radius:${isBuyer ? '16px 16px 4px 16px' : '4px 16px 16px 16px'};background:${isBuyer ? 'linear-gradient(135deg,#FFD700,#FFA500)' : '#1A1A1A'};color:${isBuyer ? '#0A0A0A' : '#FFFFFF'};font-size:14px;">
                ${contentHtml}
                <div style="font-size:10px;opacity:0.6;margin-top:4px;">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    };
    rtdb.ref('chats/' + orderId).on('child_added', chatListenerRef);
}

function sendDirectMessage() {
    const input = document.getElementById('directChatInput');
    const text = input?.value.trim();
    if ((!text || text === '') && !window.pendingBuyerImage) return;
    const messageData = { text: text || '', sender: 'buyer', timestamp: Date.now() };
    if (window.pendingBuyerImage) {
        messageData.imageBase64 = window.pendingBuyerImage;
        window.pendingBuyerImage = null;
        const previewDiv = document.getElementById('buyerImagePreview');
        if (previewDiv) previewDiv.style.display = 'none';
    }
    rtdb.ref('chats/' + currentChatOrderId).push(messageData).then(() => { if (input) input.value = ''; }).catch(() => alert('Failed to send'));
}

function sendBuyerImage() {
    const fileInput = document.getElementById('buyerChatImage');
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 1048576) { alert('⚠️ Image too large! Max 1MB'); fileInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            window.pendingBuyerImage = e.target.result;
            const previewDiv = document.getElementById('buyerImagePreview');
            if (previewDiv) {
                previewDiv.innerHTML = `📷 Image ready to send. Click Send to share.`;
                previewDiv.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    }
}

function loadOrderHistory() {
    const orderHistoryList = document.getElementById('orderHistoryList');
    orderHistoryList.innerHTML = '<div style="text-align:center;padding:20px;">⏳ Loading orders...</div>';
    if (!buyerProfile.phone || !buyerProfile.name) {
        orderHistoryList.innerHTML = `<div style="text-align:center;padding:40px;color:#F59E0B;"><div style="font-size:48px;">⚠️</div><div>Profile Incomplete</div><button onclick="closeOrdersAndOpenProfile()" style="background:#10B981;color:white;border:none;padding:12px 24px;border-radius:8px;margin-top:16px;cursor:pointer;">👤 Complete Profile</button></div>`;
        return;
    }
    rtdb.ref('orders').orderByChild('buyer/phone').equalTo(buyerProfile.phone).once('value').then((snapshot) => {
        orderHistoryList.innerHTML = '';
        if (!snapshot.exists()) { orderHistoryList.innerHTML = '<div style="text-align:center;padding:20px;color:#6B7280;">📭 No orders yet</div>'; return; }
        const orders = [];
        snapshot.forEach((child) => orders.push(child.val()));
        orders.sort((a, b) => b.timestamp - a.timestamp);
        orders.forEach(order => orderHistoryList.appendChild(createOrderCard(order)));
    }).catch(() => { orderHistoryList.innerHTML = '<div style="text-align:center;padding:20px;color:#EF4444;">❌ Failed to load orders</div>'; });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-history-card';
    const statusLabels = { 'pending':'Pending','confirmed':'Confirmed','processing':'Processing','shipped':'Shipped','delivered':'Completed','cancelled':'Cancelled' };
    const statusClass = { 'pending':'status-pending','confirmed':'status-confirmed','processing':'status-processing','shipped':'status-shipped','delivered':'status-delivered','cancelled':'status-cancelled' };
    const orderDate = new Date(order.timestamp).toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const sellerNum = order.seller?.sellerNum || 1;
    const showConfirmBtn = order.status === 'shipped';
    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;flex-wrap:wrap;gap:12px;">
            <div><div style="font-family:monospace;font-weight:600;color:#FFD700;margin-bottom:4px;">${order.orderId}</div><div style="font-size:13px;color:#888;">📅 ${orderDate}</div></div>
            <div class="order-status-badge ${statusClass[order.status]}">${statusLabels[order.status]}</div>
        </div>
        <div style="border-top:1px solid #FFD70020;padding-top:12px;">
            <div style="margin-bottom:8px;"><strong>📦 ${order.product.name}</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:14px;color:#AAAAAA;margin-bottom:4px;"><span>Quantity: ${order.product.quantity}x</span><span style="font-weight:600;color:#FFD700;">Rp ${order.product.total.toLocaleString('en-US')}</span></div>
            <div style="font-size:13px;color:#888;">🏪 ${order.seller.name} | 📞 ${order.seller.phone}</div>
            <button onclick="openDirectChat('${order.orderId}', ${sellerNum}, '${order.seller.name}', '${order.seller.phone}')" style="width:100%;margin-top:10px;padding:8px;background:linear-gradient(135deg,#3B82F6,#2563EB);color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">💬 Chat with Seller</button>
            ${showConfirmBtn ? `<button class="confirm-delivery-btn" onclick="openConfirmDelivery('${order.orderId}', ${sellerNum})">✅ Confirm Order Received</button>` : ''}
        </div>
    `;
    return card;
}

function openConfirmDelivery(orderId, sellerNum) {
    pendingConfirmOrder = { orderId, sellerNum };
    document.getElementById('confirmOrderId').innerHTML = `Order ID: <strong style="color:#FFD700;">${orderId}</strong>`;
    document.getElementById('confirmDeliveryModal').style.display = 'flex';
}

function confirmDeliverySubmit() {
    if (!pendingConfirmOrder) return;
    const { orderId, sellerNum } = pendingConfirmOrder;
    Promise.all([
        rtdb.ref('orders/' + orderId).update({ status: 'delivered' }),
        rtdb.ref('sellerOrders/seller' + sellerNum + '/' + orderId).update({ status: 'delivered' })
    ]).then(() => {
        alert('✅ Thank you! Order has been confirmed as delivered.');
        closeConfirmDeliveryModal();
        loadOrderHistory();
        pendingConfirmOrder = null;
    }).catch(() => {
        alert('⚠️ Failed to confirm delivery. Please try again.');
    });
}

function closeConfirmDeliveryModal() {
    document.getElementById('confirmDeliveryModal').style.display = 'none';
    pendingConfirmOrder = null;
}

function showContinueShoppingPopup() {
    const popup = document.createElement('div');
    popup.className = 'modal';
    popup.style.display = 'block';
    popup.innerHTML = `<div class="modal-content" style="max-width:400px;text-align:center;"><h2>🎉 Thank You!</h2><p style="margin:20px 0;">Your order has been successfully created.<br>The seller will contact you via WhatsApp soon.</p><div style="display:flex;gap:12px;"><button class="modal-btn" onclick="continueShopping()" style="flex:1;background:#10B981;">🛍️ Continue Shopping</button><button class="modal-btn" onclick="closeContinuePopup()" style="flex:1;background:#6B7280;">❌ Close</button></div></div>`;
    popup.id = 'continueShoppingPopup';
    document.body.appendChild(popup);
}
function continueShopping() { closeContinuePopup(); buyerInput.focus(); }
function closeContinuePopup() { const popup = document.getElementById('continueShoppingPopup'); if (popup) popup.remove(); }

window.onclick = function(event) { if (event.target.classList.contains('modal-overlay')) event.target.style.display = 'none'; }
window.addEventListener('beforeunload', () => { if (rtdb) { rtdb.ref('messages').off(); rtdb.ref('responses').off(); rtdb.ref('orders').off(); } });
function focusChat() { buyerInput.focus(); }

loadBuyerProfile();
console.log('✅ Buyer App initialized with Chat Image Upload!');