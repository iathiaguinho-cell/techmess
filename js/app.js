document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // 1. CONFIGURAÇÕES E INICIALIZAÇÃO
    // =================================================================================

    // Configurações do Firebase (substitua com suas chaves reais)
    const firebaseConfig = {
        apiKey: "AIzaSyARb-0QE9QcYD2OjkCsOj0pmKTgkJQRlSg",
        authDomain: "vipcell-gestor.firebaseapp.com",
        projectId: "vipcell-gestor",
        databaseURL: "https://vipcell-gestor-default-rtdb.firebaseio.com", // Adicionado para clareza
        storageBucket: "vipcell-gestor.appspot.com",
        messagingSenderId: "259960306679",
        appId: "1:259960306679:web:ad7a41cd1842862f7f8cf2"
    };

    // Configurações do Cloudinary
    const cloudinaryConfig = {
        cloudName: "dmuvm1o6m",
        uploadPreset: "poh3ej4m"
    };

    // Inicializa o Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.database();

    // =================================================================================
    // 2. ESTADO DA APLICAÇÃO E ELEMENTOS DO DOM
    // =================================================================================

    const appContainer = document.getElementById('app-container');
    const modalContainer = document.getElementById('modal-container');
    let cart = []; // Carrinho de compras da vitrine

    // =================================================================================
    // 3. AUTENTICAÇÃO
    // =================================================================================

    // Observador do estado de autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            // Usuário está logado, renderiza o painel de gestão
            renderAdminPanel();
        } else {
            // Usuário não está logado, decide entre vitrine e login
            // Por padrão, vamos para a vitrine. O acesso ao admin redirecionará para o login.
            renderStorefront();
        }
    });

    // Função de Login
    const handleLogin = (email, password) => {
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => {
                console.error("Erro de login:", error);
                alert(`Falha no login: ${error.message}`);
            });
    };

    // Função de Logout
    const handleLogout = () => {
        auth.signOut();
    };

    // =================================================================================
    // 4. LÓGICA DE RENDERIZAÇÃO DA UI (TELAS PRINCIPAIS)
    // =================================================================================

    // Renderiza a tela de Login
    const renderLoginScreen = () => {
        appContainer.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-900">
                <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h1 class="text-3xl font-bold text-center text-cyan-400 mb-6">Techmess</h1>
                    <h2 class="text-xl font-semibold text-center text-gray-300 mb-8">Acesso ao Painel de Gestão</h2>
                    <form id="login-form">
                        <div class="mb-4">
                            <label for="email" class="block text-gray-400 mb-2">Email</label>
                            <input type="email" id="email" class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition">
                        </div>
                        <div class="mb-6">
                            <label for="password" class="block text-gray-400 mb-2">Senha</label>
                            <input type="password" id="password" class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition">
                        </div>
                        <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-md transition duration-300">Entrar</button>
                    </form>
                    <p class="text-center mt-4"><a href="#" id="back-to-store" class="text-cyan-400 hover:underline">Voltar para a Loja</a></p>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password);
        });
        
        document.getElementById('back-to-store').addEventListener('click', e => {
            e.preventDefault();
            renderStorefront();
        });
    };

    // Renderiza a Vitrine Pública (E-commerce)
    const renderStorefront = () => {
        appContainer.innerHTML = `
            <header class="bg-gray-800 shadow-md sticky top-0 z-40">
                <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-cyan-400">Techmess</h1>
                    <div>
                        <button id="cart-button" class="relative text-gray-300 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span id="cart-count" class="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">${cart.length}</span>
                        </button>
                        <button id="admin-login-button" class="ml-4 text-gray-300 hover:text-white text-sm">Admin</button>
                    </div>
                </nav>
            </header>
            <main class="container mx-auto px-6 py-8">
                <h2 class="text-3xl font-bold text-gray-100 mb-8">Nossos Produtos</h2>
                <div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    <!-- Produtos serão carregados aqui -->
                    <p>Carregando produtos...</p>
                </div>
            </main>
        `;

        // Carrega e exibe os produtos
        const productsRef = db.ref('estoque');
        productsRef.on('value', snapshot => {
            const products = snapshot.val();
            const productGrid = document.getElementById('product-grid');
            productGrid.innerHTML = '';
            if (products) {
                Object.keys(products).forEach(key => {
                    const product = products[key];
                    const isOutOfStock = product.quantidade <= 0;
                    const productCard = document.createElement('div');
                    productCard.className = `bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 ${isOutOfStock ? 'opacity-50' : ''}`;
                    productCard.innerHTML = `
                        <img class="w-full h-48 object-cover" src="${product.imagemUrl || 'https://via.placeholder.com/300'}" alt="${product.nome}">
                        <div class="p-4">
                            <h3 class="text-lg font-semibold text-gray-100">${product.nome}</h3>
                            <p class="text-gray-400 mt-1 h-10 overflow-hidden">${product.descricao || ''}</p>
                            <div class="flex justify-between items-center mt-4">
                                <span class="text-xl font-bold text-cyan-400">R$ ${parseFloat(product.preco).toFixed(2)}</span>
                                ${isOutOfStock 
                                    ? '<span class="text-red-500 font-semibold">Esgotado</span>'
                                    : `<button data-id="${key}" class="add-to-cart-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition">Adicionar</button>`
                                }
                            </div>
                        </div>
                    `;
                    productGrid.appendChild(productCard);
                });
            } else {
                productGrid.innerHTML = '<p class="col-span-full text-center">Nenhum produto encontrado.</p>';
            }
        });
        
        // Event Listeners da Vitrine
        document.getElementById('cart-button').addEventListener('click', showCartModal);
        document.getElementById('admin-login-button').addEventListener('click', renderLoginScreen);
        appContainer.addEventListener('click', e => {
            if (e.target && e.target.classList.contains('add-to-cart-btn')) {
                const productId = e.target.dataset.id;
                addToCart(productId);
            }
        });
    };

    // Renderiza o Painel de Administração
    const renderAdminPanel = (activeTab = 'dashboard') => {
        appContainer.innerHTML = `
            <div class="flex h-screen bg-gray-900">
                <!-- Sidebar -->
                <aside class="w-64 bg-gray-800 text-gray-200 flex flex-col">
                    <div class="h-16 flex items-center justify-center border-b border-gray-700">
                        <h1 class="text-2xl font-bold text-cyan-400">Techmess ERP</h1>
                    </div>
                    <nav id="admin-nav" class="flex-1 p-4 space-y-2">
                        <a href="#" data-tab="dashboard" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Dashboard</a>
                        <a href="#" data-tab="vendas" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Vendas</a>
                        <a href="#" data-tab="compras" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Compras</a>
                        <a href="#" data-tab="estoque" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Estoque</a>
                        <a href="#" data-tab="financeiro" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Financeiro</a>
                        <a href="#" data-tab="fornecedores" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Fornecedores</a>
                    </nav>
                    <div class="p-4 border-t border-gray-700">
                        <button id="logout-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Sair</button>
                    </div>
                </aside>

                <!-- Main Content -->
                <main id="admin-content" class="flex-1 p-8 overflow-y-auto">
                    <!-- Conteúdo da aba será carregado aqui -->
                </main>
            </div>
        `;

        // Destaca a aba ativa
        document.querySelector(`#admin-nav a[data-tab="${activeTab}"]`).classList.add('bg-cyan-600', 'text-white');

        // Carrega o conteúdo da aba
        renderAdminTab(activeTab);

        // Event Listeners do Painel
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('admin-nav').addEventListener('click', e => {
            e.preventDefault();
            if (e.target.tagName === 'A') {
                const tab = e.target.dataset.tab;
                renderAdminPanel(tab);
            }
        });
    };
    
    // Renderiza o conteúdo de uma aba específica do painel
    const renderAdminTab = (tab) => {
        const contentArea = document.getElementById('admin-content');
        if (!contentArea) return;

        switch (tab) {
            case 'dashboard':
                renderDashboard(contentArea);
                break;
            case 'vendas':
                renderVendas(contentArea);
                break;
            case 'compras':
                renderCompras(contentArea);
                break;
            case 'estoque':
                renderEstoque(contentArea);
                break;
            case 'financeiro':
                renderFinanceiro(contentArea);
                break;
            case 'fornecedores':
                renderFornecedores(contentArea);
                break;
            default:
                contentArea.innerHTML = `<h1 class="text-2xl font-bold">Página não encontrada</h1>`;
        }
    };

    // =================================================================================
    // 5. LÓGICA DE NEGÓCIOS E RENDERIZAÇÃO DE ABAS DO ADMIN
    // =================================================================================

    // --- MÓDULO DE DASHBOARD ---
    const renderDashboard = (container) => {
        container.innerHTML = `<h1 class="text-3xl font-bold text-gray-100 mb-8">Dashboard</h1>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <!-- KPIs -->
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 class="text-gray-400 text-sm font-medium">Faturamento do Mês</h3>
                    <p id="kpi-faturamento" class="text-3xl font-bold text-cyan-400 mt-2">R$ 0,00</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 class="text-gray-400 text-sm font-medium">Vendas do Dia</h3>
                    <p id="kpi-vendas-dia" class="text-3xl font-bold text-cyan-400 mt-2">0</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 class="text-gray-400 text-sm font-medium">Ticket Médio</h3>
                    <p id="kpi-ticket-medio" class="text-3xl font-bold text-cyan-400 mt-2">R$ 0,00</p>
                </div>
            </div>
            <!-- Alertas de Estoque Baixo -->
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-semibold mb-4">Alertas de Estoque Baixo</h3>
                <div id="alertas-estoque-baixo">
                    <p>Carregando alertas...</p>
                </div>
            </div>
        `;
        // Lógica para carregar os dados do dashboard
        // (Esta parte requer agregação de dados e seria complexa. Implementação simplificada)
        db.ref('vendas').on('value', snap => {
            const vendas = snap.val() || {};
            let faturamentoMes = 0;
            let vendasHoje = 0;
            const hoje = new Date().toISOString().slice(0, 10);
            const mesAtual = new Date().getMonth();
            const anoAtual = new Date().getFullYear();

            Object.values(vendas).forEach(venda => {
                const dataVenda = new Date(venda.data);
                if (dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual && venda.status === 'Confirmada') {
                    faturamentoMes += venda.total;
                }
                if (venda.data.startsWith(hoje) && venda.status === 'Confirmada') {
                    vendasHoje++;
                }
            });
            
            const totalVendasConfirmadas = Object.values(vendas).filter(v => v.status === 'Confirmada').length;
            const ticketMedio = totalVendasConfirmadas > 0 ? faturamentoMes / totalVendasConfirmadas : 0;

            document.getElementById('kpi-faturamento').textContent = `R$ ${faturamentoMes.toFixed(2)}`;
            document.getElementById('kpi-vendas-dia').textContent = vendasHoje;
            document.getElementById('kpi-ticket-medio').textContent = `R$ ${ticketMedio.toFixed(2)}`;
        });

        db.ref('estoque').on('value', snap => {
            const estoque = snap.val() || {};
            const alertasContainer = document.getElementById('alertas-estoque-baixo');
            alertasContainer.innerHTML = '';
            const alertas = Object.values(estoque).filter(p => p.quantidade <= p.nivelAlerta);
            if (alertas.length > 0) {
                alertas.forEach(p => {
                    alertasContainer.innerHTML += `<p class="text-yellow-400">- ${p.nome}: ${p.quantidade} em estoque (alerta: ${p.nivelAlerta})</p>`;
                });
            } else {
                alertasContainer.innerHTML = '<p class="text-gray-400">Nenhum alerta de estoque.</p>';
            }
        });
    };

    // --- MÓDULO DE ESTOQUE ---
    const renderEstoque = (container) => {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-gray-100">Gestão de Estoque</h1>
                <button id="add-product-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">Adicionar Produto</button>
            </div>
            <div class="bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
                <table class="w-full text-left">
                    <thead class="bg-gray-700">
                        <tr>
                            <th class="p-4">Produto</th>
                            <th class="p-4">Preço</th>
                            <th class="p-4">Qtd.</th>
                            <th class="p-4">Nível Alerta</th>
                            <th class="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="stock-table-body">
                        <tr><td colspan="5" class="p-4 text-center">Carregando produtos...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        const stockTableBody = document.getElementById('stock-table-body');
        db.ref('estoque').on('value', snapshot => {
            const products = snapshot.val();
            stockTableBody.innerHTML = '';
            if (products) {
                Object.keys(products).forEach(key => {
                    const product = products[key];
                    const row = document.createElement('tr');
                    row.className = 'border-b border-gray-700';
                    row.innerHTML = `
                        <td class="p-4">${product.nome}</td>
                        <td class="p-4">R$ ${parseFloat(product.preco).toFixed(2)}</td>
                        <td class="p-4">${product.quantidade}</td>
                        <td class="p-4">${product.nivelAlerta}</td>
                        <td class="p-4">
                            <button data-id="${key}" class="view-product-btn text-blue-400 hover:underline mr-2">Ver</button>
                            <button data-id="${key}" class="edit-product-btn text-yellow-400 hover:underline mr-2">Editar</button>
                            <button data-id="${key}" class="delete-product-btn text-red-500 hover:underline">Excluir</button>
                        </td>
                    `;
                    stockTableBody.appendChild(row);
                });
            } else {
                stockTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Nenhum produto cadastrado.</td></tr>`;
            }
        });

        document.getElementById('add-product-btn').addEventListener('click', () => showProductModal());
        container.addEventListener('click', e => {
            const target = e.target;
            const productId = target.dataset.id;
            if (target.classList.contains('edit-product-btn')) {
                showProductModal(productId);
            }
            if (target.classList.contains('delete-product-btn')) {
                if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
                    db.ref(`estoque/${productId}`).remove();
                }
            }
            if (target.classList.contains('view-product-btn')) {
                showKardexModal(productId);
            }
        });
    };
    
    // --- MÓDULO DE VENDAS ---
    const renderVendas = (container) => {
        container.innerHTML = `
            <h1 class="text-3xl font-bold text-gray-100 mb-8">Gestão de Vendas</h1>
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <h3 class="text-xl font-semibold mb-4">Pedidos Pendentes</h3>
                <div id="pedidos-pendentes-container" class="overflow-x-auto">
                    <p>Carregando pedidos...</p>
                </div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 class="text-xl font-semibold mb-4">Relatório de Vendas</h3>
                <!-- Filtros e botão de exportar -->
                <button id="export-csv-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4">Exportar para CSV</button>
                <div id="relatorio-vendas-container" class="overflow-x-auto"></div>
            </div>
        `;

        // Carregar Pedidos Pendentes
        db.ref('pedidos').orderByChild('status').equalTo('Pendente').on('value', snap => {
            const pedidos = snap.val() || {};
            const container = document.getElementById('pedidos-pendentes-container');
            container.innerHTML = '';
            if (Object.keys(pedidos).length === 0) {
                container.innerHTML = '<p class="text-gray-400">Nenhum pedido pendente.</p>';
                return;
            }
            const table = document.createElement('table');
            table.className = 'w-full text-left';
            table.innerHTML = `<thead class="bg-gray-700"><tr><th class="p-3">Cliente</th><th class="p-3">WhatsApp</th><th class="p-3">Total</th><th class="p-3">Ações</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            Object.keys(pedidos).forEach(key => {
                const pedido = pedidos[key];
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700';
                row.innerHTML = `
                    <td class="p-3">${pedido.nome}</td>
                    <td class="p-3">${pedido.whatsapp}</td>
                    <td class="p-3">R$ ${pedido.total.toFixed(2)}</td>
                    <td class="p-3">
                        <button data-id="${key}" class="confirm-sale-btn bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm">Confirmar</button>
                        <button data-id="${key}" class="cancel-sale-btn bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm ml-2">Cancelar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            container.appendChild(table);
        });
        
        // Carregar Relatório de Vendas
        db.ref('vendas').on('value', snap => {
            const vendas = snap.val() || {};
            const container = document.getElementById('relatorio-vendas-container');
            container.innerHTML = '';
            const table = document.createElement('table');
            table.className = 'w-full text-left';
            table.innerHTML = `<thead class="bg-gray-700"><tr><th class="p-3">Data</th><th class="p-3">Cliente</th><th class="p-3">Total</th><th class="p-3">Status</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            Object.values(vendas).sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(venda => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-700';
                row.innerHTML = `
                    <td class="p-3">${new Date(venda.data).toLocaleString()}</td>
                    <td class="p-3">${venda.clienteNome}</td>
                    <td class="p-3">R$ ${venda.total.toFixed(2)}</td>
                    <td class="p-3"><span class="${venda.status === 'Confirmada' ? 'text-green-400' : 'text-red-400'}">${venda.status}</span></td>
                `;
                tbody.appendChild(row);
            });
            container.appendChild(table);
        });

        container.addEventListener('click', e => {
            const target = e.target;
            const pedidoId = target.dataset.id;
            if (target.classList.contains('confirm-sale-btn')) {
                confirmSale(pedidoId);
            }
            if (target.classList.contains('cancel-sale-btn')) {
                cancelSale(pedidoId);
            }
        });
        
        document.getElementById('export-csv-btn').addEventListener('click', exportVendasToCSV);
    };
    
    // --- Lógica de Confirmação e Cancelamento de Venda ---
    const confirmSale = async (pedidoId) => {
        const pedidoRef = db.ref(`pedidos/${pedidoId}`);
        const pedidoSnap = await pedido
