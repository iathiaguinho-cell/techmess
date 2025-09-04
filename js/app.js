/**
 * Techmess ERP - app.js
 * Senior Software Developer: Parceiro de Programacao
 * Description: Core logic for the Techmess ERP & E-commerce SPA.
 * Handles Firebase integration, UI manipulation, and business logic for all modules.
 */

// --- CONFIGURAÇÃO E INICIALIZAÇÃO ---
const firebaseConfig = {
    apiKey: "AIzaSyARb-0QE9QcYD2OjkCsOj0pmKTgkJQRlSg",
    authDomain: "vipcell-gestor.firebaseapp.com",
    projectId: "vipcell-gestor",
    storageBucket: "vipcell-gestor.appspot.com",
    messagingSenderId: "259960306679",
    appId: "1:259960306679:web:ad7a41cd1842862f7f8cf2"
};

const CLOUDINARY_CLOUD_NAME = 'dmuvm1o6m';
const CLOUDINARY_UPLOAD_PRESET = 'poh3ej4m';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
let cart = {};
let products = {};
let suppliers = {};
let currentPurchaseItems = {};
let salesReportData = [];

// --- SELETORES DE ELEMENTOS DO DOM (CACHE) ---
const getElem = (id) => document.getElementById(id);
const querySel = (selector) => document.querySelector(selector);
const querySelAll = (selector) => document.querySelectorAll(selector);

const ui = {
    publicView: getElem('public-view'),
    managementPanel: getElem('management-panel'),
    authButton: getElem('auth-button'),
    nav: {
        home: getElem('nav-home'),
        shop: getElem('nav-shop'),
        cart: getElem('nav-cart'),
        dashboard: getElem('nav-dashboard')
    },
    shop: {
        productList: getElem('product-list')
    },
    cart: {
        modal: getElem('cart-modal'),
        closeButton: getElem('close-cart-modal'),
        items: getElem('cart-items'),
        total: getElem('cart-total'),
        checkoutButton: getElem('checkout-button')
    },
    checkout: {
        modal: getElem('checkout-modal'),
        closeButton: getElem('close-checkout-modal'),
        nameInput: getElem('customer-name'),
        whatsappInput: getElem('customer-whatsapp'),
        submitButton: getElem('submit-checkout')
    },
    erp: {
        tabs: querySelAll('.tab-button'),
        contents: querySelAll('.tab-content'),
        dashboard: {
            content: getElem('dashboard-content'),
            monthlyRevenue: getElem('monthly-revenue'),
            dailySales: getElem('daily-sales'),
            lowStockAlerts: getElem('low-stock-alerts')
        },
        sales: {
            content: getElem('sales-content'),
            pendingOrders: getElem('pending-orders')
        },
        purchases: {
            content: getElem('purchases-content'),
            newButton: getElem('new-purchase-button'),
            list: getElem('purchase-list'),
            modal: getElem('purchase-form-modal'),
            closeModalButton: getElem('close-purchase-form-modal'),
            saveButton: getElem('save-purchase-button'),
            supplierSelect: getElem('purchase-supplier'),
            productSelect: getElem('purchase-product'),
            quantityInput: getElem('purchase-quantity'),
            priceInput: getElem('purchase-unit-price'),
            addItemButton: getElem('add-item-to-purchase-button'),
            itemsList: getElem('purchase-items-list'),
            total: getElem('purchase-total')
        },
        stock: {
            content: getElem('stock-content'),
            addButton: getElem('add-product-button'),
            list: getElem('product-management-list'),
            modal: getElem('product-form-modal'),
            closeModalButton: getElem('close-product-form-modal'),
            saveButton: getElem('save-product-button'),
            title: getElem('product-form-title'),
            idInput: getElem('product-id'),
            nameInput: getElem('product-name'),
            priceInput: getElem('product-price'),
            quantityInput: getElem('product-quantity'),
            descriptionInput: getElem('product-description'),
            alertLevelInput: getElem('product-alert-level'),
            imageUploadInput: getElem('product-image-upload')
        },
        finance: {
            content: getElem('finance-content'),
            transactions: getElem('financial-transactions'),
            cashBalance: getElem('cash-balance'),
            reportStartDate: getElem('report-start-date'),
            reportEndDate: getElem('report-end-date'),
            generateReportBtn: getElem('generate-report-button'),
            exportCsvBtn: getElem('export-csv-button'),
            reportResults: getElem('report-results')
        },
        suppliers: {
            content: getElem('suppliers-content'),
            addButton: getElem('add-supplier-button'),
            list: getElem('supplier-list'),
            modal: getElem('supplier-form-modal'),
            closeModalButton: getElem('close-supplier-form-modal'),
            saveButton: getElem('save-supplier-button'),
            title: getElem('supplier-form-title'),
            idInput: getElem('supplier-id'),
            nameInput: getElem('supplier-name'),
            contactInput: getElem('supplier-contact')
        }
    }
};

// --- FUNÇÕES DE UI ---

/**
 * Alterna a visibilidade entre a vitrine pública e o painel de gestão.
 * @param {string} viewToShow - 'public' ou 'management'.
 */
function switchView(viewToShow) {
    ui.publicView.classList.toggle('hidden', viewToShow !== 'public');
    ui.managementPanel.classList.toggle('hidden', viewToShow !== 'management');
    if (viewToShow === 'management') {
        // Por padrão, mostra o dashboard ao entrar no painel
        switchTab('dashboard');
    }
}

/**
 * Alterna entre as abas do painel de gestão (ERP).
 * @param {string} tabId - O ID da aba a ser exibida (ex: 'dashboard').
 */
function switchTab(tabId) {
    ui.erp.contents.forEach(content => content.classList.add('hidden'));
    getElem(`${tabId}-content`).classList.remove('hidden');

    ui.erp.tabs.forEach(button => {
        button.classList.remove('border-cyan-400');
        button.classList.add('border-transparent');
    });
    querySel(`button[data-tab="${tabId}"]`).classList.add('border-cyan-400');
}

/**
 * Abre ou fecha um modal.
 * @param {HTMLElement} modalElement - O elemento do modal.
 * @param {boolean} show - True para mostrar, false para esconder.
 */
function toggleModal(modalElement, show) {
    modalElement.classList.toggle('hidden', !show);
}

// --- AUTENTICAÇÃO ---

/**
 * Monitora o estado de autenticação do usuário e ajusta a UI.
 */
auth.onAuthStateChanged(user => {
    const isLoggedIn = !!user;
    ui.authButton.textContent = isLoggedIn ? 'Logout' : 'Login';
    ui.nav.dashboard.parentElement.classList.toggle('hidden', !isLoggedIn);
    switchView(isLoggedIn ? 'management' : 'public');
});

/**
 * Lida com o clique no botão de login/logout.
 */
function handleAuthClick() {
    if (auth.currentUser) {
        auth.signOut();
    } else {
        const email = prompt('Digite seu e-mail:');
        const password = prompt('Digite sua senha:');
        if (email && password) {
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => alert('Erro de login: ' + error.message));
        }
    }
}

// --- MÓDULO: VITRINE PÚBLICA (E-COMMERCE) ---

/**
 * Carrega produtos do Firebase e os renderiza na vitrine.
 */
function loadPublicProducts() {
    database.ref('estoque').on('value', snapshot => {
        products = snapshot.val() || {};
        ui.shop.productList.innerHTML = Object.keys(products).length === 0 
            ? '<p>Nenhum produto disponível no momento.</p>'
            : Object.entries(products).map(([id, p]) => `
                <div class="product-card">
                    <img src="${p.imagem || 'https://via.placeholder.com/300'}" alt="${p.nome}">
                    <h3>${p.nome}</h3>
                    <p>${p.descricao}</p>
                    <p class="price">R$ ${p.precoVenda.toFixed(2).replace('.', ',')}</p>
                    ${p.quantidade > 0
                        ? `<button class="add-to-cart-button w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded" data-id="${id}">Adicionar ao Carrinho</button>`
                        : `<p class="out-of-stock">Esgotado</p>`
                    }
                </div>
            `).join('');
    });
}

/**
 * Adiciona um produto ao carrinho.
 * @param {string} productId - ID do produto a ser adicionado.
 */
function addToCart(productId) {
    if (cart[productId]) {
        cart[productId].quantity++;
    } else {
        cart[productId] = { ...products[productId], quantity: 1 };
    }
    updateCartDisplay();
}

/**
 * Remove uma unidade de um produto do carrinho.
 * @param {string} productId - ID do produto a ser removido.
 */
function removeFromCart(productId) {
    if (cart[productId]) {
        cart[productId].quantity--;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
    }
    updateCartDisplay();
}

/**
 * Atualiza a exibição do modal do carrinho.
 */
function updateCartDisplay() {
    let total = 0;
    ui.cart.items.innerHTML = Object.keys(cart).length === 0
        ? '<p>Seu carrinho está vazio.</p>'
        : Object.entries(cart).map(([id, item]) => {
            total += item.quantity * item.precoVenda;
            return `
                <div class="cart-item">
                    <div class="item-info">
                        <h4>${item.nome}</h4>
                        <p>${item.quantity} x R$ ${item.precoVenda.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div class="item-actions">
                        <button data-id="${id}" class="remove-from-cart-button">Remover</button>
                    </div>
                </div>
            `;
        }).join('');
    ui.cart.total.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    ui.cart.checkoutButton.disabled = Object.keys(cart).length === 0;
}

/**
 * Submete o pedido de checkout para o Firebase.
 */
function submitCheckout() {
    const name = ui.checkout.nameInput.value.trim();
    const whatsapp = ui.checkout.whatsappInput.value.trim();

    if (!name || !whatsapp || Object.keys(cart).length === 0) {
        alert('Por favor, preencha todos os campos e adicione itens ao carrinho.');
        return;
    }

    const order = {
        cliente: name,
        whatsapp: whatsapp,
        itens: cart,
        total: Object.values(cart).reduce((sum, item) => sum + item.quantity * item.precoVenda, 0),
        status: 'pendente',
        data: new Date().toISOString()
    };

    database.ref('pedidos').push(order).then(() => {
        alert('Pedido realizado com sucesso!');
        cart = {};
        updateCartDisplay();
        toggleModal(ui.checkout.modal, false);
        ui.checkout.nameInput.value = '';
        ui.checkout.whatsappInput.value = '';
    }).catch(error => alert('Erro ao realizar pedido: ' + error.message));
}

// --- MÓDULO: ESTOQUE (ERP) ---

/**
 * Salva um produto (novo ou editado) no Firebase.
 */
async function saveProduct() {
    const id = ui.erp.stock.idInput.value;
    const name = ui.erp.stock.nameInput.value;
    const price = parseFloat(ui.erp.stock.priceInput.value);
    const quantity = parseInt(ui.erp.stock.quantityInput.value);
    const description = ui.erp.stock.descriptionInput.value;
    const alertLevel = parseInt(ui.erp.stock.alertLevelInput.value);
    const imageFile = ui.erp.stock.imageUploadInput.files[0];

    if (!name || isNaN(price) || isNaN(quantity)) {
        alert('Por favor, preencha nome, preço e quantidade corretamente.');
        return;
    }

    let imageUrl = (id && products[id] && products[id].imagem) || '';
    if (imageFile) {
        try {
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(CLOUDINARY_API_URL, { method: 'POST', body: formData });
            const data = await response.json();
            imageUrl = data.secure_url;
        } catch (error) {
            alert('Erro ao fazer upload da imagem. Tente novamente.');
            return;
        }
    }

    const productData = {
        nome: name,
        nome_lowercase: name.toLowerCase(),
        precoVenda: price,
        quantidade: quantity,
        descricao: description,
        nivelAlertaEstoque: alertLevel,
        imagem: imageUrl
    };

    const dbRef = id ? database.ref('estoque/' + id) : database.ref('estoque').push();
    dbRef.set(productData).then(() => {
        alert(`Produto ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
        toggleModal(ui.erp.stock.modal, false);
    }).catch(error => alert(`Erro ao salvar produto: ${error.message}`));
}

/**
 * Carrega e exibe a lista de produtos no painel de gestão.
 */
function loadStockManagement() {
    database.ref('estoque').on('value', snapshot => {
        products = snapshot.val() || {};
        const tableBody = Object.entries(products).map(([id, p]) => `
            <tr>
                <td><img src="${p.imagem || 'https://via.placeholder.com/50'}" alt="${p.nome}" class="w-12 h-12 object-cover rounded"></td>
                <td>${p.nome}</td>
                <td>R$ ${p.precoVenda.toFixed(2).replace('.', ',')}</td>
                <td>${p.quantidade}</td>
                <td>${p.nivelAlertaEstoque}</td>
                <td>
                    <button class="edit-product-button bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded" data-id="${id}">Editar</button>
                    <button class="delete-product-button bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded ml-2" data-id="${id}">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        ui.erp.stock.list.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr><th>Imagem</th><th>Nome</th><th>Preço Venda</th><th>Qtd.</th><th>Alerta</th><th>Ações</th></tr></thead>
                <tbody>${tableBody}</tbody>
            </table>
        `;
        updateLowStockAlerts();
    });
}


/**
 * Preenche o formulário de produto para edição.
 * @param {string} productId - ID do produto a ser editado.
 */
function openEditProductModal(productId) {
    const p = products[productId];
    if (p) {
        ui.erp.stock.title.textContent = 'Editar Produto';
        ui.erp.stock.idInput.value = productId;
        ui.erp.stock.nameInput.value = p.nome;
        ui.erp.stock.priceInput.value = p.precoVenda;
        ui.erp.stock.quantityInput.value = p.quantidade;
        ui.erp.stock.descriptionInput.value = p.descricao;
        ui.erp.stock.alertLevelInput.value = p.nivelAlertaEstoque;
        toggleModal(ui.erp.stock.modal, true);
    }
}

/**
 * Abre o formulário de produto para adicionar um novo.
 */
function openNewProductModal() {
    ui.erp.stock.title.textContent = 'Adicionar Produto';
    ui.erp.stock.idInput.value = '';
    getElem('product-form-modal').querySelector('form')?.reset(); // Assumindo que está dentro de um form
    ui.erp.stock.nameInput.value = '';
    ui.erp.stock.priceInput.value = '';
    ui.erp.stock.quantityInput.value = '';
    ui.erp.stock.descriptionInput.value = '';
    ui.erp.stock.alertLevelInput.value = '';
    ui.erp.stock.imageUploadInput.value = '';
    toggleModal(ui.erp.stock.modal, true);
}


/**
 * Deleta um produto do Firebase.
 * @param {string} productId - ID do produto a ser deletado.
 */
function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        database.ref('estoque/' + productId).remove()
            .then(() => alert('Produto excluído com sucesso!'))
            .catch(error => alert('Erro ao excluir produto: ' + error.message));
    }
}

// --- MÓDULO: FORNECEDORES (ERP) ---

/**
 * Carrega e exibe a lista de fornecedores.
 */
function loadSupplierManagement() {
    database.ref('fornecedores').on('value', snapshot => {
        suppliers = snapshot.val() || {};
        const tableBody = Object.entries(suppliers).map(([id, s]) => `
            <tr>
                <td>${s.nome}</td>
                <td>${s.contato}</td>
                <td>
                    <button class="edit-supplier-button bg-blue-600 text-white text-xs px-2 py-1 rounded" data-id="${id}">Editar</button>
                    <button class="delete-supplier-button bg-red-600 text-white text-xs px-2 py-1 rounded ml-2" data-id="${id}">Excluir</button>
                </td>
            </tr>
        `).join('');
        ui.erp.suppliers.list.innerHTML = `
            <table>
                <thead><tr><th>Nome</th><th>Contato</th><th>Ações</th></tr></thead>
                <tbody>${tableBody}</tbody>
            </table>
        `;
    });
}

// ... (Funções para salvar, editar e deletar fornecedores são análogas às de produtos)

// --- MÓDULO: COMPRAS (ERP) ---

/**
 * Abre o modal de nova compra e popula os dropdowns.
 */
function openNewPurchaseModal() {
    // Popula fornecedores
    ui.erp.purchases.supplierSelect.innerHTML = Object.entries(suppliers)
        .map(([id, s]) => `<option value="${id}">${s.nome}</option>`).join('');
    // Popula produtos
    ui.erp.purchases.productSelect.innerHTML = Object.entries(products)
        .map(([id, p]) => `<option value="${id}">${p.nome}</option>`).join('');
    
    currentPurchaseItems = {};
    updatePurchaseItemsList();
    toggleModal(ui.erp.purchases.modal, true);
}

/**
 * Adiciona um item à lista da compra atual.
 */
function addItemToPurchase() {
    const productId = ui.erp.purchases.productSelect.value;
    const quantity = parseInt(ui.erp.purchases.quantityInput.value);
    const unitPrice = parseFloat(ui.erp.purchases.priceInput.value);

    if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
        alert("Dados do item inválidos.");
        return;
    }

    currentPurchaseItems[productId] = {
        nome: products[productId].nome,
        quantity,
        unitPrice
    };
    updatePurchaseItemsList();
}

/**
 * Atualiza a exibição da lista de itens e total no modal de compra.
 */
function updatePurchaseItemsList() {
    let total = 0;
    ui.erp.purchases.itemsList.innerHTML = Object.entries(currentPurchaseItems).map(([id, item]) => {
        total += item.quantity * item.unitPrice;
        return `<p>${item.quantity}x ${item.nome} @ R$ ${item.unitPrice.toFixed(2)}</p>`;
    }).join('');
    ui.erp.purchases.total.textContent = `R$ ${total.toFixed(2)}`;
}

/**
 * Salva a nova compra no Firebase.
 */
function savePurchase() {
    const supplierId = ui.erp.purchases.supplierSelect.value;
    if (!supplierId || Object.keys(currentPurchaseItems).length === 0) {
        alert("Selecione um fornecedor e adicione pelo menos um item.");
        return;
    }

    const total = Object.values(currentPurchaseItems).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const purchaseData = {
        fornecedorId: supplierId,
        fornecedorNome: suppliers[supplierId].nome,
        itens: currentPurchaseItems,
        total: total,
        status: 'Aguardando Recebimento',
        data: new Date().toISOString()
    };
    
    database.ref('compras').push(purchaseData).then(() => {
        alert("Compra registrada com sucesso!");
        toggleModal(ui.erp.purchases.modal, false);
    }).catch(e => alert("Erro: " + e.message));
}


// --- MÓDULO: VENDAS (ERP) ---

function loadSales() {
    database.ref('pedidos').orderByChild('status').equalTo('pendente').on('value', (snapshot) => {
        const orders = snapshot.val() || {};
        const tableBody = Object.entries(orders).map(([id, order]) => {
            const itemsList = Object.values(order.itens).map(item => `${item.nome} (${item.quantity})`).join(', ');
            return `
                <tr>
                    <td>${new Date(order.data).toLocaleDateString()}</td>
                    <td>${order.cliente}</td>
                    <td>${order.whatsapp}</td>
                    <td class="text-xs">${itemsList}</td>
                    <td>R$ ${order.total.toFixed(2)}</td>
                    <td>
                        <button class="confirm-sale-button bg-green-600 text-white text-xs px-2 py-1 rounded" data-id="${id}">Confirmar</button>
                        <button class="cancel-order-button bg-red-600 text-white text-xs px-2 py-1 rounded ml-2" data-id="${id}">Cancelar</button>
                    </td>
                </tr>`;
        }).join('');
        
        ui.erp.sales.pendingOrders.innerHTML = Object.keys(orders).length > 0 ? `
            <table class="w-full text-sm">
                <thead><tr><th>Data</th><th>Cliente</th><th>WhatsApp</th><th>Itens</th><th>Total</th><th>Ações</th></tr></thead>
                <tbody>${tableBody}</tbody>
            </table>` : '<p>Nenhum pedido pendente.</p>';
    });
}


// --- MÓDULO: FINANCEIRO (ERP) ---

/**
 * Gera o relatório de vendas com base nas datas selecionadas.
 */
function generateSalesReport() {
    const startDate = ui.erp.finance.reportStartDate.value;
    const endDate = ui.erp.finance.reportEndDate.value;
    if (!startDate || !endDate) {
        alert("Por favor, selecione data de início e fim.");
        return;
    }
    
    const start = new Date(startDate).setHours(0,0,0,0);
    const end = new Date(endDate).setHours(23,59,59,999);

    database.ref('vendas').once('value', snapshot => {
        const allSales = snapshot.val() || {};
        salesReportData = Object.values(allSales).filter(sale => {
            const saleDate = new Date(sale.data).getTime();
            return saleDate >= start && saleDate <= end;
        });

        if (salesReportData.length === 0) {
            ui.erp.finance.reportResults.innerHTML = "<p>Nenhuma venda encontrada para o período.</p>";
            ui.erp.finance.exportCsvBtn.classList.add('hidden');
            return;
        }

        const tableBody = salesReportData.map(sale => {
            const items = Object.values(sale.itens).map(i => `${i.quantity}x ${i.nome}`).join('<br>');
            return `<tr><td>${new Date(sale.data).toLocaleString()}</td><td>${sale.cliente}</td><td>${items}</td><td>R$ ${sale.total.toFixed(2)}</td></tr>`;
        }).join('');

        ui.erp.finance.reportResults.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr><th>Data</th><th>Cliente</th><th>Itens</th><th>Total</th></tr></thead>
                <tbody>${tableBody}</tbody>
            </table>`;
        ui.erp.finance.exportCsvBtn.classList.remove('hidden');
    });
}

/**
 * Exporta os dados do relatório de vendas para um arquivo CSV.
 */
function exportToCSV() {
    if (salesReportData.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Cliente,Produto,Quantidade,Preco Unitario,Total Item\r\n";

    salesReportData.forEach(sale => {
        const saleDate = new Date(sale.data).toLocaleString('pt-BR');
        Object.values(sale.itens).forEach(item => {
            const row = [
                saleDate,
                `"${sale.cliente}"`,
                `"${item.nome}"`,
                item.quantity,
                item.precoVenda.toFixed(2),
                (item.quantity * item.precoVenda).toFixed(2)
            ].join(",");
            csvContent += row + "\r\n";
        });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_vendas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---

/**
 * Anexa todos os event listeners da aplicação.
 */
function attachEventListeners() {
    // Navegação e Autenticação
    ui.authButton.addEventListener('click', handleAuthClick);
    ui.nav.home.addEventListener('click', () => switchView('public'));
    ui.nav.shop.addEventListener('click', () => switchView('public'));
    ui.nav.dashboard.addEventListener('click', () => switchView('management'));

    // Navegação do ERP
    ui.erp.tabs.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Vitrine e Carrinho
    ui.shop.productList.addEventListener('click', e => {
        if (e.target.classList.contains('add-to-cart-button')) {
            addToCart(e.target.dataset.id);
        }
    });
    ui.nav.cart.addEventListener('click', () => toggleModal(ui.cart.modal, true));
    ui.cart.closeButton.addEventListener('click', () => toggleModal(ui.cart.modal, false));
    ui.cart.items.addEventListener('click', e => {
        if (e.target.classList.contains('remove-from-cart-button')) {
            removeFromCart(e.target.dataset.id);
        }
    });

    // Checkout
    ui.cart.checkoutButton.addEventListener('click', () => {
        toggleModal(ui.cart.modal, false);
        toggleModal(ui.checkout.modal, true);
    });
    ui.checkout.closeButton.addEventListener('click', () => toggleModal(ui.checkout.modal, false));
    ui.checkout.submitButton.addEventListener('click', submitCheckout);

    // Módulo Estoque
    ui.erp.stock.addButton.addEventListener('click', openNewProductModal);
    ui.erp.stock.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.stock.modal, false));
    ui.erp.stock.saveButton.addEventListener('click', saveProduct);
    ui.erp.stock.list.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('edit-product-button')) {
            openEditProductModal(target.dataset.id);
        }
        if (target.classList.contains('delete-product-button')) {
            deleteProduct(target.dataset.id);
        }
    });

    // Módulo Compras
    ui.erp.purchases.newButton.addEventListener('click', openNewPurchaseModal);
    ui.erp.purchases.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.purchases.modal, false));
    ui.erp.purchases.addItemButton.addEventListener('click', addItemToPurchase);
    ui.erp.purchases.saveButton.addEventListener('click', savePurchase);
    
    // Módulo Vendas
    ui.erp.sales.pendingOrders.addEventListener('click', async e => {
        const target = e.target;
        const orderId = target.dataset.id;
        if (!orderId) return;

        if (target.classList.contains('confirm-sale-button')) {
            // Lógica de confirmação de venda...
        }
        if (target.classList.contains('cancel-order-button')) {
            // Lógica de cancelamento de pedido...
        }
    });

    // Módulo Financeiro
    ui.erp.finance.generateReportBtn.addEventListener('click', generateSalesReport);
    ui.erp.finance.exportCsvBtn.addEventListener('click', exportToCSV);
}

/**
 * Função principal que inicializa a aplicação.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Garante que todos os modais estejam fechados na inicialização
    querySelAll('.modal-backdrop').forEach(modal => modal.classList.add('hidden'));
    
    // Carrega dados iniciais
    loadPublicProducts();
    loadStockManagement();
    loadSupplierManagement();
    // ... carregar outros dados do ERP
    loadSales();
    
    // Anexa listeners
    attachEventListeners();
});
