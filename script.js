// script.js

// --- 設定 ---
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwty1oe-6s7l6GPnMyo-nhQk2vDfnWKsdlzmgdGo1ey7g1QNLusXc_iIbAJYdE8RhLwRnLobvrBvDV/pub?gid=821609257&single=true&output=csv';
const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSexVAhliA-a_VG2fiyEZZUGmuBVKxXgtmdIdciqKai-Ki0ssg/viewform?usp=dialog'; 
const RECRUIT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe9ct1JVa42u4tWHIqFQJegyq1s2b2rjiSpc84EBqq65QkLug/viewform'; 
const i18n = {
    jp: {
        home: "ホーム", policy: "ポリシー", recruit: "掲載", contact: "お問い合わせ", faq: "よくある質問",
        title: "実験参加者募集", subtitle: "大学研究・心理学実験への参加募集",
        aboutTitle: "当サイトについて", aboutText: "大学の研究実験やアンケートの協力者を募集する掲示板です。",
        countSuffix: "件の募集", sortNew: "新着順", sortOld: "古い順",
        more: "詳細を見る", close: "閉じる",
        langBtn: "English"
    },
    en: {
        home: "Home", policy: "Policy", recruit: "Post", contact: "Contact", faq: "FAQ",
        title: "Experiment Recruitment", subtitle: "Recruiting participants for university research",
        aboutTitle: "About Us", aboutText: "A bulletin board for recruiting participants for university experiments and surveys.",
        countSuffix: " posts", sortNew: "Newest", sortOld: "Oldest",
        more: "View Details", close: "Close",
        langBtn: "日本語"
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

// --- ステート管理 ---
let allPosts = [];
let sortOrder = 'newest';

// --- ルーティング定義 ---
const routes = {
    '': { label: 'ホーム', icon: 'home', render: renderHome },
    '#policy': { label: '利用ポリシー', icon: 'shield-check', render: renderPolicy },
    '#recruit': { label: '掲載', icon: 'pen-tool', render: renderRecruit },
    '#contact': { label: 'お問い合わせ', icon: 'mail', render: renderContact },
    '#faq': { label: 'よくある質問', icon: 'help-circle', render: renderFaq }, // 追加
};

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

    // 初回ロード
    fetchData().then(() => {
        handleRoute();
    });

    // ハッシュ変更監視
    window.addEventListener('hashchange', handleRoute);
});

function setupNavigation() {
    const routes = getRoutes();
    const navItems = Object.entries(routes).map(([hash, route]) => ({ hash, ...route }));
    const t = i18n[currentLang];

    // PC用メニュー（リンク + 言語ボタン）
    els.desktopNav.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" 
           class="nav-item px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-accent hover:bg-blue-50 transition-all flex items-center gap-2"
           data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-4 h-4"></i>
            ${item.label}
        </a>
    `).join('') + `
        <button id="lang-toggle-pc" class="ml-4 px-3 py-1 border border-accent text-accent rounded-full text-xs font-bold hover:bg-blue-50 transition-all">
            ${t.langBtn}
        </button>
    `;

    // スマホ用メニューリンク（最後に言語ボタンを追加）
    els.mobileNavLinks.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" 
           class="nav-item block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 flex items-center gap-3"
           data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
            ${item.label}
        </a>
    `).join('') + `
        <div class="px-3 py-2 border-t border-gray-100 mt-2">
            <button id="lang-toggle-mobile" class="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">
                ${t.langBtn}
            </button>
        </div>
    `;

    // 言語切替イベントの登録
    const toggleLang = () => {
        currentLang = currentLang === 'jp' ? 'en' : 'jp';
        setupNavigation(); // ナビを再描画
        handleRoute();     // コンテンツを再描画
    };

    document.getElementById('lang-toggle-pc')?.addEventListener('click', toggleLang);
    document.getElementById('lang-toggle-mobile')?.addEventListener('click', toggleLang);

    // スマホメニュー開閉ロジック (既存のものを維持)
    els.mobileMenuBtn.onclick = (e) => {
        e.stopPropagation();
        const isHidden = els.mobileNav.classList.toggle('hidden');
        const newIconName = isHidden ? 'menu' : 'x';
        els.mobileMenuBtn.innerHTML = `<i data-lucide="${newIconName}" class="w-6 h-6 text-gray-600"></i>`;
        lucide.createIcons();
    };

    lucide.createIcons();
}

function updateActiveNav(currentHash) {
    const normalizedHash = currentHash || '';

    document.querySelectorAll('.nav-item').forEach(link => {
        const isMatch = link.dataset.hash === normalizedHash;
        if (isMatch) {
            link.classList.add('text-accent', 'bg-blue-50');
            link.classList.remove('text-gray-600', 'text-gray-700');
        } else {
            link.classList.remove('text-accent', 'bg-blue-50');
            link.classList.add('text-gray-600');
        }
    });

    // ページ遷移時にスマホメニューを閉じる
    els.mobileNav.classList.add('hidden');
    
    // アイコンも「メニュー」に戻す
    els.mobileMenuBtn.innerHTML = `<i data-lucide="menu" class="w-6 h-6 text-gray-600"></i>`;
    lucide.createIcons();
}

// --- ルーティング処理 ---
function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash] || routes['']; 

    updateActiveNav(hash);

    // コンテンツ描画
    els.main.innerHTML = route.render();

    // アイコン再生成
    lucide.createIcons();

    window.scrollTo(0, 0);

    if (!hash || hash === '#') {
        attachHomeEvents();
    }
}

// --- データ取得 ---
async function fetchData() {
    try {
        const res = await fetch(SHEET_URL);
        if (!res.ok) throw new Error('Network error');
        const csvText = await res.text();
        allPosts = parseCSV(csvText);
    } catch (err) {
        console.error(err);
        els.main.innerHTML = `
            <div class="bg-red-50 text-red-600 p-4 rounded-lg text-center">
                データの読み込みに失敗しました。<br>時間をおいて再読み込みしてください。
            </div>`;
    }
}

// --- CSVパーサー ---
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
        } else {
            currentVal += char;
        }
    }
    if (currentRow.length) rows.push(currentRow);

    return rows.slice(1)
        .filter(r => r.length >= 3)
        .map((r, i) => ({
            id: i,
            timestamp: r[0].trim(),
            title: r[1].trim(),
            details: r[2].trim()
        }));
}

// ==========================================
// ページレンダリング関数群
// ==========================================

function renderHome() {
    const t = i18n[currentLang];
    
    if (!allPosts.length) {
        return `
            <div class="text-center py-20">
                <div class="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-10 max-w-md mx-auto">
                    <i data-lucide="search" class="w-12 h-12 text-gray-300 mx-auto mb-4"></i>
                    <p class="text-gray-500 mb-4">${t.loading || '現在、新しい募集を準備中です...'}</p>
                    <a href="#recruit" class="text-accent font-bold hover:underline">
                        ${currentLang === 'jp' ? '最初の募集を掲載しませんか？' : 'Be the first to post a recruitment!'}
                    </a>
                </div>
            </div>`;
    }

    const sorted = [...allPosts].sort((a, b) => 
        sortOrder === 'newest' ? b.id - a.id : a.id - b.id
    );

    const cardsHtml = sorted.map((post, idx) => {
        const displayNum = sortOrder === 'newest' ? sorted.length - idx : idx + 1;
        return `
        <article class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 group">
            <div class="post-trigger p-6 cursor-pointer select-none">
                <div class="flex items-center justify-between mb-3">
                    <span class="bg-blue-100 text-accent text-xs font-bold px-2 py-1 rounded">#${displayNum}</span>
                    <span class="text-xs text-gray-400 flex items-center gap-1">
                        <i data-lucide="clock" class="w-3 h-3"></i> ${post.timestamp}
                    </span>
                </div>
                <h3 class="text-lg font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                    ${post.title}
                </h3>
                <div class="flex items-center justify-between mt-4">
                    <span class="text-sm font-medium text-accent flex items-center gap-1 toggle-label">
                        ${t.more}
                    </span>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-300 transition-transform duration-300 chevron-icon"></i>
                </div>
            </div>
            <div class="post-detail max-h-0 overflow-hidden transition-all duration-300 ease-out bg-gray-50 border-t border-gray-100">
                <div class="p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                    ${post.details}
                </div>
            </div>
        </article>
        `;
    }).join('');

    return `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex gap-4 items-start">
                <div class="bg-blue-50 p-2 rounded-lg text-accent shrink-0">
                    <i data-lucide="info" class="w-6 h-6"></i>
                </div>
                <div>
                    <h2 class="font-bold text-primary mb-1">${t.aboutTitle}</h2>
                    <p class="text-sm text-gray-600">
                        ${t.aboutText}<br>
                        <span class="text-xs mt-2 inline-block text-gray-400">
                            ${currentLang === 'jp' 
                                ? '※掲載は最短1分で完了。大学の研究者・学生ならどなたでも無料で掲載可能です。' 
                                : '*Posting takes as little as 1 minute. Free for university researchers and students.'}
                        </span>
                    </p>
                </div>
            </div>

            <div class="flex justify-between items-center px-2">
                <span class="text-sm font-bold text-gray-500">${sorted.length}${t.countSuffix}</span>
                <select id="sort-select" class="text-sm border-gray-300 rounded-lg shadow-sm focus:border-accent focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-1.5">
                    <option value="newest" ${sortOrder==='newest'?'selected':''}>${t.sortNew}</option>
                    <option value="oldest" ${sortOrder==='oldest'?'selected':''}>${t.sortOld}</option>
                </select>
            </div>

            <div class="grid gap-4">
                ${cardsHtml}
            </div>
        </div>
    `;
}

    const cardsHtml = sorted.map((post, idx) => {
        const displayNum = sortOrder === 'newest' ? sorted.length - idx : idx + 1;
        return `
        <article class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 group">
            <div class="post-trigger p-6 cursor-pointer select-none">
                <div class="flex items-center justify-between mb-3">
                    <span class="bg-blue-100 text-accent text-xs font-bold px-2 py-1 rounded">#${displayNum}</span>
                    <span class="text-xs text-gray-400 flex items-center gap-1">
                        <i data-lucide="clock" class="w-3 h-3"></i> ${post.timestamp}
                    </span>
                </div>
                <h3 class="text-lg font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                    ${post.title}
                </h3>
                <div class="flex items-center justify-between mt-4">
                    <span class="text-sm font-medium text-accent flex items-center gap-1 toggle-label">
                        詳細を見る
                    </span>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-300 transition-transform duration-300 chevron-icon"></i>
                </div>
            </div>
            <div class="post-detail max-h-0 overflow-hidden transition-all duration-300 ease-out bg-gray-50 border-t border-gray-100">
                <div class="p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
${post.details}
                </div>
            </div>
        </article>
        `;
    }).join('');

    return `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex gap-4 items-start">
                <div class="bg-blue-50 p-2 rounded-lg text-accent shrink-0">
                    <i data-lucide="info" class="w-6 h-6"></i>
                </div>
                <div>
                    <h2 class="font-bold text-primary mb-1">当サイトについて</h2>
                    <p class="text-sm text-gray-600">
                        大学の研究実験やアンケートの協力者を募集する掲示板です。<br>
                        参加にあたっては各募集の条件や<a href="#policy" class="text-accent hover:underline">ポリシー</a>をご確認ください。
                    </p>
                </div>
            </div>

            <div class="flex justify-between items-center px-2">
                <span class="text-sm font-bold text-gray-500">${sorted.length}件の募集</span>
                <select id="sort-select" class="text-sm border-gray-300 rounded-lg shadow-sm focus:border-accent focus:ring focus:ring-blue-200 focus:ring-opacity-50 py-1.5">
                    <option value="newest" ${sortOrder==='newest'?'selected':''}>新着順</option>
                    <option value="oldest" ${sortOrder==='oldest'?'selected':''}>古い順</option>
                </select>
            </div>

            <div class="grid gap-4">
                ${cardsHtml}
            </div>
        </div>
    `;
}

function attachHomeEvents() {
    const select = document.getElementById('sort-select');
    if (select) {
        select.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            handleRoute();
        });
    }

    document.querySelectorAll('.post-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const detail = trigger.nextElementSibling;
            const icon = trigger.querySelector('.chevron-icon');
            const label = trigger.querySelector('.toggle-label');

            if (detail.style.maxHeight) {
                detail.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
                label.textContent = '詳細を見る';
            } else {
                detail.style.maxHeight = detail.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
                label.textContent = '閉じる';
            }
        });
    });
}

function renderPolicy() {
    return `
    <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-primary mb-2">利用ポリシー</h2>
            <p class="text-gray-500 text-sm">最終更新日: 2025年11月23日</p>
        </div>
        <div class="space-y-8">
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="info" class="w-5 h-5 text-accent"></i>
                    サイトの目的
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                    このサイト「実験参加者募集」は、研究や実験などへの参加希望者を募集する目的で運営されています。以下の方針に従い、利用者の皆さまが安心してご利用いただける環境を提供いたします。
                </p>
            </section>
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="lock" class="w-5 h-5 text-accent"></i>
                    個人情報の取り扱い
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                    応募フォームなどで提供いただいた情報は、募集に関するサイト運営のためのみに使用し、第三者への提供は一切行いません。
                </p>
            </section>
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="package" class="w-5 h-5 text-accent"></i>
                    投稿内容について
                </h3>
                <ul class="list-disc list-inside text-gray-600 text-sm leading-relaxed space-y-2">
                    <li>掲載される募集情報は、研究機関・大学・実験担当者によって提供された内容に基づいています。</li>
                    <li>サイト運営者は、投稿内容の正確性について保証いたしません。</li>
                </ul>
            </section>
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="gavel" class="w-5 h-5 text-red-500"></i>
                    禁止されているもの
                </h3>
                <ul class="list-disc list-inside text-gray-600 text-sm leading-relaxed space-y-2">
                    <li>虚偽または誤解を招く情報の掲載</li>
                    <li>他者への誹謗中傷、差別的表現</li>
                    <li>営利・勧誘・広告目的の投稿</li>
                </ul>
            </section>
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500"></i>
                    免責事項
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                    当サイトの利用により生じた損害やトラブルについて、運営者は一切の責任を負いません。利用者ご自身の責任において情報をご利用ください。
                </p>
            </section>
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="repeat-2" class="w-5 h-5 text-accent"></i>
                    ポリシーの変更
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                    本ポリシーの内容は、必要に応じて予告なく変更される場合があります。最新の内容は本ページにてご確認ください。
                </p>
            </section>
        </div>
        <div class="mt-10 pt-6 border-t border-gray-100 text-center">
            <a href="#" onclick="history.back(); return false;" class="text-accent hover:underline text-sm font-medium">
                ← 前のページに戻る
            </a>
        </div>
    </div>
    `;
}

function renderRecruit() {
    return `
    <div class="max-w-3xl mx-auto space-y-6">
        <div class="bg-gradient-to-r from-accent to-blue-700 rounded-2xl p-8 text-white text-center shadow-lg">
            <h2 class="text-2xl font-bold mb-4">実験参加者を募集しませんか？</h2>
            <p class="opacity-90 mb-6">研究・実験の参加者募集を無料で掲載できます。</p>
            <a href="${RECRUIT_FORM_URL}" target="_blank" 
               class="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition-transform hover:-translate-y-1">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                掲載フォームへ
            </a>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 class="text-xl font-bold text-primary mb-4 pb-2 border-b">掲載内容に関する規定</h3>
            <div class="space-y-5">
                <section>
                    <h4 class="font-bold text-accent mb-2 text-base flex items-center gap-2">
                        <i data-lucide="package" class="w-4 h-4"></i>掲載可能な内容
                    </h4>
                    <ul class="list-disc list-inside text-sm text-gray-600 space-y-1 pl-4">
                        <li>実験の参加者を**無料**で募集することが可能です。</li>
                        <li>各研究室の参加者募集のリンク（Sonaシステム、ホームページなど）も掲載可能です。</li>
                    </ul>
                </section>
                <hr>
                <section>
                    <h4 class="font-bold text-blue-800 mb-2 text-base flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i>注意事項
                    </h4>
                    <ul class="list-disc list-inside text-sm text-gray-600 space-y-1 pl-4">
                        <li>掲載料金などは一切かかりません。</li>
                        <li>実験・調査内容に**虚偽を含まない**こと。</li>
                        <li>**謝礼の有無は必ず明記**してください。また謝礼がアマゾンギフト券など**現金以外の場合も明記**してください。</li>
                    </ul>
                </section>
                <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 font-medium">
                    <p class="font-bold flex items-center gap-2 mb-1">
                        <i data-lucide="alert-triangle" class="w-4 h-4"></i>免責事項
                    </p>
                    当サイトを通じて行われる参加者募集に関連して生じたいかなる問題についても、当サイトは一切の責任を負いません。あらかじめご承知おきください。
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderContact() {
    return `
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-blue-100 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <i data-lucide="mail" class="w-8 h-8"></i>
        </div>
        <h2 class="text-2xl font-bold text-primary mb-4">お問い合わせ</h2>
        <p class="text-gray-600 mb-6">
            ご質問・ご相談（掲載内容の修正・削除依頼など）がありましたら、<br>
            以下のフォームからご連絡ください。
        </p>
        <a href="${CONTACT_FORM_URL}" target="_blank"
           class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-transform hover:-translate-y-0.5">
            <i data-lucide="send" class="w-5 h-5"></i>
            お問い合わせフォームへ
        </a>
        <p class="text-xs text-gray-400 mt-8">
            ※研究内容自体に関する質問は、各募集の担当者へ直接お問い合わせください。
        </p>
    </div>
    `;
}
function renderFaq() {
    const faqCategories = [
        {
            label: "参加したい方へ",
            icon: "user",
            items: [
               
                {
                    q: "複数の実験に同時に応募しても大丈夫ですか？",
                    a: "基本的には可能ですが、実験によっては「過去に似た実験を受けた人は不可」という制限がある場合があります。各実験の条件をよくご確認ください。"
                },
               
            ]
        },
        {
            label: "掲載したい方へ",
            icon: "clipboard-list",
            items: [
                 {
                    q: "学生個人の実験の掲載はできますか？",
                    a: "はい、掲載可能です。"
                },
                {
                    q: "掲載料は掛かりますか？",
                    a: "いいえ、無料で掲載できます。研究室のリンク（Sonaシステム等）も掲載可能です。"
                },
                {
                    q: "掲載を終了するにはどうすればいいですか？",
                    a: "募集が終了した場合は実験名の前に【募集終了】と表記してください。掲載自体を取りやめたい場合は、お問い合わせフォームより「実験名」と「メールアドレス」、掲載を取りやめる旨をご連絡いただければ、速やかに削除いたします。"
                },
                {
                    q: "写真や資料を掲載することはできますか？",
                    a: "現在、掲示板はテキストベースとなっております。詳細な資料がある場合は、Googleドライブの共有リンクや、研究室HPのURLを詳細欄に記載いただくことを推奨しています。"
                }
            ]
        }
    ];

    const sectionsHtml = faqCategories.map(cat => `
        <section class="mb-10">
            <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-4 px-2">
                <i data-lucide="${cat.icon}" class="w-5 h-5 text-accent"></i>
                ${cat.label}
            </h3>
            <div class="space-y-4">
                ${cat.items.map(item => `
                    <details class="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <summary class="flex items-center justify-between p-5 cursor-pointer list-none focus:outline-none">
                            <span class="text-sm font-bold text-primary flex items-center gap-3">
                                <span class="w-6 h-6 bg-blue-100 text-accent rounded-full flex items-center justify-center text-xs shrink-0">Q</span>
                                ${item.q}
                            </span>
                            <i data-lucide="chevron-down" class="w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180"></i>
                        </summary>
                        <div class="px-5 pb-5 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50/50">
                            <div class="flex gap-3 pt-4">
                                <span class="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs shrink-0 font-bold">A</span>
                                <p>${item.a}</p>
                            </div>
                        </div>
                    </details>
                `).join('')}
            </div>
        </section>
    `).join('');

    return `
    <div class="max-w-3xl mx-auto space-y-6">
        <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-primary mb-2">よくある質問</h2>
            <p class="text-gray-500 text-sm">参加者・掲載者それぞれの疑問にお答えします</p>
        </div>
        
        <div class="faq-sections">
            ${sectionsHtml}
        </div>

        <div class="bg-blue-50 p-8 rounded-2xl border border-blue-100 text-center">
            <h4 class="font-bold text-primary mb-2">解決しない場合はありますか？</h4>
            <p class="text-sm text-gray-600 mb-6">ご質問はフォームより受け付けています。</p>
            <a href="#contact" class="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">
                <i data-lucide="mail" class="w-5 h-5"></i>
                お問い合わせはこちら
            </a>
        </div>
    </div>
    `;
}
