/* =============================================
   ui.js — Componentes de interface globais
   Toasts, Modais, Drawer, Loading, Sidebar, Header
   ============================================= */

/* =============================================
   TOAST NOTIFICATIONS
   ============================================= */
const TOAST_DURATION = 4000;

function showToast(message, type = 'success', title = null) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  const titles = {
    success: title || 'Sucesso',
    error: title || 'Erro',
    warning: title || 'Atenção',
    info: title || 'Info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type]}" class="toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-progress" style="width:100%"></div>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });

  // Anima barra de progresso
  const bar = toast.querySelector('.toast-progress');
  requestAnimationFrame(() => {
    bar.style.transition = `width ${TOAST_DURATION}ms linear`;
    bar.style.width = '0%';
  });

  // Auto remove
  const timer = setTimeout(() => removeToast(toast), TOAST_DURATION);

  toast.addEventListener('click', () => {
    clearTimeout(timer);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(20px)';
  toast.style.transition = 'all 0.25s ease';
  setTimeout(() => toast.remove(), 250);
}

/* =============================================
   MODAL
   ============================================= */
let _modalStack = [];

function showModal(title, contentHTML, options = {}) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  const size = options.size || '';
  const icon = options.icon || 'layout';
  const footer = options.footer || `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  `;

  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <div class="modal-title">
          <i data-lucide="${icon}" style="width:18px;height:18px;color:var(--accent)"></i>
          ${title}
        </div>
        <button class="modal-close" onclick="closeModal()">
          <i data-lucide="x" style="width:16px;height:16px"></i>
        </button>
      </div>
      <div class="modal-body" id="modalBody">
        ${contentHTML}
      </div>
      <div class="modal-footer" id="modalFooter">
        ${footer}
      </div>
    </div>
  `;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('active'));

  if (window.lucide) lucide.createIcons({ nodes: [overlay] });

  // Fecha ao clicar no overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  }, { once: true });

  _modalStack.push(overlay);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  }, 200);
}

/* =============================================
   DRAWER
   ============================================= */
function showDrawer(title, contentHTML, icon = 'info') {
  let overlay = document.getElementById('drawerOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'drawerOverlay';
    overlay.className = 'drawer-overlay hidden';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="drawer" id="drawerPanel">
      <div class="drawer-header">
        <div class="drawer-title">
          <i data-lucide="${icon}" style="width:18px;height:18px;color:var(--accent)"></i>
          ${title}
        </div>
        <button class="drawer-close" onclick="closeDrawer()">
          <i data-lucide="x" style="width:18px;height:18px"></i>
        </button>
      </div>
      <div class="drawer-body" id="drawerBody">
        ${contentHTML}
      </div>
    </div>
  `;

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('active');
    const panel = document.getElementById('drawerPanel');
    if (panel) panel.classList.add('open');
  });

  if (window.lucide) lucide.createIcons({ nodes: [overlay] });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDrawer();
  }, { once: true });
}

function closeDrawer() {
  const overlay = document.getElementById('drawerOverlay');
  if (!overlay) return;
  const panel = document.getElementById('drawerPanel');
  if (panel) panel.classList.remove('open');
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  }, 300);
}

/* =============================================
   LOADING STATES
   ============================================= */
function showLoading(element, type = 'skeleton') {
  if (!element) return;
  element.dataset.originalContent = element.innerHTML;

  if (type === 'skeleton') {
    element.innerHTML = `
      <div class="skeleton skeleton-title" style="width:60%"></div>
      <div class="skeleton skeleton-text" style="width:100%"></div>
      <div class="skeleton skeleton-text" style="width:80%"></div>
      <div class="skeleton skeleton-text" style="width:90%"></div>
    `;
  } else {
    element.innerHTML = `
      <div class="flex-center" style="padding:32px">
        <div style="width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite"></div>
      </div>
    `;
  }
}

function hideLoading(element) {
  if (!element || !element.dataset.originalContent) return;
  element.innerHTML = element.dataset.originalContent;
  delete element.dataset.originalContent;
}

/* =============================================
   SKELETON PARA GRIDS/TABELAS
   ============================================= */
function skeletonCards(count = 4, height = '120px') {
  return Array(count).fill(0).map(() =>
    `<div class="skeleton" style="height:${height};border-radius:var(--radius-lg)"></div>`
  ).join('');
}

function skeletonRows(count = 5) {
  return Array(count).fill(0).map(() => `
    <tr>
      <td><div class="skeleton skeleton-text" style="width:120px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:80px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:100px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:60px"></div></td>
      <td><div class="skeleton skeleton-text" style="width:70px"></div></td>
    </tr>
  `).join('');
}

/* =============================================
   ANIMATE COUNTER
   ============================================= */
function animateCounter(element, target, duration = 1200, prefix = '', suffix = '') {
  if (!element) return;
  const start = 0;
  const startTime = performance.now();
  const isFloat = target !== Math.floor(target);

  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = start + (target - start) * eased;

    if (isFloat) {
      element.textContent = prefix + current.toFixed(2).replace('.', ',') + suffix;
    } else {
      element.textContent = prefix + Math.floor(current).toLocaleString('pt-BR') + suffix;
    }

    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

/* =============================================
   CONFIRM DIALOG
   ============================================= */
function confirmDialog(message, title = 'Confirmar ação', type = 'danger') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) { resolve(false); return; }

    const colors = {
      danger: { icon: 'alert-triangle', color: 'var(--danger)', btn: 'btn-danger' },
      warning: { icon: 'alert-circle', color: 'var(--warning)', btn: 'btn-secondary' },
      info: { icon: 'info', color: 'var(--accent)', btn: 'btn-primary' }
    };

    const c = colors[type] || colors.danger;

    overlay.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <div class="modal-title">
            <i data-lucide="${c.icon}" style="width:18px;height:18px;color:${c.color}"></i>
            ${title}
          </div>
          <button class="modal-close" id="confirmClose">
            <i data-lucide="x" style="width:16px;height:16px"></i>
          </button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-muted);font-size:14px;line-height:1.6">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="confirmNo">Cancelar</button>
          <button class="btn ${c.btn}" id="confirmYes">Confirmar</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('active'));
    if (window.lucide) lucide.createIcons({ nodes: [overlay] });

    const close = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.classList.add('hidden'); overlay.innerHTML = ''; }, 200);
      resolve(result);
    };

    document.getElementById('confirmYes').onclick = () => close(true);
    document.getElementById('confirmNo').onclick = () => close(false);
    document.getElementById('confirmClose').onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
  });
}

/* =============================================
   SIDEBAR INJECTION
   ============================================= */
function initPage(activePage) {
  if (document.getElementById('sidebar')) return; // Guard: evita dupla injeção
  // Injeta sidebar
  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img src="assets/images/logo-dark.png" alt="TS Tech Store" class="sidebar-logo-img logo-dark-img" />
          <img src="assets/images/logo-light.png" alt="TS Tech Store" class="sidebar-logo-img logo-light-img" />
          <img src="assets/images/logo-dark.png" alt="TS" class="sidebar-logo-img-collapsed logo-dark-img" />
          <img src="assets/images/logo-light.png" alt="TS" class="sidebar-logo-img-collapsed logo-light-img" />
        </div>
        <button class="sidebar-toggle" id="sidebarToggle" title="Recolher menu">
          <i data-lucide="chevron-left" style="width:16px;height:16px"></i>
        </button>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Principal</div>
        <a href="index.html" class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" data-tooltip="Dashboard">
          <i data-lucide="layout-dashboard" class="nav-icon"></i>
          <span class="nav-label">Dashboard</span>
        </a>
        <a href="vendas.html" class="nav-item ${activePage === 'vendas' ? 'active' : ''}" data-tooltip="Vendas">
          <i data-lucide="shopping-cart" class="nav-icon"></i>
          <span class="nav-label">Vendas</span>
        </a>
        <a href="parcelas.html" class="nav-item ${activePage === 'parcelas' ? 'active' : ''}" data-tooltip="Parcelas">
          <i data-lucide="calendar-check" class="nav-icon"></i>
          <span class="nav-label">Parcelas</span>
          <span class="nav-badge" id="navBadgeOverdue" style="display:none">0</span>
        </a>
        <div class="nav-section-label">Cadastros</div>
        <a href="clientes.html" class="nav-item ${activePage === 'clientes' ? 'active' : ''}" data-tooltip="Clientes">
          <i data-lucide="users" class="nav-icon"></i>
          <span class="nav-label">Clientes</span>
        </a>
        <a href="produtos.html" class="nav-item ${activePage === 'produtos' ? 'active' : ''}" data-tooltip="Produtos">
          <i data-lucide="package" class="nav-icon"></i>
          <span class="nav-label">Produtos</span>
        </a>
        <div class="nav-section-label">Financeiro</div>
        <a href="financeiro.html" class="nav-item ${activePage === 'financeiro' ? 'active' : ''}" data-tooltip="Financeiro">
          <i data-lucide="bar-chart-2" class="nav-icon"></i>
          <span class="nav-label">Financeiro</span>
        </a>
        <a href="fluxo-caixa.html" class="nav-item ${activePage === 'fluxo-caixa' ? 'active' : ''}" data-tooltip="Fluxo de Caixa">
          <i data-lucide="trending-up" class="nav-icon"></i>
          <span class="nav-label">Fluxo de Caixa</span>
        </a>
      </nav>
    </aside>
  `;

  // Injeta antes do main-content
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.insertAdjacentHTML('beforebegin', sidebarHTML);
  }

  // Injeta header
  const headerHTML = `
    <header class="header">
      <div class="header-left">
        <button class="btn-icon btn-ghost" id="mobileMenuBtn" style="display:none">
          <i data-lucide="menu" style="width:18px;height:18px"></i>
        </button>
        <span class="header-title" id="headerTitle">TSTechStore</span>
        <div class="header-datetime">
          <span class="dot">●</span>
          <span id="headerDateTime"></span>
        </div>
      </div>
      <div class="header-right">
        <div class="alert-badge hidden" id="headerAlertBadge" onclick="window.location='parcelas.html?filter=atrasadas'">
          <i data-lucide="bell" style="width:13px;height:13px"></i>
          <span id="headerAlertCount">0</span> vencidas hoje
        </div>
        <button class="theme-toggle" id="themeToggle" title="Alternar tema" onclick="Theme.toggle()"></button>
        <a href="vendas-nova.html" class="btn btn-primary btn-sm">
          <i data-lucide="plus" style="width:13px;height:13px"></i>
          Nova Venda
        </a>
      </div>
    </header>
  `;

  if (mainContent) {
    mainContent.insertAdjacentHTML('afterbegin', headerHTML);
  }

  // Injeta bottom nav para mobile
  const bottomNavHTML = `
    <nav class="bottom-nav" id="bottomNav">
      <a href="index.html" class="bottom-nav-item ${activePage === 'dashboard' ? 'active' : ''}">
        <i data-lucide="layout-dashboard" style="width:20px;height:20px"></i>
        <span>Início</span>
      </a>
      <a href="vendas.html" class="bottom-nav-item ${activePage === 'vendas' ? 'active' : ''}">
        <i data-lucide="shopping-cart" style="width:20px;height:20px"></i>
        <span>Vendas</span>
      </a>
      <a href="vendas-nova.html" class="bottom-nav-item">
        <div style="width:40px;height:40px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:-14px;box-shadow:0 4px 12px var(--accent-glow)">
          <i data-lucide="plus" style="width:20px;height:20px;color:white"></i>
        </div>
        <span style="margin-top:2px">Vender</span>
      </a>
      <a href="parcelas.html" class="bottom-nav-item ${activePage === 'parcelas' ? 'active' : ''}">
        <i data-lucide="calendar-check" style="width:20px;height:20px"></i>
        <span>Parcelas</span>
      </a>
      <a href="clientes.html" class="bottom-nav-item ${activePage === 'clientes' ? 'active' : ''}">
        <i data-lucide="users" style="width:20px;height:20px"></i>
        <span>Clientes</span>
      </a>
    </nav>
  `;

  document.body.insertAdjacentHTML('beforeend', bottomNavHTML);

  // Injeta containers de toast e modal se não existirem
  if (!document.getElementById('toastContainer')) {
    document.body.insertAdjacentHTML('beforeend', '<div id="toastContainer" class="toast-container"></div>');
  }
  if (!document.getElementById('modalOverlay')) {
    document.body.insertAdjacentHTML('beforeend', '<div id="modalOverlay" class="modal-overlay hidden"></div>');
  }
  if (!document.getElementById('drawerOverlay')) {
    document.body.insertAdjacentHTML('beforeend', '<div id="drawerOverlay" class="drawer-overlay hidden"></div>');
  }

  // Init Lucide icons
  if (window.lucide) lucide.createIcons();

  // Sidebar collapse
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    const isCollapsed = localStorage.getItem('ts-sidebar-collapsed') === 'true';
    if (isCollapsed) sidebar.classList.add('collapsed');

    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('ts-sidebar-collapsed', sidebar.classList.contains('collapsed'));
    });
  }

  // Mobile menu
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    mobileBtn.addEventListener('click', () => {
      sidebar?.classList.toggle('mobile-open');
    });
  }

  // Responsive
  window.addEventListener('resize', () => {
    if (mobileBtn) {
      mobileBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    }
  });

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Alert badge (parcelas vencidas hoje)
  loadAlertBadge();

  // Theme
  Theme.init();
}

function updateClock() {
  const el = document.getElementById('headerDateTime');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

async function loadAlertBadge() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('installments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .lte('due_date', today);

    if (count > 0) {
      const badge = document.getElementById('headerAlertBadge');
      const countEl = document.getElementById('headerAlertCount');
      const navBadge = document.getElementById('navBadgeOverdue');
      if (badge) { badge.classList.remove('hidden'); }
      if (countEl) countEl.textContent = count;
      if (navBadge) { navBadge.style.display = 'flex'; navBadge.textContent = count; }
    }
  } catch (e) { /* silencioso */ }
}

/* =============================================
   FORMATTERS
   ============================================= */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function daysOverdue(dueDateStr) {
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff;
}

function avatarColor(name) {
  const colors = ['#6C63FF','#00D4AA','#FF4757','#FFA502','#1E90FF','#FF6B9E','#A29BFE','#00CEC9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function badgeStatus(status) {
  const map = {
    em_dia: `<span class="badge badge-success"><i data-lucide="check-circle" style="width:10px;height:10px"></i> Em dia</span>`,
    atrasado: `<span class="badge badge-warning"><i data-lucide="clock" style="width:10px;height:10px"></i> Atrasado</span>`,
    inadimplente: `<span class="badge badge-danger"><i data-lucide="alert-circle" style="width:10px;height:10px"></i> Inadimplente</span>`,
    pendente: `<span class="badge badge-muted">Pendente</span>`,
    pago: `<span class="badge badge-success"><i data-lucide="check" style="width:10px;height:10px"></i> Pago</span>`,
    ativa: `<span class="badge badge-accent">Ativa</span>`,
    quitada: `<span class="badge badge-success">Quitada</span>`,
    cancelada: `<span class="badge badge-muted">Cancelada</span>`,
  };
  return map[status] || `<span class="badge badge-muted">${status}</span>`;
}

function badgePayment(type, installments) {
  const map = {
    pix: `<span class="badge badge-cyan">⚡ Pix</span>`,
    cartao_credito: `<span class="badge badge-accent">💳 Cartão ${installments ? installments + 'x' : ''}</span>`,
    crediario: `<span class="badge badge-orange">🏪 Crediário ${installments ? installments + 'x' : ''}</span>`,
  };
  return map[type] || `<span class="badge badge-muted">${type}</span>`;
}

/* =============================================
   INPUT MASK — CPF e Telefone
   ============================================= */
function maskCPF(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = v;
  });
}

function maskPhone(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      v = v.replace(/(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.replace(/(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    input.value = v;
  });
}

function maskMoney(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '');
    v = (parseInt(v || '0') / 100).toFixed(2);
    input.value = v.replace('.', ',');
  });
}

function parseMoney(str) {
  return parseFloat((str || '0').toString().replace(',', '.').replace(/[^\d.]/g, '')) || 0;
}
