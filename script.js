// script.js

// --- 設定 ---
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwty1oe-6s7l6GPnMyo-nhQk2vDfnWKsdlzmgdGo1ey7g1QNLusXc_iIbAJYdE8RhLwRnLobvrBvDV/pub?gid=821609257&single=true&output=csv';
const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSexVAhliA-a_VG2fiyEZZUGmuBVKxXgtmdIdciqKai-Ki0ssg/viewform?usp=dialog'; 
const RECRUIT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe9ct1JVa42u4tWHIqFQJegyq1s2b2rjiSpc84EBqq65QkLug/viewform'; 

// --- ステート管理 ---
let allPosts = [];
let sortOrder = 'newest';

// --- ルーティング定義 ---
const routes = {
    '': { label: 'ホーム', icon: 'home', render: renderHome },
    '#policy': { label: '利用ポリシー', icon: 'shield-check', render: renderPolicy },
    '#recruit': { label: '掲載依頼', icon: 'pen-tool', render: renderRecruit },
    '#contact': { label: 'お問い合わせ', icon: 'mail', render: renderContact },
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
    const navItems = Object.entries(routes).map(([hash, route]) => ({ hash, ...route }));

    // PC用メニュー
    els.desktopNav.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" 
           class="nav-item px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-accent hover:bg-blue-50 transition-all flex items-center gap-2"
           data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-4 h-4"></i>
            ${item.label}
        </a>
    `).join('');

    // スマホ用メニューリンク
    els.mobileNavLinks.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" 
           class="nav-item block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 flex items-center gap-3"
           data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
            ${item.label}
        </a>
    `).join('');

    // 【修正箇所: スマホメニュー開閉のロジック】
    // 重複登録を防ぐため、一度cloneNodeを使って既存のリスナーを削除するか、
    // ここで確実に1回だけ実行されるようにしています。
    els.mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // バブリング防止（念のため）
        
        // 1. メニューの表示/非表示を切り替える
        els.mobileNav.classList.toggle('hidden');

        // 2. アイコンを切り替える (メニュー <-> X)
        // Lucideが<i>タグを<svg>に変換してしまうため、コンテナ内の最初の要素（svgまたはi）を取得
        const iconElement = els.mobileMenuBtn.firstElementChild;
        
        // 現在の状態を確認
        const isHidden = els.mobileNav.classList.contains('hidden');

        // 新しいアイコンを設定するための<i>タグを再生成して置き換える
        // (Lucideは既存のSVGの属性変更よりも、新しいタグを変換させる方が確実なため)
        const newIconName = isHidden ? 'menu' : 'x';
        
        // ボタンの中身をリセットして新しいiタグを入れる
        els.mobileMenuBtn.innerHTML = `<i data-lucide="${newIconName}" class="w-6 h-6 text-gray-600"></i>`;

        // 3. アイコン再描画
        lucide.createIcons();
    });

    // メニュー外クリックで閉じる処理（UX向上）
    document.addEventListener('click', (e) => {
        if (!els.mobileNav.classList.contains('hidden') && 
            !els.mobileNav.contains(e.target) && 
            !els.mobileMenuBtn.contains(e.target)) {
            
            els.mobileNav.classList.add('hidden');
            els.mobileMenuBtn.innerHTML = `<i data-lucide="menu" class="w-6 h-6 text-gray-600"></i>`;
            lucide.createIcons();
        }
    });

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
    if (!allPosts.length) return `<div class="text-center py-10 text-gray-500">募集中または読み込み中です...</div>`;

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
                    このサイト「被験者募集掲示板」は、研究や実験などへの参加希望者を募集する目的で運営されています。以下の方針に従い、利用者の皆さまが安心してご利用いただける環境を提供いたします。
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
            <h2 class="text-2xl font-bold mb-4">実験被験者を募集しませんか？</h2>
            <p class="opacity-90 mb-6">研究・実験の被験者募集を無料で掲載できます。</p>
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
                        <li>実験の被験者を**無料**で募集することが可能です。</li>
                        <li>各研究室の参加者募集のリンク（Sonaシステム、ホームページなど）も掲載可能です。</li>
                    </ul>
                </section>
                <hr>
                <section>
                    <h4 class="font-bold text-blue-800 mb-2 text-base flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i>予防・注意事項
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
