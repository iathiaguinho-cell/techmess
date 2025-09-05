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
let salesReportData = [];
let isErpInitialized = false;
let currentOrderToConfirm = null;

// --- SELETORES DE ELEMENTOS DO DOM (CACHE) ---
const getElem = (id) => document.getElementById(id);
const querySel = (selector) => document.querySelector(selector);
const querySelAll = (selector) => document.querySelectorAll(selector);

const ui = {
    // ... outros seletores ...
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
    erp: {
        // ... outros seletores ...
        finance: {
            content: getElem('finance-content'),
            cashBalance: getElem('cash-balance'),
            accountsReceivable: getElem('accounts-receivable'),
            accountsPayable: getElem('accounts-payable'),
        },
        // ...
    }
};

// ... FUNÇÕES DE UI, AUTENTICAÇÃO, ETC (sem alterações)...

// --- MÓDULO: VITRINE PÚBLICA (E-COMMERCE) ---
// ... (funções de carrinho permanecem iguais) ...

// FUNÇÃO ATUALIZADA: submitCheckout
async function submitCheckout() {
    const name = ui.checkout.nameInput.value.trim();
    const whatsapp = ui.checkout.whatsappInput.value.trim();

    if (!name || !whatsapp || Object.keys(cart).length === 0) {
        alert('Por favor, preencha todos os campos e adicione itens ao carrinho.');
        return;
    }

    // LÓGICA REMOVIDA: Verificação de cliente existente foi removida para garantir a permissão de escrita.
    // Um novo cliente sempre será criado no checkout público.
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


// --- MÓDULO: VENDAS (ERP) ---
// ... (função loadSalesHistory sem alterações) ...
function loadSales() {
    database.ref('pedidos').orderByChild('status').equalTo('pendente').on('value', snapshot => {
        const orders = snapshot.val() || {};
        window.pendingOrdersData = orders; // Armazena os dados completos para uso posterior
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

// FUNÇÃO ATUALIZADA: openPaymentConfirmationModal
function openPaymentConfirmationModal(orderId) {
    currentOrderToConfirm = { id: orderId, ...window.pendingOrdersData[orderId] };
    const today = new Date().toISOString().split('T')[0];
    ui.paymentConfirmationModal.firstDueDateInput.value = today;
    ui.paymentConfirmationModal.installmentsInput.value = 1;
    ui.paymentConfirmationModal.paymentMethodSelect.value = 'Pix';
    toggleInstallmentFields(); // Garante que os campos de parcela fiquem ocultos inicialmente
    toggleModal(ui.paymentConfirmationModal.modal, true);
}

function toggleInstallmentFields() {
    const method = ui.paymentConfirmationModal.paymentMethodSelect.value;
    const show = method === 'Boleto' || method === 'Cartão de Crédito';
    ui.paymentConfirmationModal.installmentFields.classList.toggle('hidden', !show);
}

// FUNÇÃO REFEITA: processSaleConfirmation (Lógica Profissional de ERP)
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

    // 1. Verificação de estoque (sem alterações na lógica)
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

    // 2. Confirma operações no banco de dados
    try {
        // Debita o estoque
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
        delete saleData.id; // Remove o ID temporário
        
        // Salva em /vendas
        const newSaleRef = await database.ref('vendas').push(saleData);
        
        // 3. Cria as parcelas em /contasReceber
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

        // Remove de /pedidos
        await database.ref('pedidos/' + orderId).remove();

        alert('Venda confirmada com sucesso! As parcelas foram geradas em Contas a Receber.');
        toggleModal(ui.paymentConfirmationModal.modal, false);
        currentOrderToConfirm = null;

    } catch (error) {
        alert('Ocorreu um erro ao processar a venda: ' + error.message);
        // TODO: Implementar lógica para reverter a baixa de estoque em caso de falha.
    }
}

// --- MÓDULO FINANCEIRO REFEITO ---

function loadFinance() {
    // Carrega Contas a Receber
    database.ref('contasReceber').orderByChild('dataVencimento').on('value', (snapshot) => {
        const accounts = snapshot.val() || {};
        const tableBody = Object.entries(accounts).map(([id, acc]) => {
            const isPaid = acc.status === 'Recebido';
            return `
            <tr>
                <td>${new Date(acc.dataVencimento + 'T12:00:00Z').toLocaleDateString()}</td>
                <td>${acc.clienteNome}</td>
                <td>${acc.descricao}</td>
                <td class="text-green-400">+ R$ ${acc.valor.toFixed(2).replace('.',',')}</td>
                <td>${acc.status}</td>
                <td>${!isPaid ? `<button class="confirm-payment-button bg-green-600 text-white text-xs px-2 py-1 rounded" data-id="${id}" data-type="receber">Receber</button>` : `Recebido em ${new Date(acc.dataRecebimento).toLocaleDateString()}`}</td>
            </tr>`;
        }).join('');
        ui.erp.finance.accountsReceivable.innerHTML = `
            <table class="w-full text-sm"><thead><tr><th>Vencimento</th><th>Cliente</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${tableBody || '<tr><td colspan="6" class="text-center">Nenhuma conta a receber.</td></tr>'}</tbody></table>`;
    });

    // Carrega Contas a Pagar (lógica similar, vindo de compras)
    // TODO: Implementar o nó /contasPagar, similar ao /contasReceber
    ui.erp.finance.accountsPayable.innerHTML = `<p class="text-center">Módulo de contas a pagar em desenvolvimento.</p>`;

    // Calcula Saldo de Caixa a partir do /fluxoDeCaixa
    database.ref('fluxoDeCaixa').on('value', (snapshot) => {
        const transactions = snapshot.val() || {};
        const balance = Object.values(transactions).reduce((acc, t) => acc + t.valor, 0);
        ui.erp.finance.cashBalance.textContent = `R$ ${balance.toFixed(2).replace('.',',')}`;
        ui.erp.finance.cashBalance.classList.toggle('text-red-400', balance < 0);
        ui.erp.finance.cashBalance.classList.toggle('text-green-400', balance >= 0);
    });
}

async function confirmPayment(accountId, type) {
    const node = type === 'receber' ? 'contasReceber' : 'contasPagar';
    const accountRef = database.ref(`${node}/${accountId}`);
    const snapshot = await accountRef.once('value');
    const account = snapshot.val();

    if (!account || account.status !== 'Pendente') return;
    
    if (confirm(`Confirmar recebimento de R$ ${account.valor.toFixed(2)}?`)) {
        try {
            // Atualiza o status da conta
            await accountRef.update({
                status: 'Recebido',
                dataRecebimento: new Date().toISOString()
            });

            // Lança a transação no fluxo de caixa
            await database.ref('fluxoDeCaixa').push({
                descricao: `Recebimento da ${account.descricao}`,
                valor: account.valor, // Positivo para recebimento
                data: new Date().toISOString()
            });

            alert('Recebimento confirmado e lançado no caixa!');
        } catch (error) {
            alert('Erro ao confirmar recebimento: ' + error.message);
        }
    }
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---

function attachEventListeners() {
    // ... (outros listeners permanecem iguais)
    
    // Listener para o select de forma de pagamento
    ui.paymentConfirmationModal.paymentMethodSelect.addEventListener('change', toggleInstallmentFields);

    // Delegação de Eventos para botões dinâmicos (adição do novo botão)
    document.body.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        
        // ... (outros 'if's)
        else if (target.classList.contains('confirm-payment-button')) {
            confirmPayment(target.dataset.id, target.dataset.type);
        }
    });

    // ... (o resto da função attachEventListeners)
}

// ... (todas as outras funções que não foram modificadas)
