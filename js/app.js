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
    const loginModal = document.getElementById('loginModal');
    
    auth.onAuthStateChanged(user => {
        if (user) {
            publicArea.style.display = 'none';
            app.style.display = 'block';
            loginModal.classList.add('hidden');
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
    
    // Adiciona event listeners para todos os botões de fechar modais
    document.querySelectorAll('.close-modal-btn, .modal-container').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) { // Apenas se clicar no fundo ou no botão específico
                const modalId = e.currentTarget.closest('.modal-container').id;
                toggleModal(modalId, false);
            }
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
    document.getElementById('register-purchase-btn').addEventListener('click', () => toggleModal('purchaseModal', true));
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
    }
}

async function handlePurchaseSave(e) {
    e.preventDefault();
    const supplierId = document.getElementById('purchaseSupplier').value;
    const totalAmount = parseFloat(document.getElementById('purchaseTotal').value);
    const itemRows = document.querySelectorAll('#purchase-items-list > div');
    if(itemRows.length === 0) { alert('Adicione pelo menos um item à nota.'); return; }

    try {
        const updates = {};
        for (const row of itemRows) {
            const name = row.querySelector('.purchase-item-name').value;
            const quantity = parseInt(row.querySelector('.purchase-item-quantity').value);
            const price = parseFloat(row.querySelector('.purchase-item-price').value);
            if (!name || !quantity || !price) { alert('Preencha todos os campos dos itens.'); return; }
            
            const productKey = Object.keys(fullInventory).find(key => fullInventory[key].name.toLowerCase() === name.toLowerCase());
            
            if (productKey) { // Produto existente
                const newQuantity = fullInventory[productKey].quantity + quantity;
                updates[`/estoque/${productKey}/quantity`] = newQuantity;
            } else { // Novo produto
                const newProductData = { name, price, quantity, description: '', alertLevel: 1, createdAt: firebase.database.ServerValue.TIMESTAMP };
                const newProductKey = db.ref('estoque').push().key;
                updates[`/estoque/${newProductKey}`] = newProductData;
            }
        }
        
        await db.ref().update(updates);

        const transactionData = { description: `Compra do fornecedor: ${document.getElementById('purchaseSupplier').options[document.getElementById('purchaseSupplier').selectedIndex].text}`, amount: totalAmount, type: 'saida', status: 'pendente', createdAt: firebase.database.ServerValue.TIMESTAMP };
        await db.ref('fluxoDeCaixa').push(transactionData);

        alert('Registro de compra finalizado com sucesso! Estoque atualizado e conta a pagar lançada.');
        toggleModal('purchaseModal', false);
        document.getElementById('purchase-items-list').innerHTML = '';
        document.getElementById('purchaseForm').reset();
    } catch(error) {
        console.error("Erro ao registrar compra:", error);
        alert("Ocorreu um erro ao processar a compra.");
    }
}

// ======================= LÓGICA DA VITRINE PÚBLICA E CARRINHO =======================
function displayProducts() {
    // ... (lógica inalterada)
}

// ... (todas as funções de addToPublicCart, removeFromPublicCart, updatePublicCartDisplay, displayCheckoutModal, handleOrderSubmit permanecem as mesmas)


// ======================= LÓGICA DO PAINEL DE GESTÃO (VISUALIZAÇÃO) =======================
function initializeAdminPanel() {
    setupInventoryControls();
    setupFinancialControls();
    setupSupplierControls();
    displayOrders();
    displayInventoryTable();
    checkLowStockAlerts();
}

function displayInventoryTable() {
    const inventoryRef = db.ref('estoque');
    inventoryRef.on('value', snapshot => {
        fullInventory = snapshot.val() || {};
        const inventoryTableBody = document.getElementById('inventory-table-body');
        inventoryTableBody.innerHTML = '';

        if (!snapshot.exists()) { inventoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum produto cadastrado.</td></tr>'; return; }
        
        // Cria um datalist para autocomplete na tela de compras
        const dataList = document.createElement('datalist');
        dataList.id = 'inventory-datalist';
        Object.values(fullInventory).forEach(p => { dataList.innerHTML += `<option value="${p.name}">`});
        document.body.appendChild(dataList);

        snapshot.forEach(child => {
            const product = { id: child.key, ...child.val() };
            const isLowStock = product.quantity <= product.alertLevel;
            inventoryTableBody.innerHTML += `<tr class="border-b border-gray-700"><td class="p-2">${product.name}</td><td class="p-2 ${isLowStock ? 'text-red-400 font-bold' : ''}">${product.quantity}</td><td class="p-2 text-right">R$ ${product.price.toFixed(2).replace('.', ',')}</td><td class="p-2 text-center flex gap-2 justify-center"><button onclick="editProduct('${product.id}')" class="text-blue-400 hover:text-blue-300">Editar</button><button onclick="deleteProduct('${product.id}')" class="text-red-500 hover:text-red-400">Excluir</button></td></tr>`;
        });
    });
}

// ... (funções de displayOrders, confirmOrder, cancelOrder, checkLowStockAlerts, e módulo financeiro/relatórios permanecem as mesmas da versão anterior)


// ======================= MÓDULO DE FORNECEDORES =======================
function setupSupplierControls() {
    document.getElementById('manage-suppliers-btn').addEventListener('click', () => {
        displaySuppliersList();
        toggleModal('suppliersModal', true);
    });
    document.getElementById('supplierForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('supplierName');
        const contactInput = document.getElementById('supplierContact');
        const supplierData = { name: nameInput.value, contact: contactInput.value };
        try {
            await db.ref('fornecedores').push(supplierData);
            nameInput.value = ''; contactInput.value = '';
        } catch (error) { console.error("Erro ao adicionar fornecedor:", error); }
    });
}

function displaySuppliersList() {
    const listEl = document.getElementById('suppliers-list');
    const selectEl = document.getElementById('purchaseSupplier');
    db.ref('fornecedores').on('value', snapshot => {
        listEl.innerHTML = '';
        selectEl.innerHTML = '<option value="">Selecione...</option>';
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const supplier = { id: child.key, ...child.val() };
                listEl.innerHTML += `<div class="bg-gray-700 p-2 rounded flex justify-between items-center"><p>${supplier.name} <span class="text-sm text-gray-400">${supplier.contact}</span></p><button onclick="deleteSupplier('${supplier.id}')" class="text-red-500 hover:text-red-400">&times;</button></div>`;
                selectEl.innerHTML += `<option value="${supplier.id}">${supplier.name}</option>`;
            });
        }
    });
}

async function deleteSupplier(supplierId) {
    if (!confirm('Tem certeza?')) return;
    try { await db.ref(`fornecedores/${supplierId}`).remove(); } catch (error) { console.error("Erro ao excluir fornecedor:", error); }
}
