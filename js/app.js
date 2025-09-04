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
let isErpInitialized = false; // Flag para garantir que o painel seja inicializado apenas uma vez

// --- SELETORES DE ELEMENTOS DO DOM (CACHE) ---
const getElem = (id) => document.getElementById(id);
const querySel = (selector) => document.querySelector(selector);
const querySelAll = (selector) => document.querySelectorAll(selector);

// Objeto 'ui' para centralizar a referência aos elementos da interface
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

function switchView(viewToShow) {
    ui.publicView.classList.toggle('hidden', viewToShow !== 'public');
    ui.managementPanel.classList.toggle('hidden', viewToShow !== 'management');
    if (viewToShow === 'management') {
        switchTab('dashboard');
    }
}

function switchTab(tabId) {
    ui.erp.contents.forEach(content => content.classList.add('hidden'));
    getElem(`${tabId}-content`).classList.remove('hidden');

    ui.erp.tabs.forEach(button => {
        button.classList.remove('border-cyan-400', 'text-white');
        button.classList.add('border-transparent', 'text-gray-300');
    });
    const activeButton = querySel(`button[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('border-cyan-400', 'text-white');
    }
}

function toggleModal(modalElement, show) {
    modalElement.classList.toggle('hidden', !show);
}

// --- AUTENTICAÇÃO E INICIALIZAÇÃO DO PAINEL ---

/**
 * Função dedicada a carregar todos os dados necessários para o painel de gestão.
 */
function initializeErpPanel() {
    console.log("Inicializando dados do Painel de Gestão...");
    loadStockManagement();
    loadSupplierManagement();
    loadPurchases();
    loadSales();
    loadFinance();
    calculateDailySalesAndMonthlyRevenue();
}

auth.onAuthStateChanged(user => {
    const isLoggedIn = !!user;
    ui.authButton.textContent = isLoggedIn ? 'Logout' : 'Login';
    ui.nav.dashboard.parentElement.classList.toggle('hidden', !isLoggedIn);
    switchView(isLoggedIn ? 'management' : 'public');

    // **LÓGICA CORRIGIDA**: Só inicializa o painel se o usuário estiver logado
    // e o painel ainda não tiver sido inicializado.
    if (isLoggedIn && !isErpInitialized) {
        initializeErpPanel();
        isErpInitialized = true;
    } else if (!isLoggedIn) {
        // Reseta o status se o usuário fizer logout
        isErpInitialized = false;
    }
});

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

function loadPublicProducts() {
    database.ref('estoque').on('value', snapshot => {
        products = snapshot.val() || {};
        const productEntries = Object.entries(products);
        ui.shop.productList.innerHTML = productEntries.length === 0 
            ? '<p class="col-span-full text-center">Nenhum produto disponível no momento.</p>'
            : productEntries.map(([id, p]) => `
                <div class="product-card">
                    <img src="${p.imagem || 'https://via.placeholder.com/300'}" alt="${p.nome}">
                    <h3>${p.nome}</h3>
                    <p>${p.descricao || 'Sem descrição.'}</p>
                    <p class="price">R$ ${(p.precoVenda || 0).toFixed(2).replace('.', ',')}</p>
                    ${(p.quantidade || 0) > 0
                        ? `<button class="add-to-cart-button w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded" data-id="${id}">Adicionar ao Carrinho</button>`
                        : `<p class="out-of-stock">Esgotado</p>`
                    }
                </div>
            `).join('');
    });
}

function addToCart(productId) {
    if (cart[productId]) {
        cart[productId].quantity++;
    } else {
        cart[productId] = { ...products[productId], quantity: 1 };
    }
    updateCartDisplay();
}

function removeFromCart(productId) {
    if (cart[productId] && cart[productId].quantity > 0) {
        cart[productId].quantity--;
        if (cart[productId].quantity === 0) {
            delete cart[productId];
        }
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    let total = 0;
    const cartEntries = Object.entries(cart);
    ui.cart.items.innerHTML = cartEntries.length === 0
        ? '<p>Seu carrinho está vazio.</p>'
        : cartEntries.map(([id, item]) => {
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
    ui.cart.checkoutButton.disabled = cartEntries.length === 0;
}

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
        nivelAlertaEstoque: alertLevel || 0,
        imagem: imageUrl
    };

    const dbRef = id ? database.ref('estoque/' + id) : database.ref('estoque').push();
    dbRef.set(productData).then(() => {
        alert(`Produto ${id ? 'atualizado' : 'adicionado'} com sucesso!`);
        toggleModal(ui.erp.stock.modal, false);
    }).catch(error => alert(`Erro ao salvar produto: ${error.message}`));
}

function loadStockManagement() {
    database.ref('estoque').on('value', snapshot => {
        products = snapshot.val() || {};
        const tableBody = Object.entries(products).map(([id, p]) => `
            <tr>
                <td><img src="${p.imagem || 'https://via.placeholder.com/50'}" alt="${p.nome}" class="w-12 h-12 object-cover rounded"></td>
                <td>${p.nome}</td>
                <td>R$ ${(p.precoVenda || 0).toFixed(2).replace('.', ',')}</td>
                <td>${p.quantidade || 0}</td>
                <td>${p.nivelAlertaEstoque || 0}</td>
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
        ui.erp.stock.imageUploadInput.value = '';
        toggleModal(ui.erp.stock.modal, true);
    }
}

function openNewProductModal() {
    ui.erp.stock.title.textContent = 'Adicionar Produto';
    ui.erp.stock.idInput.value = '';
    ui.erp.stock.nameInput.value = '';
    ui.erp.stock.priceInput.value = '';
    ui.erp.stock.quantityInput.value = '';
    ui.erp.stock.descriptionInput.value = '';
    ui.erp.stock.alertLevelInput.value = '';
    ui.erp.stock.imageUploadInput.value = '';
    toggleModal(ui.erp.stock.modal, true);
}

function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        database.ref('estoque/' + productId).remove()
            .then(() => alert('Produto excluído com sucesso!'))
            .catch(error => alert('Erro ao excluir produto: ' + error.message));
    }
}

// --- Funções para os outros módulos (Fornecedores, Compras, Vendas, Financeiro) continuam aqui... ---
// Elas já estão corretas e serão chamadas pela função `initializeErpPanel` no momento certo.
// Apenas colei as partes mais críticas para a correção do bug. O restante do seu código pode ser mantido.
// Vou incluir o restante para garantir que você tenha a versão completa e funcional.

// --- MÓDULO: FORNECEDORES (ERP) ---
function saveSupplier() {
    const id = ui.erp.suppliers.idInput.value;
    const name = ui.erp.suppliers.nameInput.value.trim();
    const contact = ui.erp.suppliers.contactInput.value.trim();
    if (!name) {
        alert("O nome do fornecedor é obrigatório.");
        return;
    }
    const supplierData = { nome: name, contato: contact };
    const ref = id ? database.ref('fornecedores/' + id) : database.ref('fornecedores').push();
    ref.set(supplierData).then(() => {
        alert(`Fornecedor ${id ? 'atualizado' : 'salvo'} com sucesso!`);
        toggleModal(ui.erp.suppliers.modal, false);
    }).catch(e => alert("Erro: " + e.message));
}

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
            <table class="w-full text-sm">
                <thead><tr><th>Nome</th><th>Contato</th><th>Ações</th></tr></thead>
                <tbody>${tableBody || '<tr><td colspan="3" class="text-center">Nenhum fornecedor cadastrado.</td></tr>'}</tbody>
            </table>`;
    });
}

function openEditSupplierModal(id) {
    const s = suppliers[id];
    if (s) {
        ui.erp.suppliers.title.textContent = "Editar Fornecedor";
        ui.erp.suppliers.idInput.value = id;
        ui.erp.suppliers.nameInput.value = s.nome;
        ui.erp.suppliers.contactInput.value = s.contato;
        toggleModal(ui.erp.suppliers.modal, true);
    }
}

function openNewSupplierModal() {
    ui.erp.suppliers.title.textContent = "Adicionar Fornecedor";
    ui.erp.suppliers.idInput.value = '';
    ui.erp.suppliers.nameInput.value = '';
    ui.erp.suppliers.contactInput.value = '';
    toggleModal(ui.erp.suppliers.modal, true);
}

function deleteSupplier(id) {
    if (confirm("Tem certeza que deseja excluir este fornecedor?")) {
        database.ref('fornecedores/' + id).remove()
        .then(() => alert("Fornecedor excluído."))
        .catch(e => alert("Erro: " + e.message));
    }
}


// --- MÓDULO: COMPRAS (ERP) ---
function openNewPurchaseModal() {
    const supplierOptions = Object.entries(suppliers).map(([id, s]) => `<option value="${id}">${s.nome}</option>`).join('');
    const productOptions = Object.entries(products).map(([id, p]) => `<option value="${id}">${p.nome}</option>`).join('');
    if(!supplierOptions || !productOptions) {
        alert("É necessário ter pelo menos um fornecedor e um produto cadastrado para registrar uma compra.");
        return;
    }
    ui.erp.purchases.supplierSelect.innerHTML = supplierOptions;
    ui.erp.purchases.productSelect.innerHTML = productOptions;
    currentPurchaseItems = {};
    updatePurchaseItemsList();
    toggleModal(ui.erp.purchases.modal, true);
}

function addItemToPurchase() {
    const productId = ui.erp.purchases.productSelect.value;
    const quantity = parseInt(ui.erp.purchases.quantityInput.value);
    const unitPrice = parseFloat(ui.erp.purchases.priceInput.value);

    if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
        alert("Dados do item inválidos.");
        return;
    }
    currentPurchaseItems[productId] = { nome: products[productId].nome, quantity, unitPrice };
    updatePurchaseItemsList();
}

function updatePurchaseItemsList() {
    let total = 0;
    ui.erp.purchases.itemsList.innerHTML = Object.entries(currentPurchaseItems).map(([id, item]) => {
        total += item.quantity * item.unitPrice;
        return `<div class="flex justify-between items-center p-2 bg-gray-700 rounded mb-1">
                    <span>${item.quantity}x ${item.nome} @ R$ ${item.unitPrice.toFixed(2)}</span>
                    <button class="text-red-400 hover:text-red-600" data-id="${id}" onclick="removeItemFromPurchase('${id}')">&times;</button>
                </div>`;
    }).join('');
    ui.erp.purchases.total.textContent = `R$ ${total.toFixed(2)}`;
}

function removeItemFromPurchase(productId) {
    delete currentPurchaseItems[productId];
    updatePurchaseItemsList();
}


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

function loadPurchases() {
    database.ref('compras').on('value', snapshot => {
        const purchases = snapshot.val() || {};
        const tableBody = Object.entries(purchases).map(([id, p]) => `
            <tr>
                <td>${new Date(p.data).toLocaleDateString()}</td>
                <td>${p.fornecedorNome}</td>
                <td>R$ ${p.total.toFixed(2)}</td>
                <td>${p.status}</td>
                <td>${p.status === 'Aguardando Recebimento' ? `<button class="confirm-receipt-button bg-green-600 text-white text-xs px-2 py-1 rounded" data-id="${id}">Confirmar Receb.</button>` : ''}</td>
            </tr>`).join('');
        ui.erp.purchases.list.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr><th>Data</th><th>Fornecedor</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>${tableBody || '<tr><td colspan="5" class="text-center">Nenhuma compra registrada.</td></tr>'}</tbody>
            </table>`;
    });
}

async function confirmPurchaseReceipt(purchaseId) {
    const purchaseRef = database.ref('compras/' + purchaseId);
    const purchaseSnapshot = await purchaseRef.once('value');
    const purchase = purchaseSnapshot.val();
    if (purchase && confirm('Confirmar recebimento desta compra? O estoque será atualizado.')) {
        const updates = {};
        for (const [itemId, item] of Object.entries(purchase.itens)) {
            updates[`/estoque/${itemId}/quantidade`] = firebase.database.ServerValue.increment(item.quantity);
        }
        await database.ref().update(updates);

        await database.ref('fluxoDeCaixa').push({
            tipo: 'Pagar',
            descricao: `Compra #${purchaseId.slice(-5)} - ${purchase.fornecedorNome}`,
            valor: purchase.total,
            data: new Date().toISOString(),
            status: 'Pendente'
        });
        
        await purchaseRef.update({ status: 'Recebido' });
        alert('Recebimento confirmado e estoque atualizado!');
    }
}


// --- MÓDULO: VENDAS (ERP) ---
function loadSales() {
    database.ref('pedidos').orderByChild('status').equalTo('pendente').on('value', snapshot => {
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

async function confirmSale(orderId) {
    const orderRef = database.ref('pedidos/' + orderId);
    const orderSnapshot = await orderRef.once('value');
    const order = orderSnapshot.val();

    if (!order || !confirm('Confirmar esta venda? O estoque será atualizado.')) return;

    const updates = {};
    for (const [itemId, item] of Object.entries(order.itens)) {
        const productSnapshot = await database.ref('estoque/' + itemId).once('value');
        const product = productSnapshot.val();
        if (!product || product.quantidade < item.quantity) {
            alert(`Estoque insuficiente para ${item.nome}. Venda não confirmada.`);
            return;
        }
        updates[`/estoque/${itemId}/quantidade`] = firebase.database.ServerValue.increment(-item.quantity);
    }
    
    await database.ref().update(updates);
    await database.ref('vendas').push(order);
    await database.ref('fluxoDeCaixa').push({
        tipo: 'Receber',
        descricao: `Venda #${orderId.slice(-5)} - ${order.cliente}`,
        valor: order.total,
        data: new Date().toISOString(),
        status: 'Pendente'
    });
    await orderRef.remove();
    alert('Venda confirmada e estoque atualizado!');
}

function cancelOrder(orderId) {
    if (confirm('Tem certeza que deseja cancelar este pedido?')) {
        database.ref('pedidos/' + orderId).remove().then(() => alert('Pedido cancelado!'));
    }
}


// --- MÓDULO: FINANCEIRO (ERP) ---
function loadFinance() {
    database.ref('fluxoDeCaixa').on('value', (snapshot) => {
        const transactions = snapshot.val() || {};
        let balance = 0;
        const tableBody = Object.entries(transactions).map(([id, t]) => {
            if (t.status === 'Recebido') balance += t.valor;
            if (t.status === 'Paga') balance -= t.valor;
            const isReceber = t.tipo === 'Receber';
            const valorClass = isReceber ? 'text-green-400' : 'text-red-400';
            const valorSignal = isReceber ? '+' : '-';
            return `
            <tr>
                <td>${new Date(t.data).toLocaleDateString()}</td>
                <td>${t.tipo}</td>
                <td>${t.descricao}</td>
                <td class="${valorClass}">${valorSignal} R$ ${t.valor.toFixed(2)}</td>
                <td>${t.status}</td>
                <td>${t.status === 'Pendente' ? `<button class="confirm-finance-button bg-green-600 text-white text-xs px-2 py-1 rounded" data-id="${id}" data-type="${t.tipo}">Confirmar</button>` : 'Liquidado'}</td>
            </tr>`;
        }).join('');

        ui.erp.finance.transactions.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>${tableBody || '<tr><td colspan="6" class="text-center">Nenhuma transação.</td></tr>'}</tbody>
            </table>`;
        ui.erp.finance.cashBalance.textContent = `R$ ${balance.toFixed(2)}`;
        ui.erp.finance.cashBalance.classList.toggle('text-red-400', balance < 0);
        ui.erp.finance.cashBalance.classList.toggle('text-green-400', balance >= 0);
    });
}

function confirmFinanceTransaction(id, type) {
    const newStatus = type === 'Receber' ? 'Recebido' : 'Paga';
    if (confirm(`Confirmar esta transação como "${newStatus}"?`)) {
        database.ref('fluxoDeCaixa/' + id).update({ status: newStatus })
        .then(() => alert('Transação atualizada!'));
    }
}

function generateSalesReport() {
    const startDate = ui.erp.finance.reportStartDate.value;
    const endDate = ui.erp.finance.reportEndDate.value;
    if (!startDate || !endDate) {
        alert("Por favor, selecione data de início e fim.");
        return;
    }
    
    const start = new Date(startDate).setHours(0,0,0,0);
    const end = new Date(endDate).setHours(23,59,59,999);

    database.ref('vendas').orderByChild('data').startAt(new Date(start).toISOString()).endAt(new Date(end).toISOString()).once('value', snapshot => {
        const sales = snapshot.val() || {};
        salesReportData = Object.values(sales);

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

function exportToCSV() {
    if (salesReportData.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Cliente,Produto,Quantidade,Preco Unitario,Total Item\r\n";
    salesReportData.forEach(sale => {
        const saleDate = new Date(sale.data).toLocaleString('pt-BR');
        Object.values(sale.itens).forEach(item => {
            csvContent += [
                saleDate, `"${sale.cliente}"`, `"${item.nome}"`,
                item.quantity, item.precoVenda.toFixed(2), (item.quantity * item.precoVenda).toFixed(2)
            ].join(",") + "\r\n";
        });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// --- MÓDULO: DASHBOARD (ERP) ---
function updateLowStockAlerts() {
    if (!ui.erp.dashboard.lowStockAlerts) return;
    const lowStockProducts = Object.values(products).filter(p => p.quantidade <= p.nivelAlertaEstoque);
    if (lowStockProducts.length === 0) {
        ui.erp.dashboard.lowStockAlerts.innerHTML = '<li>Nenhum alerta de estoque baixo.</li>';
    } else {
        ui.erp.dashboard.lowStockAlerts.innerHTML = lowStockProducts.map(p => 
            `<li class="text-red-400">${p.nome}: ${p.quantidade} em estoque (Alerta: ${p.nivelAlertaEstoque})</li>`
        ).join('');
    }
}

function calculateDailySalesAndMonthlyRevenue() {
    database.ref('vendas').on('value', (snapshot) => {
        const sales = snapshot.val() || {};
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        let daily = 0, monthly = 0;
        Object.values(sales).forEach(sale => {
            const saleDate = new Date(sale.data).getTime();
            if (saleDate >= startOfMonth) monthly += sale.total;
            if (saleDate >= startOfDay) daily += sale.total;
        });
        ui.erp.dashboard.dailySales.textContent = `R$ ${daily.toFixed(2)}`;
        ui.erp.dashboard.monthlyRevenue.textContent = `R$ ${monthly.toFixed(2)}`;
    });
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---

function attachEventListeners() {
    // Navegação e Autenticação
    ui.authButton.addEventListener('click', handleAuthClick);
    ui.nav.home.addEventListener('click', () => switchView('public'));
    ui.nav.shop.addEventListener('click', () => switchView('public'));
    ui.nav.dashboard.addEventListener('click', () => switchView('management'));
    ui.erp.tabs.forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));

    // Vitrine e Carrinho
    document.body.addEventListener('click', e => {
        const target = e.target.closest('button'); // Event delegation
        if (!target) return;

        const { id, classList } = target;
        const datasetId = target.dataset.id;
        
        if (classList.contains('add-to-cart-button')) addToCart(datasetId);
        if (classList.contains('remove-from-cart-button')) removeFromCart(datasetId);
        if (classList.contains('edit-product-button')) openEditProductModal(datasetId);
        if (classList.contains('delete-product-button')) deleteProduct(datasetId);
        if (classList.contains('edit-supplier-button')) openEditSupplierModal(datasetId);
        if (classList.contains('delete-supplier-button')) deleteSupplier(datasetId);
        if (classList.contains('confirm-receipt-button')) confirmPurchaseReceipt(datasetId);
        if (classList.contains('confirm-sale-button')) confirmSale(datasetId);
        if (classList.contains('cancel-order-button')) cancelOrder(datasetId);
        if (classList.contains('confirm-finance-button')) confirmFinanceTransaction(datasetId, target.dataset.type);
    });

    ui.nav.cart.addEventListener('click', () => toggleModal(ui.cart.modal, true));
    ui.cart.closeButton.addEventListener('click', () => toggleModal(ui.cart.modal, false));
    ui.cart.checkoutButton.addEventListener('click', () => {
        toggleModal(ui.cart.modal, false);
        toggleModal(ui.checkout.modal, true);
    });
    ui.checkout.closeButton.addEventListener('click', () => toggleModal(ui.checkout.modal, false));
    ui.checkout.submitButton.addEventListener('click', submitCheckout);

    // Modais do ERP
    ui.erp.stock.addButton.addEventListener('click', openNewProductModal);
    ui.erp.stock.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.stock.modal, false));
    ui.erp.stock.saveButton.addEventListener('click', saveProduct);

    ui.erp.suppliers.addButton.addEventListener('click', openNewSupplierModal);
    ui.erp.suppliers.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.suppliers.modal, false));
    ui.erp.suppliers.saveButton.addEventListener('click', saveSupplier);
    
    ui.erp.purchases.newButton.addEventListener('click', openNewPurchaseModal);
    ui.erp.purchases.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.purchases.modal, false));
    ui.erp.purchases.addItemButton.addEventListener('click', addItemToPurchase);
    ui.erp.purchases.saveButton.addEventListener('click', savePurchase);
    
    ui.erp.finance.generateReportBtn.addEventListener('click', generateSalesReport);
    ui.erp.finance.exportCsvBtn.addEventListener('click', exportToCSV);
}

document.addEventListener('DOMContentLoaded', () => {
    querySelAll('.modal-backdrop').forEach(modal => modal.classList.add('hidden'));
    
    // Carrega apenas os dados da vitrine pública inicialmente
    loadPublicProducts();
    
    attachEventListeners();
});
