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
let fullInventory = {};
let publicCart = [];

// ======================= LÓGICA DE AUTENTICAÇÃO E CONTROLES GERAIS =======================
document.addEventListener('DOMContentLoaded', () => {
    const publicArea = document.getElementById('public-area');
    const app = document.getElementById('app');
    const currentUserName = document.getElementById('currentUserName');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
    const logoutButton = document.getElementById('logoutButton');

    auth.onAuthStateChanged(user => {
        if (user) {
            publicArea.style.display = 'none';
            app.style.display = 'block';
            loginModal.classList.add('hidden');
            currentUserName.textContent = user.email;
            initializeAdminPanel();
        } else {
            publicArea.style.display = 'block';
            app.style.display = 'none';
        }
    });

    loginForm.addEventListener('submit', (e) => { e.preventDefault(); loginError.textContent = ''; const email = document.getElementById('emailInput').value; const password = document.getElementById('passwordInput').value; auth.signInWithEmailAndPassword(email, password).catch(error => { loginError.textContent = 'E-mail ou senha incorretos.'; }); });
    logoutButton.addEventListener('click', () => auth.signOut());
    adminLoginBtn.addEventListener('click', () => { loginModal.classList.remove('hidden'); loginModal.classList.add('flex'); });
    closeLoginModalBtn.addEventListener('click', () => { loginModal.classList.add('hidden'); loginModal.classList.remove('flex'); });
    loginModal.addEventListener('click', (e) => { if (e.target.id === 'loginModal') { loginModal.classList.add('hidden'); loginModal.classList.remove('flex'); } });

    // Inicia a exibição dos produtos na vitrine
    displayProducts();
});


// ======================= LÓGICA DE GESTÃO DE ESTOQUE =======================
function setupInventoryControls() {
    const productModal = document.getElementById('productModal');
    const newProductBtn = document.getElementById('newProductBtn');
    const closeProductModalBtn = document.getElementById('closeProductModalBtn');
    const productForm = document.getElementById('productForm');
    const saveProductBtn = document.getElementById('saveProductBtn');

    newProductBtn.addEventListener('click', () => { productForm.reset(); document.getElementById('productModalTitle').textContent = 'Adicionar Novo Produto'; productModal.classList.remove('hidden'); productModal.classList.add('flex'); });
    closeProductModalBtn.addEventListener('click', () => { productModal.classList.add('hidden'); productModal.classList.remove('flex'); });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productData = { name: document.getElementById('productName').value, price: parseFloat(document.getElementById('productPrice').value), quantity: parseInt(document.getElementById('productQuantity').value), description: document.getElementById('productDescription').value, imageUrl: '', createdAt: firebase.database.ServerValue.TIMESTAMP };
        const productImageFile = document.getElementById('productImage').files[0];
        if (!productImageFile) { alert('Por favor, selecione uma imagem.'); return; }
        saveProductBtn.disabled = true; saveProductBtn.innerHTML = 'Enviando imagem...';
        const formData = new FormData();
        formData.append('file', productImageFile);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Falha no upload da imagem.');
            const data = await response.json();
            productData.imageUrl = data.secure_url;
            saveProductBtn.innerHTML = 'Salvando produto...';
            await db.ref('estoque').push(productData);
            alert('Produto cadastrado com sucesso!');
            productModal.classList.add('hidden'); productModal.classList.remove('flex');
        } catch (error) { console.error('Erro ao salvar produto:', error); alert('Ocorreu um erro ao salvar o produto.'); } finally { saveProductBtn.disabled = false; saveProductBtn.innerHTML = 'Salvar Produto'; }
    });
}

// ======================= LÓGICA DA VITRINE PÚBLICA E E-COMMERCE =======================
function displayProducts() {
    const productGrid = document.getElementById('product-grid');
    const productsRef = db.ref('estoque').orderByChild('createdAt');
    productsRef.on('value', (snapshot) => {
        productGrid.innerHTML = '';
        fullInventory = snapshot.val() || {};
        if (!snapshot.exists()) { productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Nenhum produto cadastrado.</p>'; return; }
        const products = [];
        snapshot.forEach(child => { products.push({ id: child.key, ...child.val() }); });
        products.reverse().forEach(product => {
            const outOfStock = product.quantity <= 0;
            productGrid.innerHTML += `<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700/50 flex flex-col"><div class="relative"><img src="${product.imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">${outOfStock ? '<div class="absolute inset-0 bg-black/70 flex items-center justify-center"><span class="text-white font-bold text-xl">ESGOTADO</span></div>' : ''}</div><div class="p-4 flex flex-col flex-grow"><h3 class="font-semibold text-lg text-white flex-grow">${product.name}</h3><p class="text-cyan-400 mt-2 text-2xl font-bold">R$ ${product.price.toFixed(2).replace('.', ',')}</p><button data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''} class="add-to-cart-btn mt-4 w-full bg-cyan-500 text-black font-bold py-2 rounded-lg transition-colors ${outOfStock ? 'bg-gray-600 cursor-not-allowed' : 'hover:bg-cyan-400'}">Adicionar ao Carrinho</button></div></div>`;
        });
    });
    
    productGrid.addEventListener('click', (e) => { if (e.target.classList.contains('add-to-cart-btn')) { addToPublicCart(e.target.dataset.productId); } });
    
    const publicCartBtn = document.getElementById('public-cart-btn');
    const checkoutModal = document.getElementById('checkoutModal');
    const closeCheckoutModalBtn = document.getElementById('closeCheckoutModalBtn');
    const checkoutForm = document.getElementById('checkoutForm');

    publicCartBtn.addEventListener('click', () => { if (publicCart.length === 0) { alert("Seu carrinho está vazio."); return; } displayCheckoutModal(); });
    closeCheckoutModalBtn.addEventListener('click', () => { checkoutModal.classList.add('hidden'); checkoutModal.classList.remove('flex'); });
    checkoutForm.addEventListener('submit', handleOrderSubmit);
}

function addToPublicCart(productId) {
    const product = fullInventory[productId];
    if (!product || product.quantity <= 0) { alert("Produto esgotado!"); return; }
    const existingItem = publicCart.find(item => item.id === productId);
    if (existingItem) { if (existingItem.quantity < product.quantity) { existingItem.quantity++; } else { alert('Quantidade máxima em estoque atingida.'); return; } } else { publicCart.push({ id: productId, name: product.name, price: product.price, quantity: 1 }); }
    updatePublicCartDisplay();
    alert(`${product.name} adicionado ao carrinho!`);
}

function updatePublicCartDisplay() {
    const publicCartCount = document.getElementById('public-cart-count');
    const totalItems = publicCart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) { publicCartCount.textContent = totalItems; publicCartCount.classList.remove('hidden'); } else { publicCartCount.classList.add('hidden'); }
}

function displayCheckoutModal() {
    const itemsDiv = document.getElementById('checkout-cart-items');
    const totalSpan = document.getElementById('checkout-total');
    let total = 0;
    itemsDiv.innerHTML = '';
    publicCart.forEach(item => { total += item.price * item.quantity; itemsDiv.innerHTML += `<p>${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>`; });
    totalSpan.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('checkoutModal').classList.remove('hidden');
    document.getElementById('checkoutModal').classList.add('flex');
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    const orderData = { customerName: document.getElementById('customerName').value, customerWhatsapp: document.getElementById('customerWhatsapp').value, items: publicCart, total: publicCart.reduce((sum, item) => sum + item.price * item.quantity, 0), status: 'pendente', createdAt: firebase.database.ServerValue.TIMESTAMP };
    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.disabled = true; submitBtn.textContent = 'Enviando...';
    try {
        await db.ref('pedidos').push(orderData);
        alert('Pedido enviado com sucesso! Entraremos em contato em breve.');
        publicCart = [];
        updatePublicCartDisplay();
        document.getElementById('checkoutForm').reset();
        document.getElementById('checkoutModal').classList.add('hidden');
    } catch (error) { console.error("Erro ao enviar pedido:", error); alert("Não foi possível enviar o pedido."); } finally { submitBtn.disabled = false; submitBtn.textContent = 'Enviar Pedido'; }
}

// ======================= LÓGICA DO PAINEL DE GESTÃO =======================
function initializeAdminPanel() {
    setupInventoryControls();
    setupFinancialControls();
    displayOrders();
    displayFinancialDashboard();
}

function displayOrders() {
    const ordersListDiv = document.getElementById('orders-list');
    const ordersRef = db.ref('pedidos').orderByChild('status').equalTo('pendente');
    ordersRef.on('value', snapshot => {
        ordersListDiv.innerHTML = '';
        if (!snapshot.exists()) { ordersListDiv.innerHTML = '<p class="text-gray-500">Nenhum pedido novo no momento.</p>'; return; }
        let orders = [];
        snapshot.forEach(child => { orders.push({ id: child.key, ...child.val() }); });
        orders.reverse().forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleString('pt-BR');
            ordersListDiv.innerHTML += `<div class="bg-gray-800 p-4 rounded-lg border border-gray-700"><div class="flex justify-between items-start"><div><p class="font-bold text-white">${order.customerName}</p><p class="text-sm text-gray-400">WhatsApp: ${order.customerWhatsapp}</p><p class="text-xs text-gray-500">Recebido em: ${orderDate}</p></div><p class="font-bold text-lg text-cyan-400">R$ ${order.total.toFixed(2).replace('.', ',')}</p></div><ul class="list-disc list-inside my-3 text-gray-300 pl-2">${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}</ul><div class="flex gap-4"><button onclick="confirmOrder('${order.id}')" class="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-4 rounded-lg">Confirmar Venda</button><button onclick="cancelOrder('${order.id}')" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar Pedido</button></div></div>`;
        });
    });
}

async function confirmOrder(orderId) {
    if (!confirm('Confirmar esta venda? A ação dará baixa no estoque e registrará a entrada no caixa.')) return;
    const orderSnapshot = await db.ref(`pedidos/${orderId}`).once('value');
    if (!orderSnapshot.exists()) { alert("Pedido não encontrado."); return; }
    const order = orderSnapshot.val();
    for (const item of order.items) { const stockQty = (await db.ref(`estoque/${item.id}/quantity`).once('value')).val(); if (stockQty < item.quantity) { alert(`Estoque insuficiente para ${item.name}.`); return; } }
    try {
        const saleData = { items: order.items, total: order.total, createdAt: firebase.database.ServerValue.TIMESTAMP, seller: auth.currentUser.email, customer: {name: order.customerName, whatsapp: order.customerWhatsapp} };
        const saleRef = await db.ref('vendas').push(saleData);
        await db.ref('fluxoDeCaixa').push({ type: 'entrada', description: `Venda #${saleRef.key.slice(-6)}`, amount: order.total, status: 'pago', createdAt: firebase.database.ServerValue.TIMESTAMP });
        const updates = {};
        for (const item of order.items) { const stockQty = (await db.ref(`estoque/${item.id}/quantity`).once('value')).val(); updates[`/estoque/${item.id}/quantity`] = stockQty - item.quantity; }
        await db.ref().update(updates);
        await db.ref(`pedidos/${orderId}`).remove();
        alert('Venda confirmada com sucesso!');
    } catch (error) { console.error("Erro ao confirmar pedido:", error); alert("Ocorreu um erro ao processar o pedido."); }
}

async function cancelOrder(orderId) {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    try { await db.ref(`pedidos/${orderId}`).remove(); alert('Pedido cancelado.'); } catch (error) { console.error("Erro ao cancelar pedido:", error); }
}

// ======================= MÓDULO FINANCEIRO =======================
function setupFinancialControls() {
    const transactionModal = document.getElementById('transactionModal');
    const newTransactionBtn = document.getElementById('new-transaction-btn');
    const closeTransactionModalBtn = document.getElementById('closeTransactionModalBtn');
    const transactionForm = document.getElementById('transactionForm');

    newTransactionBtn.addEventListener('click', () => { transactionForm.reset(); transactionModal.classList.remove('hidden'); transactionModal.classList.add('flex'); });
    closeTransactionModalBtn.addEventListener('click', () => { transactionModal.classList.add('hidden'); transactionModal.classList.remove('flex'); });

    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const transactionData = { description: document.getElementById('transaction-description').value, amount: parseFloat(document.getElementById('transaction-amount').value), type: document.querySelector('input[name="transaction-type"]:checked').value, status: 'pendente', createdAt: firebase.database.ServerValue.TIMESTAMP };
        try { await db.ref('fluxoDeCaixa').push(transactionData); alert('Lançamento salvo!'); transactionModal.classList.add('hidden'); } catch (error) { console.error("Erro ao salvar lançamento:", error); alert("Erro ao salvar."); }
    });
}

function displayFinancialDashboard() {
    const cashFlowRef = db.ref('fluxoDeCaixa');
    cashFlowRef.on('value', snapshot => {
        let totalRevenue = 0, totalExpenses = 0;
        const payableList = document.getElementById('accounts-payable-list');
        const receivableList = document.getElementById('accounts-receivable-list');
        payableList.innerHTML = ''; receivableList.innerHTML = '';
        let hasPayable = false, hasReceivable = false;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const entry = { id: child.key, ...child.val() };
                if (entry.status === 'pago') {
                    if (entry.type === 'entrada') totalRevenue += entry.amount;
                    if (entry.type === 'saida') totalExpenses += entry.amount;
                } else { // Pendente
                    const listHtml = `<div class="bg-gray-700 p-3 rounded-md flex justify-between items-center"><p>${entry.description}<br><span class="text-sm font-bold">R$ ${entry.amount.toFixed(2).replace('.', ',')}</span></p><button onclick="markAsPaid('${entry.id}')" class="bg-green-600 text-white px-3 py-1 text-sm rounded-md hover:bg-green-500">Pagar/Receber</button></div>`;
                    if (entry.type === 'saida') { payableList.innerHTML += listHtml; hasPayable = true; }
                    if (entry.type === 'entrada') { receivableList.innerHTML += listHtml; hasReceivable = true; }
                }
            });
        }
        if (!hasPayable) payableList.innerHTML = '<p class="text-gray-500">Nenhuma conta a pagar pendente.</p>';
        if (!hasReceivable) receivableList.innerHTML = '<p class="text-gray-500">Nenhuma conta a receber pendente.</p>';
        
        document.getElementById('total-revenue').textContent = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('total-expenses').textContent = `R$ ${totalExpenses.toFixed(2).replace('.', ',')}`;
        document.getElementById('current-balance').textContent = `R$ ${(totalRevenue - totalExpenses).toFixed(2).replace('.', ',')}`;
    });

    const salesRef = db.ref('vendas');
    const salesReportTableBody = document.getElementById('sales-report-table-body');
    salesRef.orderByChild('createdAt').on('value', snapshot => {
        salesReportTableBody.innerHTML = '';
        if (!snapshot.exists()) { salesReportTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhuma venda registrada.</td></tr>'; return; }
        let salesData = [];
        snapshot.forEach(child => { salesData.push(child.val()); });
        salesData.reverse().forEach(sale => {
            const saleDate = new Date(sale.createdAt).toLocaleDateString('pt-BR');
            const itemsSummary = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
            salesReportTableBody.innerHTML += `<tr class="border-b border-gray-700"><td class="p-2">${saleDate}</td><td class="p-2">${sale.customer.name}</td><td class="p-2 text-sm">${itemsSummary}</td><td class="p-2 text-right font-semibold">R$ ${sale.total.toFixed(2).replace('.', ',')}</td></tr>`;
        });
        document.getElementById('export-sales-btn').onclick = () => exportToCSV(salesData, 'relatorio_vendas');
    });
}

async function markAsPaid(transactionId) {
    try { await db.ref(`fluxoDeCaixa/${transactionId}`).update({ status: 'pago' }); alert('Status atualizado com sucesso!'); } catch (error) { console.error("Erro ao atualizar status:", error); alert('Erro ao atualizar.'); }
}

function exportToCSV(data, filename) {
    const header = "Data,Cliente,Itens,Total\n";
    const rows = data.map(sale => {
        const date = new Date(sale.createdAt).toLocaleDateString('pt-BR');
        const customer = `"${sale.customer.name.replace(/"/g, '""')}"`;
        const items = `"${sale.items.map(i => `${i.quantity}x ${i.name}`).join('; ')}"`;
        const total = sale.total.toFixed(2);
        return [date, customer, items, total].join(',');
    }).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
