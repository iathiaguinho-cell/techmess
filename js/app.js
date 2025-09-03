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

// Seletores de elementos DOM GERAIS
const publicArea = document.getElementById('public-area');
const app = document.getElementById('app');
const currentUserName = document.getElementById('currentUserName');

// Seletores do Modal de LOGIN
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
  } else {
    publicArea.classList.remove('hidden');
    app.classList.add('hidden');
  }
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      loginError.textContent = 'E-mail ou senha incorretos.';
    });
});

logoutButton.addEventListener('click', () => {
  auth.signOut();
});

// CONTROLES DO MODAL DE LOGIN
adminLoginBtn.addEventListener('click', () => {
  loginModal.classList.remove('hidden');
  loginModal.classList.add('flex');
});
closeLoginModalBtn.addEventListener('click', () => {
  loginModal.classList.add('hidden');
  loginModal.classList.remove('flex');
});
loginModal.addEventListener('click', (e) => {
    if (e.target.id === 'loginModal') {
        loginModal.classList.add('hidden');
        loginModal.classList.remove('flex');
    }
});

/* ==================================================================
LÓGICA DE GESTÃO DE ESTOQUE
================================================================== */

// Seletores para o modal de PRODUTO
const productModal = document.getElementById('productModal');
const newProductBtn = document.getElementById('newProductBtn');
const closeProductModalBtn = document.getElementById('closeProductModalBtn');
const productForm = document.getElementById('productForm');
const saveProductBtn = document.getElementById('saveProductBtn');

// Abrir o modal de produto
newProductBtn.addEventListener('click', () => {
  productForm.reset();
  document.getElementById('productModalTitle').textContent = 'Adicionar Novo Produto';
  productModal.classList.remove('hidden');
  productModal.classList.add('flex');
});

// Fechar o modal de produto
closeProductModalBtn.addEventListener('click', () => {
  productModal.classList.add('hidden');
  productModal.classList.remove('flex');
});

// Lógica para salvar o produto (COM CLOUDINARY)
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const productName = document.getElementById('productName').value;
  const productPrice = parseFloat(document.getElementById('productPrice').value);
  const productImageFile = document.getElementById('productImage').files[0];
  
  if (!productImageFile) {
    alert('Por favor, selecione uma imagem.');
    return;
  }
  
  saveProductBtn.disabled = true;
  saveProductBtn.innerHTML = 'Enviando imagem...';
  
  const formData = new FormData();
  formData.append('file', productImageFile);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Falha no upload da imagem.');
    
    const data = await response.json();
    const imageUrl = data.secure_url;
    
    saveProductBtn.innerHTML = 'Salvando produto...';
    
    const productData = {
      name: productName,
      price: productPrice,
      imageUrl: imageUrl,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    await db.ref('estoque').push(productData);
    
    alert('Produto cadastrado com sucesso!');
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    alert('Ocorreu um erro ao salvar o produto. Tente novamente.');
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.innerHTML = 'Salvar Produto';
  }
});


/* ==================================================================
LÓGICA DA VITRINE PÚBLICA
================================================================== */

function displayProducts() {
  const productsRef = db.ref('estoque').orderByChild('createdAt');
  const productGrid = document.getElementById('product-grid');
  
  productsRef.on('value', (snapshot) => {
    productGrid.innerHTML = '';
    
    if (!snapshot.exists()) {
      productGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Nenhum produto cadastrado no momento.</p>';
      return;
    }
    
    const products = [];
    snapshot.forEach(childSnapshot => {
        products.push(childSnapshot.val());
    });

    products.reverse().forEach(product => {
        const productCardHTML = `
        <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700/50 flex flex-col">
          <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-56 object-cover">
          <div class="p-4 flex flex-col flex-grow">
            <h3 class="font-semibold text-lg text-white flex-grow">${product.name}</h3>
            <p class="text-cyan-400 mt-2 text-2xl font-bold">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      `;
      productGrid.innerHTML += productCardHTML;
    });
  });
}

// Inicia a exibição dos produtos quando a página carrega
displayProducts();
