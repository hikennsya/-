
// Configuration
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwty1oe-6s7l6GPnMyo-nhQk2vDfnWKsdlzmgdGo1ey7g1QNLusXc_iIbAJYdE8RhLwRnLobvrBvDV/pub?gid=821609257&single=true&output=csv';

// State
let allPosts = [];
let sortOrder = 'oldest'; // Default: Oldest first

// DOM Elements
const mainContent = document.getElementById('main-content');
const desktopNav = document.getElementById('desktop-nav');
const mobileNavLinks = document.getElementById('mobile-nav-links');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNav = document.getElementById('mobile-nav');

// --- Routes & Navigation ---
const routes = {
    '': { label: 'ホーム', render: renderHome },
    '#policy': { label: 'ポリシー', render: renderPolicy },
    '#recruit': { label: '掲載依頼', render: renderRecruit },
    '#contact': { label: 'お問い合わせ', render: renderContact },
};

function init() {
    setupNavigation();
    document.getElementById('year').textContent = new Date().getFullYear();
    window.addEventListener('hashchange', handleRoute);
    
    // Initial Route
    handleRoute();

    // Fetch Data immediately
    fetchData();
}

function setupNavigation() {
    const navItems = Object.entries(routes).map(([hash, route]) => ({ hash, label: route.label }));
    
    // Desktop
    desktopNav.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" class="nav-link px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200" data-hash="${item.hash}">
            ${item.label}
        </a>
    `).join('');

    // Mobile
    mobileNavLinks.innerHTML = navItems.map(item => `
        <a href="${item.hash || '#'}" class="nav-link block px-3 py-3 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50" data-hash="${item.hash}">
            ${item.label}
        </a>
    `).join('');

    // Mobile Menu Toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('hidden');
    });
}

function updateActiveNav(hash) {
    const normalizedHash = hash || '';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.hash === normalizedHash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    // Close mobile menu on navigate
    mobileNav.classList.add('hidden');
}

function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash] || routes[''];
    
    updateActiveNav(hash);
    
    // Render content
    if (hash === '' || hash === '#') {
        renderHome(); // Home needs data
    } else {
        mainContent.innerHTML = route.render();
        lucide.createIcons();
    }
    
    window.scrollTo(0, 0);
}

// --- Data Handling ---

async function fetchData() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const rows = parseCSV(text);
        allPosts = transformPosts(rows);
        
        // If currently on home, re-render with data
        if (!window.location.hash || window.location.hash === '#') {
            renderHome();
        }
    } catch (error) {
        console.error('Fetch error:', error);
        if (!window.location.hash || window.location.hash === '#') {
            mainContent.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-700">
                    <h3 class="font-bold">データの取得に失敗しました</h3>
                    <p class="text-sm mt-2">しばらく経ってから再読み込みしてください。</p>
                </div>
            `;
        }
    }
}

// Robust CSV Parser (State Machine)
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                currentVal += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === ',' && !insideQuote) {
            currentRow.push(currentVal);
            currentVal = '';
        } else if ((char === '\n' || char === '\r') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentRow.length > 0 || currentVal) {
                currentRow.push(currentVal);
                rows.push(currentRow);
            }
            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    if (currentRow.length > 0 || currentVal) {
        currentRow.push(currentVal);
        rows.push(currentRow);
    }
    return rows;
}

function transformPosts(rawRows) {
    // Assuming Header is row 0
    const posts = [];
    // Start from index 1 to skip header
    for (let i = 1; i < rawRows.length; i++) {
        const cols = rawRows[i];
        if (cols.length < 3) continue;
        const timestamp = cols[0].trim();
        const title = cols[1].trim();
        const details = cols[2].trim();

        if (title || details) {
            posts.push({ id: i, timestamp, title, details });
        }
    }
    return posts; // Natural order (Oldest first usually in Sheets)
}

// --- Render Functions ---

function renderHome() {
    if (allPosts.length === 0) {
        // Show loading if empty and fetch hasn't failed/completed implies loading
        // But here simpler to just show skeleton or loading div
        return; 
    }

    // Sort
    const sortedPosts = [...allPosts].sort((a, b) => {
        return sortOrder === 'newest' ? b.id - a.id : a.id - b.id;
    });

    const html = `
        <div class="space-y-8">
            <!-- Intro -->
            <section class="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 bg-gradient-to-r from-blue-50 to-white">
                <div class="flex items-start gap-4">
                    <div class="bg-blue-100 p-2 rounded-full hidden sm:block">
                        <i data-lucide="info" class="w-6 h-6 text-accent"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-gray-900 mb-2">このサイトについて</h2>
                        <p class="text-gray-600 leading-relaxed text-sm sm:text-base">
                            被験者募集掲示板へようこそ。ここでは大学の研究や心理学実験への協力者を募集しています。
                            参加の際は必ず<a href="#policy" class="text-accent hover:underline">ポリシー</a>をご確認ください。
                        </p>
                    </div>
                </div>
            </section>

            <!-- Controls -->
            <div class="flex justify-between items-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <p class="text-sm text-gray-500 font-medium">${sortedPosts.length}件の募集</p>
                <div class="flex items-center gap-3">
                    <label for="sort-select" class="text-sm font-medium text-gray-600">並び替え</label>
                    <div class="relative">
                        <select id="sort-select" class="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium hover:border-accent focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm">
                            <option value="oldest" ${sortOrder === 'oldest' ? 'selected' : ''}>投稿順</option>
                            <option value="newest" ${sortOrder === 'newest' ? 'selected' : ''}>新着順</option>
                        </select>
                        <i data-lucide="arrow-up-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"></i>
                    </div>
                </div>
            </div>

            <!-- Posts List -->
            <div class="grid grid-cols-1 gap-6">
                ${sortedPosts.length === 0 ? 
                    `<div class="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <p class="text-gray-500">現在、募集中の実験はありません。</p>
                    </div>` 
                    : sortedPosts.map(post => createPostCard(post, sortOrder === 'newest' ? sortedPosts.length - sortedPosts.indexOf(post) : post.id)).join('')
                }
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
    
    // Re-initialize icons
    lucide.createIcons();

    // Event Listeners for Home
    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortOrder = e.target.value;
        renderHome();
    });

    // Toggle Details logic
    document.querySelectorAll('.post-card-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => toggleDetails(trigger));
    });

    // Close Button logic
    document.querySelectorAll('.close-detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const detail = btn.closest('.post-detail');
            const trigger = detail.previousElementSibling;
            toggleDetails(trigger);
        });
    });
}

function toggleDetails(trigger) {
    const detail = trigger.nextElementSibling;
    const icon = trigger.querySelector('.chevron-icon');
    
    // Calculate the height to slide smoothly
    if (detail.style.maxHeight) {
        // Close
        detail.style.maxHeight = null;
        if (icon) {
            icon.setAttribute('data-lucide', 'chevron-down');
        }
    } else {
        // Open (set to scrollHeight)
        detail.style.maxHeight = detail.scrollHeight + "px";
        if (icon) {
            icon.setAttribute('data-lucide', 'chevron-up');
        }
    }
    
    lucide.createIcons();
}

function createPostCard(post, displayIndex) {
    // Convert newlines to <br> for HTML rendering
    const formattedDetails = post.details.replace(/\n/g, '<br/>');

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md group">
        <!-- Trigger Area -->
        <div class="post-card-trigger p-5 cursor-pointer hover:bg-gray-50 transition-colors relative">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 pr-8">
                <div class="flex items-center space-x-2 text-xs font-semibold text-accent bg-blue-50 px-2 py-1 rounded-md w-fit">
                    <span>#${displayIndex}</span>
                </div>
                <div class="flex items-center text-gray-500 text-sm">
                    <i data-lucide="calendar" class="w-4 h-4 mr-1"></i>
                    ${post.timestamp}
                </div>
            </div>
            
            <h3 class="text-xl font-bold text-gray-800 leading-tight mb-2 flex items-start gap-2 pr-6">
                <i data-lucide="flask-conical" class="w-6 h-6 text-slate-400 flex-shrink-0 mt-0.5"></i>
                ${post.title}
            </h3>

            <!-- Chevron Icon (Down = Closed by default) -->
            <div class="absolute top-5 right-5 text-gray-400 group-hover:text-accent transition-colors">
                 <i data-lucide="chevron-down" class="chevron-icon w-6 h-6"></i>
            </div>
        </div>

        <!-- Detail Area -->
        <div class="post-detail bg-gray-50 border-t border-gray-100">
            <div class="p-6 text-gray-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                <div class="prose prose-blue max-w-none">${formattedDetails}</div>
                <div class="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                    <button class="close-detail-btn text-sm text-gray-500 hover:text-accent font-medium flex items-center gap-1">
                        閉じる <i data-lucide="chevron-up" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

function renderPolicy() {
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-fade-in">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <i data-lucide="shield-check" class="w-8 h-8 text-emerald-500"></i>
            <h1 class="text-2xl font-bold text-gray-900">利用ポリシー</h1>
        </div>
        <div class="prose max-w-none text-gray-700">
            <h3 class="font-bold text-lg text-gray-900 mt-4 mb-2">参加者の方へ</h3>
            <ul class="list-disc pl-5 space-y-2 mb-6">
                <li>掲載されている実験・調査は、各研究者の責任において実施されます。</li>
                <li>参加に際して生じたトラブルについて、当掲示板運営は一切の責任を負いかねます。</li>
                <li>実験内容や謝礼に関する不明点は、必ず記載されている連絡先へ直接お問い合わせください。</li>
            </ul>
            <h3 class="font-bold text-lg text-gray-900 mt-4 mb-2">研究者の方へ</h3>
            <ul class="list-disc pl-5 space-y-2 mb-6">
                <li>所属機関の倫理審査承認を得た研究のみ掲載可能です。</li>
                <li>虚偽の内容や公序良俗に反する内容の掲載は禁止します。</li>
            </ul>
        </div>
    </div>`;
}

function renderRecruit() {
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-fade-in">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <i data-lucide="file-text" class="w-8 h-8 text-accent"></i>
            <h1 class="text-2xl font-bold text-gray-900">掲載依頼について</h1>
        </div>
        <div class="text-gray-700">
            <p class="mb-4">研究者様は、以下の情報をフォームより送信してください。</p>
            <div class="bg-blue-50 p-5 rounded-lg border border-blue-100 my-6">
                <h3 class="font-bold text-blue-900 mb-3">掲載に必要な情報</h3>
                <ul class="list-disc pl-5 space-y-1 text-blue-800 text-sm">
                    <li>研究名、所属機関</li>
                    <li>実施責任者、連絡先</li>
                    <li>実験概要、謝礼、倫理審査情報</li>
                </ul>
            </div>
            <div class="text-center mt-8">
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSe9ct1JVa42u4tWHIqFQJegyq1s2b2rjiSpc84EBqq65QkLug/viewform" target="_blank" class="inline-block bg-accent hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:-translate-y-0.5">
                    掲載依頼フォーム
                </a>
            </div>
        </div>
    </div>`;
}

function renderContact() {
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-fade-in">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <i data-lucide="mail" class="w-8 h-8 text-indigo-500"></i>
            <h1 class="text-2xl font-bold text-gray-900">お問い合わせ</h1>
        </div>
        <div class="text-gray-700">
            <p class="mb-6">当サイトに関するご意見・ご質問は、以下のフォームよりご連絡ください。</p>
            
            <div class="text-center mb-10">
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSexVAhliA-a_VG2fiyEZZUGmuBVKxXgtmdIdciqKai-Ki0ssg/viewform?usp=dialog" target="_blank" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-all hover:-translate-y-1">
                    <i data-lucide="send" class="w-5 h-5"></i> お問い合わせフォーム
                </a>
            </div>
        </div>
    </div>`;
}

// Start app
document.addEventListener('DOMContentLoaded', init);
