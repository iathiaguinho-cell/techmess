// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyARb-0QE9QcYD2OjkCsOj0pmKTgkJQRlSg",
  authDomain: "vipcell-gestor.firebaseapp.com",
  projectId: "vipcell-gestor",
  storageBucket: "vipcell-gestor.appspot.com",
  messagingSenderId: "259960306679",
  appId: "1:259960306679:web:ad7a41cd1842862f7f8cf2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Funções Auxiliares
function show(elementId) {
  document.getElementById(elementId).classList.remove('hidden');
}

function hide(elementId) {
  document.getElementById(elementId).classList.add('hidden');
}

// Autenticação
function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      hide('login');
      show('dashboard');
    })
    .catch(error => alert(error.message));
}

// Vitrine Pública
function loadProducts() {
  db.ref('estoque').on('value', snapshot => {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    snapshot.forEach(productSnapshot => {
      const product = productSnapshot.val();
      if (product.quantidade > 0) {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${product.nome}</strong> - R$ ${product.preco} <button onclick="addToCart('${productSnapshot.key}')">Adicionar ao Carrinho</button>`;
        productList.appendChild(li);
      } else {
        const li = document.createElement('li');
        li.textContent = `${product.nome} - Esgotado`;
        productList.appendChild(li);
      }
    });
  });
}

function addToCart(productId) {
  let cart = JSON.parse(localStorage.getItem('cart')) || {};
  cart[productId] = (cart[productId] || 0) + 1;
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCart();
}

function updateCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  const cartItems = document.getElementById('cartItems');
  cartItems.innerHTML = '';
  let total = 0;

  db.ref('estoque').once('value').then(snapshot => {
    for (const [key, quantity] of Object.entries(cart)) {
      const product = snapshot.val()[key];
      if (product) {
        const li = document.createElement('li');
        li.innerHTML = `${product.nome} x${quantity} - Subtotal: R$ ${(product.preco * quantity).toFixed(2)} <button onclick="removeFromCart('${key}')">Remover</button>`;
        cartItems.appendChild(li);
        total += product.preco * quantity;
      }
    }

    document.getElementById('cartTotal').textContent = total.toFixed(2);
  });
}

function removeFromCart(productId) {
  let cart = JSON.parse(localStorage.getItem('cart')) || {};
  if (cart[productId]) {
    if (cart[productId] === 1) {
      delete cart[productId];
    } else {
      cart[productId]--;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCart();
  }
}

function checkout() {
  const name = prompt('Informe seu nome:');
  const whatsapp = prompt('Informe seu WhatsApp:');
  if (name && whatsapp) {
    const cart = JSON.parse(localStorage.getItem('cart')) || {};
    db.ref('pedidos').push({
      cliente: { nome: name, whatsapp },
      itens: cart,
      status: 'pendente'
    });

    localStorage.removeItem('cart');
    updateCart();
    alert('Pedido realizado com sucesso!');
  }
}

// Inicialização
auth.onAuthStateChanged(user => {
  if (user) {
    hide('login');
    show('dashboard');
    loadProducts();
  } else {
    hide('dashboard');
    show('login');
  }
});