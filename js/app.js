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
    databaseURL: "https://vipcell-gestor-default-rtdb.firebaseio.com",
    projectId: "vipcell-gestor",
    storageBucket: "vipcell-gestor.firebasestorage.app",
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
let customers = {};
let currentPurchaseItems = {};
let currentSaleItems = {};
let isErpInitialized = false;
let currentOrderToConfirm = null;

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
        dashboard: getElem('nav-dashboard'),
        cartItemCount: getElem('cart-item-count')
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
    paymentConfirmationModal: {
        modal: getElem('payment-confirmation-modal'),
        closeButton: getElem('close-payment-confirmation-modal'),
        processButton: getElem('process-sale-confirmation-button'),
        orderIdInput: getElem('confirm-sale-order-id'),
        paymentMethodSelect: getElem('confirm-sale-payment-method'),
        installmentFields: getElem('installment-fields'),
        installmentsInput: getElem('confirm-sale-installments'),
        firstDueDateInput: getElem('confirm-sale-first-due-date'),
    },
    expenseModal: {
        modal: getElem('expense-form-modal'),
        closeButton: getElem('close-expense-form-modal'),
        saveButton: getElem('save-expense-button'),
        descriptionInput: getElem('expense-description'),
        valueInput: getElem('expense-value'),
        dueDateInput: getElem('expense-due-date'),
        categorySelect: getElem('expense-category'),
    },
    erp: {
        tabs: querySelAll('.tab-button'),
        contents: querySelAll('.tab-content'),
        dashboard: {
            content: getElem('dashboard-content'),
            monthlyRevenue: getElem('monthly-revenue'),
            dailySales: getElem('daily-sales'),
            lowStockAlerts: getElem('low-stock-alerts'),
            resetSystemButton: getElem('reset-system-button')
        },
        sales: {
            content: getElem('sales-content'),
            pendingOrders: getElem('pending-orders'),
            historyList: getElem('sales-history-list'),
            newSaleButton: getElem('new-sale-button'),
            manualSaleModal: getElem('manual-sale-modal'),
            closeManualSaleModal: getElem('close-manual-sale-modal'),
            saveManualSaleButton: getElem('save-manual-sale-button'),
            customerSelect: getElem('sale-customer'),
            productSelect: getElem('sale-product'),
            quantityInput: getElem('sale-quantity'),
            addItemButton: getElem('add-item-to-sale-button'),
            itemsList: getElem('sale-items-list'),
            total: getElem('sale-total'),
            dateInput: getElem('sale-date'),
            paymentMethodSelect: getElem('sale-payment-method')
        },
        customers: {
            content: getElem('customers-content'),
            addButton: getElem('add-customer-button'),
            list: getElem('customer-list'),
            modal: getElem('customer-form-modal'),
            closeModalButton: getElem('close-customer-form-modal'),
            saveButton: getElem('save-customer-button'),
            title: getElem('customer-form-title'),
            idInput: getElem('customer-id'),
            nameInput: getElem('new-customer-name'),
            whatsappInput: getElem('new-customer-whatsapp'),
            emailInput: getElem('new-customer-email'),
            notesInput: getElem('new-customer-notes')
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
            total: getElem('purchase-total'),
            invoiceInput: getElem('purchase-invoice-number'),
            dateInput: getElem('purchase-date'),
            paymentMethodSelect: getElem('purchase-payment-method')
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
            cashBalance: getElem('cash-balance'),
            accountsReceivable: getElem('accounts-receivable'),
            accountsPayable: getElem('accounts-payable'),
            newExpenseButton: getElem('new-expense-button'),
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
        activeButton.classList.remove('border-transparent', 'text-gray-300');
        activeButton.classList.add('border-cyan-400', 'text-white');
    }
}

function toggleModal(modalElement, show) {
    modalElement.classList.toggle('hidden', !show);
}

// --- AUTENTICAÇÃO E INICIALIZAÇÃO DO PAINEL ---

function initializeErpPanel() {
    if (isErpInitialized) return;
    console.log("A inicializar dados do Painel de Gestão...");
    loadStockManagement();
    loadSupplierManagement();
    loadCustomerManagement();
    loadPurchases();
    loadSales();
    loadSalesHistory();
    loadFinance();
    calculateDailySalesAndMonthlyRevenue();
    isErpInitialized = true;
}

auth.onAuthStateChanged(user => {
    const isLoggedIn = !!user;
    ui.authButton.textContent = isLoggedIn ? 'Logout' : 'Login';
    ui.nav.dashboard.parentElement.classList.toggle('hidden', !isLoggedIn);
    
    if (isLoggedIn) {
        switchView('management');
        initializeErpPanel();
    } else {
        switchView('public');
        isErpInitialized = false;
    }
});

function handleAuthClick() {
    if (auth.currentUser) {
        auth.signOut();
    } else {
        const email = prompt('Digite o seu e-mail:');
        const password = prompt('Digite a sua senha:');
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
                    <img src="${p.imagem || 'https://placehold.co/300x200/1f2937/9ca3af?text=Produto'}" alt="${p.nome}">
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
    if (cart[productId] && cart[productId].quantity > 1) {
        cart[productId].quantity--;
    } else {
        delete cart[productId];
    }
    updateCartDisplay();
}

function updateCartDisplay() {
    let total = 0;
    let totalItems = 0;
    const cartEntries = Object.entries(cart);

    ui.cart.items.innerHTML = cartEntries.length === 0
        ? '<p>O seu carrinho está vazio.</p>'
        : cartEntries.map(([id, item]) => {
            total += item.quantity * item.precoVenda;
            totalItems += item.quantity;
            return `
                <div class="cart-item">
                    <div class="item-info">
                        <h4>${item.nome}</h4>
                        <p>${item.quantity} x R$ ${item.precoVenda.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div class="item-actions">
                        <button data-id="${id}" class="remove-from-cart-button bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded">Remover</button>
                    </div>
                </div>
            `;
        }).join('');
        
    ui.cart.total.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    ui.cart.checkoutButton.disabled = cartEntries.length === 0;

    if (totalItems > 0) {
        ui.nav.cartItemCount.textContent = totalItems;
        ui.nav.cartItemCount.classList.remove('hidden');
    } else {
        ui.nav.cartItemCount.classList.add('hidden');
    }
}

async function submitCheckout() {
    const name = ui.checkout.nameInput.value.trim();
    const whatsapp = ui.checkout.whatsappInput.value.trim();

    if (!name || !whatsapp || Object.keys(cart).length === 0) {
        alert('Por favor, preencha todos os campos e adicione itens ao carrinho.');
        return;
    }

    const newCustomerData = {
        nome: name,
        nome_lowercase: name.toLowerCase(),
        whatsapp: whatsapp,
        dataCadastro: new Date().toISOString()
    };
    const newCustomerRef = await database.ref('clientes').push(newCustomerData);
    const customerId = newCustomerRef.key;

    const order = {
        clienteId: customerId,
        cliente: name,
        whatsapp: whatsapp,
        itens: cart,
        total: Object.values(cart).reduce((sum, item) => sum + item.quantity * item.precoVenda, 0),
        status: 'pendente',
        data: new Date().toISOString()
    };

    database.ref('pedidos').push(order).then(() => {
        alert('Pedido realizado com sucesso! Nossa equipe entrará em contato.');
        cart = {};
        updateCartDisplay();
        toggleModal(ui.checkout.modal, false);
        ui.checkout.nameInput.value = '';
        ui.checkout.whatsappInput.value = '';
    }).catch(error => {
        console.error("Erro no checkout:", error);
        alert('Erro ao realizar pedido: ' + error.message);
    });
}

// --- MÓDULO: CLIENTES (CRM) ---
function openNewCustomerModal() {
    ui.erp.customers.title.textContent = 'Adicionar Novo Cliente';
    ui.erp.customers.idInput.value = '';
    ui.erp.customers.nameInput.value = '';
    ui.erp.customers.whatsappInput.value = '';
    ui.erp.customers.emailInput.value = '';
    ui.erp.customers.notesInput.value = '';
    toggleModal(ui.erp.customers.modal, true);
}

function openEditCustomerModal(customerId) {
    const customer = customers[customerId];
    if (customer) {
        ui.erp.customers.title.textContent = 'Editar Cliente';
        ui.erp.customers.idInput.value = customerId;
        ui.erp.customers.nameInput.value = customer.nome;
        ui.erp.customers.whatsappInput.value = customer.whatsapp;
        ui.erp.customers.emailInput.value = customer.email || '';
        ui.erp.customers.notesInput.value = customer.observacoes || '';
        toggleModal(ui.erp.customers.modal, true);
    }
}

function saveCustomer() {
    const id = ui.erp.customers.idInput.value;
    const name = ui.erp.customers.nameInput.value.trim();
    const whatsapp = ui.erp.customers.whatsappInput.value.trim();
    const email = ui.erp.customers.emailInput.value.trim();
    const notes = ui.erp.customers.notesInput.value.trim();

    if (!name || !whatsapp) {
        alert('Nome e WhatsApp são obrigatórios.');
        return;
    }

    const customerData = {
        nome: name,
        nome_lowercase: name.toLowerCase(),
        whatsapp: whatsapp,
        email: email,
        observacoes: notes,
        dataCadastro: new Date().toISOString()
    };
    
    const dbRef = id ? database.ref('clientes/' + id) : database.ref('clientes').push();
    dbRef.set(customerData).then(() => {
        alert(`Cliente ${id ? 'atualizado' : 'salvo'} com sucesso!`);
        toggleModal(ui.erp.customers.modal, false);
    }).catch(error => alert(`Erro ao salvar cliente: ${error.message}`));
}

function deleteCustomer(customerId) {
    if (confirm('Tem a certeza de que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
        database.ref('clientes/' + customerId).remove()
            .then(() => alert('Cliente excluído com sucesso!'))
            .catch(error => alert('Erro ao excluir cliente: ' + error.message));
    }
}

function loadCustomerManagement() {
    database.ref('clientes').on('value', snapshot => {
        customers = snapshot.val() || {};
        const tableBody = Object.entries(customers).map(([id, c]) => `
            <tr>
                <td>${c.nome}</td>
                <td>${c.whatsapp}</td>
                <td>${c.email || 'N/A'}</td>
                <td>
                    <button class="edit-customer-button bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded" data-id="${id}">Editar</button>
                    <button class="delete-customer-button bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded ml-2" data-id="${id}">Excluir</button>
                </td>
            </tr>
        `).join('');

        ui.erp.customers.list.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Ações</th></tr></thead>
                <tbody>${tableBody || '<tr><td colspan="4" class="text-center">Nenhum cliente cadastrado.</td></tr>'}</tbody>
            </table>
        `;
    });
}

// --- MÓDULO: VENDAS (ERP) ---
function loadSales() {
    database.ref('pedidos').orderByChild('status').equalTo('pendente').on('value', snapshot => {
        const orders = snapshot.val() || {};
        window.pendingOrdersData = orders;
        const tableBody = Object.entries(orders).map(([id, order]) => {
            const itemsList = Object.values(order.itens).map(item => `${item.nome} (${item.quantity})`).join(', ');
            return `
                <tr>
                    <td>${new Date(order.data).toLocaleDateString()}</td>
                    <td>${order.cliente}</td>
                    <td>${order.whatsapp}</td>
                    <td class="text-xs">${itemsList}</td>
                    <td>R$ ${order.total.toFixed(2).replace('.',',')}</td>
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

function loadSalesHistory() {
    database.ref('vendas').limitToLast(25).on('value', snapshot => {
        const sales = snapshot.val() || {};
        const reversedSales = Object.entries(sales).reverse();

        if (reversedSales.length === 0) {
            ui.erp.sales.historyList.innerHTML = '<p>Nenhuma venda foi confirmada ainda.</p>';
            return;
        }

        const tableBody = reversedSales.map(([id, sale]) => {
            const itemsList = Object.values(sale.itens).map(item => `${item.nome} (${item.quantity})`).join(', ');
            return `
                <tr>
                    <td>${new Date(sale.data).toLocaleDateString()}</td>
                    <td>${sale.cliente}</td>
                    <td>${sale.pagamento.metodo} (${sale.pagamento.parcelas || 1}x)</td>
                    <td class="text-xs">${itemsList}</td>
                    <td>R$ ${sale.total.toFixed(2).replace('.',',')}</td>
                </tr>`;
        }).join('');
        
        ui.erp.sales.historyList.innerHTML = `
            <table class="w-full text-sm">
                <thead><tr><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Itens</th><th>Total</th></tr></thead>
                <tbody>${tableBody}</tbody>
            </table>`;
    });
}

function openPaymentConfirmationModal(orderId) {
    currentOrderToConfirm = { id: orderId, ...window.pendingOrdersData[orderId] };
    const today = new Date().toISOString().split('T')[0];
    ui.paymentConfirmationModal.firstDueDateInput.value = today;
    ui.paymentConfirmationModal.installmentsInput.value = 1;
    ui.paymentConfirmationModal.paymentMethodSelect.value = 'Pix';
    toggleInstallmentFields();
    toggleModal(ui.paymentConfirmationModal.modal, true);
}

function toggleInstallmentFields() {
    const method = ui.paymentConfirmationModal.paymentMethodSelect.value;
    const show = method === 'Boleto' || method === 'Cartão de Crédito';
    ui.paymentConfirmationModal.installmentFields.classList.toggle('hidden', !show);
}

async function processSaleConfirmation() {
    if (!currentOrderToConfirm) {
        alert("Erro: Pedido não encontrado.");
        return;
    }

    const orderId = currentOrderToConfirm.id;
    const order = currentOrderToConfirm;
    
    const paymentMethod = ui.paymentConfirmationModal.paymentMethodSelect.value;
    const installments = parseInt(ui.paymentConfirmationModal.installmentsInput.value) || 1;
    const firstDueDate = ui.paymentConfirmationModal.firstDueDateInput.value;
    
    if ((paymentMethod === 'Boleto' || paymentMethod === 'Cartão de Crédito') && !firstDueDate) {
        alert("Para esta forma de pagamento, a data do primeiro vencimento é obrigatória.");
        return;
    }

    const updates = {};
    let hasEnoughStock = true;
    for (const [itemId, item] of Object.entries(order.itens)) {
        const product = products[itemId];
        if (!product || product.quantidade < item.quantity) {
            hasEnoughStock = false;
            alert(`Estoque insuficiente para ${item.nome}. Venda não confirmada.`);
            break;
        }
        updates[`/estoque/${itemId}/quantidade`] = firebase.database.ServerValue.increment(-item.quantity);
    }

    if (!hasEnoughStock) return;

    try {
        await database.ref().update(updates);

        const saleData = {
            ...order,
            status: 'Concluída',
            pagamento: {
                metodo: paymentMethod,
                parcelas: installments,
                status: 'A Receber'
            }
        };
        delete saleData.id;
        
        const newSaleRef = await database.ref('vendas').push(saleData);
        
        const installmentValue = order.total / installments;
        for (let i = 1; i <= installments; i++) {
            const dueDate = new Date(firstDueDate + 'T12:00:00Z');
            dueDate.setMonth(dueDate.getMonth() + (i - 1));

            const installmentData = {
                vendaId: newSaleRef.key,
                clienteId: order.clienteId,
                clienteNome: order.cliente,
                descricao: `Parcela ${i}/${installments} - Venda #${newSaleRef.key.slice(-5)}`,
                valor: installmentValue,
                dataVencimento: dueDate.toISOString().split('T')[0],
                status: 'Pendente'
            };
            await database.ref('contasReceber').push(installmentData);
        }

        await database.ref('pedidos/' + orderId).remove();

        alert('Venda confirmada com sucesso! As parcelas foram geradas em Contas a Receber.');
        toggleModal(ui.paymentConfirmationModal.modal, false);
        currentOrderToConfirm = null;

    } catch (error) {
        alert('Ocorreu um erro ao processar a venda: ' + error.message);
    }
}

function cancelOrder(orderId) {
    if (confirm('Tem a certeza de que deseja cancelar este pedido?')) {
        database.ref('pedidos/' + orderId).remove().then(() => alert('Pedido cancelado!'));
    }
}

// --- MÓDULO: DESPESAS E FINANCEIRO ---

function openNewExpenseModal() {
    ui.expenseModal.descriptionInput.value = '';
    ui.expenseModal.valueInput.value = '';
    ui.expenseModal.dueDateInput.value = new Date().toISOString().split('T')[0];
    ui.expenseModal.categorySelect.value = 'Custo Fixo';
    toggleModal(ui.expenseModal.modal, true);
}

function saveExpense() {
    const description = ui.expenseModal.descriptionInput.value.trim();
    const value = parseFloat(ui.expenseModal.valueInput.value);
    const dueDate = ui.expenseModal.dueDateInput.value;
    const category = ui.expenseModal.categorySelect.value;

    if (!description || isNaN(value) || value <= 0 || !dueDate) {
        alert("Preencha todos os campos da despesa corretamente.");
        return;
    }

    const expenseData = {
        descricao: description,
        categoria: category,
        valor: value,
        dataVencimento: dueDate,
        status: 'Pendente'
    };

    database.ref('contasPagar').push(expenseData).then(() => {
        alert("Despesa lançada com sucesso!");
        toggleModal(ui.expenseModal.modal, false);
    }).catch(error => {
        alert("Erro ao salvar despesa: " + error.message);
    });
}

function loadFinance() {
    database.ref('contasReceber').orderByChild('dataVencimento').on('value', (snapshot) => {
        const accounts = snapshot.val() || {};
        const tableBody = Object.entries(accounts).map(([id, acc]) => {
            const isPaid = acc.status === 'Recebido';
            return `
            <tr>
                <td>${new Date(acc.dataVencimento + 'T12:00:00Z').toLocaleDateString()}</td>
                <td>${acc.clienteNome || 'N/A'}</td>
                <td>${acc.descricao}</td>
                <td class="text-green-400">+ R$ ${acc.valor.toFixed(2).replace('.',',')}</td>
                <td><span class="px-2 py-1 text-xs rounded-full ${isPaid ? 'bg-green-700' : 'bg-yellow-700'}">${acc.status}</span></td>
                <td>${!isPaid ? `<button class="confirm-transaction-button bg-green-600 text-white text-xs px-2 py-1 rounded" data-id="${id}" data-type="receber">Receber</button>` : `Liquidado em ${new Date(acc.dataRecebimento).toLocaleDateString()}`}</td>
            </tr>`;
        }).join('');
        ui.erp.finance.accountsReceivable.innerHTML = `
            <table class="w-full text-sm"><thead><tr><th>Vencimento</th><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${tableBody || '<tr><td colspan="6" class="text-center">Nenhuma conta a receber.</td></tr>'}</tbody></table>`;
    });

    database.ref('contasPagar').orderByChild('dataVencimento').on('value', (snapshot) => {
        const accounts = snapshot.val() || {};
        const tableBody = Object.entries(accounts).map(([id, acc]) => {
            const isPaid = acc.status === 'Paga';
            return `
            <tr>
                <td>${new Date(acc.dataVencimento + 'T12:00:00Z').toLocaleDateString()}</td>
                <td>${acc.fornecedorNome || acc.categoria}</td>
                <td>${acc.descricao}</td>
                <td class="text-red-400">- R$ ${acc.valor.toFixed(2).replace('.',',')}</td>
                <td><span class="px-2 py-1 text-xs rounded-full ${isPaid ? 'bg-green-700' : 'bg-yellow-700'}">${acc.status}</span></td>
                <td>${!isPaid ? `<button class="confirm-transaction-button bg-blue-600 text-white text-xs px-2 py-1 rounded" data-id="${id}" data-type="pagar">Pagar</button>` : `Liquidado em ${new Date(acc.dataPagamento).toLocaleDateString()}`}</td>
            </tr>`;
        }).join('');
        ui.erp.finance.accountsPayable.innerHTML = `
            <table class="w-full text-sm"><thead><tr><th>Vencimento</th><th>Fornecedor/Categoria</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${tableBody || '<tr><td colspan="6" class="text-center">Nenhuma conta a pagar.</td></tr>'}</tbody></table>`;
    });

    database.ref('fluxoDeCaixa').on('value', (snapshot) => {
        const transactions = snapshot.val() || {};
        const balance = Object.values(transactions).reduce((acc, t) => acc + t.valor, 0);
        ui.erp.finance.cashBalance.textContent = `R$ ${balance.toFixed(2).replace('.',',')}`;
        ui.erp.finance.cashBalance.classList.toggle('text-red-400', balance < 0);
        ui.erp.finance.cashBalance.classList.toggle('text-green-400', balance >= 0);
    });
}

async function confirmTransaction(accountId, type) {
    const isReceiving = type === 'receber';
    const node = isReceiving ? 'contasReceber' : 'contasPagar';
    const newStatus = isReceiving ? 'Recebido' : 'Paga';
    const dateField = isReceiving ? 'dataRecebimento' : 'dataPagamento';
    const confirmationText = isReceiving ? 'Recebimento' : 'Pagamento';
    
    const accountRef = database.ref(`${node}/${accountId}`);
    const snapshot = await accountRef.once('value');
    const account = snapshot.val();

    if (!account || account.status !== 'Pendente') return;
    
    if (confirm(`Confirmar ${confirmationText} de R$ ${account.valor.toFixed(2)}?`)) {
        try {
            await accountRef.update({
                status: newStatus,
                [dateField]: new Date().toISOString()
            });

            await database.ref('fluxoDeCaixa').push({
                descricao: `${confirmationText}: ${account.descricao}`,
                valor: isReceiving ? account.valor : -account.valor,
                data: new Date().toISOString()
            });

            alert(`${confirmationText} confirmado e lançado no caixa!`);
        } catch (error) {
            alert(`Erro ao confirmar ${confirmationText}: ` + error.message);
        }
    }
}

// --- Demais Módulos (Compras, Fornecedores, etc.) ---
// ... (código existente e sem alterações para compras, fornecedores, etc.)
// As funções abaixo permanecem as mesmas
function saveSupplier() { /* ... */ }
function loadSupplierManagement() { /* ... */ }
function openEditSupplierModal(id) { /* ... */ }
function openNewSupplierModal() { /* ... */ }
function deleteSupplier(id) { /* ... */ }
function openNewPurchaseModal() { /* ... */ }
function addItemToPurchase() { /* ... */ }
function updatePurchaseItemsList() { /* ... */ }
function removeItemFromPurchase(productId) { /* ... */ }
function savePurchase() { /* ... */ }
function loadPurchases() { /* ... */ }
function deletePurchase(purchaseId) { /* ... */ }
// Função confirmPurchaseReceipt foi atualizada
async function confirmPurchaseReceipt(purchaseId) {
    const purchaseRef = database.ref('compras/' + purchaseId);
    const purchaseSnapshot = await purchaseRef.once('value');
    const purchase = purchaseSnapshot.val();
    if (purchase && confirm('Confirmar o recebimento desta compra? O estoque será atualizado e uma conta a pagar será gerada.')) {
        const updates = {};
        for (const [itemId, item] of Object.entries(purchase.itens)) {
            updates[`/estoque/${itemId}/quantidade`] = firebase.database.ServerValue.increment(item.quantity);
        }
        await database.ref().update(updates);

        await database.ref('contasPagar').push({
            compraId: purchaseId,
            fornecedorId: purchase.fornecedorId,
            fornecedorNome: purchase.fornecedorNome,
            descricao: `Pagamento NF #${purchase.numeroNota}`,
            valor: purchase.total,
            dataVencimento: purchase.dataCompra,
            status: 'Pendente'
        });
        
        await purchaseRef.update({ status: 'Recebido' });
        alert('Recebimento confirmado, estoque atualizado e conta a pagar gerada!');
    }
}
function updateLowStockAlerts() { /* ... */ }
function calculateDailySalesAndMonthlyRevenue() { /* ... */ }
function initiateSystemReset() { /* ... */ }
async function performSystemReset() { /* ... */ }

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
function attachEventListeners() {
    // Navegação e Autenticação
    ui.authButton.addEventListener('click', handleAuthClick);
    ui.nav.home.addEventListener('click', (e) => { e.preventDefault(); switchView('public'); });
    ui.nav.shop.addEventListener('click', (e) => { e.preventDefault(); switchView('public'); });
    ui.nav.dashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('management'); });
    ui.erp.tabs.forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    ui.erp.dashboard.resetSystemButton.addEventListener('click', initiateSystemReset);

    // Delegação de Eventos para botões dinâmicos
    document.body.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;

        const datasetId = target.dataset.id;
        
        if (target.classList.contains('add-to-cart-button')) addToCart(datasetId);
        else if (target.classList.contains('remove-from-cart-button')) removeFromCart(datasetId);
        else if (target.classList.contains('edit-product-button')) openEditProductModal(datasetId);
        else if (target.classList.contains('delete-product-button')) deleteProduct(datasetId);
        else if (target.classList.contains('edit-supplier-button')) openEditSupplierModal(datasetId);
        else if (target.classList.contains('delete-supplier-button')) deleteSupplier(datasetId);
        else if (target.classList.contains('edit-customer-button')) openEditCustomerModal(datasetId);
        else if (target.classList.contains('delete-customer-button')) deleteCustomer(datasetId);
        else if (target.classList.contains('confirm-receipt-button')) confirmPurchaseReceipt(datasetId);
        else if (target.classList.contains('delete-purchase-button')) deletePurchase(datasetId);
        else if (target.classList.contains('confirm-sale-button')) openPaymentConfirmationModal(datasetId);
        else if (target.classList.contains('cancel-order-button')) cancelOrder(datasetId);
        else if (target.classList.contains('confirm-transaction-button')) confirmTransaction(datasetId, target.dataset.type);
        else if (target.classList.contains('remove-purchase-item-button')) removeItemFromPurchase(datasetId);
        else if (target.classList.contains('remove-sale-item-button')) removeItemFromSale(datasetId);
    });

    // Modais
    ui.nav.cart.addEventListener('click', (e) => { e.preventDefault(); toggleModal(ui.cart.modal, true); });
    ui.cart.closeButton.addEventListener('click', () => toggleModal(ui.cart.modal, false));
    ui.cart.checkoutButton.addEventListener('click', () => {
        toggleModal(ui.cart.modal, false);
        toggleModal(ui.checkout.modal, true);
    });
    ui.checkout.closeButton.addEventListener('click', () => toggleModal(ui.checkout.modal, false));
    ui.checkout.submitButton.addEventListener('click', submitCheckout);
    ui.paymentConfirmationModal.closeButton.addEventListener('click', () => toggleModal(ui.paymentConfirmationModal.modal, false));
    ui.paymentConfirmationModal.processButton.addEventListener('click', processSaleConfirmation);
    ui.paymentConfirmationModal.paymentMethodSelect.addEventListener('change', toggleInstallmentFields);

    // Modais do ERP
    ui.erp.stock.addButton.addEventListener('click', openNewProductModal);
    ui.erp.stock.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.stock.modal, false));
    ui.erp.stock.saveButton.addEventListener('click', saveProduct);

    ui.erp.suppliers.addButton.addEventListener('click', openNewSupplierModal);
    ui.erp.suppliers.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.suppliers.modal, false));
    ui.erp.suppliers.saveButton.addEventListener('click', saveSupplier);

    ui.erp.customers.addButton.addEventListener('click', openNewCustomerModal);
    ui.erp.customers.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.customers.modal, false));
    ui.erp.customers.saveButton.addEventListener('click', saveCustomer);
    
    ui.erp.purchases.newButton.addEventListener('click', openNewPurchaseModal);
    ui.erp.purchases.closeModalButton.addEventListener('click', () => toggleModal(ui.erp.purchases.modal, false));
    ui.erp.purchases.addItemButton.addEventListener('click', addItemToPurchase);
    ui.erp.purchases.saveButton.addEventListener('click', savePurchase);
    
    ui.erp.sales.newSaleButton.addEventListener('click', openNewSaleModal);
    ui.erp.sales.closeManualSaleModal.addEventListener('click', () => toggleModal(ui.erp.sales.manualSaleModal, false));
    ui.erp.sales.addItemButton.addEventListener('click', addItemToSale);
    ui.erp.sales.saveManualSaleButton.addEventListener('click', saveManualSale);

    ui.erp.finance.newExpenseButton.addEventListener('click', openNewExpenseModal);
    ui.expenseModal.closeButton.addEventListener('click', () => toggleModal(ui.expenseModal.modal, false));
    ui.expenseModal.saveButton.addEventListener('click', saveExpense);
}

document.addEventListener('DOMContentLoaded', () => {
    querySelAll('.modal-backdrop').forEach(modal => modal.classList.add('hidden'));
    loadPublicProducts();
    attachEventListeners();
    updateCartDisplay();
});
