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
    const publicArea = document.getElementById('public-area');
    const app = document.getElementById('app');
    
    auth.onAuthStateChanged(user => {
        if (user) {
            publicArea.style.display = 'none';
            app.style.display = 'block';
            toggleModal('loginModal', false);
            document.getElementById('currentUserName').textContent = user.email;
            initializeAdminPanel();
        } else {
            publicArea.style.display = 'block';
            app.style.display = 'none';
        }
    });

    // Event listeners dos modais e botões principais
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutButton').addEventListener('click', () => auth.signOut());
    document.getElementById('admin-login-btn').addEventListener('click', () => toggleModal('loginModal', true));
    
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('.modal-container').id;
            toggleModal(modalId, false);
        });
    });

    displayProducts();
});

function handleLogin(e) {
    e.preventDefault();
    const loginError = document.getElementById('loginError');
    loginError.textContent = '';
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    auth.signInWithEmailAndPassword(email, password).catch(error => {
        loginError.textContent = 'E-mail ou senha incorretos.';
    });
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}


// ======================= LÓGICA DE GESTÃO DE ESTOQUE E COMPRAS =======================
function setupInventoryControls() {
    document.getElementById('newProductBtn').addEventListener('click', () => {
        editingProductId = null;
        const productForm = document.getElementById('productForm');
        productForm.reset();
        document.getElementById('productModalTitle').textContent = 'Adicionar Novo Produto';
        document.getElementById('productImage').required = true;
        toggleModal('productModal', true);
    });
    document.getElementById('productForm').addEventListener('submit', handleProductSave);
    document.getElementById('register-purchase-btn').addEventListener('click', () => {
        document.getElementById('purchaseForm').reset();
        document.getElementById('purchase-items-list').innerHTML = '';
        addPurchaseItemRow();
        toggleModal('purchaseModal', true)
    });
    document.getElementById('add-purchase-item-btn').addEventListener('click', addPurchaseItemRow);
    document.getElementById('purchaseForm').addEventListener('submit', handlePurchaseSave);
}

async function handleProductSave(e) {
    e.preventDefault();
    const saveProductBtn = document.getElementById('saveProductBtn');
    let productData = { name: document.getElementById('productName').value, price: parseFloat(document.getElementById('productPrice').value), quantity: parseInt(document.getElementById('productQuantity').value), description: document.getElementById('productDescription').value, alertLevel: parseInt(document.getElementById('productAlertLevel').value) || 1 };
    saveProductBtn.disabled = true; saveProductBtn.innerHTML = 'Salvando...';
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
        if (editingProductId) { await db.ref(`estoque/${editingProductId}`).update(productData); alert('Produto atualizado!'); } else { productData.createdAt = firebase.database.ServerValue.TIMESTAMP; await db.ref('estoque').push(productData); alert('Produto cadastrado!'); }
        toggleModal('productModal', false);
    } catch (error) { console.error('Erro ao salvar produto:', error); alert('Ocorreu um erro.'); } finally { saveProductBtn.disabled = false; saveProductBtn.innerHTML = 'Salvar'; editingProductId = null; }
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
    toggleModal('productModal', true);
}

async function deleteProduct(productId) {
    if (!confirm(`Excluir "${fullInventory[productId].name}"?`)) return;
    try { await db.ref(`estoque/${productId}`).remove(); alert('Produto excluído.'); } catch (error) { console.error('Erro ao excluir:', error); alert('Erro ao excluir.'); }
}

function addPurchaseItemRow() {
    const list = document.getElementById('purchase-items-list');
    const itemIndex = list.children.length;
    const itemRow = document.createElement('div');
    itemRow.className = 'grid grid-cols-5 gap-2 items-center';
    itemRow.innerHTML = `
        <input type="text" placeholder="Nome do Produto" class="form-input col-span-2 purchase-item-name" list="inventory-datalist" data-index="${itemIndex}">
        <input type="number" placeholder="Qtd" class="form-input purchase-item-quantity">
        <input type="number" step="0.01" placeholder="Custo/Un" class="form-input purchase-item-cost">
        <input type="number" step="0.01" placeholder="Venda/Un" class="form-input purchase-item-price">
        <button type="button" class="text-red-500 hover:text-red-400" onclick="this.parentElement.remove()">Remover</button>
    `;
    list.appendChild(itemRow);
    itemRow.querySelector('.purchase-item-name').addEventListener('change', (e) => populatePurchaseItem(e.target));
}

function populatePurchaseItem(inputElement) {
    const productName = inputElement.value;
    const productKey = Object.keys(fullInventory).find(key => fullInventory[key].name === productName);
    if (productKey) {
        const product = fullInventory[productKey];
        const row = inputElement.parentElement;
        row.querySelector('.purchase-item-price').value = product.price;
        row.querySelector('.purchase-item-price').disabled = true;
    } else {
        const row = inputElement.parentElement;
        row.querySelector('.purchase-item-price').disabled = false;
    }
}

async function handlePurchaseSave(e) {
    e.preventDefault();
    const supplierId = document.getElementById('purchaseSupplier').value;
    const totalAmount = parseFloat(document.getElementById('purchaseTotal').value);
    const itemRows = document.querySelectorAll('#purchase-items-list > div');
    if(itemRows.length === 0 || !supplierId || !totalAmount) { alert('Preencha todos os campos da nota.'); return; }

    try {
        const updates = {};
        for (const row of itemRows) {
            const name = row.querySelector('.purchase-item-name').value;
            const quantity = parseInt(row.querySelector('.purchase-item-quantity').value);
            const price = parseFloat(row.querySelector('.purchase-item-price').value);
            if (!name || !quantity || !price) continue;
            
            const productKey = Object.keys(fullInventory).find(key => fullInventory[key].name.toLowerCase() === name.toLowerCase());
            if (productKey) {
                const newQuantity = (fullInventory[productKey].quantity || 0) + quantity;
                updates[`/estoque/${productKey}/quantity`] = newQuantity;
            } else {
                const newProductData = { name, price, quantity, description: '', alertLevel: 1, createdAt: firebase.database.ServerValue.TIMESTAMP, imageUrl: 'https://placehold.co/600x400/222/fff?text=SEM+IMAGEM' };
                const newProductKey = db.ref('estoque').push().key;
                updates[`/estoque/${newProductKey}`] = newProductData;
            }
        }
        await db.ref().update(updates);
        const transactionData = { description: `Compra: ${document.getElementById('purchaseSupplier').options[document.getElementById('purchaseSupplier').selectedIndex].text}`, amount: totalAmount, type: 'saida', status: 'pendente', createdAt: firebase.database.ServerValue.TIMESTAMP };
        await db.ref('fluxoDeCaixa').push(transactionData);
        alert('Compra registrada! Estoque atualizado e conta a pagar lançada.');
        toggleModal('purchaseModal', false);
    } catch(error) { console.error("Erro ao registrar compra:", error); alert("Ocorreu um erro."); }
}

// ======================= LÓGICA DA VITRINE PÚBLICA E CARRINHO =======================
function displayProducts() {
    const productGrid = document.getElementById('product-grid');
    db.ref('estoque').orderByChild('createdAt').on('value', snapshot => {
        productGrid.innerHTML = '';
        if (!snapshot.exists()) { productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Nenhum produto cadastrado.</p>'; return; }
        const products = [];
        snapshot.forEach(child => products.push({ id: child.key, ...child.val() }));
        products.reverse().forEach(product => {
            const outOfStock = product.quantity <= 0;
            productGrid.innerHTML += `<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700/50 flex flex-col"><div class="relative"><img src="${product.imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">${outOfStock ? '<div class="absolute inset-0 bg-black/70 flex items-center justify-center"><span class="text-white font-bold text-xl">ESGOTADO</span></div>' : ''}</div><div class="p-4 flex flex-col flex-grow"><h3 class="font-semibold text-lg text-white flex-grow">${product.name}</h3><p class="text-cyan-400 mt-2 text-2xl font-bold">R$ ${product.price.toFixed(2).replace('.', ',')}</p><button data-product-id="${product.id}" ${outOfStock ? 'disabled' : ''} class="add-to-cart-btn mt-4 w-full bg-cyan-500 text-black font-bold py-2 rounded-lg transition-colors ${outOfStock ? 'bg-gray-600 cursor-not-allowed' : 'hover:bg-cyan-400'}">Adicionar ao Carrinho</button></div></div>`;
        });
    });
    
    productGrid.addEventListener('click', e => { if (e.target.classList.contains('add-to-cart-btn')) addToPublicCart(e.target.dataset.productId); });
    document.getElementById('public-cart-btn').addEventListener('click', displayCheckoutModal);
    document.getElementById('checkoutForm').addEventListener('submit', handleOrderSubmit);
}
//... (O restante do código do app.js continua aqui, idêntico ao da versão anterior)
// Adicionei apenas a parte relevante para a correção
// A partir daqui, as funções são as mesmas da resposta anterior:
// addToPublicCart, removeFromPublicCart, updatePublicCartDisplay, displayCheckoutModal, handleOrderSubmit
// initializeAdminPanel, displayInventoryTable, checkLowStockAlerts, displayOrders, confirmOrder, cancelOrder
// setupFinancialControls, displayFinancialDashboard, displaySalesReport, exportToCSV
// setupSupplierControls, displaySuppliersList, deleteSupplier
