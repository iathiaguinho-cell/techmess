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

// Seletores de DOM
const publicArea = document.getElementById('public-area');
const app = document.getElementById('app');
const currentUserName = document.getElementById('currentUserName');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const adminLoginBtn = document.getElementById('admin-login-btn');
const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
const logoutButton = document.getElementById('logoutButton');

// LÓGICA DE AUTENTICAÇÃO
auth.onAuthStateChanged(user => {
  if (user) {
    publicArea.classList.add('hidden');
    loginModal.classList.add('hidden');
    app.classList.remove('hidden');
    currentUserName.textContent = user.email;
    initializeAdminPanel();
  } else {
    publicArea.classList.remove('hidden');
    app.classList.add('hidden');
  }
});

loginForm.addEventListener('submit', (e) => { e.preventDefault(); loginError.textContent = ''; const email = document.getElementById('emailInput').value; const password = document.getElementById('passwordInput').value; auth.signInWithEmailAndPassword(email, password).catch(error => { loginError.textContent = 'E-mail ou senha incorretos.'; }); });
logoutButton.addEventListener('click', () => { auth.signOut(); });
adminLoginBtn.addEventListener('click', () => { loginModal.classList.remove('hidden'); loginModal.classList.add('flex'); });
closeLoginModalBtn.addEventListener('click', () => { loginModal.classList.add('hidden'); loginModal.classList.remove('flex'); });
loginModal.addEventListener('click', (e) => { if (e.target.id === 'loginModal') { loginModal.classList.add('hidden'); loginModal.classList.remove('flex'); } });

// ======================= LÓGICA DE GESTÃO DE ESTOQUE =======================
const productModal = document.getElementById('productModal');
const newProductBtn = document.getElementById('newProductBtn');
const closeProductModalBtn = document.getElementById('closeProductModalBtn');
const productForm = document.getElementById('productForm');
const saveProductBtn = document.getElementById('saveProductBtn');

newProductBtn.addEventListener('click', () => {
  productForm.reset();
  document.getElementById('productModalTitle').textContent = 'Adicionar Novo Produto';
  productModal.classList.remove('hidden');
  productModal.classList.add('flex');
});

closeProductModalBtn.addEventListener('click', () => {
  productModal.classList.add('hidden');
  productModal.classList.remove('flex');
});

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const productData = {
    name: document.getElementById('productName').value,
    price: parseFloat(document.getElementById('productPrice').value),
    quantity: parseInt(document.getElementById('productQuantity').value),
    description: document.getElementById('productDescription').value,
    imageUrl: '',
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
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
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    alert('Ocorreu um erro ao salvar o produto.');
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.innerHTML = 'Salvar Produto';
  }
});

// ======================= LÓGICA DA VITRINE PÚBLICA E E-COMMERCE =======================
const productGrid = document.getElementById('product-grid');
const publicCartBtn = document.getElementById('public-cart-btn');
const publicCartCount = document.getElementById('public-cart-count');
const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutModalBtn = document.getElementById('closeCheckoutModalBtn');
const checkoutForm = document.getElementById('checkoutForm');

function displayProducts() {
  const productsRef = db.ref('estoque').orderByChild('createdAt');
  productsRef.on('value', (snapshot) => {
    productGrid.innerHTML = '';
    const inventoryData = snapshot.val();
    fullInventory = inventoryData || {};
    if (!snapshot.exists()) {
      productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Nenhum produto cadastrado.</p>';
      return;
    }
    const products = [];
    snapshot.forEach(child => { products.push({ id: child.key, ...child.val() }); });
    products.reverse().forEach(product => {
      const outOfStock = product.quantity <= 0;
      productGrid.innerHTML += `
        <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700/50 flex flex-col">
          <div class="relative"> <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-56 object-cover"> ${outOfStock ? '<div class="absolute inset-0 bg-black/70 flex items-center justify-center"><span class="text-white font-bold text-xl">ESGOTADO</span></div>' : ''} </div>
          <div class="p-4 flex flex-col flex-grow">
            <h3 class="font-semibold text-lg text-white flex-grow">${product.name}</h3>
            <p class="text-cyan-400 mt-2 text-2xl font-bold">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
            <button data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''} class="add-to-cart-btn mt-4 w-full bg-cyan-500 text-black font-bold py-2 rounded-lg transition-colors ${outOfStock ? 'bg-gray-600 cursor-not-allowed' : 'hover:bg-cyan-400'}">Adicionar ao Carrinho</button>
          </div>
        </div>`;
    });
  });
}

productGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const productId = e.target.dataset.productId;
        addToPublicCart(productId);
    }
});

function addToPublicCart(productId) {
    const product = fullInventory[productId];
    if (!product || product.quantity <= 0) {
        alert("Produto esgotado!");
        return;
    }
    const existingItem = publicCart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.quantity) {
            existingItem.quantity++;
        } else {
            alert('Você já selecionou a quantidade máxima em estoque.');
            return;
        }
    } else {
        publicCart.push({ id: productId, name: product.name, price: product.price, quantity: 1, maxQuantity: product.quantity });
    }
    updatePublicCartDisplay();
    alert(`${product.name} adicionado ao carrinho!`);
}

function updatePublicCartDisplay() {
    const totalItems = publicCart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
        publicCartCount.textContent = totalItems;
        publicCartCount.classList.remove('hidden');
    } else {
        publicCartCount.classList.add('hidden');
    }
}

publicCartBtn.addEventListener('click', () => {
    if (publicCart.length === 0) { alert("Seu carrinho está vazio."); return; }
    const itemsDiv = document.getElementById('checkout-cart-items');
    const totalSpan = document.getElementById('checkout-total');
    let total = 0;
    itemsDiv.innerHTML = '';
    publicCart.forEach(item => {
        total += item.price * item.quantity;
        itemsDiv.innerHTML += `<p>${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>`;
    });
    totalSpan.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    checkoutModal.classList.remove('hidden');
    checkoutModal.classList.add('flex');
});

closeCheckoutModalBtn.addEventListener('click', () => {
    checkoutModal.classList.add('hidden');
    checkoutModal.classList.remove('flex');
});

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderData = {
        customerName: document.getElementById('customerName').value,
        customerWhatsapp: document.getElementById('customerWhatsapp').value,
        items: publicCart,
        total: publicCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'pendente',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.disabled = true; submitBtn.textContent = 'Enviando...';
    try {
        await db.ref('pedidos').push(orderData);
        alert('Pedido enviado com sucesso! Entraremos em contato em breve.');
        publicCart = [];
        updatePublicCartDisplay();
        checkoutForm.reset();
        checkoutModal.classList.add('hidden');
        checkoutModal.classList.remove('flex');
    } catch (error) {
        console.error("Erro ao enviar pedido:", error);
        alert("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
        submitBtn.disabled = false; submitBtn.textContent = 'Enviar Pedido';
    }
});

// ======================= LÓGICA DO PAINEL DE GESTÃO =======================
const ordersListDiv = document.getElementById('orders-list');
const totalRevenueEl = document.getElementById('total-revenue');
const totalExpensesEl = document.getElementById('total-expenses');
const currentBalanceEl = document.getElementById('current-balance');
const salesReportTableBody = document.getElementById('sales-report-table-body');
const exportSalesBtn = document.getElementById('export-sales-btn');

function initializeAdminPanel() {
    displayOrders();
    displayFinancialDashboard();
}

function displayOrders() {
    const ordersRef = db.ref('pedidos').orderByChild('status').equalTo('pendente');
    ordersRef.on('value', snapshot => {
        ordersListDiv.innerHTML = '';
        if (!snapshot.exists()) {
            ordersListDiv.innerHTML = '<p class="text-gray-500">Nenhum pedido novo no momento.</p>';
            return;
        }
        let orders = [];
        snapshot.forEach(child => { orders.push({ id: child.key, ...child.val() }); });
        orders.reverse().forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleString('pt-BR');
            ordersListDiv.innerHTML += `
            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div class="flex justify-between items-start"> <div> <p class="font-bold text-white">${order.customerName}</p> <p class="text-sm text-gray-400">WhatsApp: ${order.customerWhatsapp}</p> <p class="text-xs text-gray-500">Recebido em: ${orderDate}</p> </div> <p class="font-bold text-lg text-cyan-400">R$ ${order.total.toFixed(2).replace('.', ',')}</p> </div>
                <ul class="list-disc list-inside my-3 text-gray-300 pl-2"> ${order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')} </ul>
                <div class="flex gap-4"> <button onclick="confirmOrder('${order.id}')" class="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-4 rounded-lg">Confirmar Venda</button> <button onclick="cancelOrder('${order.id}')" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar Pedido</button> </div>
            </div>`;
        });
    });
}

function displayFinancialDashboard() {
    const cashFlowRef = db.ref('fluxoDeCaixa');
    const salesRef = db.ref('vendas');

    cashFlowRef.on('value', snapshot => {
        let totalRevenue = 0;
        let totalExpenses = 0;
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const entry = child.val();
                if (entry.type === 'entrada') totalRevenue += entry.amount;
                if (entry.type === 'saida') totalExpenses += entry.amount;
            });
        }
        totalRevenueEl.textContent = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
        totalExpensesEl.textContent = `R$ ${totalExpenses.toFixed(2).replace('.', ',')}`;
        currentBalanceEl.textContent = `R$ ${(totalRevenue - totalExpenses).toFixed(2).replace('.', ',')}`;
    });

    salesRef.orderByChild('createdAt').on('value', snapshot => {
        salesReportTableBody.innerHTML = '';
        if (!snapshot.exists()) {
            salesReportTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhuma venda registrada.</td></tr>';
            return;
        }
        let salesData = [];
        snapshot.forEach(child => { salesData.push(child.val()); });
        
        salesData.reverse().forEach(sale => {
            const saleDate = new Date(sale.createdAt).toLocaleDateString('pt-BR');
            const itemsSummary = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
            salesReportTableBody.innerHTML += `
                <tr class="border-b border-gray-700">
                    <td class="p-2">${saleDate}</td>
                    <td class="p-2">${sale.customer.name}</td>
                    <td class="p-2 text-sm">${itemsSummary}</td>
                    <td class="p-2 text-right font-semibold">R$ ${sale.total.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
        
        exportSalesBtn.onclick = () => exportToCSV(salesData, 'relatorio_vendas');
    });
}

async function confirmOrder(orderId) {
    if (!confirm('Esta ação irá registrar a venda, lançar no caixa e dar baixa no estoque. Deseja continuar?')) return;
    const orderSnapshot = await db.ref(`pedidos/${orderId}`).once('value');
    if (!orderSnapshot.exists()) { alert("Pedido não encontrado ou já processado."); return; }
    const order = orderSnapshot.val();
    for (const item of order.items) {
        const productSnapshot = await db.ref(`estoque/${item.id}/quantity`).once('value');
        const currentQuantity = productSnapshot.val();
        if (currentQuantity < item.quantity) {
            alert(`Erro: Estoque insuficiente para o produto "${item.name}". Apenas ${currentQuantity} unidade(s) disponível(eis).`);
            return;
        }
    }
    try {
        const saleData = { items: order.items, total: order.total, createdAt: firebase.database.ServerValue.TIMESTAMP, seller: auth.currentUser.email, customer: {name: order.customerName, whatsapp: order.customerWhatsapp} };
        const saleRef = await db.ref('vendas').push(saleData);
        await db.ref('fluxoDeCaixa').push({ type: 'entrada', description: `Venda #${saleRef.key}`, amount: order.total, createdAt: firebase.database.ServerValue.TIMESTAMP });
        const updates = {};
        for (const item of order.items) {
            const productSnapshot = await db.ref(`estoque/${item.id}/quantity`).once('value');
            updates[`/estoque/${item.id}/quantity`] = productSnapshot.val() - item.quantity;
        }
        await db.ref().update(updates);
        await db.ref(`pedidos/${orderId}`).remove();
        alert('Venda confirmada e processada com sucesso!');
    } catch (error) {
        console.error("Erro ao confirmar pedido:", error);
        alert("Ocorreu um erro ao processar o pedido.");
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
    try {
        await db.ref(`pedidos/${orderId}`).remove();
        alert('Pedido cancelado com sucesso.');
    } catch (error) {
        console.error("Erro ao cancelar pedido:", error);
        alert("Não foi possível cancelar o pedido.");
    }
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
    
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// INICIA O SISTEMA
displayProducts();
