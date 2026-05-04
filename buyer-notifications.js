// Simple notification toggle for buyer
document.getElementById('notifNavBtn')?.addEventListener('click', () => {
    alert('🔔 Fitur notifikasi\n\nNotifikasi order akan muncul di sini!\nSaat ini Anda bisa cek pesanan di menu "Pesanan".');

    // Reset badge
    const badge = document.getElementById('navNotifBadge');
    if (badge) {
        badge.textContent = '0';
        badge.style.display = 'none';
    }
});

// Example: Update notification badge when new order comes in
function updateNotificationBadge(count) {
    const badge = document.getElementById('navNotifBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// You can call updateNotificationBadge(3) to show 3 unread notifications
