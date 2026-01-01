// --- 設定 ---
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwty1oe-6s7l6GPnMyo-nhQk2vDfnWKsdlzmgdGo1ey7g1QNLusXc_iIbAJYdE8RhLwRnLobvrBvDV/pub?gid=821609257&single=true&output=csv';
const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSexVAhliA-a_VG2fiyEZZUGmuBVKxXgtmdIdciqKai-Ki0ssg/viewform?usp=dialog'; 
const RECRUIT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe9ct1JVa42u4tWHIqFQJegyq1s2b2rjiSpc84EBqq65QkLug/viewform'; 

// --- ステート管理 ---
let currentLang = 'jp';
let allPosts = [];
let sortOrder = 'newest';

// --- 多言語辞書 ---
const i18n = {
    jp: {
        home: "ホーム", policy: "ポリシー", recruit: "掲載", contact: "お問い合わせ", faq: "よくある質問",
        title: "実験参加者募集", subtitle: "大学研究・心理学実験への参加募集",
        aboutTitle: "当サイトについて", aboutText: "大学の研究実験やアンケートの協力者を募集する掲示板です。",
        recruitHint: "※掲載は最短1分で完了。大学の研究者・学生ならどなたでも無料で掲載可能です。",
        emptyMsg: "現在、新しい募集を準備中です...", emptyAction: "最初の募集を掲載しませんか？",
        countSuffix: "件の募集", sortNew: "新着順", sortOld: "古い順",
        more: "詳細を見る", close: "閉じる", back: "← 前のページに戻る",
        langBtn: "English",
        recruitHero: "実験参加者を募集しませんか？", recruitSub: "研究・実験の参加者募集を無料で掲載できます。",
        recruitBtn: "掲載フォームへ", contactTitle: "お問い合わせ",
        contactText: "ご質問・ご相談がありましたら、以下のフォームからご連絡ください。",
        contactBtn: "お問い合わせフォームへ"
    },
    en: {
        home: "Home", policy: "Policy", recruit: "Post", contact: "Contact", faq: "FAQ",
        title: "Experiment Recruitment", subtitle: "Recruiting participants for university research",
        aboutTitle: "About Us", aboutText: "A bulletin board for recruiting participants for university experiments and surveys.",
        recruitHint: "*Posting takes as little as 1 minute. Free for university researchers and students.",
        emptyMsg: "Preparing for new recruitments...", emptyAction: "Be the first to post a recruitment!",
        countSuffix: " posts", sortNew: "Newest", sortOld: "Oldest",
        more: "View Details", close: "Close", back: "← Back",
        langBtn: "日本語",
        recruitHero: "Want to recruit participants?", recruitSub: "You can post your research or experiment for free.",
        recruitBtn: "Go to Post Form", contactTitle: "Contact Us",
        contactText: "If you have any questions or requests, please contact us via the form below.",
        contactBtn: "Go to Contact Form"
    }
};

function getRoutes() {
    const t = i18n[currentLang];
    return {
        '': { label: t.home, icon: 'home', render: renderHome },
        '#faq': { label: t.faq, icon: 'help-circle', render: renderFaq },
        '#policy': { label: t.policy, icon: 'shield-check', render: renderPolicy },
        '#recruit': { label: t.recruit, icon: 'pen-tool', render: renderRecruit },
        '#contact': { label: t.contact, icon: 'mail', render: renderContact },
    };
}

// --- DOM要素 ---
const els = {
    main: document.getElementById('main-content'),
    desktopNav: document.getElementById('desktop-nav'),
    mobileNav: document.getElementById('mobile-nav'),
    mobileNavLinks: document.getElementById('mobile-nav-links'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    year: document.getElementById('year'),
};

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    els.year.textContent = new Date().getFullYear();
    setupNavigation();
    fetchData().then(() => handleRoute());
    window.addEventListener('hashchange', handleRoute);
});

function setupNavigation() {
    const routes = getRoutes();
    const navItems = Object.entries(routes).map(([hash, route]) => ({ hash, ...route }));
    const t = i18n[currentLang];

    els.desktopNav.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" class="nav-item px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-accent hover:bg-blue-50 transition-all flex items-center gap-2" data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-4 h-4"></i> ${item.label}
        </a>
    `).join('') + `
        <button id="lang-toggle-pc" class="ml-4 px-3 py-1 border border-accent text-accent rounded-full text-xs font-bold hover:bg-blue-50 transition-all">${t.langBtn}</button>
    `;

    els.mobileNavLinks.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" class="nav-item block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 flex items-center gap-3" data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i> ${item.label}
        </a>
    `).join('') + `
        <div class="px-3 py-2 border-t border-gray-100 mt-2">
            <button id="lang-toggle-mobile" class="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">${t.langBtn}</button>
        </div>
    `;

    const toggleLang = () => {
        currentLang = currentLang === 'jp' ? 'en' : 'jp';
        setupNavigation();
        handleRoute();
    };

    document.getElementById('lang-toggle-pc')?.addEventListener('click', toggleLang);
    document.getElementById('lang-toggle-mobile')?.addEventListener('click', toggleLang);

    els.mobileMenuBtn.onclick = (e) => {
        e.stopPropagation();
        const isHidden = els.mobileNav.classList.toggle('hidden');
        els.mobileMenuBtn.innerHTML = `<i data-lucide="${isHidden ? 'menu' : 'x'}" class="w-6 h-6 text-gray-600"></i>`;
        lucide.createIcons();
    };
    lucide.createIcons();
}

function handleRoute() {
    const hash = window.location.hash;
    const routes = getRoutes();
    const route = routes[hash] || routes['']; 

    // ナビのアクティブ表示更新
    document.querySelectorAll('.nav-item').forEach(link => {
        const isMatch = link.dataset.hash === (hash || '');
        link.classList.toggle('text-accent', isMatch);
        link.classList.toggle('bg-blue-50', isMatch);
    });

    els.mobileNav.classList.add('hidden');
    els.main.innerHTML = route.render();
    lucide.createIcons();
    window.scrollTo(0, 0);

    if (!hash || hash === '#') attachHomeEvents();
}

async function fetchData() {
    try {
        const res = await fetch(SHEET_URL);
        const csvText = await res.text();
        allPosts = parseCSV(csvText);
    } catch (err) {
        els.main.innerHTML = `<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center">Failed to load data.</div>`;
    }
}

function parseCSV(text) {
    const rows = [];
    let currentRow = [], currentVal = '', insideQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i], nextChar = text[i+1];
        if (char === '"') {
            if (insideQuote && nextChar === '"') { currentVal += '"'; i++; }
            else { insideQuote = !insideQuote; }
        } else if (char === ',' && !insideQuote) {
            currentRow.push(currentVal); currentVal = '';
        } else if ((char === '\n' || char === '\r') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentRow.length) rows.push(currentRow);
            currentRow = []; currentVal = '';
        } else { currentVal += char; }
    }
    if (currentRow.length) rows.push(currentRow);
    return rows.slice(1).filter(r => r.length >= 3).map((r, i) => ({ id: i, timestamp: r[0].trim(), title: r[1].trim(), details: r[2].trim() }));
}

// --- 各ページ描画関数 ---

function renderHome() {
    const t = i18n[currentLang];
    if (!allPosts.length) {
        return `<div class="text-center py-20"><div class="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-10 max-w-md mx-auto"><i data-lucide="search" class="w-12 h-12 text-gray-300 mx-auto mb-4"></i><p class="text-gray-500 mb-4">${t.emptyMsg}</p><a href="#recruit" class="text-accent font-bold hover:underline">${t.emptyAction}</a></div></div>`;
    }

    const sorted = [...allPosts].sort((a, b) => sortOrder === 'newest' ? b.id - a.id : a.id - b.id);
    const cardsHtml = sorted.map((post, idx) => {
        const displayNum = sortOrder === 'newest' ? sorted.length - idx : idx + 1;
        return `
        <article class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
            <div class="post-trigger p-6 cursor-pointer select-none">
                <div class="flex items-center justify-between mb-3">
                    <span class="bg-blue-100 text-accent text-xs font-bold px-2 py-1 rounded">#${displayNum}</span>
                    <span class="text-xs text-gray-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${post.timestamp}</span>
                </div>
                <h3 class="text-lg font-bold text-primary mb-2 group-hover:text-accent transition-colors">${post.title}</h3>
                <div class="flex items-center justify-between mt-4">
                    <span class="text-sm font-medium text-accent flex items-center gap-1 toggle-label">${t.more}</span>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-300 transition-transform duration-300 chevron-icon"></i>
                </div>
            </div>
            <div class="post-detail max-h-0 overflow-hidden transition-all duration-300 ease-out bg-gray-50 border-t border-gray-100">
                <div class="p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${post.details}</div>
            </div>
        </article>`;
    }).join('');

    return `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex gap-4 items-start">
                <div class="bg-blue-50 p-2 rounded-lg text-accent shrink-0"><i data-lucide="info" class="w-6 h-6"></i></div>
                <div>
                    <h2 class="font-bold text-primary mb-1">${t.aboutTitle}</h2>
                    <p class="text-sm text-gray-600">${t.aboutText}<br><span class="text-xs mt-2 inline-block text-gray-400">${t.recruitHint}</span></p>
                </div>
            </div>
            <div class="flex justify-between items-center px-2">
                <span class="text-sm font-bold text-gray-500">${sorted.length}${t.countSuffix}</span>
                <select id="sort-select" class="text-sm border-gray-300 rounded-lg py-1.5">
                    <option value="newest" ${sortOrder==='newest'?'selected':''}>${t.sortNew}</option>
                    <option value="oldest" ${sortOrder==='oldest'?'selected':''}>${t.sortOld}</option>
                </select>
            </div>
            <div class="grid gap-4">${cardsHtml}</div>
        </div>`;
}

function attachHomeEvents() {
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        handleRoute();
    });
    document.querySelectorAll('.post-trigger').forEach(trigger => {
        trigger.onclick = () => {
            const t = i18n[currentLang];
            const detail = trigger.nextElementSibling;
            const icon = trigger.querySelector('.chevron-icon');
            const label = trigger.querySelector('.toggle-label');
            const isOpen = !!detail.style.maxHeight;
            detail.style.maxHeight = isOpen ? null : detail.scrollHeight + 'px';
            icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            label.textContent = isOpen ? t.more : t.close;
        };
    });
}

function renderPolicy() {
    const t = i18n[currentLang];
    const content = currentLang === 'jp' ? `
        <h2 class="text-2xl font-bold mb-4">利用ポリシー</h2>
        <p class="text-sm text-gray-600 mb-8">このサイトは、研究目的の参加者募集を円滑に行うためのプラットフォームです。公序良俗に反する投稿や、虚偽情報の掲載は固く禁じます。</p>
        <h3 class="font-bold text-primary border-b pb-2 mb-3">個人情報の取り扱い</h3>
        <p class="text-sm text-gray-600 mb-6">応募時に提供される情報は、各研究担当者が管理します。当サイトは情報の正確性やトラブルについて一切の責任を負いません。</p>
    ` : `
        <h2 class="text-2xl font-bold mb-4">Policy</h2>
        <p class="text-sm text-gray-600 mb-8">This site is a platform for recruiting research participants. Posts that violate public order or contain false information are strictly prohibited.</p>
        <h3 class="font-bold text-primary border-b pb-2 mb-3">Privacy</h3>
        <p class="text-sm text-gray-600 mb-6">Information provided at the time of application is managed by each researcher. This site is not responsible for any disputes.</p>
    `;
    return `<div class="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">${content}<a href="#" onclick="history.back(); return false;" class="text-accent hover:underline text-sm font-medium">${t.back}</a></div>`;
}

function renderRecruit() {
    const t = i18n[currentLang];
    return `
    <div class="max-w-3xl mx-auto space-y-6">
        <div class="bg-gradient-to-r from-accent to-blue-700 rounded-2xl p-8 text-white text-center shadow-lg">
            <h2 class="text-2xl font-bold mb-4">${t.recruitHero}</h2>
            <p class="opacity-90 mb-6">${t.recruitSub}</p>
            <a href="${RECRUIT_FORM_URL}" target="_blank" class="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition-transform hover:-translate-y-1">
                <i data-lucide="external-link" class="w-4 h-4"></i> ${t.recruitBtn}
            </a>
        </div>
    </div>`;
}

function renderContact() {
    const t = i18n[currentLang];
    return `
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-blue-100 text-accent rounded-full flex items-center justify-center mx-auto mb-6"><i data-lucide="mail" class="w-8 h-8"></i></div>
        <h2 class="text-2xl font-bold text-primary mb-4">${t.contactTitle}</h2>
        <p class="text-gray-600 mb-6">${t.contactText}</p>
        <a href="${CONTACT_FORM_URL}" target="_blank" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">
            <i data-lucide="send" class="w-5 h-5"></i> ${t.contactBtn}
        </a>
    </div>`;
}

function renderFaq() {
    const t = i18n[currentLang];
    const faqData = currentLang === 'jp' ? [
        { q: "無料で掲載できますか？", a: "はい、大学関係者であれば無料で掲載可能です。" },
        { q: "掲載を終了したい", a: "お問い合わせフォームからご連絡ください。" }
    ] : [
        { q: "Is it free to post?", a: "Yes, it is free for university researchers and students." },
        { q: "How to end recruitment?", a: "Please contact us via the contact form." }
    ];

    const faqHtml = faqData.map(item => `
        <details class="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
            <summary class="flex items-center justify-between p-5 cursor-pointer list-none focus:outline-none">
                <span class="text-sm font-bold text-primary flex items-center gap-3"><span class="w-6 h-6 bg-blue-100 text-accent rounded-full flex items-center justify-center text-xs shrink-0">Q</span>${item.q}</span>
                <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180"></i>
            </summary>
            <div class="px-5 pb-5 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/50"><div class="flex gap-3 pt-4"><span class="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs shrink-0 font-bold">A</span><p>${item.a}</p></div></div>
        </details>`).join('');

    return `<div class="max-w-3xl mx-auto space-y-6"><div class="text-center mb-8"><h2 class="text-2xl font-bold text-primary mb-2">${t.faq}</h2></div>${faqHtml}</div>`;
}
