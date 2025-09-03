// COLE AQUI A CONFIGURAÇÃO DO FIREBASE QUE VOCÊ GEROU NO SEU PAINEL
  const firebaseConfig = {
    apiKey: "AIzaSyARb-0QE9QcYD2OjkCsOj0pmKTgkJQRlSg",
    authDomain: "vipcell-gestor.firebaseapp.com",
    projectId: "vipcell-gestor",
    storageBucket: "vipcell-gestor.firebasestorage.app",
    messagingSenderId: "259960306679",
    appId: "1:259960306679:web:ad7a41cd1842862f7f8cf2"
  };

// INICIALIZAÇÃO DO SISTEMA
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Seletores de elementos DOM
const publicArea = document.getElementById('public-area');
const app = document.getElementById('app');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const adminLoginBtn = document.getElementById('admin-login-btn');
const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
const logoutButton = document.getElementById('logoutButton');
const currentUserName = document.getElementById('currentUserName');

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

// CONTROLES DO MODAL
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
