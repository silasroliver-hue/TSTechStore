/* =============================================
   produtos.js — Gestão de produtos
   ============================================= */

let allProducts = [];
let productFilter = '';

async function initProdutos() {
  initPage('produtos');
  await loadProducts();
  setupListeners();
}

function setupListeners() {
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    productFilter = e.target.value.toLowerCase();
    renderProducts();
  });
  document.getElementById('btnNewProduct')?.addEventListener('click', openNewProductModal);
}

async function loadProducts() {
  const tbody = document.getElementById('productsBody');
  if (tbody) tbody.innerHTML = skeletonRows(6);

  const { data, error } = await db.getProducts();
  if (error) { showToast('Erro ao carregar produtos', 'error'); return; }

  allProducts = data || [];
  renderProducts();
  updateProductStats();
}

function getFilteredProducts() {
  return allProducts.filter(p => {
    if (!productFilter) return true;
    return (p.name + ' ' + (p.brand || '') + ' ' + (p.model || '')).toLowerCase().includes(productFilter);
  });
}

function calcMargin(cost, sale) {
  if (!cost || !sale || sale === 0) return 0;
  return ((sale - cost) / sale * 100);
}

function marginPill(margin) {
  if (margin >= 30) return `<span class="margin-pill margin-high">▲ ${margin.toFixed(1)}%</span>`;
  if (margin >= 15) return `<span class="margin-pill margin-mid">◆ ${margin.toFixed(1)}%</span>`;
  return `<span class="margin-pill margin-low">▼ ${margin.toFixed(1)}%</span>`;
}

function stockBar(qty) {
  const max = 20;
  const pct = Math.min((qty / max) * 100, 100);
  const color = qty >= 5 ? 'var(--success)' : qty >= 2 ? 'var(--warning)' : 'var(--danger)';
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <div class="progress-bar" style="width:60px">
        <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span style="font-weight:600;color:${color};font-size:12px">${qty}</span>
    </div>`;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const tbody = document.getElementById('productsBody');
  const emptyState = document.getElementById('emptyProducts');

  if (!filtered.length) {
    if (tbody) tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  if (tbody) {
    tbody.innerHTML = filtered.map(p => {
      const margin = calcMargin(p.cost_price, p.sale_price);
      return `
        <tr>
          <td>
            <div>
              <div style="font-weight:600">${p.name}</div>
              ${p.model ? `<div style="font-size:11.5px;color:var(--text-muted)">${p.model}</div>` : ''}
            </div>
          </td>
          <td style="color:var(--text-muted)">${p.brand || '—'}</td>
          <td style="color:var(--text-muted)">${formatCurrency(p.cost_price)}</td>
          <td style="font-weight:700;color:var(--success)">${formatCurrency(p.sale_price)}</td>
          <td>${marginPill(margin)}</td>
          <td>${stockBar(p.stock_quantity)}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-icon btn-ghost btn-sm" title="Editar" onclick="openEditProductModal('${p.id}')">
                <i data-lucide="edit-2" style="width:14px;height:14px"></i>
              </button>
              <button class="btn btn-icon btn-ghost btn-sm" title="Ajustar estoque" onclick="openStockModal('${p.id}')">
                <i data-lucide="package" style="width:14px;height:14px"></i>
              </button>
              <button class="btn btn-icon btn-ghost btn-sm" title="Excluir" onclick="deleteProduct('${p.id}','${p.name}')">
                <i data-lucide="trash-2" style="width:14px;height:14px"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons({ nodes: [tbody] });
  }
}

function updateProductStats() {
  document.getElementById('totalProducts').textContent = allProducts.length;
  document.getElementById('lowStockProducts').textContent = allProducts.filter(p => p.stock_quantity < 3).length;
  const totalInv = allProducts.reduce((s, p) => s + (p.cost_price * p.stock_quantity), 0);
  document.getElementById('totalInventory').textContent = formatCurrency(totalInv);
}

/* =============================================
   MODAL — NOVO / EDITAR PRODUTO
   ============================================= */
function productFormHTML(product = {}) {
  return `
    <form id="productForm" onsubmit="event.preventDefault()">
      <div class="form-row cols-2">
        <div class="form-group" style="grid-column:span 2">
          <label class="form-label">Nome do produto *</label>
          <input class="form-input" id="prodName" type="text" placeholder="iPhone 14 Pro" value="${product.name || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Marca</label>
          <input class="form-input" id="prodBrand" type="text" placeholder="Apple" value="${product.brand || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Modelo / Variante</label>
          <input class="form-input" id="prodModel" type="text" placeholder="128GB Preto" value="${product.model || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Custo (R$) *</label>
          <input class="form-input" id="prodCost" type="number" step="0.01" min="0" placeholder="0,00" value="${product.cost_price || ''}" required oninput="calcPreviewMargin()">
        </div>
        <div class="form-group">
          <label class="form-label">Preço de Venda (R$) *</label>
          <input class="form-input" id="prodSale" type="number" step="0.01" min="0" placeholder="0,00" value="${product.sale_price || ''}" required oninput="calcPreviewMargin()">
        </div>
        <div class="form-group" style="grid-column:span 2">
          <label class="form-label">Estoque atual</label>
          <input class="form-input" id="prodStock" type="number" min="0" placeholder="0" value="${product.stock_quantity ?? 0}">
        </div>
      </div>
      <div id="marginPreview" style="margin-top:8px;padding:12px;background:var(--bg);border-radius:var(--radius-md);display:none">
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:var(--text-muted)">Margem de lucro:</span>
          <span id="marginValue" style="font-weight:700"></span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
          <span style="color:var(--text-muted)">Lucro por unidade:</span>
          <span id="profitValue" style="font-weight:700;color:var(--success)"></span>
        </div>
      </div>
      <input type="hidden" id="prodId" value="${product.id || ''}">
    </form>
  `;
}

function calcPreviewMargin() {
  const cost = parseFloat(document.getElementById('prodCost')?.value) || 0;
  const sale = parseFloat(document.getElementById('prodSale')?.value) || 0;
  const preview = document.getElementById('marginPreview');
  if (!preview) return;

  if (cost > 0 && sale > 0) {
    const margin = calcMargin(cost, sale);
    const profit = sale - cost;
    preview.style.display = 'block';
    const mv = document.getElementById('marginValue');
    const pv = document.getElementById('profitValue');
    if (mv) {
      mv.textContent = margin.toFixed(1) + '%';
      mv.style.color = margin >= 30 ? 'var(--success)' : margin >= 15 ? 'var(--warning)' : 'var(--danger)';
    }
    if (pv) pv.textContent = formatCurrency(profit);
  } else {
    preview.style.display = 'none';
  }
}

function openNewProductModal() {
  showModal('Novo Produto', productFormHTML(), {
    icon: 'package-plus',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveProduct()" id="btnSaveProd">
        <i data-lucide="save" style="width:14px;height:14px"></i> Salvar
      </button>`
  });
}

function openEditProductModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  showModal('Editar Produto', productFormHTML(product), {
    icon: 'edit-2',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveProduct()" id="btnSaveProd">
        <i data-lucide="save" style="width:14px;height:14px"></i> Salvar
      </button>`
  });

  setTimeout(calcPreviewMargin, 100);
}

async function saveProduct() {
  const btn = document.getElementById('btnSaveProd');
  if (btn) btn.classList.add('btn-loading');

  const id = document.getElementById('prodId')?.value;
  const data = {
    name: document.getElementById('prodName')?.value.trim(),
    brand: document.getElementById('prodBrand')?.value.trim() || null,
    model: document.getElementById('prodModel')?.value.trim() || null,
    cost_price: parseFloat(document.getElementById('prodCost')?.value) || 0,
    sale_price: parseFloat(document.getElementById('prodSale')?.value) || 0,
    stock_quantity: parseInt(document.getElementById('prodStock')?.value) || 0,
  };

  if (!data.name || !data.sale_price) {
    showToast('Preencha nome e preço de venda', 'warning');
    if (btn) btn.classList.remove('btn-loading');
    return;
  }

  if (id) data.id = id;
  const { error } = await db.upsertProduct(data);
  if (btn) btn.classList.remove('btn-loading');

  if (error) { showToast('Erro ao salvar produto', 'error'); return; }

  showToast(id ? 'Produto atualizado!' : 'Produto cadastrado!', 'success');
  closeModal();
  await loadProducts();
}

function openStockModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  showModal(`Ajustar Estoque — ${product.name}`, `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:36px;margin-bottom:8px">📦</div>
      <div style="color:var(--text-muted)">Estoque atual: <strong style="color:var(--text);font-size:18px">${product.stock_quantity}</strong></div>
    </div>
    <div class="form-group">
      <label class="form-label">Novo quantidade em estoque</label>
      <input class="form-input" id="newStockQty" type="number" min="0" value="${product.stock_quantity}">
    </div>
  `, {
    icon: 'package',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="updateStock('${id}')">
        <i data-lucide="save" style="width:14px;height:14px"></i> Atualizar
      </button>`
  });
}

async function updateStock(id) {
  const qty = parseInt(document.getElementById('newStockQty')?.value) || 0;
  const { error } = await supabase.from('products').update({ stock_quantity: qty }).eq('id', id);
  if (error) { showToast('Erro ao atualizar estoque', 'error'); return; }
  showToast('Estoque atualizado!', 'success');
  closeModal();
  await loadProducts();
}

async function deleteProduct(id, name) {
  const confirmed = await confirmDialog(`Excluir o produto <strong>${name}</strong>?`);
  if (!confirmed) return;
  const { error } = await db.deleteProduct(id);
  if (error) { showToast('Erro ao excluir produto', 'error'); return; }
  showToast('Produto excluído', 'success');
  await loadProducts();
}

document.addEventListener('DOMContentLoaded', initProdutos);
