// ============================================
// SELLER APP - WITH FIREBASE INTEGRATION & DASHBOARD
// ============================================

const sellerDefaults = {
    1: { name: 'Pak Budi Supra', phone: '', location: '' },
    2: { name: 'Pak Dadang', phone: '', location: '' },
    3: { name: 'Dagangan Pak Haji', phone: '', location: '' },
    4: { name: 'Pak Sapri', phone: '', location: '' }
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const livePreview = document.getElementById('livePreview');
const notificationBadge = document.getElementById('notificationBadge');
const notificationText = document.getElementById('notificationText');

let currentMessageId = null;
let sellerResponses = [false, false, false, false];
let currentActiveSeller = 1;
let currentFilterStatus = 'all';
let sellerOrdersList = [];

function previewImage(sellerNum) {
    const fileInput = document.getElementById(`seller${sellerNum}Image`);
    const preview = document.getElementById(`seller${sellerNum}ImagePreview`);
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 1048576) { alert('⚠️ Max 1MB'); fileInput.value = ''; preview.innerHTML = '🖼️'; return; }
        const reader = new FileReader();
        reader.onload = function(e) { preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`; };
        reader.readAsDataURL(file);
    }
}

function getImageBase64(sellerNum) {
    return new Promise((resolve, reject) => {
        const fileInput = document.getElementById(`seller${sellerNum}Image`);
        if (!fileInput?.files?.[0]) { resolve(null); return; }
        const file = fileInput.files[0];
        if (file.size > 1048576) { reject(new Error('Image too large')); return; }
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read'));
        reader.readAsDataURL(file);
    });
}

if (rtdb) {
    rtdb.ref('messages').on('child_added', (snapshot) => {
        const messageData = snapshot.val();
        currentMessageId = snapshot.key;
        showNotification(`🔔 Buyer: "${messageData.text}"`);
        if (livePreview) livePreview.innerHTML = `<div class="preview-text" style="font-size:14px;font-weight:600;color:var(--text);text-align:center;padding:8px 0;">"${escapeHtml(messageData.text)}"</div>`;
        resetSellerForms();
    });
}

function showNotification(message) {
    if (notificationText) notificationText.textContent = message;
    if (notificationBadge) notificationBadge.classList.add('show');
    setTimeout(() => { if (notificationBadge) notificationBadge.classList.remove('show'); }, 60000);
}

function resetSellerForms() {
    sellerResponses = [false, false, false, false];
    for (let i = 1; i <= 4; i++) {
        const fields = ['Product','Price','Stock','Notes','PhoneInput','LocationInput'];
        fields.forEach(f => { const el = document.getElementById(`seller${i}${f}`); if (el) { el.disabled = false; el.value = f === 'Stock' ? '0' : ''; } });
        const imgInp = document.getElementById(`seller${i}Image`);
        if (imgInp) { imgInp.disabled = false; imgInp.value = ''; }
        const preview = document.getElementById(`seller${i}ImagePreview`);
        if (preview) preview.innerHTML = '🖼️';
        const btn = document.getElementById(`sellerBtn${i}`);
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send Offer</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>'; }
        const status = document.getElementById(`seller${i}Status`);
        if (status) { status.textContent = 'Ready'; status.className = 'seller-status-display'; }
        const delBtn = document.querySelector(`#sellerForm${i} .delete-inventory-btn`);
        if (delBtn) delBtn.remove();
    }
}

async function submitResponse(sellerNum) {
    if (!currentMessageId) { alert('⚠️ No buyer message yet!'); return; }
    if (sellerResponses[sellerNum-1]) { alert('Already submitted!'); return; }
    const phone = document.getElementById(`seller${sellerNum}PhoneInput`).value.trim();
    const location = document.getElementById(`seller${sellerNum}LocationInput`).value.trim();
    const product = document.getElementById(`seller${sellerNum}Product`).value.trim();
    const price = parseInt(document.getElementById(`seller${sellerNum}Price`).value);
    const stock = parseInt(document.getElementById(`seller${sellerNum}Stock`).value);
    const notes = document.getElementById(`seller${sellerNum}Notes`).value.trim();
    if (!product || !price) { alert('⚠️ Product and Price required!'); return; }
    if (!phone || !location) { alert('⚠️ Phone and Location required!'); return; }
    let imageBase64 = null;
    try { imageBase64 = await getImageBase64(sellerNum); } catch(e) { alert(e.message); return; }
    const btn = document.getElementById(`sellerBtn${sellerNum}`);
    const originalHtml = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳ Sending...</span>'; }
    const responseData = { sellerNum, sellerName: sellerDefaults[sellerNum].name, sellerPhone: phone, sellerLocation: location, product, price, stock, notes, imageBase64, timestamp: Date.now() };
    rtdb.ref('responses/' + currentMessageId + '/seller' + sellerNum).set(responseData).then(() => {
        document.getElementById(`seller${sellerNum}Product`).disabled = true;
        document.getElementById(`seller${sellerNum}Price`).disabled = true;
        document.getElementById(`seller${sellerNum}Stock`).disabled = true;
        document.getElementById(`seller${sellerNum}PhoneInput`).disabled = true;
        document.getElementById(`seller${sellerNum}LocationInput`).disabled = true;
        document.getElementById(`seller${sellerNum}Notes`).disabled = true;
        const imgInp = document.getElementById(`seller${sellerNum}Image`);
        if (imgInp) imgInp.disabled = true;
        if (btn) { btn.disabled = true; btn.innerHTML = '<span>✓ Sent</span>'; }
        const status = document.getElementById(`seller${sellerNum}Status`);
        if (status) { status.textContent = '✓ Sent'; status.className = 'seller-status-display success'; }
        sellerResponses[sellerNum-1] = true;
        addDeleteButton(sellerNum);
    }).catch(() => { alert('Failed'); if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; } });
}

function addDeleteButton(sellerNum) {
    const card = document.getElementById(`sellerForm${sellerNum}`);
    if (!card || card.querySelector('.delete-inventory-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'delete-inventory-btn';
    btn.textContent = '🗑️ Delete Offer';
    btn.onclick = () => deleteInventory(sellerNum);
    const submitBtn = document.getElementById(`sellerBtn${sellerNum}`);
    if (submitBtn) submitBtn.parentNode.insertBefore(btn, submitBtn.nextSibling);
}

function deleteInventory(sellerNum) {
    if (!currentMessageId) return;
    if (!confirm('Delete this offer?')) return;
    rtdb.ref('responses/' + currentMessageId + '/seller' + sellerNum).remove().then(() => {
        ['Product','Price','Stock','PhoneInput','LocationInput','Notes'].forEach(f => {
            const el = document.getElementById(`seller${sellerNum}${f}`);
            if (el) { el.disabled = false; el.value = f === 'Stock' ? '0' : ''; }
        });
        const img = document.getElementById(`seller${sellerNum}Image`);
        if (img) { img.disabled = false; img.value = ''; }
        const preview = document.getElementById(`seller${sellerNum}ImagePreview`);
        if (preview) preview.innerHTML = '🖼️';
        const btn = document.getElementById(`sellerBtn${sellerNum}`);
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>Send Offer</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>'; }
        const status = document.getElementById(`seller${sellerNum}Status`);
        if (status) { status.textContent = 'Ready'; status.className = 'seller-status-display'; }
        const del = document.querySelector(`#sellerForm${sellerNum} .delete-inventory-btn`);
        if (del) del.remove();
        sellerResponses[sellerNum-1] = false;
        alert('Deleted');
    });
}

function clearAllInventory() {
    if (!currentMessageId) { alert('No active offers'); return; }
    if (!confirm('Clear ALL offers?')) return;
    rtdb.ref('responses/' + currentMessageId).remove().then(() => { resetSellerForms(); alert('Cleared'); });
}

function clearAllOrders() {
    const sellerNum = window.currentActiveSeller || 1;
    rtdb.ref('sellerOrders/seller' + sellerNum).once('value').then(snap => {
        const count = snap.numChildren();
        if (count === 0) { alert('No orders'); return; }
        if (!confirm(`Delete ${count} order(s)? This cannot be undone.`)) return;
        rtdb.ref('sellerOrders/seller' + sellerNum).remove().then(() => {
            if (confirm('Also delete from global orders? (removes from buyer history)')) {
                snap.forEach(child => { rtdb.ref('orders/' + child.key).remove(); });
            }
            alert(`Cleared ${count} orders`);
            loadOrdersDashboard();
            sellerOrdersList = [];
            updateSalesStats([]);
            renderFilteredOrders();
        });
    });
}

// ============================================
// SELLER CHAT WITH IMAGE UPLOAD
// ============================================
let sellerChatOrderId = null, sellerChatListener = null;

function openSellerChat(orderId, buyerName) {
    sellerChatOrderId = orderId;
    let modal = document.getElementById('sellerDirectChatModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sellerDirectChatModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display: flex; justify-content: center; align-items: center; z-index: 2000;';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 550px; max-height: 80vh; width: 90%;">
                <div class="modal-header">
                    <h2>💬 Chat with <span id="sellerChatBuyerName"></span></h2>
                    <span class="modal-close" onclick="closeSellerChat()">&times;</span>
                </div>
                <div id="sellerChatMessages" style="max-height: 50vh; overflow-y: auto; padding: 16px; color: #fff; min-height: 200px;">
                    <div style="text-align: center; color: #888; padding: 20px;">Loading messages...</div>
                </div>
                <div style="padding: 12px 16px; border-top: 1px solid #FFD70030;">
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="sellerChatInput" class="form-input" placeholder="Type your message..." style="margin: 0; flex: 1;">
                        <label for="sellerChatImage" style="background: #1A1A1A; padding: 12px 16px; border-radius: 12px; cursor: pointer; border: 1px solid #FFD70030;">📷</label>
                        <input type="file" id="sellerChatImage" accept="image/*" style="display: none;" onchange="sendSellerImage()">
                        <button onclick="sendSellerMessage()" style="padding: 12px 20px; background: linear-gradient(135deg, #FFD700, #FFA500); color: #0A0A0A; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;">Send</button>
                    </div>
                    <div id="sellerImagePreview" style="font-size: 12px; color: #888; display: none;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    document.getElementById('sellerChatBuyerName').textContent = buyerName;
    const container = document.getElementById('sellerChatMessages');
    container.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">Loading messages...</div>';
    if (sellerChatListener && rtdb) rtdb.ref('chats/' + orderId).off('child_added', sellerChatListener);
    sellerChatListener = (snapshot) => {
        const msg = snapshot.val();
        const isSeller = msg.sender === 'seller';
        if (container.querySelector('div')?.textContent === 'Loading messages...') container.innerHTML = '';
        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `display:flex;justify-content:${isSeller ? 'flex-end' : 'flex-start'};margin-bottom:10px;`;
        
        let contentHtml = '';
        if (msg.imageBase64) {
            contentHtml = `<img src="${msg.imageBase64}" style="max-width: 200px; max-height: 150px; border-radius: 12px; margin-bottom: 4px;"><br>`;
        }
        contentHtml += `<div>${escapeHtml(msg.text || '')}</div>`;
        
        msgDiv.innerHTML = `
            <div style="max-width:80%;padding:10px 16px;border-radius:${isSeller ? '16px 16px 4px 16px' : '4px 16px 16px 16px'};background:${isSeller ? 'linear-gradient(135deg,#FFD700,#FFA500)' : '#1A1A1A'};color:${isSeller ? '#0A0A0A' : '#FFFFFF'};font-size:14px;">
                ${contentHtml}
                <div style="font-size:10px;opacity:0.6;margin-top:4px;">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    };
    rtdb.ref('chats/' + orderId).on('child_added', sellerChatListener);
    setTimeout(() => { const inp = document.getElementById('sellerChatInput'); if (inp) inp.onkeypress = e => { if (e.key === 'Enter') sendSellerMessage(); }; }, 500);
}

function closeSellerChat() {
    const modal = document.getElementById('sellerDirectChatModal');
    if (modal) modal.style.display = 'none';
    if (sellerChatListener && rtdb) rtdb.ref('chats/' + sellerChatOrderId).off('child_added', sellerChatListener);
}

function sendSellerMessage() {
    const input = document.getElementById('sellerChatInput');
    const text = input?.value.trim();
    if ((!text || text === '') && !window.pendingSellerImage) return;
    const messageData = { text: text || '', sender: 'seller', timestamp: Date.now() };
    if (window.pendingSellerImage) {
        messageData.imageBase64 = window.pendingSellerImage;
        window.pendingSellerImage = null;
        const previewDiv = document.getElementById('sellerImagePreview');
        if (previewDiv) previewDiv.style.display = 'none';
    }
    rtdb.ref('chats/' + sellerChatOrderId).push(messageData).then(() => { if (input) input.value = ''; });
}

function sendSellerImage() {
    const fileInput = document.getElementById('sellerChatImage');
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 1048576) { alert('⚠️ Image too large! Max 1MB'); fileInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            window.pendingSellerImage = e.target.result;
            const previewDiv = document.getElementById('sellerImagePreview');
            if (previewDiv) {
                previewDiv.innerHTML = `📷 Image ready to send. Click Send to share.`;
                previewDiv.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================
function loadOrdersDashboard() {
    const container = document.getElementById('ordersDashboardList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">Loading...</div>';
    const sellerNum = window.currentActiveSeller || 1;
    rtdb.ref('sellerOrders/seller' + sellerNum).once('value').then(snap => {
        sellerOrdersList = [];
        if (!snap.exists()) { container.innerHTML = '<div class="empty-orders">No orders yet</div>'; updateSalesStats([]); return; }
        snap.forEach(c => sellerOrdersList.push(c.val()));
        sellerOrdersList.sort((a,b) => b.timestamp - a.timestamp);
        updateSalesStats(sellerOrdersList);
        renderFilteredOrders();
    });
}

function updateSalesStats(orders) {
    const today = new Date().toDateString();
    let todaySales = 0, pending = 0, completed = 0;
    orders.forEach(o => {
        if (new Date(o.timestamp).toDateString() === today && o.status === 'delivered') todaySales += o.product.total;
        if (o.status === 'pending') pending++;
        if (o.status === 'delivered') completed++;
    });
    const t = document.getElementById('todaySalesAmount');
    const tot = document.getElementById('totalOrdersCount');
    const pen = document.getElementById('pendingOrdersCount');
    const com = document.getElementById('completedOrdersCount');
    if (t) t.textContent = `Rp ${todaySales.toLocaleString('en-US')}`;
    if (tot) tot.textContent = orders.length;
    if (pen) pen.textContent = pending;
    if (com) com.textContent = completed;
}

function filterOrders(status) {
    currentFilterStatus = status;
    document.querySelectorAll('.order-tab').forEach(tab => {
        if (tab.getAttribute('data-status') === status) tab.classList.add('active');
        else tab.classList.remove('active');
    });
    renderFilteredOrders();
}

function renderFilteredOrders() {
    const container = document.getElementById('ordersDashboardList');
    if (!container) return;
    let filtered = currentFilterStatus === 'all' ? sellerOrdersList : sellerOrdersList.filter(o => o.status === currentFilterStatus);
    if (filtered.length === 0) { container.innerHTML = `<div class="empty-orders">No ${currentFilterStatus} orders</div>`; return; }
    container.innerHTML = '';
    filtered.forEach(o => container.appendChild(createDashboardOrderCard(o)));
}

function createDashboardOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'dashboard-order-card';
    const statusLabels = { pending:'Pending', confirmed:'Confirmed', processing:'Processing', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled' };
    const statusClass = { pending:'status-pending', confirmed:'status-confirmed', processing:'status-processing', shipped:'status-shipped', delivered:'status-delivered', cancelled:'status-cancelled' };
    
    const paymentMethod = order.payment?.method || 'cod';
    const paymentBadge = paymentMethod === 'qris' 
        ? '<span style="background: #8B5CF620; color: #8B5CF6; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">📱 QRIS</span>' 
        : '<span style="background: #F59E0B20; color: #F59E0B; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">💵 COD</span>';
    
    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <div>
                <div style="font-family:monospace;font-weight:700;color:#FFD700;font-size:14px;background:#0D0D0D;padding:4px 12px;border-radius:8px;display:inline-block;">${order.orderId} ${paymentBadge}</div>
                <div style="font-size:12px;color:#888;margin-top:4px;">📅 ${new Date(order.timestamp).toLocaleDateString()}</div>
            </div>
            <div class="order-status-badge ${statusClass[order.status]}">${statusLabels[order.status]}</div>
        </div>
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #FFD70020;">
            <div style="font-size:18px;font-weight:700;color:#fff;">📦 ${escapeHtml(order.product.name)}</div>
            <div style="display:flex;gap:20px;font-size:14px;color:#aaa;"><span>💰 Rp ${order.product.price.toLocaleString('en-US')}</span><span>📊 ${order.product.quantity}x</span><span>💎 Total: Rp ${order.product.total.toLocaleString('en-US')}</span></div>
        </div>
        <div style="background:#F8FAFC;border-radius:12px;padding:12px;margin-bottom:16px;border:1px solid #E2E8F0;">
            <p style="color:#1e293b;"><strong>👤 Buyer:</strong> ${escapeHtml(order.buyer.name)}</p>
            <p style="color:#1e293b;"><strong>📞 Phone:</strong> ${escapeHtml(order.buyer.phone)}</p>
            <p style="color:#1e293b;"><strong>📍 Address:</strong> ${escapeHtml(order.buyer.address)}</p>
            <p style="color:#1e293b;"><strong>💳 Payment:</strong> ${paymentMethod.toUpperCase()}</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">${getOrderActions(order)}</div>
    `;
    return card;
}

function getOrderActions(order) {
    const sn = order.seller?.sellerNum || window.currentActiveSeller || 1;
    const actions = [];
    
    if (order.status === 'pending') {
        actions.push(`<button class="order-action-btn confirm" onclick="updateStatus('${order.orderId}',${sn},'confirmed')">✓ Confirm Order</button>`);
        actions.push(`<button class="order-action-btn cancel" onclick="updateStatus('${order.orderId}',${sn},'cancelled')">❌ Cancel</button>`);
    } else if (order.status === 'confirmed') {
        actions.push(`<button class="order-action-btn process" onclick="updateStatus('${order.orderId}',${sn},'processing')">⚙️ Process Order</button>`);
        actions.push(`<button class="order-action-btn cancel" onclick="updateStatus('${order.orderId}',${sn},'cancelled')">❌ Cancel</button>`);
    } else if (order.status === 'processing') {
        actions.push(`<button class="order-action-btn ship" onclick="updateStatus('${order.orderId}',${sn},'shipped')">🚚 Ship Order</button>`);
    } else if (order.status === 'shipped') {
        actions.push(`<button class="order-action-btn" style="background:#F59E0B;color:white;" onclick="alert('Waiting for buyer to confirm delivery')">⏳ Awaiting Buyer Confirmation</button>`);
    }
    
    actions.push(`<button class="order-action-btn chat" onclick="openSellerChat('${order.orderId}','${escapeHtml(order.buyer.name)}')">💬 Chat</button>`);
    return actions.join('');
}

function updateStatus(orderId, sellerNum, newStatus) {
    if (!confirm(`Update order ${orderId} to ${newStatus.toUpperCase()}?`)) return;
    Promise.all([
        rtdb.ref('orders/' + orderId).update({ status: newStatus }),
        rtdb.ref('sellerOrders/seller' + sellerNum + '/' + orderId).update({ status: newStatus })
    ]).then(() => { showNotification(`Order ${orderId} → ${newStatus}`); loadOrdersDashboard(); });
}

function quickConfirmOrder(orderId, sellerNum) { updateStatus(orderId, sellerNum, 'confirmed'); }

let shownOrderIds = new Set();
let isInitialLoad = true;

if (rtdb) {
    for (let sn = 1; sn <= 4; sn++) {
        rtdb.ref('sellerOrders/seller' + sn).once('value', snap => { snap.forEach(c => shownOrderIds.add(c.key)); if (sn === 4) isInitialLoad = false; });
        rtdb.ref('sellerOrders/seller' + sn).on('child_added', snap => {
            const data = snap.val();
            if (!isInitialLoad && !shownOrderIds.has(snap.key)) showFloatingNotification(data);
            shownOrderIds.add(snap.key);
            if (window.currentActiveSeller === sn) loadOrdersDashboard();
        });
        rtdb.ref('sellerOrders/seller' + sn).on('child_changed', () => { if (window.currentActiveSeller === sn) loadOrdersDashboard(); });
    }
}

function showFloatingNotification(order) {
    const notif = document.getElementById('floatingOrderNotification');
    if (!notif) return;
    const content = document.getElementById('floatingNotifContent');
    const paymentMethod = order.payment?.method || 'cod';
    const paymentIcon = paymentMethod === 'qris' ? '📱' : '💵';
    
    content.innerHTML = `
        <div style="font-weight:600;color:#FFD700;">🎉 New Order!</div>
        <div style="font-family:monospace;font-size:12px;color:#888;margin-top:4px;">${order.orderId}</div>
        <div style="margin-top:8px;"><strong>📦 ${order.product.name}</strong><br>${order.product.quantity}x @ Rp ${order.product.price.toLocaleString('en-US')}<br>Total: Rp ${order.product.total.toLocaleString('en-US')}</div>
        <div style="margin-top:6px; font-size:12px;">${paymentIcon} Payment: ${paymentMethod.toUpperCase()}</div>
        <div style="margin-top:6px; font-size:12px;">👤 ${order.buyer.name}</div>
        <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="order-action-btn chat" style="background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; padding: 6px 12px; font-size: 12px;" onclick="openSellerChat('${order.orderId}','${order.buyer.name}'); document.getElementById('floatingOrderNotification').style.display='none';">💬 Chat</button>
            <button class="order-action-btn" style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #0A0A0A; padding: 6px 12px; font-size: 12px;" onclick="document.getElementById('floatingOrderNotification').style.display='none'; toggleView('dashboard'); loadOrdersDashboard();">📊 View</button>
        </div>
    `;
    notif.style.display = 'block';
    setTimeout(() => { if (notif.style.display === 'block') notif.style.display = 'none'; }, 60000);
}

document.addEventListener('DOMContentLoaded', () => {
    for (let i = 1; i <= 4; i++) {
        ['Product','Price','Stock','PhoneInput','LocationInput','Notes'].forEach(f => {
            const el = document.getElementById(`seller${i}${f}`);
            if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submitResponse(i); } });
        });
    }
    window.currentActiveSeller = 1;
    setTimeout(() => loadOrdersDashboard(), 1000);
});

window.addEventListener('beforeunload', () => { if (rtdb) { rtdb.ref('messages').off(); rtdb.ref('responses').off(); rtdb.ref('sellerOrders').off(); } });
console.log('✅ Seller App with Chat Image Upload!');