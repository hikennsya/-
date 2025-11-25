// script.js

// --- 設定 ---
// GoogleスプレッドシートのCSV URL
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwty1oe-6s7l6GPnMyo-nhQk2vDfnWKsdlzmgdGo1ey7g1QNLusXc_iIbAJYdE8RhLwRnLobvrBvDV/pub?gid=821609257&single=true&output=csv';

// 掲載依頼用のGoogleフォームURL（ダミーです。実際のものに置き換えてください）
const RECRUIT_FORM_URL = 'https://forms.google.com/'; 

// --- ステート管理 ---
let allPosts = [];
let sortOrder = 'newest'; // 'newest' | 'oldest'

// --- ルーティング定義 ---
const routes = {
    '': { 
        label: 'ホーム', 
        icon: 'home', 
        render: renderHome 
    },
    '#policy': { 
        label: '利用ポリシー', 
        icon: 'shield-check', 
        render: renderPolicy 
    },
    '#recruit': { 
        label: '掲載依頼', 
        icon: 'pen-tool', 
        render: renderRecruit 
    },
    '#contact': { 
        label: 'お問い合わせ', 
        icon: 'mail', 
        render: renderContact 
    },
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

// --- ナビゲーション生成 ---
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

    // スマホ用メニュー
    els.mobileNavLinks.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" 
           class="nav-item block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-accent hover:bg-gray-50 flex items-center gap-3"
           data-hash="${item.hash}">
            <i data-lucide="${item.icon}" class="w-5 h-5"></i>
            ${item.label}
        </a>
    `).join('');

    // スマホメニュー開閉
    els.mobileMenuBtn.addEventListener('click', () => {
        els.mobileNav.classList.toggle('hidden');
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
}

// --- ルーティング処理 ---
function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash] || routes['']; // デフォルトはホーム

    updateActiveNav(hash);
    
    // コンテンツ描画
    els.main.innerHTML = route.render();
    
    // アイコン再生成
    lucide.createIcons();
    
    // ページトップへ
    window.scrollTo(0, 0);

    // ホーム画面固有のイベントリスナー設定
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

    // ヘッダーを除去し、オブジェクトに変換
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

// 1. ホーム画面
function renderHome() {
    if (!allPosts.length) return `<div class="text-center py-10 text-gray-500">募集中または読み込み中です...</div>`;

    const sorted = [...allPosts].sort((a, b) => 
        sortOrder === 'newest' ? b.id - a.id : a.id - b.id
    );

    const cardsHtml = sorted.map((post, idx) => {
        // 表示番号
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
                    <option value="oldest" ${sortOrder==='oldest'?'selected':''}>投稿順</option>
                </select>
            </div>

            <div class="grid gap-4">
                ${cardsHtml}
            </div>
        </div>
    `;
}

// ホーム画面用イベント設定
function attachHomeEvents() {
    // ソート変更
    const select = document.getElementById('sort-select');
    if (select) {
        select.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            handleRoute();
        });
    }

    // アコーディオン開閉
    document.querySelectorAll('.post-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const detail = trigger.nextElementSibling;
            const icon = trigger.querySelector('.chevron-icon');
            const label = trigger.querySelector('.toggle-label');
            
            if (detail.style.maxHeight) {
                // 閉じる
                detail.style.maxHeight = null;
                icon.style.transform = 'rotate(0deg)';
                label.textContent = '詳細を見る';
            } else {
                // 開く
                detail.style.maxHeight = detail.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
                label.textContent = '閉じる';
            }
        });
    });
}

// 2. 利用ポリシー画面
function renderPolicy() {
    return `
    <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-primary mb-2">利用ポリシー</h2>
            <p class="text-gray-500 text-sm">安全に研究に参加していただくためのガイドライン</p>
        </div>

        <div class="space-y-8">
            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="check-circle" class="w-5 h-5 text-accent"></i>
                    サイトの目的
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                    当サイトは、大学および研究機関における学術研究（心理学実験、行動観察、アンケート調査など）の被験者募集情報を集約し、研究者と協力者を繋ぐことを目的としています。
                </p>
            </section>

            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-accent"></i>
                    免責事項
                </h3>
                <ul class="list-disc list-inside text-gray-600 text-sm leading-relaxed space-y-2">
                    <li>当サイトは情報の掲載の場を提供するのみであり、実験内容や謝礼の授受に関するトラブルについて一切の責任を負いません。</li>
                    <li>参加申し込みは、各募集の担当者と直接連絡を取って行ってください。</li>
                    <li>掲載内容は投稿者の責任において公開されています。</li>
                </ul>
            </section>

            <section>
                <h3 class="flex items-center gap-2 text-lg font-bold text-primary mb-3 pb-2 border-b border-gray-100">
                    <i data-lucide="shield" class="w-5 h-5 text-accent"></i>
                    個人情報の取り扱い
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                    当サイト自体は閲覧者の個人情報を取得・保存しません。実験参加の際に研究者に提供する個人情報（氏名、連絡先など）は、各研究機関の倫理規定に基づき管理されます。
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

// 3. 掲載依頼画面
function renderRecruit() {
    return `
    <div class="max-w-3xl mx-auto space-y-6">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center shadow-lg">
            <h2 class="text-2xl font-bold mb-4">研究参加者を募集しませんか？</h2>
            <p class="opacity-90 mb-6">大学・研究機関所属の方であれば、どなたでも無料で掲載可能です。</p>
            <a href="${RECRUIT_FORM_URL}" target="_blank" 
               class="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-full font-bold shadow-md hover:bg-gray-100 transition-transform hover:-translate-y-1">
                <i data-lucide="external-link" class="w-4 h-4"></i>
                掲載依頼フォームへ（Google Form）
            </a>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 class="text-lg font-bold text-primary mb-4">掲載条件</h3>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-accent mb-2 text-sm">✅ 掲載できるもの</h4>
                    <ul class="text-sm text-gray-600 space-y-1">
                        <li>大学・公的研究機関の研究</li>
                        <li>倫理審査の承認を得ているもの</li>
                        <li>無償または謝礼ありの実験</li>
                    </ul>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-red-500 mb-2 text-sm">❌ 掲載できないもの</h4>
                    <ul class="text-sm text-gray-600 space-y-1">
                        <li>営利目的のモニター募集</li>
                        <li>治験（医薬品の臨床試験）</li>
                        <li>所属が不明確な個人の調査</li>
                    </ul>
                </div>
            </div>
            
            <div class="mt-6 pt-6 border-t border-gray-100">
                <h3 class="text-lg font-bold text-primary mb-2">掲載の流れ</h3>
                <ol class="list-decimal list-inside text-sm text-gray-600 space-y-2">
                    <li>上記ボタンのGoogleフォームより、実験名・日時・詳細を入力してください。</li>
                    <li>管理人が内容を確認し（通常24時間以内）、問題なければスプレッドシートに反映されます。</li>
                    <li>募集が終了した場合は、お問い合わせフォームより削除依頼を出してください。</li>
                </ol>
            </div>
        </div>
    </div>
    `;
}

// 4. お問い合わせ画面
function renderContact() {
    return `
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-blue-100 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
            <i data-lucide="mail" class="w-8 h-8"></i>
        </div>
        
        <h2 class="text-2xl font-bold text-primary mb-4">お問い合わせ</h2>
        <p class="text-gray-600 mb-8">
            掲載情報の修正・削除依頼、その他サイトに関するお問い合わせは<br>
            以下のSNSのDM（ダイレクトメッセージ）にて受け付けています。
        </p>
        
        <div class="flex flex-col sm:flex-row justify-center gap-4">
            <a href="https://x.com/hikennsya_keiji" target="_blank" 
               class="flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X (Twitter)で連絡
            </a>
            
            <a href="https://www.threads.net/@hikennsya_keijiban" target="_blank"
               class="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-black border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors">
                <span class="font-bold">@</span>
                Threadsで連絡
            </a>
        </div>

        <p class="text-xs text-gray-400 mt-8">
            ※研究内容自体に関する質問は、各募集の担当者へ直接お問い合わせください。
        </p>
    </div>
    `;
}
