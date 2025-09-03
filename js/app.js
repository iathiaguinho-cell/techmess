// =================================================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyARb-0QE9QcYD2OjkCsOj0pmKTgkJQRlSg",
  authDomain: "vipcell-gestor.firebaseapp.com",
  projectId: "vipcell-gestor",
  storageBucket: "vipcell-gestor.appspot.com",
  messagingSenderId: "259960306679",
  appId: "1:259960306679:web:ad7a41cd1842862f7f8cf2"
};

const CLOUDINARY_CLOUD_NAME = "dmuvm1o6m";
const CLOUDINARY_UPLOAD_PRESET = "poh3ej4m";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// =================================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// =================================================================================
let state = {
    user: null,
    inventory: {},
    suppliers: {},
    purchases: {},
    sales: {},
    cashFlow: {},
    cart: JSON.parse(localStorage.getItem('techmessCart')) || [],
    listeners: {} // Para gerenciar os listeners do Firebase
};

// =================================================================================
// HELPERS E FUNÇÕES UTILITÁRIAS
// =================================================================================
const el = (id) => document.getElementById(id);
const render = (elementId, html) => { el(elementId).innerHTML = html; };
const renderModal = (html) => { el('modal-root').innerHTML = html; };
const toggleModal = (modalId, show) => {
    const modal = el(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        setTimeout(() => el('modal-root').innerHTML = '', 300); // Limpa o modal após fechar
    }
};
const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('pt-BR');
const formatCurrency = (value) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;

// =================================================================================
// PONTO DE ENTRADA DA APLICAÇÃO
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            state.user = user;
            initializeAdminPanel();
        } else {
            state.user = null;
            stopAllListeners();
            renderStorefront();
        }
    });
});

// =================================================================================
// RENDERIZAÇÃO DAS TELAS PRINCIPAIS (VITRINE E LOGIN)
// =================================================================================
function renderStorefront() {
    const html = `
        <div id="public-area">
            <header class="bg-black/30 backdrop-blur-lg sticky top-0 z-50 border-b border-cyan-500/20">
                <div class="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div><h1 class="techmess-title text-4xl font-bold tracking-wider">TECHMESS</h1><p class="text-sm text-gray-400">Produtos Apple e eletrônicos</p></div>
                    <button id="public-cart-btn" class="relative text-white p-2 rounded-full hover:bg-gray-700"><i class='bx bxs-cart text-3xl'></i><span id="public-cart-count" class="absolute top-0 right-0 bg-cyan-500 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${state.cart.length > 0 ? '' : 'hidden'}">${state.cart.length}</span></button>
                </div>
            </header>
            <main id="showcase" class="container mx-auto p-6 mt-4">
                <h2 class="text-2xl font-semibold text-white mb-6">Produtos Disponíveis</h2>
                <div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><p class="col-span-full text-center text-gray-500 py-10">Carregando catálogo...</p></div>
            </main>
            <footer class="bg-black text-white py-4 mt-12 border-t border-cyan-500/10">
                <div class="container mx-auto px-6 text-center text-sm"><p class="text-gray-500">&copy; 2025 Techmess. Todos os direitos reservados.</p><button id="admin-login-btn" class="mt-2 text-gray-600 hover:text-cyan-400 text-xs transition-colors">Acesso Restrito</button></div>
            </footer>
        </div>
    `;
    render('app-root', html);
    el('admin-login-btn').addEventListener('click', showAuthModal);
    // Adicionar lógica do carrinho aqui
}

function showAuthModal() {
    const html = `
        <div id="authModal" class="modal-container">
            <div class="modal-content max-w-sm">
                <h2 class="modal-title">Acesso Administrativo</h2>
                <form id="loginForm" class="text-left">
                    <div class="mb-4"><label for="emailInput" class="label">E-mail</label><input type="email" id="emailInput" required class="form-input"></div>
                    <div class="mb-6"><label for="passwordInput" class="label">Senha</label><input type="password" id="passwordInput" required class="form-input"></div>
                    <button type="submit" class="w-full btn-primary bg-cyan-500 text-black">Entrar</button>
                    <p id="loginError" class="text-red-500 text-sm mt-4 text-center h-4"></p>
                </form>
                <button type="button" class="modal-close-btn" onclick="toggleModal('authModal', false)">Fechar</button>
            </div>
        </div>
    `;
    renderModal(html);
    toggleModal('authModal', true);
    el('loginForm').addEventListener('submit', handleLogin);
}

function handleLogin(e) {
    e.preventDefault();
    const loginError = el('loginError');
    loginError.textContent = '';
    auth.signInWithEmailAndPassword(el('emailInput').value, el('passwordInput').value)
        .catch(err => {
            loginError.textContent = 'E-mail ou senha incorretos.';
            console.error(err);
        });
}


// =================================================================================
// PAINEL DE GESTÃO - ARQUITETURA E NAVEGAÇÃO
// =================================================================================
function initializeAdminPanel() {
    const html = `
        <div id="admin-panel">
            <header class="bg-gray-800 shadow-lg">
                <div class="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 class="text-xl font-bold text-white">Painel de Gestão <span class="techmess-title-alt font-semibold">Techmess</span></h1>
                    <div class="flex items-center gap-4">
                        <p id="currentUserName" class="font-semibold text-gray-300 text-sm">${state.user.email}</p>
                        <button id="logoutButton" class="text-sm text-red-500 hover:text-red-400 transition-colors">Sair</button>
                    </div>
                </div>
            </header>
            <main class="container mx-auto p-6">
                <div class="flex border-b border-gray-700 mb-6 overflow-x-auto">
                    <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
                    <button class="tab-btn" data-tab="vendas">Vendas</button>
                    <button class="tab-btn" data-tab="compras">Compras</button>
                    <button class="tab-btn" data-tab="estoque">Estoque</button>
                    <button class="tab-btn" data-tab="financeiro">Financeiro</button>
                    <button class="tab-btn" data-tab="fornecedores">Fornecedores</button>
                </div>
                <div id="tab-content-container"></div>
            </main>
        </div>
    `;
    render('app-root', html);
    el('logoutButton').addEventListener('click', () => auth.signOut());
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelector('.tab-btn.active').classList.remove('active');
            e.target.classList.add('active');
            const renderFunctionName = 'render' + e.target.dataset.tab.charAt(0).toUpperCase() + e.target.dataset.tab.slice(1);
            if(window[renderFunctionName]) window[renderFunctionName]();
        });
    });

    initializeDataListeners();
    renderDashboard();
}

function initializeDataListeners() {
    const refs = {
        inventory: db.ref('estoque'),
        suppliers: db.ref('fornecedores'),
        purchases: db.ref('compras'),
        sales: db.ref('vendas'),
        cashFlow: db.ref('fluxoDeCaixa')
    };

    for (const key in refs) {
        if (state.listeners[key]) refs[key].off('value', state.listeners[key]);
        
        const listener = snapshot => {
            state[key] = snapshot.val() || {};
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            if (activeTab && (activeTab === key || activeTab === 'dashboard')) {
                 const renderFunctionName = 'render' + activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
                 if(window[renderFunctionName]) window[renderFunctionName]();
            }
        };
        refs[key].on('value', listener);
        state.listeners[key] = listener;
    }
}

function stopAllListeners() {
    for (const key in state.listeners) {
        db.ref(key).off('value', state.listeners[key]);
    }
    state.listeners = {};
}


// =================================================================================
// MÓDULOS DO PAINEL DE GESTÃO (Funções de Renderização)
// =================================================================================
function renderDashboard() {
    const html = `
        <div id="dashboard-content">
            <h2 class="text-3xl font-bold text-white mb-6">Dashboard</h2>
            <!-- Conteúdo do Dashboard aqui -->
        </div>`;
    render('tab-content-container', html);
}

function renderVendas() {
    const html = `
        <div id="vendas-content">
            <h2 class="text-3xl font-bold text-white mb-6">Pedidos e Vendas</h2>
            <!-- Conteúdo de Vendas aqui -->
        </div>`;
    render('tab-content-container', html);
}

function renderCompras() {
    const html = `
        <div id="compras-content">
            <h2 class="text-3xl font-bold text-white mb-6">Compras</h2>
            <!-- Conteúdo de Compras aqui -->
        </div>`;
    render('tab-content-container', html);
}

function renderEstoque() {
    const html = `
        <div id="estoque-content">
            <h2 class="text-3xl font-bold text-white mb-6">Estoque</h2>
            <!-- Conteúdo de Estoque aqui -->
        </div>`;
    render('tab-content-container', html);
}

function renderFinanceiro() {
    const html = `
        <div id="financeiro-content">
            <h2 class="text-3xl font-bold text-white mb-6">Financeiro</h2>
            <!-- Conteúdo de Financeiro aqui -->
        </div>`;
    render('tab-content-container', html);
}

function renderFornecedores() {
    const html = `
        <div id="fornecedores-content">
            <h2 class="text-3xl font-bold text-white mb-6">Fornecedores</h2>
            <!-- Conteúdo de Fornecedores aqui -->
        </div>`;
    render('tab-content-container', html);
}
