// CONFIGURAÇÃO DO FIREBASE (DADOS REAIS)
const firebaseConfig = {
  apiKey: "AIzaSyARb-0QE9QcYD2OjkCsOj0pmKTgkJQRlSg",
  authDomain: "vipcell-gestor.firebaseapp.com",
  projectId: "vipcell-gestor",
  storageBucket: "vipcell-gestor.appspot.com",
  messagingSenderId: "259960306679",
  appId: "1:259960306679:web:ad7a41cd1842862f7f8cf2"
};

// CONFIGURAÇÃO DO CLOUDINARY (DADOS REAIS)
const CLOUDINARY_CLOUD_NAME = "dmuvm1o6m";
const CLOUDINARY_UPLOAD_PRESET = "poh3ej4m";

// INICIALIZAÇÃO DO SISTEMA
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Variáveis Globais
let fullInventory = {}, publicCart = [], salesDataCache = [], editingProductId = null;

// ======================= RENDERIZAÇÃO DE COMPONENTES E MÓDULOS =======================
const render = (element, html) => { document.getElementById(element).innerHTML = html; };
const renderModal = (html) => { document.getElementById('modal-container').innerHTML = html; };

// ======================= LÓGICA DE AUTENTICAÇÃO E INICIALIZAÇÃO =======================
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('public-area').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            document.getElementById('currentUserName').textContent = user.email;
            initializeAdminPanel();
        } else {
            document.getElementById('public-area').style.display = 'block';
            document.getElementById('app').style.display = 'none';
        }
    });
    document.getElementById('admin-login-btn').addEventListener('click', () => {
        renderModal(authModalTemplate());
        toggleModal('authModal', true);
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    });
    document.getElementById('logoutButton').addEventListener('click', () => auth.signOut());
    displayProducts();
});

function handleLogin(e) { /* ... Lógica de login ... */ }
function toggleModal(modalId, show) { /* ... Lógica de abrir/fechar modal ... */ }

// ======================= PAINEL DE GESTÃO - LÓGICA PRINCIPAL =======================
function initializeAdminPanel() {
    setupTabNavigation();
    renderDashboard(); // Carrega o dashboard como tela inicial
    // Inicializa os listeners de dados em background
    listenToSales();
    listenToInventory();
    // ... outros listeners
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.tab-btn.active').classList.remove('active');
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
            
            // Carrega o conteúdo da aba selecionada
            switch(tab.dataset.tab) {
                case 'dashboard': renderDashboard(); break;
                case 'pedidos': renderPedidos(); break;
                case 'estoque': renderEstoque(); break;
                case 'compras': renderCompras(); break;
                case 'financeiro': renderFinanceiro(); break;
                case 'relatorios': renderRelatorios(); break;
            }
        });
    });
}


// ======================= MÓDULO DASHBOARD =======================
function renderDashboard() {
    const html = `
        <h2 class="text-3xl font-bold text-white mb-6">Dashboard</h2>
        <div id="kpi-grid" class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <!-- KPIs serão carregados aqui -->
        </div>
        <div class="mt-8">
            <h3 class="text-xl font-semibold text-white mb-4">Alertas de Estoque Baixo</h3>
            <div id="dashboard-alerts" class="bg-gray-800 p-4 rounded-lg"></div>
        </div>
    `;
    render('dashboard', html);
    // Chamar função para carregar dados do dashboard
}

// ======================= MÓDULO PEDIDOS =======================
function renderPedidos() {
    const html = `<h2 class="text-3xl font-bold text-white mb-6">Pedidos Pendentes</h2><div id="orders-list" class="space-y-4"></div>`;
    render('pedidos', html);
    // Chamar função para carregar pedidos
}

// ... E assim por diante para cada módulo (Estoque, Compras, Financeiro, Relatórios)

// ======================= TEMPLATES HTML (Gerados via JS) =======================
// Manter o HTML fora da lógica principal torna o código mais limpo.
const authModalTemplate = () => `
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
// ... Outros templates de modal (produto, checkout, etc.)


// ======================= VITRINE PÚBLICA E CARRINHO =======================
function displayProducts() { /* ... Lógica para mostrar produtos ... */ }
function addToPublicCart(productId) { /* ... Lógica para adicionar ao carrinho ... */ }
// ... Outras funções da vitrine

// Funções globais necessárias
window.toggleModal = toggleModal; // Torna a função acessível no HTML
// ... Outras funções globais
