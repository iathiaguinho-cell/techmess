document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // 1. CONFIGURAÇÕES E INICIALIZAÇÃO
    // =================================================================================

    // O Firebase é inicializado automaticamente pelo /__/firebase/init.js.
    // As credenciais estão seguras e não ficam expostas no código.
    const auth = firebase.auth();
    const db = firebase.database();

    // Configurações do Cloudinary
    const cloudinaryConfig = {
        cloudName: "dmuvm1o6m",
        uploadPreset: "poh3ej4m"
    };

    // =================================================================================
    // 2. ESTADO DA APLICAÇÃO E ELEMENTOS DO DOM
    // =================================================================================

    const appContainer = document.getElementById('app-container');
    const modalContainer = document.getElementById('modal-container');
    let cart = []; // Carrinho de compras da vitrine

    // =================================================================================
    // 3. FUNÇÕES UTILITÁRIAS (HELPERS)
    // =================================================================================

    const showModal = (content, size = 'max-w-md') => {
        modalContainer.innerHTML = `<div class="bg-gray-800 rounded-lg shadow-xl w-full ${size} p-6 m-4 overflow-y-auto max-h-full">${content}</div>`;
        modalContainer.classList.remove('hidden');
        modalContainer.classList.add('flex');
    };

    const closeModal = () => {
        modalContainer.innerHTML = '';
        modalContainer.classList.add('hidden');
        modalContainer.classList.remove('flex');
    };
    
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeModal();
        }
    });

    const uploadImage = async (file, statusElement) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        statusElement.textContent = 'Enviando imagem...';
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }
            statusElement.textContent = 'Upload concluído!';
            return data.secure_url;
        } catch (error) {
            console.error('Erro no upload da imagem:', error);
            statusElement.textContent = `Falha no envio: ${error.message}`;
            return null;
        }
    };

    // =================================================================================
    // 4. AUTENTICAÇÃO
    // =================================================================================

    auth.onAuthStateChanged(user => {
        // Simplesmente renderiza o painel se logado, ou a vitrine se não.
        // A navegação para /admin (ou qualquer outra rota) pode ser tratada por regras de segurança do Firebase.
        if (user) {
            renderAdminPanel();
        } else {
            renderStorefront();
        }
    });

    const handleLogin = (email, password) => {
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => alert(`Falha no login: ${error.message}`));
    };

    const handleLogout = () => auth.signOut();

    // =================================================================================
    // 5. LÓGICA DO CARRINHO E PEDIDOS (VITRINE)
    // =================================================================================
    
    const addToCart = async (productId) => {
        const productRef = db.ref(`estoque/${productId}`);
        const snapshot = await productRef.once('value');
        const product = snapshot.val();
    
        if (product && product.quantidade > 0) {
            const cartItem = cart.find(item => item.id === productId);
            if (cartItem) {
                if (cartItem.quantity < product.quantidade) {
                     cartItem.quantity++;
                } else {
                    alert('Quantidade máxima em estoque atingida para este item.');
                    return;
                }
            } else {
                cart.push({ id: productId, name: product.nome, price: product.preco, quantity: 1 });
            }
            updateCartCount();
            alert(`${product.nome} adicionado ao carrinho!`);
        } else {
            alert('Produto esgotado ou não encontrado.');
        }
    };
    
    const updateCartCount = () => {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
        }
    };
    
    const placeOrder = async (customerName, customerWhatsapp) => {
        if (cart.length === 0 || !customerName || !customerWhatsapp) {
            alert('Por favor, preencha todos os campos e adicione itens ao carrinho.');
            return;
        }
    
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderData = {
            nome: customerName,
            whatsapp: customerWhatsapp,
            items: cart,
            total: total,
            data: new Date().toISOString(),
            status: 'Pendente'
        };
    
        try {
            await db.ref('pedidos').push(orderData);
            alert('Pedido enviado com sucesso! Entraremos em contato em breve.');
            cart = [];
            updateCartCount();
            closeModal();
        } catch (error) {
            console.error('Erro ao finalizar pedido:', error);
            alert('Ocorreu um erro ao enviar seu pedido.');
        }
    };

    // =================================================================================
    // 6. LÓGICA DE NEGÓCIOS (ADMIN)
    // =================================================================================

    const saveProduct = async (productId, productData) => {
        const isNewProduct = !productId;
        const ref = isNewProduct ? db.ref('estoque').push() : db.ref(`estoque/${productId}`);
        const finalProductId = isNewProduct ? ref.key : productId;

        const oldDataSnap = !isNewProduct ? await db.ref(`estoque/${productId}`).once('value') : null;
        const oldData = oldDataSnap ? oldDataSnap.val() : { quantidade: 0 };
    
        try {
            await ref.set(productData);
    
            const qtdChange = productData.quantidade - oldData.quantidade;
            if (qtdChange !== 0) {
                const kardexId = db.ref(`kardex/${finalProductId}`).push().key;
                await db.ref(`kardex/${finalProductId}/${kardexId}`).set({
                    data: new Date().toISOString(),
                    tipo: isNewProduct ? 'ENTRADA INICIAL' : (qtdChange > 0 ? 'AJUSTE ENTRADA' : 'AJUSTE SAÍDA'),
                    quantidade: Math.abs(qtdChange),
                    motivo: isNewProduct ? 'Criação de produto' : 'Edição manual de produto'
                });
            }
    
            alert('Produto salvo com sucesso!');
            closeModal();
            renderAdminPanel('estoque');
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Falha ao salvar o produto.');
        }
    };

    const confirmSale = async (pedidoId) => {
        const pedidoRef = db.ref(`pedidos/${pedidoId}`);
        const pedidoSnap = await pedidoRef.once('value');
        const pedido = pedidoSnap.val();
    
        if (!pedido) {
            alert('Pedido não encontrado.');
            return;
        }
    
        const updates = {};
        const kardexUpdates = {};
        const vendaId = db.ref('vendas').push().key;
        
        updates[`/vendas/${vendaId}`] = {
            clienteNome: pedido.nome,
            whatsapp: pedido.whatsapp,
            items: pedido.items,
            total: pedido.total,
            data: new Date().toISOString(),
            status: 'Confirmada'
        };
        
        updates[`/pedidos/${pedidoId}`] = null;
    
        for (const item of pedido.items) {
            const estoqueRef = db.ref(`estoque/${item.id}`);
            const snap = await estoqueRef.once('value');
            const produtoEmEstoque = snap.val();
    
            if (!produtoEmEstoque || produtoEmEstoque.quantidade < item.quantity) {
                alert(`Estoque insuficiente para o produto: ${item.name}. Venda não pode ser confirmada.`);
                return;
            }
            updates[`/estoque/${item.id}/quantidade`] = produtoEmEstoque.quantidade - item.quantity;
            
            const kardexId = db.ref(`kardex/${item.id}`).push().key;
            kardexUpdates[`/kardex/${item.id}/${kardexId}`] = {
                data: new Date().toISOString(),
                tipo: 'SAÍDA',
                quantidade: item.quantity,
                motivo: `Venda #${vendaId}`
            };
        }
        
        try {
            await db.ref().update({ ...updates, ...kardexUpdates });
            alert('Venda confirmada e estoque atualizado!');
        } catch (error) {
            console.error("Erro ao confirmar venda:", error);
            alert('Ocorreu um erro. A operação foi cancelada para garantir a integridade dos dados.');
        }
    };

    const cancelSale = async (pedidoId) => {
        if (confirm('Tem certeza que deseja cancelar este pedido?')) {
            const pedidoRef = db.ref(`pedidos/${pedidoId}`);
            const pedidoSnap = await pedidoRef.once('value');
            const pedido = pedidoSnap.val();

            const vendaId = db.ref('vendas').push().key;
            const updates = {};
            updates[`/vendas/${vendaId}`] = { ...pedido, status: 'Cancelado' };
            updates[`/pedidos/${pedidoId}`] = null;

            await db.ref().update(updates);
            alert('Pedido cancelado e movido para o histórico de vendas.');
        }
    };

    const exportVendasToCSV = async () => {
        const vendasSnap = await db.ref('vendas').once('value');
        const vendas = vendasSnap.val() || {};
        
        if (Object.keys(vendas).length === 0) {
            alert('Não há vendas para exportar.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID Venda,Data,Status,Cliente,Total,Itens\n";

        Object.keys(vendas).forEach(key => {
            const venda = vendas[key];
            const data = new Date(venda.data).toLocaleString('pt-BR');
            const total = venda.total.toFixed(2);
            const itens = venda.items.map(i => `${i.quantity}x ${i.name}`).join('; ');
            
            csvContent += `${key},"${data}","${venda.status}","${venda.clienteNome}","${total}","${itens}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_vendas_techmess.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // =================================================================================
    // 7. RENDERIZAÇÃO DE MODAIS
    // =================================================================================

    const showCartModal = () => {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let itemsHtml = cart.map(item => `
            <div class="flex justify-between items-center border-b border-gray-700 py-2">
                <span>${item.quantity}x ${item.name}</span>
                <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `).join('');

        if (cart.length === 0) {
            itemsHtml = '<p class="text-gray-400 text-center py-4">Seu carrinho está vazio.</p>';
        }

        const modalContent = `
            <h2 class="text-2xl font-bold mb-4 text-cyan-400">Seu Carrinho</h2>
            <div class="mb-4">${itemsHtml}</div>
            <div class="text-right font-bold text-xl mb-6">Total: R$ ${total.toFixed(2)}</div>
            <form id="order-form">
                <div class="space-y-4">
                    <input id="customer-name" type="text" placeholder="Seu nome completo" required>
                    <input id="customer-whatsapp" type="tel" placeholder="Seu WhatsApp (com DDD)" required>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="close-modal-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Fechar</button>
                    <button type="submit" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">Enviar Pedido</button>
                </div>
            </form>
        `;
        showModal(modalContent);
        
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);
        document.getElementById('order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            placeOrder(document.getElementById('customer-name').value, document.getElementById('customer-whatsapp').value);
        });
    };

    const showProductModal = async (productId = null) => {
        let product = { nome: '', descricao: '', preco: '', quantidade: '', nivelAlerta: 5, imagemUrl: '' };
        if (productId) {
            const snapshot = await db.ref(`estoque/${productId}`).once('value');
            product = snapshot.val();
        }

        const modalContent = `
            <h2 class="text-2xl font-bold mb-6 text-cyan-400">${productId ? 'Editar' : 'Adicionar'} Produto</h2>
            <form id="product-form">
                <input type="hidden" id="product-id" value="${productId || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-400 mb-1">Nome do Produto</label>
                        <input id="product-name" type="text" placeholder="Ex: iPhone 15 Pro" required value="${product.nome}">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                        <textarea id="product-desc" placeholder="Ex: 256GB, Titânio Azul" class="h-24">${product.descricao}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                        <input id="product-price" type="number" step="0.01" placeholder="Ex: 7999.90" required value="${product.preco}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Quantidade em Estoque</label>
                        <input id="product-qty" type="number" placeholder="Ex: 10" required value="${product.quantidade}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-1">Nível de Alerta</label>
                        <input id="product-alert" type="number" placeholder="Ex: 2" required value="${product.nivelAlerta}">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-400 mb-1">Imagem do Produto</label>
                        <input id="product-image-file" type="file" accept="image/*">
                        <span id="upload-status" class="text-sm text-cyan-400 block mt-1"></span>
                        <input id="product-image-url" type="hidden" value="${product.imagemUrl}">
                        ${product.imagemUrl ? `<img src="${product.imagemUrl}" class="w-20 h-20 object-cover rounded mt-2">` : ''}
                    </div>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-product-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                    <button type="submit" id="save-product-btn" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">Salvar</button>
                </div>
            </form>
        `;
        showModal(modalContent, 'max-w-3xl');

        document.getElementById('cancel-product-btn').addEventListener('click', closeModal);
        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('save-product-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Salvando...';

            const imageFile = document.getElementById('product-image-file').files[0];
            let imageUrl = document.getElementById('product-image-url').value;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile, document.getElementById('upload-status'));
                if (!imageUrl) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Salvar';
                    return;
                }
            }

            const productData = {
                nome: document.getElementById('product-name').value,
                descricao: document.getElementById('product-desc').value,
                preco: parseFloat(document.getElementById('product-price').value),
                quantidade: parseInt(document.getElementById('product-qty').value),
                nivelAlerta: parseInt(document.getElementById('product-alert').value),
                imagemUrl: imageUrl,
            };
            await saveProduct(document.getElementById('product-id').value, productData);
        });
    };
    
    const showKardexModal = async (productId) => {
        const productSnap = await db.ref(`estoque/${productId}`).once('value');
        const product = productSnap.val();
        
        const kardexSnap = await db.ref(`kardex/${productId}`).orderByChild('data').once('value');
        const movements = kardexSnap.val() || {};
        
        let movementsHtml = Object.values(movements).sort((a, b) => new Date(b.data) - new Date(a.data)).map(m => `
            <tr class="border-b border-gray-700">
                <td class="p-2">${new Date(m.data).toLocaleString('pt-BR')}</td>
                <td class="p-2 font-semibold ${m.tipo.includes('SAÍDA') ? 'text-red-400' : 'text-green-400'}">${m.tipo}</td>
                <td class="p-2">${m.quantidade}</td>
                <td class="p-2 text-gray-400">${m.motivo}</td>
            </tr>
        `).join('');

        const modalContent = `
            <h2 class="text-2xl font-bold mb-4 text-cyan-400">Kardex - ${product.nome}</h2>
            <div class="max-h-96 overflow-y-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-700 sticky top-0"><tr><th class="p-2">Data</th><th class="p-2">Tipo</th><th class="p-2">Qtd.</th><th class="p-2">Motivo</th></tr></thead>
                    <tbody>${movementsHtml || '<tr><td colspan="4" class="p-4 text-center">Nenhum movimento registrado.</td></tr>'}</tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                 <button type="button" id="close-kardex-btn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Fechar</button>
            </div>
        `;
        showModal(modalContent, 'max-w-4xl');
        document.getElementById('close-kardex-btn').addEventListener('click', closeModal);
    };
    
    // =================================================================================
    // 8. RENDERIZAÇÃO DE TELAS E ABAS
    // =================================================================================

    const renderLoginScreen = () => {
        appContainer.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-900">
                <div class="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h1 class="text-3xl font-bold text-center text-cyan-400 mb-6">Techmess</h1>
                    <h2 class="text-xl font-semibold text-center text-gray-300 mb-8">Acesso ao Painel de Gestão</h2>
                    <form id="login-form">
                        <div class="mb-4">
                            <label for="email" class="block text-gray-400 mb-2">Email</label>
                            <input type="email" id="email" class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition">
                        </div>
                        <div class="mb-6">
                            <label for="password" class="block text-gray-400 mb-2">Senha</label>
                            <input type="password" id="password" class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition">
                        </div>
                        <button type="submit" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-md transition duration-300">Entrar</button>
                    </form>
                    <p class="text-center mt-4"><a href="#" id="back-to-store" class="text-cyan-400 hover:underline">Voltar para a Loja</a></p>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', e => {
            e.preventDefault();
            handleLogin(document.getElementById('email').value, document.getElementById('password').value);
        });
        document.getElementById('back-to-store').addEventListener('click', e => {
            e.preventDefault();
            renderStorefront();
        });
    };

    const renderStorefront = () => {
        appContainer.innerHTML = `
            <header class="bg-gray-800 shadow-md sticky top-0 z-40">
                <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-cyan-400">Techmess</h1>
                    <div>
                        <button id="cart-button" class="relative text-gray-300 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span id="cart-count" class="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">${cart.reduce((total, item) => total + item.quantity, 0)}</span>
                        </button>
                        <button id="admin-login-button" class="ml-4 text-gray-300 hover:text-white text-sm">Admin</button>
                    </div>
                </nav>
            </header>
            <main class="container mx-auto px-6 py-8">
                <h2 class="text-3xl font-bold text-gray-100 mb-8">Nossos Produtos</h2>
                <div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    <p>Carregando produtos...</p>
                </div>
            </main>
        `;
    
        const productsRef = db.ref('estoque');
        productsRef.on('value', snapshot => {
            const products = snapshot.val();
            const productGrid = document.getElementById('product-grid');
            productGrid.innerHTML = ''; // Limpa a grade
    
            if (products) {
                Object.keys(products).forEach(key => {
                    const product = products[key];
                    const isOutOfStock = product.quantidade <= 0;
                    
                    // Construção segura do DOM para evitar XSS
                    const productCard = document.createElement('div');
                    productCard.className = `bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 ${isOutOfStock ? 'opacity-50' : ''}`;
                    
                    const img = document.createElement('img');
                    img.className = 'w-full h-48 object-cover';
                    img.src = product.imagemUrl || 'https://via.placeholder.com/400x300';
                    img.alt = product.nome;
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'p-4 flex flex-col flex-grow';
                    
                    const title = document.createElement('h3');
                    title.className = 'text-lg font-semibold text-gray-100';
                    title.textContent = product.nome;
                    
                    const description = document.createElement('p');
                    description.className = 'text-gray-400 mt-1 h-10 overflow-hidden text-sm';
                    description.textContent = product.descricao || 'Sem descrição.';
                    
                    const footerDiv = document.createElement('div');
                    footerDiv.className = 'flex justify-between items-center mt-4';
                    
                    const price = document.createElement('span');
                    price.className = 'text-xl font-bold text-cyan-400';
                    price.textContent = `R$ ${parseFloat(product.preco || 0).toFixed(2)}`;
                    
                    footerDiv.appendChild(price);
                    
                    if (isOutOfStock) {
                        const outOfStockLabel = document.createElement('span');
                        outOfStockLabel.className = 'text-red-500 font-semibold';
                        outOfStockLabel.textContent = 'Esgotado';
                        footerDiv.appendChild(outOfStockLabel);
                    } else {
                        const addButton = document.createElement('button');
                        addButton.dataset.id = key;
                        addButton.className = 'add-to-cart-btn bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition';
                        addButton.textContent = 'Adicionar';
                        footerDiv.appendChild(addButton);
                    }
                    
                    contentDiv.appendChild(title);
                    contentDiv.appendChild(description);
                    contentDiv.appendChild(footerDiv);
                    productCard.appendChild(img);
                    productCard.appendChild(contentDiv);
                    
                    productGrid.appendChild(productCard);
                });
            } else {
                productGrid.innerHTML = '<p class="col-span-full text-center text-gray-400">Nenhum produto encontrado no momento.</p>';
            }
        });

        document.getElementById('cart-button').addEventListener('click', showCartModal);
        document.getElementById('admin-login-button').addEventListener('click', renderLoginScreen);
        appContainer.addEventListener('click', e => {
            if (e.target && e.target.classList.contains('add-to-cart-btn')) {
                addToCart(e.target.dataset.id);
            }
        });
    };

    const renderAdminPanel = (activeTab = 'dashboard') => {
        appContainer.innerHTML = `
            <div class="flex h-screen bg-gray-900">
                <aside class="w-64 bg-gray-800 text-gray-200 flex flex-col">
                    <div class="h-16 flex items-center justify-center border-b border-gray-700">
                        <h1 class="text-2xl font-bold text-cyan-400">Techmess ERP</h1>
                    </div>
                    <nav id="admin-nav" class="flex-1 p-4 space-y-2">
                        <a href="#" data-tab="dashboard" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Dashboard</a>
                        <a href="#" data-tab="vendas" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Vendas</a>
                        <a href="#" data-tab="compras" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Compras</a>
                        <a href="#" data-tab="estoque" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Estoque</a>
                        <a href="#" data-tab="financeiro" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Financeiro</a>
                        <a href="#" data-tab="fornecedores" class="flex items-center px-4 py-2 rounded-md hover:bg-gray-700">Fornecedores</a>
                    </nav>
                    <div class="p-4 border-t border-gray-700">
                        <button id="logout-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Sair</button>
                    </div>
                </aside>
                <main id="admin-content" class="flex-1 p-8 overflow-y-auto">
                    <!-- Conteúdo da aba será carregado aqui -->
                </main>
            </div>
        `;

        document.querySelector(`#admin-nav a[data-tab="${activeTab}"]`).classList.add('bg-cyan-600', 'text-white');
        renderAdminTab(activeTab);

        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('admin-nav').addEventListener('click', e => {
            e.preventDefault();
            if (e.target.tagName === 'A' && e.target.dataset.tab) {
                renderAdminPanel(e.target.dataset.tab);
            }
        });
    };
    
    const renderAdminTab = (tab) => {
        const contentArea = document.getElementById('admin-content');
        if (!contentArea) return;

        const renderFunctions = {
            dashboard: renderDashboard,
            vendas: renderVendas,
            compras: renderCompras,
            estoque: renderEstoque,
            financeiro: renderFinanceiro,
            fornecedores: renderFornecedores
        };

        const renderFn = renderFunctions[tab] || (() => {
            contentArea.innerHTML = `<h1 class="text-2xl font-bold">Página não encontrada</h1>`;
        });
