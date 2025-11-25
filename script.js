// --- 開閉関数 ---
function openDetails(trigger) {
    const detail = trigger.nextElementSibling;
    const icon = trigger.querySelector('.chevron-icon');
    const toggleText = trigger.querySelector('.toggle-text');

    if (detail.style.maxHeight) return; // 既に開いていたら何もしない

    detail.style.maxHeight = detail.scrollHeight + "px";
    if (icon) icon.setAttribute('data-lucide', 'chevron-up');
    if (toggleText) toggleText.textContent = "▲ 閉じる";

    lucide.createIcons();
}

function closeDetails(detail) {
    if (!detail) return;
    const trigger = detail.previousElementSibling;
    const icon = trigger.querySelector('.chevron-icon');
    const toggleText = trigger.querySelector('.toggle-text');

    detail.style.maxHeight = null;
    if (icon) icon.setAttribute('data-lucide', 'chevron-down');
    if (toggleText) toggleText.textContent = "▼ 詳細を表示";

    lucide.createIcons();
}

// --- Homeレンダリング後のイベントリスナー ---
document.querySelectorAll('.post-card-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => openDetails(trigger));
});

document.querySelectorAll('.close-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const detail = btn.closest('.post-detail');
        closeDetails(detail);
    });
});
