/* =============================================
   vendas.js — Lista de vendas + Nova venda (wizard)
   ============================================= */

let allSales = [];
let salesFilter = 'todas';

async function initVendas() {
  initPage('vendas');
  await loadSales();
  setupSalesListeners();
}

function setupSalesListeners() {
  document.getElementById('searchSales')?.addEventListener('input', (e) => {
    renderSales(e.target.value.toLowerCase());
  });
}

async function loadSales() {
  const tbody = document.getElementById('salesBody');
  if (tbody) tbody.innerHTML = skeletonRows(8);

  const { data, error } = await db.getSales();
  if (error) { showToast('Erro ao carregar vendas', 'error'); return; }

  allSales = data || [];
  renderSales();
  updateSalesStats();
}

function renderSales(search = '') {
  const tbody = document.getElementById('salesBody');
  if (!tbody) return;

  let filtered = allSales.filter(s => {
    if (salesFilter !== 'todas' && s.status !== salesFilter) return false;
    if (search) {
      return (s.clients?.name || '').toLowerCase().includes(search) ||
             (s.products?.name || '').toLowerCase().includes(search);
    }
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">Nenhuma venda encontrada</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td>
        <div>
          <div style="font-weight:600">${s.clients?.name || '—'}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${formatDate(s.created_at)}</div>
        </div>
      </td>
      <td style="color:var(--text-muted)">${s.products?.name || '—'}</td>
      <td>${badgePayment(s.payment_type, s.installments_count || s.card_installments)}</td>
      <td style="font-weight:700">${formatCurrency(s.total_amount)}</td>
      <td>
        ${s.down_payment > 0 ? `<span style="font-size:12px;color:var(--success)">+${formatCurrency(s.down_payment)} entrada</span>` : '—'}
      </td>
      <td>${badgeStatus(s.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-ghost btn-sm" title="Detalhes" onclick="openSaleDrawer('${s.id}')">
            <i data-lucide="eye" style="width:14px;height:14px"></i>
          </button>
          ${s.status === 'ativa' ? `
            <button class="btn btn-icon btn-ghost btn-sm" title="Cancelar venda" onclick="cancelSale('${s.id}')">
              <i data-lucide="x-circle" style="width:14px;height:14px"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons({ nodes: [tbody] });
}

function setSalesFilter(filter) {
  salesFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
  renderSales();
}

function updateSalesStats() {
  const naoCanceladas = allSales.filter(v => v.status !== 'cancelada');
  const total = naoCanceladas.reduce((s, v) => s + parseFloat(v.total_amount), 0);
  const ativas = allSales.filter(v => v.status === 'ativa').length;
  const quitadas = allSales.filter(v => v.status === 'quitada').length;

  document.getElementById('statTotalVendas').textContent = naoCanceladas.length;
  document.getElementById('statTotalValor').textContent = formatCurrency(total);
  document.getElementById('statAtivas').textContent = ativas;
  document.getElementById('statQuitadas').textContent = quitadas;
}

async function cancelSale(id) {
  const confirmed = await confirmDialog('Cancelar esta venda? As parcelas em aberto serão removidas.');
  if (!confirmed) return;

  await supabase.from('installments').delete().eq('sale_id', id).eq('status', 'pendente');
  const { error } = await db.updateSale(id, { status: 'cancelada' });
  if (error) { showToast('Erro ao cancelar', 'error'); return; }
  showToast('Venda cancelada', 'success');
  await loadSales();
}

async function openSaleDrawer(id) {
  const { data: sale, error } = await db.getSale(id);
  if (error || !sale) { showToast('Erro ao carregar venda', 'error'); return; }

  const { data: installments } = await supabase
    .from('installments')
    .select('*')
    .eq('sale_id', id)
    .order('installment_number');

  const today = new Date().toISOString().split('T')[0];

  showDrawer(`Venda — ${sale.clients?.name}`, `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        ${badgePayment(sale.payment_type, sale.installments_count || sale.card_installments)}
        ${badgeStatus(sale.status)}
      </div>
      <div class="stat-row"><span class="stat-label">Cliente</span><strong>${sale.clients?.name}</strong></div>
      <div class="stat-row"><span class="stat-label">Produto</span><span class="stat-value">${sale.products?.name}</span></div>
      <div class="stat-row"><span class="stat-label">Valor total</span><strong style="color:var(--success)">${formatCurrency(sale.total_amount)}</strong></div>
      ${sale.down_payment > 0 ? `<div class="stat-row"><span class="stat-label">Entrada</span><span class="stat-value text-success">${formatCurrency(sale.down_payment)}</span></div>` : ''}
      <div class="stat-row"><span class="stat-label">Data da venda</span><span class="stat-value">${formatDate(sale.created_at)}</span></div>
      ${sale.notes ? `<div class="stat-row"><span class="stat-label">Obs</span><span class="stat-value" style="text-align:right;max-width:200px;font-size:12px">${sale.notes}</span></div>` : ''}
    </div>

    ${installments && installments.length ? `
      <div>
        <div style="font-weight:700;font-size:13px;margin-bottom:10px">
          Parcelas (${installments.length}x ${formatCurrency(sale.installment_value)})
        </div>
        ${installments.map(inst => {
          const isOverdue = inst.due_date < today && inst.status === 'pendente';
          const statusColor = inst.status === 'pago' ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--text-muted)';
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:600">Parcela ${inst.installment_number}</div>
                <div style="font-size:11.5px;color:${statusColor}">
                  ${inst.status === 'pago' ? `Pago em ${formatDate(inst.paid_at)}` : `Vence ${formatDate(inst.due_date)}`}
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700">${formatCurrency(inst.amount)}</div>
                ${inst.status !== 'pago' ? `
                  <button class="btn btn-success btn-sm" style="margin-top:4px" onclick="quickPayInstallmentSale('${inst.id}', '${id}')">
                    Pagar
                  </button>` : `<span class="badge badge-success" style="font-size:10px">✓ Pago</span>`}
              </div>
            </div>`;
        }).join('')}
      </div>
    ` : ''}

    ${sale.payment_type === 'cartao_credito' ? `
      <div style="margin-top:12px;padding:12px;background:var(--accent-light);border-radius:var(--radius-md);border:1px solid rgba(108,99,255,0.2)">
        <div style="font-size:12px;color:var(--text-muted)">💳 Cartão — ${sale.card_installments}x</div>
        ${sale.card_fee_percent > 0 ? `<div style="font-size:12px;color:var(--text-muted)">Taxa maquininha: ${sale.card_fee_percent}%</div>
        <div style="font-size:12px;font-weight:600">Total com taxa: ${formatCurrency(sale.card_total_with_fee)}</div>` : ''}
      </div>
    ` : ''}
  `, 'shopping-bag');
}

async function quickPayInstallmentSale(installmentId, saleId) {
  const confirmed = await confirmDialog('Registrar pagamento desta parcela?', 'Confirmar', 'info');
  if (!confirmed) return;

  const { data: inst } = await supabase.from('installments').select('sales(client_id)').eq('id', installmentId).single();
  const { error } = await db.payInstallment(installmentId);
  if (error) { showToast('Erro ao registrar pagamento', 'error'); return; }

  // Registra em payments
  const { data: instData } = await supabase.from('installments').select('*').eq('id', installmentId).single();
  if (instData && inst?.sales?.client_id) {
    await db.createPayment({
      installment_id: installmentId,
      sale_id: saleId,
      client_id: inst.sales.client_id,
      amount: instData.amount,
      payment_date: new Date().toISOString().split('T')[0],
      method: 'crediario'
    });
    await db.updateClientStatus(inst.sales.client_id);
  }

  // Verifica se todas as parcelas foram pagas
  const { data: allInst } = await supabase.from('installments').select('status').eq('sale_id', saleId);
  if (allInst && allInst.every(i => i.status === 'pago')) {
    await db.updateSale(saleId, { status: 'quitada' });
  }

  showToast('Parcela paga!', 'success');
  closeDrawer();
  await loadSales();
}

/* =============================================
   NOVA VENDA — WIZARD (vendas-nova.html)
   ============================================= */

let wizardStep = 1;
let selectedClient = null;
let selectedProduct = null;
let selectedPaymentType = null;

async function initNovaVenda() {
  initPage('vendas');
  setupWizardListeners();

  // Pré-seleciona cliente se vier da URL
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('client');
  if (clientId) {
    const { data } = await db.getClient(clientId);
    if (data) selectClient(data);
  }
}

function setupWizardListeners() {
  // Busca de cliente
  const clientSearch = document.getElementById('clientSearch');
  if (clientSearch) {
    let timeout;
    clientSearch.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => searchClients(e.target.value), 300);
    });
  }

  // Busca de produto
  const productSearch = document.getElementById('productSearch');
  if (productSearch) {
    let timeout;
    productSearch.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => searchProducts(e.target.value), 300);
    });
  }

  // Cálculo em tempo real
  document.getElementById('installmentsCount')?.addEventListener('input', calcInstallmentPreview);
  document.getElementById('downPayment')?.addEventListener('input', calcInstallmentPreview);
  document.getElementById('cardInstallments')?.addEventListener('input', calcCardPreview);
  document.getElementById('cardFeePercent')?.addEventListener('input', calcCardPreview);
}

async function searchClients(term) {
  const results = document.getElementById('clientResults');
  if (!term || term.length < 2) { if (results) results.innerHTML = ''; return; }

  const { data } = await db.getClients({ search: term });
  if (!results) return;

  if (!data || !data.length) {
    results.innerHTML = `<div style="padding:12px;color:var(--text-muted);font-size:13px">Nenhum cliente encontrado</div>`;
    return;
  }

  results.innerHTML = data.map(c => `
    <div class="search-result-item" onclick="selectClient(${JSON.stringify(c).replace(/"/g, '&quot;')})">
      <div class="client-avatar" style="background:${avatarColor(c.name)};width:32px;height:32px;font-size:12px;flex-shrink:0">${initials(c.name)}</div>
      <div>
        <div style="font-weight:600;font-size:13px">${c.name}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">${c.phone || ''} ${c.cpf ? '· '+c.cpf : ''}</div>
      </div>
      <div style="margin-left:auto">${badgeStatus(c.status)}</div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons({ nodes: [results] });
}

function selectClient(client) {
  selectedClient = client;
  document.getElementById('clientResults').innerHTML = '';
  document.getElementById('clientSearch').value = client.name;

  const preview = document.getElementById('selectedClientPreview');
  if (preview) {
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--accent-light);border-radius:var(--radius-md);border:1px solid rgba(108,99,255,0.2)">
        <div class="client-avatar" style="background:${avatarColor(client.name)};width:40px;height:40px;font-size:15px;flex-shrink:0">${initials(client.name)}</div>
        <div>
          <div style="font-weight:700">${client.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${client.phone || ''}</div>
        </div>
        <div style="margin-left:auto">${badgeStatus(client.status)}</div>
      </div>`;
    if (window.lucide) lucide.createIcons({ nodes: [preview] });
  }
}

async function searchProducts(term) {
  const results = document.getElementById('productResults');
  if (!term || term.length < 2) { if (results) results.innerHTML = ''; return; }

  const { data } = await db.getProducts({ search: term });
  if (!results) return;

  if (!data || !data.length) {
    results.innerHTML = `<div style="padding:12px;color:var(--text-muted);font-size:13px">Nenhum produto encontrado</div>`;
    return;
  }

  results.innerHTML = data.map(p => {
    const margin = ((p.sale_price - p.cost_price) / p.sale_price * 100).toFixed(1);
    const stockColor = p.stock_quantity >= 5 ? 'var(--success)' : p.stock_quantity >= 2 ? 'var(--warning)' : 'var(--danger)';
    return `
      <div class="search-result-item" onclick="selectProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">
        <div style="width:36px;height:36px;background:var(--surface-2);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📱</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${p.name} ${p.model ? '<span style="color:var(--text-muted)">'+p.model+'</span>' : ''}</div>
          <div style="font-size:11.5px;color:var(--success);font-weight:600">${formatCurrency(p.sale_price)} <span style="color:var(--text-muted);font-weight:400">· Margem ${margin}%</span></div>
        </div>
        <div style="font-size:12px;font-weight:600;color:${stockColor}">Estoque: ${p.stock_quantity}</div>
      </div>`;
  }).join('');
}

function selectProduct(product) {
  selectedProduct = product;
  document.getElementById('productResults').innerHTML = '';
  document.getElementById('productSearch').value = product.name;

  const preview = document.getElementById('selectedProductPreview');
  if (preview) {
    const margin = ((product.sale_price - product.cost_price) / product.sale_price * 100).toFixed(1);
    const stockColor = product.stock_quantity >= 5 ? 'var(--success)' : product.stock_quantity >= 2 ? 'var(--warning)' : 'var(--danger)';

    preview.innerHTML = `
      <div style="padding:14px;background:var(--accent-light);border-radius:var(--radius-md);border:1px solid rgba(108,99,255,0.2)">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:28px">📱</div>
          <div style="flex:1">
            <div style="font-weight:700">${product.name}</div>
            ${product.model ? `<div style="font-size:12px;color:var(--text-muted)">${product.brand ? product.brand + ' · ' : ''}${product.model}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:10px;font-size:12.5px">
          <div><span style="color:var(--text-muted)">Preço: </span><strong style="color:var(--success)">${formatCurrency(product.sale_price)}</strong></div>
          <div><span style="color:var(--text-muted)">Margem: </span><strong>${margin}%</strong></div>
          <div><span style="color:var(--text-muted)">Estoque: </span><strong style="color:${stockColor}">${product.stock_quantity}</strong></div>
        </div>
      </div>`;
  }
}

function selectPaymentType(type) {
  selectedPaymentType = type;
  document.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-payment="${type}"]`)?.classList.add('selected');

  // Esconde todos os campos
  document.querySelectorAll('.payment-fields').forEach(f => f.classList.add('hidden'));

  // Mostra campos do tipo selecionado
  document.getElementById(`fields-${type}`)?.classList.remove('hidden');

  // Define preço padrão
  if (selectedProduct) {
    const priceInput = document.querySelector(`#fields-${type} .price-input`);
    if (priceInput) priceInput.value = selectedProduct.sale_price.toFixed(2);
  }

  calcInstallmentPreview();
  calcCardPreview();
}

function calcInstallmentPreview() {
  const price = parseFloat(document.getElementById('crediarioPrice')?.value) || (selectedProduct?.sale_price || 0);
  const down = parseMoney(document.getElementById('downPayment')?.value || '0');
  const count = parseInt(document.getElementById('installmentsCount')?.value) || 1;
  const remaining = price - down;
  const installValue = remaining > 0 && count > 0 ? remaining / count : 0;

  const preview = document.getElementById('installmentPreview');
  if (preview) {
    preview.innerHTML = remaining > 0 ? `
      <div style="padding:12px;background:var(--warning-light);border-radius:var(--radius-md);border:1px solid rgba(255,165,2,0.2)">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">Valor total:</span>
          <strong>${formatCurrency(price)}</strong>
        </div>
        ${down > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">Entrada:</span>
          <strong style="color:var(--success)">${formatCurrency(down)}</strong>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">Saldo a parcelar:</span>
          <strong>${formatCurrency(remaining)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--warning)">
          <span>${count}x de:</span>
          <span>${formatCurrency(installValue)}</span>
        </div>
      </div>` : '';
  }
}

function calcCardPreview() {
  const price = parseFloat(document.getElementById('cartaoPrice')?.value) || (selectedProduct?.sale_price || 0);
  const installments = parseInt(document.getElementById('cardInstallments')?.value) || 1;
  const fee = parseFloat(document.getElementById('cardFeePercent')?.value) || 0;
  const totalWithFee = price * (1 + fee / 100);
  const feeAmount = totalWithFee - price;
  const installValue = totalWithFee / installments;

  const preview = document.getElementById('cardPreview');
  if (preview) {
    preview.innerHTML = price > 0 ? `
      <div style="padding:12px;background:var(--accent-light);border-radius:var(--radius-md);border:1px solid rgba(108,99,255,0.2)">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">Valor da venda:</span>
          <strong>${formatCurrency(price)}</strong>
        </div>
        ${fee > 0 ? `
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">Taxa (${fee}%):</span>
          <strong style="color:var(--danger)">+${formatCurrency(feeAmount)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <span style="color:var(--text-muted)">Total com taxa:</span>
          <strong>${formatCurrency(totalWithFee)}</strong>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--accent)">
          <span>${installments}x de:</span>
          <span>${formatCurrency(installValue)}</span>
        </div>
      </div>` : '';
  }
}

function goToStep(step) {
  if (step === 2 && !selectedClient) { showToast('Selecione um cliente', 'warning'); return; }
  if (step === 3 && !selectedProduct) { showToast('Selecione um produto', 'warning'); return; }

  wizardStep = step;

  document.querySelectorAll('.wizard-panel').forEach((p, i) => {
    p.classList.toggle('hidden', i + 1 !== step);
  });

  document.querySelectorAll('.wizard-step').forEach((s, i) => {
    s.classList.toggle('active', i + 1 === step);
    s.classList.toggle('done', i + 1 < step);
  });

  document.querySelectorAll('.step-line').forEach((l, i) => {
    l.classList.toggle('done', i + 1 < step);
  });

  if (step === 3 && selectedProduct) {
    document.querySelectorAll('.price-input').forEach(i => i.value = selectedProduct.sale_price.toFixed(2));
  }
}

async function submitSale() {
  if (!selectedClient || !selectedProduct || !selectedPaymentType) {
    showToast('Preencha todos os campos obrigatórios', 'warning');
    return;
  }

  const btn = document.getElementById('btnConfirmSale');
  if (btn) btn.classList.add('btn-loading');

  try {
    let saleData = {
      client_id: selectedClient.id,
      product_id: selectedProduct.id,
      payment_type: selectedPaymentType,
      notes: document.getElementById('saleNotes')?.value || null
    };

    if (selectedPaymentType === 'pix') {
      const price = parseFloat(document.getElementById('pixPrice')?.value) || selectedProduct.sale_price;
      saleData.total_amount = price;
      saleData.status = 'quitada';

      const { data: sale } = await db.createSale(saleData);
      await db.createPayment({ sale_id: sale.id, client_id: selectedClient.id, amount: price, payment_date: new Date().toISOString().split('T')[0], method: 'pix' });

    } else if (selectedPaymentType === 'cartao_credito') {
      const price = parseFloat(document.getElementById('cartaoPrice')?.value) || selectedProduct.sale_price;
      const cardInst = parseInt(document.getElementById('cardInstallments')?.value) || 1;
      const fee = parseFloat(document.getElementById('cardFeePercent')?.value) || 0;
      const totalWithFee = price * (1 + fee / 100);

      saleData.total_amount = price;
      saleData.card_installments = cardInst;
      saleData.card_fee_percent = fee;
      saleData.card_total_with_fee = totalWithFee;
      saleData.status = 'quitada';

      const { data: sale } = await db.createSale(saleData);
      await db.createPayment({ sale_id: sale.id, client_id: selectedClient.id, amount: price, payment_date: new Date().toISOString().split('T')[0], method: 'cartao_credito', card_installments: cardInst, card_fee_percent: fee });

    } else if (selectedPaymentType === 'crediario') {
      const price = parseFloat(document.getElementById('crediarioPrice')?.value) || selectedProduct.sale_price;
      const down = parseMoney(document.getElementById('downPayment')?.value || '0');
      const count = parseInt(document.getElementById('installmentsCount')?.value) || 1;
      const firstDue = document.getElementById('firstDueDate')?.value;
      const remaining = price - down;
      const installValue = remaining / count;

      saleData.total_amount = price;
      saleData.down_payment = down;
      saleData.installments_count = count;
      saleData.installment_value = installValue;
      saleData.first_due_date = firstDue;
      saleData.status = 'ativa';

      const { data: sale } = await db.createSale(saleData);

      // Gera parcelas
      const installmentsData = [];
      for (let i = 1; i <= count; i++) {
        const dueDate = new Date(firstDue + 'T00:00:00');
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        installmentsData.push({
          sale_id: sale.id,
          installment_number: i,
          amount: installValue,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pendente'
        });
      }

      await db.createInstallments(installmentsData);

      // Registra entrada se houver
      if (down > 0) {
        await db.createPayment({ sale_id: sale.id, client_id: selectedClient.id, amount: down, payment_date: new Date().toISOString().split('T')[0], method: 'crediario', notes: 'Entrada' });
      }
    }

    // Decrementa estoque
    await db.decrementStock(selectedProduct.id);

    showToast('Venda registrada com sucesso!', 'success');

    setTimeout(() => { window.location.href = 'vendas.html'; }, 1200);

  } catch (err) {
    console.error(err);
    showToast('Erro ao registrar venda', 'error');
    if (btn) btn.classList.remove('btn-loading');
  }
}

// Init dinâmico baseado na página
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('salesBody')) initVendas();
  if (document.getElementById('wizardContainer')) initNovaVenda();
});
