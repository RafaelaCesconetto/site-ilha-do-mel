/**
 * carrinho.js — Ilha do Mel
 * -----------------------------------------------------------------------
 * Controla o carrinho de compras: adicionar/remover itens, persistência em
 * localStorage, gaveta lateral (drawer), simulação de frete e pagamento.
 *
 * IMPORTANTE: este projeto é um PROTÓTIPO de apresentação. Não há backend,
 * não há processamento real de pagamento e o formulário de cartão NÃO deve
 * ser preenchido com dados reais — ele existe apenas para demonstrar o
 * fluxo visual de checkout.
 * -----------------------------------------------------------------------
 */

import produtos from './produtos.js';

const STORAGE_KEY = 'ilha-do-mel-cart';

/** Estado do carrinho em memória: [{ id, qtd }] */
let cart = carregarCarrinho();

/** Estado da etapa de checkout (persistido só em memória, não precisa sobreviver a refresh) */
const checkout = {
  entrega: null,      // 'retirada' | 'correios'
  cep: '',
  frete: 0,
  pagamento: null,     // 'pix' | 'cartao'
};

// ---------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------

function carregarCarrinho() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function salvarCarrinho() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  atualizarContadorHeader();
  renderConteudoCarrinho();
}

// ---------------------------------------------------------------------
// Helpers de dados
// ---------------------------------------------------------------------

function buscarProduto(id) {
  return produtos.find(p => p.id === id);
}

function itemComDados(itemCarrinho) {
  const produto = buscarProduto(itemCarrinho.id);
  return produto ? { ...produto, qtd: itemCarrinho.qtd } : null;
}

function subtotalCarrinho() {
  return cart.reduce((soma, item) => {
    const produto = buscarProduto(item.id);
    return produto ? soma + produto.preco * item.qtd : soma;
  }, 0);
}

function formatarMoeda(valor) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function iniciais(nome) {
  return nome.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('');
}

// ---------------------------------------------------------------------
// 1. Adicionar ao carrinho
// ---------------------------------------------------------------------

export function adicionarAoCarrinho(id) {
  const produto = buscarProduto(id);
  if (!produto) return;

  const existente = cart.find(item => item.id === id);
  if (existente) {
    existente.qtd += 1;
  } else {
    cart.push({ id, qtd: 1 });
  }
  salvarCarrinho();
}

// ---------------------------------------------------------------------
// 2. Remover e alterar quantidade
// ---------------------------------------------------------------------

export function removerDoCarrinho(id) {
  cart = cart.filter(item => item.id !== id);
  salvarCarrinho();
}

export function aumentarQuantidade(id) {
  const item = cart.find(i => i.id === id);
  if (item) item.qtd += 1;
  salvarCarrinho();
}

export function diminuirQuantidade(id) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qtd -= 1;
  if (item.qtd <= 0) {
    removerDoCarrinho(id); // já chama salvarCarrinho()
    return;
  }
  salvarCarrinho();
}

// ---------------------------------------------------------------------
// Contador no ícone do header
// ---------------------------------------------------------------------

function atualizarContadorHeader() {
  const el = document.getElementById('cart-count');
  if (!el) return;
  const total = cart.reduce((soma, item) => soma + item.qtd, 0);
  el.textContent = total;
}

// ---------------------------------------------------------------------
// 3. Gaveta lateral (drawer) — construção do DOM
// ---------------------------------------------------------------------

function montarEstruturaDrawer() {
  let root = document.getElementById('cart-drawer-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'cart-drawer-root';
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <div id="cart-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] hidden opacity-0 transition-opacity duration-300"></div>

    <aside id="cart-drawer"
      class="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-panel border-l border-line z-[70]
             translate-x-full transition-transform duration-300 flex flex-col">

      <div class="flex items-center justify-between px-5 py-4 border-b border-line">
        <h2 class="font-display text-lg font-semibold text-cream">Seu carrinho</h2>
        <button id="cart-close-btn" class="text-muted hover:text-gold text-2xl leading-none">&times;</button>
      </div>

      <div id="cart-body" class="flex-1 overflow-y-auto px-5 py-4"></div>
    </aside>
  `;

  document.getElementById('cart-overlay').addEventListener('click', fecharCarrinho);
  document.getElementById('cart-close-btn').addEventListener('click', fecharCarrinho);
}

export function abrirCarrinho() {
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    drawer.classList.remove('translate-x-full');
  });
  renderConteudoCarrinho();
}

export function fecharCarrinho() {
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  overlay.classList.add('opacity-0');
  drawer.classList.add('translate-x-full');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

// ---------------------------------------------------------------------
// Renderização do conteúdo (lista de itens + entrega + pagamento)
// ---------------------------------------------------------------------

function renderConteudoCarrinho() {
  const body = document.getElementById('cart-body');
  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center text-muted gap-2 py-16">
        <span class="text-4xl">🍯</span>
        <p>Seu carrinho está vazio.</p>
      </div>
    `;
    return;
  }

  const itens = cart.map(itemComDados).filter(Boolean);
  const subtotal = subtotalCarrinho();

  body.innerHTML = `
    <ul class="flex flex-col gap-4 mb-6">
      ${itens.map(item => `
        <li class="flex gap-3 border-b border-line pb-4">
          <div class="w-16 h-16 rounded-md bg-cell flex items-center justify-center overflow-hidden shrink-0">
            <img src="${item.imagem}" alt="${item.nome}" class="w-full h-full object-cover"
                 onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'font-display text-goldDim text-sm', textContent:'${iniciais(item.nome)}'}))">
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-cream truncate">${item.nome}</p>
            <p class="text-xs text-muted mb-2">${formatarMoeda(item.preco)} / un.</p>
            <div class="flex items-center gap-2">
              <button data-action="diminuir" data-id="${item.id}" class="w-6 h-6 rounded border border-line text-muted hover:border-gold hover:text-gold">−</button>
              <span class="text-sm w-5 text-center">${item.qtd}</span>
              <button data-action="aumentar" data-id="${item.id}" class="w-6 h-6 rounded border border-line text-muted hover:border-gold hover:text-gold">+</button>
              <button data-action="remover" data-id="${item.id}" class="ml-auto text-xs text-red-400/80 hover:text-red-400">Remover</button>
            </div>
          </div>
          <span class="text-sm font-medium text-gold whitespace-nowrap">${formatarMoeda(item.preco * item.qtd)}</span>
        </li>
      `).join('')}
    </ul>

    <!-- Entrega -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-cream mb-3">Entrega</h3>
      <div class="flex flex-col gap-2 text-sm">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="entrega" value="retirada" class="accent-[#E3A33F]" ${checkout.entrega === 'retirada' ? 'checked' : ''}>
          Retirada direta na loja (Vitória-ES) — Grátis
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="entrega" value="correios" class="accent-[#E3A33F]" ${checkout.entrega === 'correios' ? 'checked' : ''}>
          Entrega via Correios
        </label>
      </div>

      <div id="cep-wrapper" class="mt-3 ${checkout.entrega === 'correios' ? '' : 'hidden'}">
        <div class="flex gap-2">
          <input id="cep-input" type="text" maxlength="9" placeholder="00000-000" value="${checkout.cep}"
                 class="flex-1 bg-cell border border-line rounded-md px-3 py-2 text-sm text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold">
          <button id="calcular-frete-btn" class="text-xs px-3 rounded-md border border-line text-muted hover:border-gold hover:text-gold">Calcular</button>
        </div>
        <p id="frete-resultado" class="text-xs text-muted mt-2">${checkout.frete > 0 ? `Frete simulado: ${formatarMoeda(checkout.frete)}` : ''}</p>
      </div>
    </div>

    <!-- Pagamento -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-cream mb-3">Pagamento</h3>
      <div class="flex flex-col gap-2 text-sm">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="pagamento" value="pix" class="accent-[#E3A33F]" ${checkout.pagamento === 'pix' ? 'checked' : ''}>
          Pix (5% de desconto)
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="pagamento" value="cartao" class="accent-[#E3A33F]" ${checkout.pagamento === 'cartao' ? 'checked' : ''}>
          Cartão de crédito (em até 3x sem juros)
        </label>
      </div>
    </div>

    <!-- Totais -->
    <div class="border-t border-line pt-4 mb-5 text-sm space-y-1.5">
      <div class="flex justify-between text-muted">
        <span>Subtotal</span><span>${formatarMoeda(subtotal)}</span>
      </div>
      <div class="flex justify-between text-muted">
        <span>Frete</span><span>${checkout.entrega === 'correios' ? formatarMoeda(checkout.frete) : 'Grátis'}</span>
      </div>
      ${checkout.pagamento === 'pix' ? `
        <div class="flex justify-between text-emerald-400/90">
          <span>Desconto Pix (5%)</span><span>− ${formatarMoeda(subtotal * 0.05)}</span>
        </div>
      ` : ''}
      <div class="flex justify-between text-cream font-semibold text-base pt-1">
        <span>Total</span><span class="text-gold">${formatarMoeda(calcularTotal(subtotal))}</span>
      </div>
    </div>

    <p id="checkout-erro" class="text-xs text-red-400 mb-3 hidden"></p>

    <button id="finalizar-btn" class="w-full bg-gold hover:bg-goldDim text-bark font-medium py-3 rounded-md transition-colors">
      Finalizar pedido
    </button>
  `;

  ligarEventosCarrinho();
}

function calcularTotal(subtotal) {
  let total = subtotal;
  if (checkout.entrega === 'correios') total += checkout.frete;
  if (checkout.pagamento === 'pix') total *= 0.95;
  return total;
}

// ---------------------------------------------------------------------
// Eventos da lista + formulário
// ---------------------------------------------------------------------

function ligarEventosCarrinho() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    const id = Number(btn.dataset.id);
    const acao = btn.dataset.action;
    btn.addEventListener('click', () => {
      if (acao === 'aumentar') aumentarQuantidade(id);
      if (acao === 'diminuir') diminuirQuantidade(id);
      if (acao === 'remover') removerDoCarrinho(id);
    });
  });

  document.querySelectorAll('input[name="entrega"]').forEach(radio => {
    radio.addEventListener('change', e => {
      checkout.entrega = e.target.value;
      renderConteudoCarrinho();
    });
  });

  document.querySelectorAll('input[name="pagamento"]').forEach(radio => {
    radio.addEventListener('change', e => {
      checkout.pagamento = e.target.value;
      renderConteudoCarrinho();
    });
  });

  const cepInput = document.getElementById('cep-input');
  if (cepInput) {
    cepInput.addEventListener('input', e => {
      checkout.cep = e.target.value;
    });
  }

  const calcularBtn = document.getElementById('calcular-frete-btn');
  if (calcularBtn) {
    calcularBtn.addEventListener('click', simularFrete);
  }

  const finalizarBtn = document.getElementById('finalizar-btn');
  if (finalizarBtn) {
    finalizarBtn.addEventListener('click', finalizarPedido);
  }
}

// ---------------------------------------------------------------------
// 4. Simulação de frete por CEP
// ---------------------------------------------------------------------

function simularFrete() {
  const cepLimpo = (checkout.cep || '').replace(/\D/g, '');
  const erroEl = document.getElementById('checkout-erro');

  if (cepLimpo.length !== 8) {
    if (erroEl) {
      erroEl.textContent = 'Digite um CEP válido com 8 dígitos para simular o frete.';
      erroEl.classList.remove('hidden');
    }
    return;
  }

  // Simulação determinística baseada nos dígitos do CEP — não representa
  // um cálculo real de frete dos Correios, apenas um valor plausível e
  // reprodutível para fins de demonstração.
  const somaDigitos = cepLimpo.split('').reduce((soma, d) => soma + Number(d), 0);
  const frete = 12 + (somaDigitos % 20) + 3.5;

  checkout.frete = Number(frete.toFixed(2));
  renderConteudoCarrinho();
}

// ---------------------------------------------------------------------
// 6. Finalizar pedido — validação + tela de sucesso
// ---------------------------------------------------------------------

function finalizarPedido() {
  const erroEl = document.getElementById('checkout-erro');
  const mostrarErro = (msg) => {
    if (!erroEl) return;
    erroEl.textContent = msg;
    erroEl.classList.remove('hidden');
  };

  if (cart.length === 0) return mostrarErro('Seu carrinho está vazio.');
  if (!checkout.entrega) return mostrarErro('Selecione uma opção de entrega.');
  if (checkout.entrega === 'correios' && (checkout.cep || '').replace(/\D/g, '').length !== 8) {
    return mostrarErro('Informe e calcule o frete para o CEP antes de continuar.');
  }
  if (!checkout.pagamento) return mostrarErro('Selecione uma forma de pagamento.');

  if (checkout.pagamento === 'cartao') {
    renderFormularioCartao();
  } else {
    renderTelaSucesso();
  }
}

function renderFormularioCartao() {
  const body = document.getElementById('cart-body');
  body.innerHTML = `
    <div class="py-2">
      <h3 class="font-display text-lg font-semibold text-cream mb-1">Dados do cartão</h3>
      <p class="text-xs text-orange-400/90 mb-5 leading-relaxed">
        Ambiente de demonstração. Não digite dados reais de cartão — nenhuma informação é processada ou enviada.
      </p>

      <div class="flex flex-col gap-3 text-sm">
        <input type="text" placeholder="Número do cartão (fictício)" maxlength="19"
               class="bg-cell border border-line rounded-md px-3 py-2 text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold">
        <input type="text" placeholder="Nome impresso no cartão"
               class="bg-cell border border-line rounded-md px-3 py-2 text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold">
        <div class="flex gap-3">
          <input type="text" placeholder="MM/AA" maxlength="5"
                 class="w-1/2 bg-cell border border-line rounded-md px-3 py-2 text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold">
          <input type="text" placeholder="CVV" maxlength="4"
                 class="w-1/2 bg-cell border border-line rounded-md px-3 py-2 text-cream placeholder:text-muted/60 focus:outline-none focus:border-gold">
        </div>
      </div>

      <button id="confirmar-cartao-btn" class="w-full mt-5 bg-gold hover:bg-goldDim text-bark font-medium py-3 rounded-md transition-colors">
        Confirmar pagamento simulado
      </button>
      <button id="voltar-carrinho-btn" class="w-full mt-2 text-xs text-muted hover:text-gold py-2">
        Voltar ao carrinho
      </button>
    </div>
  `;

  document.getElementById('confirmar-cartao-btn').addEventListener('click', renderTelaSucesso);
  document.getElementById('voltar-carrinho-btn').addEventListener('click', renderConteudoCarrinho);
}

function renderTelaSucesso() {
  const subtotal = subtotalCarrinho();
  const total = calcularTotal(subtotal);
  const numeroPedido = `IDM-${Date.now().toString().slice(-6)}`;

  const blocoPagamento = checkout.pagamento === 'pix'
    ? `
      <div class="bg-cell border border-line rounded-lg p-4 flex flex-col items-center gap-3 mt-4">
        <div class="w-36 h-36 bg-white rounded-md p-2">
          ${gerarQrFake()}
        </div>
        <p class="text-xs text-muted text-center">
          Código Pix simulado (copia e cola):<br>
          <span class="text-cream break-all">00020126${numeroPedido}5204000053039865802BR</span>
        </p>
      </div>
    `
    : `
      <div class="bg-cell border border-line rounded-lg p-4 mt-4 text-sm text-muted">
        Pagamento simulado aprovado em até <strong class="text-cream">3x sem juros</strong> no cartão informado.
      </div>
    `;

  const body = document.getElementById('cart-body');
  body.innerHTML = `
    <div class="py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-gold/15 border border-gold flex items-center justify-center mx-auto mb-4 text-gold text-2xl">✓</div>
      <h3 class="font-display text-xl font-semibold text-cream mb-1">Pedido simulado com sucesso</h3>
      <p class="text-xs text-muted mb-5">Pedido nº ${numeroPedido} — nenhuma cobrança real foi realizada.</p>

      <div class="text-left bg-cell border border-line rounded-lg p-4 text-sm space-y-1.5">
        <div class="flex justify-between text-muted"><span>Itens</span><span>${cart.reduce((s, i) => s + i.qtd, 0)}</span></div>
        <div class="flex justify-between text-muted"><span>Entrega</span><span>${checkout.entrega === 'retirada' ? 'Retirada na loja' : 'Correios'}</span></div>
        <div class="flex justify-between text-muted"><span>Pagamento</span><span>${checkout.pagamento === 'pix' ? 'Pix' : 'Cartão (3x)'}</span></div>
        <div class="flex justify-between text-cream font-semibold pt-1"><span>Total</span><span class="text-gold">${formatarMoeda(total)}</span></div>
      </div>

      ${blocoPagamento}

      <button id="novo-pedido-btn" class="w-full mt-6 bg-gold hover:bg-goldDim text-bark font-medium py-3 rounded-md transition-colors">
        Fazer novo pedido
      </button>
    </div>
  `;

  document.getElementById('novo-pedido-btn').addEventListener('click', () => {
    cart = [];
    checkout.entrega = null;
    checkout.cep = '';
    checkout.frete = 0;
    checkout.pagamento = null;
    salvarCarrinho();
  });
}

/** Gera um padrão visual simples que lembra um QR code — apenas estético, não é um QR real. */
function gerarQrFake() {
  let squares = '';
  const size = 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.random() > 0.5) {
        squares += `<rect x="${x * 12.5}" y="${y * 12.5}" width="12.5" height="12.5" fill="#1A120B"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 100 100" class="w-full h-full">${squares}</svg>`;
}

// ---------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------

export function inicializarCarrinho() {
  montarEstruturaDrawer();
  atualizarContadorHeader();

  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', abrirCarrinho);
  }
}
