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
let salesDataCache = [];
let editingProductId = null;

// ======================= LÓGICA DE AUTENTICAÇÃO E CONTROLES GERAIS =======================
document.addEventListener('DOMContentLoaded', () => {
    // ... (código de autenticação e controles de modal, sem alterações)
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
    
    displayProducts();
});


// ======================= LÓGICA DE GESTÃO DE ESTOQUE (CRUD) =======================
function setupInventoryControls() {
    const productModal = document.getElementById('productModal');
    const newProductBtn = document.getElementById('newProductBtn');
    const closeProductModalBtn = document.getElementById('closeProductModalBtn');
    const productForm = document.getElementById('productForm');

    newProductBtn.addEventListener('click', () => {
        editingProductId = null;
        productForm.reset();
        document.getElementById('productModalTitle').textContent = 'Adicionar Novo Produto';
        document.getElementById('productImage').required = true;
        productModal.classList.remove('hidden');
        productModal.classList.add('flex');
    });
    closeProductModalBtn.addEventListener('click', () => { productModal.classList.add('hidden'); productModal.classList.remove('flex'); });

    productForm.addEventListener('submit', handleProductSave);
}

async function handleProductSave(e) {
    e.preventDefault();
    const saveProductBtn = document.getElementById('saveProductBtn');
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value),
        description: document.getElementById('productDescription').value,
        alertLevel: parseInt(document.getElementById('productAlertLevel').value) || 1,
    };

    saveProductBtn.disabled = true;
    saveProductBtn.innerHTML = 'Salvando...';

    try {
        const productImageFile = document.getElementById('productImage').files[0];
        if (productImageFile) {
            saveProductBtn.innerHTML = 'Enviando imagem...';
            const formData = new FormData();
            formData.append('file', productImageFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Falha no upload da imagem.');
            const data = await response.json();
            productData.imageUrl = data.secure_url;
        }

        if (editingProductId) {
            await db.ref(`estoque/${editingProductId}`).update(productData);
            alert('Produto atualizado com sucesso!');
        } else {
            productData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            await db.ref('estoque').push(productData);
            alert('Produto cadastrado com sucesso!');
        }
        document.getElementById('productModal').classList.add('hidden');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Ocorreu um erro ao salvar o produto.');
    } finally {
        saveProductBtn.disabled = false;
        saveProductBtn.innerHTML = 'Salvar';
        editingProductId = null;
    }
}

function editProduct(productId) {
    const product = fullInventory[productId];
    if (!product) return;
    editingProductId = productId;

    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productQuantity').value = product.quantity;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productAlertLevel').value = product.alertLevel || 1;
    document.getElementById('productImage').required = false;

    document.getElementById('productModalTitle').textContent = 'Editar Produto';
    document.getElementById('productModal').classList.remove('hidden');
    document.getElementById('productModal').classList.add('flex');
}

async function deleteProduct(productId) {
    if (!confirm(`Tem certeza que deseja excluir o produto "${fullInventory[productId].name}"? Esta ação não pode ser desfeita.`)) return;
    try {
        await db.ref(`estoque/${productId}`).remove();
        alert('Produto excluído com sucesso.');
        // Nota: A imagem no Cloudinary não é excluída para simplificar, mas ficará órfã.
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Ocorreu um erro ao excluir o produto.');
    }
}


// ======================= LÓGICA DA VITRINE PÚBLICA E CARRINHO =======================
function displayProducts() {
    const productGrid = document.getElementById('product-grid');
    const productsRef = db.ref('estoque').orderByChild('createdAt');
    productsRef.on('value', (snapshot) => {
        productGrid.innerHTML = '';
        fullInventory = snapshot.val() || {};
        // ... (resto da lógica de exibição, sem alterações)
        if (!snapshot.exists()) { productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Nenhum produto cadastrado.</p>'; return; }
        const products = [];
        snapshot.forEach(child => { products.push({ id: child.key, ...child.val() }); });
        products.reverse().forEach(product => {
            const outOfStock = product.quantity <= 0;
            productGrid.innerHTML += `<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700/50 flex flex-col"><div class="relative"><img src="${product.imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">${outOfStock ? '<div class="absolute inset-0 bg-black/70 flex items-center justify-center"><span class="text-white font-bold text-xl">ESGOTADO</span></div>' : ''}</div><div class="p-4 flex flex-col flex-grow"><h3 class="font-semibold text-lg text-white flex-grow">${product.name}</h3><p class="text-cyan-400 mt-2 text-2xl font-bold">R$ ${product.price.toFixed(2).replace('.', ',')}</p><button data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''} class="add-to-cart-btn mt-4 w-full bg-cyan-500 text-black font-bold py-2 rounded-lg transition-colors ${outOfStock ? 'bg-gray-600 cursor-not-allowed' : 'hover:bg-cyan-400'}">Adicionar ao Carrinho</button></div></div>`;
        });
    });

    productGrid.addEventListener('click', (e) => { if (e.target.classList.contains('add-to-cart-btn')) { addToPublicCart(e.target.dataset.productId); } });
    document.getElementById('public-cart-btn').addEventListener('click', displayCheckoutModal);
    document.getElementById('closeCheckoutModalBtn').addEventListener('click', () => document.getElementById('checkoutModal').classList.add('hidden'));
    document.getElementById('checkoutForm').addEventListener('submit', handleOrderSubmit);
}

function addToPublicCart(productId) {
    // ... (lógica inalterada)
    const product = fullInventory[productId];
    if (!product || product.quantity <= 0) { alert("Produto esgotado!"); return; }
    const existingItem = publicCart.find(item => item.id === productId);
    if (existingItem) { if (existingItem.quantity < product.quantity) { existingItem.quantity++; } else { alert('Quantidade máxima em estoque atingida.'); return; } } else { publicCart.push({ id: productId, name: product.name, price: product.price, quantity: 1 }); }
    updatePublicCartDisplay();
}

function removeFromPublicCart(productId) {
    const itemIndex = publicCart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        publicCart[itemIndex].quantity--;
        if (publicCart[itemIndex].quantity === 0) {
            publicCart.splice(itemIndex, 1);
        }
    }
    updatePublicCartDisplay();
    displayCheckoutModal(); // Atualiza a visualização do modal
}

function updatePublicCartDisplay() {
    const publicCartCount = document.getElementById('public-cart-count');
    const totalItems = publicCart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) { publicCartCount.textContent = totalItems; publicCartCount.classList.remove('hidden'); } else { publicCartCount.classList.add('hidden'); publicCartCount.classList.add('hidden'); }
}

function displayCheckoutModal() {
    const checkoutModal = document.getElementById('checkoutModal');
    if (publicCart.length === 0) { checkoutModal.classList.add('hidden'); return; }
    const itemsDiv = document.getElementById('checkout-cart-items');
    const totalSpan = document.getElementById('checkout-total');
    let total = 0;
    itemsDiv.innerHTML = '';
    publicCart.forEach(item => { total += item.price * item.quantity; itemsDiv.innerHTML += `<div class="flex justify-between items-center"><p>${item.quantity}x ${item.name}</p><div class="flex items-center gap-2"><p>R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p><button onclick="removeFromPublicCart('${item.id}')" class="text-red-500 hover:text-red-400 text-xl">&times;</button></div></div>`; });
    totalSpan.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    checkoutModal.classList.remove('hidden');
    checkoutModal.classList.add('flex');
}

async function handleOrderSubmit(e) {
    // ... (lógica inalterada)
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
    displayInventoryTable();
    checkLowStockAlerts();
}

function displayInventoryTable() {
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const inventoryRef = db.ref('estoque');
    inventoryRef.on('value', snapshot => {
        inventoryTableBody.innerHTML = '';
        if (!snapshot.exists()) { inventoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum produto cadastrado.</td></tr>'; return; }
        snapshot.forEach(child => {
            const product = { id: child.key, ...child.val() };
            const isLowStock = product.quantity <= product.alertLevel;
            inventoryTableBody.innerHTML += `<tr class="border-b border-gray-700"><td class="p-2">${product.name}</td><td class="p-2 ${isLowStock ? 'text-red-400 font-bold' : ''}">${product.quantity}</td><td class="p-2 text-right">R$ ${product.price.toFixed(2).replace('.', ',')}</td><td class="p-2 text-center flex gap-2 justify-center"><button onclick="editProduct('${product.id}')" class="text-blue-400 hover:text-blue-300">Editar</button><button onclick="deleteProduct('${product.id}')" class="text-red-500 hover:text-red-400">Excluir</button></td></tr>`;
        });
    });
}

function checkLowStockAlerts() {
    const alertsSection = document.getElementById('alerts-section');
    const inventoryRef = db.ref('estoque');
    inventoryRef.on('value', snapshot => {
        alertsSection.innerHTML = '';
        const lowStockItems = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const product = child.val();
                if (product.quantity <= product.alertLevel) {
                    lowStockItems.push(product.name);
                }
            });
        }
        if (lowStockItems.length > 0) {
            alertsSection.innerHTML = `<div class="bg-red-900 border border-red-500 text-white p-4 rounded-lg mb-6"><strong>Alerta de Estoque Baixo:</strong> ${lowStockItems.join(', ')}. Considere fazer um novo pedido.</div>`;
        }
    });
}

function displayOrders() {
    // ... (lógica inalterada)
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
    // ... (lógica inalterada, mas mais robusta)
    if (!confirm('Confirmar esta venda? A ação dará baixa no estoque e registrará a entrada no caixa.')) return;
    const orderRef = db.ref(`pedidos/${orderId}`);
    const orderSnapshot = await orderRef.once('value');
    if (!orderSnapshot.exists()) { alert("Pedido não encontrado."); return; }
    const order = orderSnapshot.val();
    try {
        const updates = {};
        for (const item of order.items) { const stockSnap = await db.ref(`estoque/${item.id}/quantity`).once('value'); const stockQty = stockSnap.val(); if (stockQty < item.quantity) throw new Error(`Estoque insuficiente para ${item.name}.`); updates[`/estoque/${item.id}/quantity`] = stockQty - item.quantity; }
        const saleData = { items: order.items, total: order.total, createdAt: firebase.database.ServerValue.TIMESTAMP, seller: auth.currentUser.email, customer: {name: order.customerName, whatsapp: order.customerWhatsapp} };
        const saleRef = await db.ref('vendas').push(saleData);
        updates[`/fluxoDeCaixa/${db.ref().push().key}`] = { type: 'entrada', description: `Venda #${saleRef.key.slice(-6)}`, amount: order.total, status: 'pago', createdAt: firebase.database.ServerValue.TIMESTAMP };
        updates[`/pedidos/${orderId}`] = null; // Deleta o pedido
        await db.ref().update(updates);
        alert('Venda confirmada com sucesso!');
    } catch (error) { console.error("Erro ao confirmar pedido:", error); alert(`Erro: ${error.message}`); }
}

async function cancelOrder(orderId) {
    // ... (lógica inalterada)
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    try { await db.ref(`pedidos/${orderId}`).remove(); alert('Pedido cancelado.'); } catch (error) { console.error("Erro ao cancelar pedido:", error); }
}

// ======================= MÓDULO FINANCEIRO E RELATÓRIOS =======================
function setupFinancialControls() {
    const reportBtn = document.getElementById('generate-report-btn');
    reportBtn.addEventListener('click', displaySalesReport);
    
    // Controles do modal de transação
    const transactionModal = document.getElementById('transactionModal');
    if (transactionModal) { // Verifica se o modal existe antes de adicionar listeners
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
}

function displayFinancialDashboard() {
    // ... (lógica inalterada)
}

function displaySalesReport() {
    const startDate = new Date(document.getElementById('report-start-date').value + "T00:00:00");
    const endDate = new Date(document.getElementById('report-end-date').value + "T23:59:59");
    const productSearch = document.getElementById('report-product-search').value.toLowerCase();
    
    const salesReportTableBody = document.getElementById('sales-report-table-body');
    const reportTotalEl = document.getElementById('report-total');

    salesReportTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Gerando relatório...</td></tr>';

    const filteredSales = salesDataCache.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        const dateMatch = (!document.getElementById('report-start-date').value || saleDate >= startDate) && (!document.getElementById('report-end-date').value || saleDate <= endDate);
        const productMatch = !productSearch || sale.items.some(item => item.name.toLowerCase().includes(productSearch));
        return dateMatch && productMatch;
    });

    let reportTotal = 0;
    salesReportTableBody.innerHTML = '';
    if (filteredSales.length === 0) {
        salesReportTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum resultado para os filtros selecionados.</td></tr>';
    } else {
        filteredSales.forEach(sale => {
            reportTotal += sale.total;
            const saleDate = new Date(sale.createdAt).toLocaleDateString('pt-BR');
            const itemsSummary = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
            salesReportTableBody.innerHTML += `<tr class="border-b border-gray-700"><td class="p-2">${saleDate}</td><td class="p-2">${sale.customer.name}</td><td class="p-2 text-sm">${itemsSummary}</td><td class="p-2 text-right font-semibold">R$ ${sale.total.toFixed(2).replace('.', ',')}</td></tr>`;
        });
    }
    reportTotalEl.textContent = `R$ ${reportTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('export-sales-btn').onclick = () => exportToCSV(filteredSales, 'relatorio_filtrado');
}

db.ref('vendas').on('value', snapshot => {
    salesDataCache = [];
    if (snapshot.exists()) {
        snapshot.forEach(child => { salesDataCache.push(child.val()); });
        salesDataCache.sort((a, b) => b.createdAt - a.createdAt); // Mais recentes primeiro
    }
});


function exportToCSV(data, filename) {
    // ... (lógica inalterada)
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
