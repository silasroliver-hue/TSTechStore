/* =============================================
   parcelas.js — Gestão de parcelas e cobranças
   ============================================= */

let allInstallments = [];
let parcelasFilter = 'todas';
let currentPage = 1;
const PAGE_SIZE = 15;

async function initParcelas() {
  initPage('parcelas');
  await db.syncOverdueInstallments();
  await loadInstallments();
  setupParcelasListeners();
}

function setupParcelasListeners() {
  document.getElementById('searchParcelas')?.addEventListener('input', (e) => {
    renderInstallments(e.target.value.toLowerCase());
  });
}

async function loadInstallments() {
  const container = document.getElementById('parcelasContainer');
  if (container) {
    container.innerHTML = Array(6).fill(`
      <div class="parcela-card">
        <div class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1"><div class="skeleton skeleton-text" style="width:60%"></div><div class="skeleton skeleton-text" style="width:40%"></div></div>
        <div class="skeleton skeleton-text" style="width:70px"></div>
      </div>`).join('');
  }

  // Verifica filtro na URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('filter')) parcelasFilter = urlParams.get('filter');

  const filters = {};
  const today = new Date().toISOString().split('T')[0];

  if (parcelasFilter === 'hoje') {
    filters.from = today; filters.to = today;
  } else if (parcelasFilter === 'atrasadas') {
    filters.to = today;
    filters.status = 'pendente';
  } else if (parcelasFilter === 'semana') {
    filters.from = today;
    filters.to = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  } else if (parcelasFilter === 'mes') {
    filters.from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    filters.to = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('installments')
    .select('*, sales!inner(*, clients(name, phone), products(name))')
    .neq('status', 'pago')
    .order('due_date')
    .limit(200);

  if (error) { showToast('Erro ao carregar parcelas', 'error'); return; }

  allInstallments = (data || []).filter(inst => {
    if (parcelasFilter === 'hoje') return inst.due_date === today;
    if (parcelasFilter === 'atrasadas') return inst.due_date < today;
    if (parcelasFilter === 'semana') {
      const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      return inst.due_date >= today && inst.due_date <= sevenDays;
    }
    if (parcelasFilter === 'mes') {
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const lastOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      return inst.due_date >= firstOfMonth && inst.due_date <= lastOfMonth;
    }
    return true;
  });

  updateParcelasStats();
  renderInstallments();
}

function setParcelasFilter(filter) {
  parcelasFilter = filter;
  currentPage = 1;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
  loadInstallments();
}

function updateParcelasStats() {
  const today = new Date().toISOString().split('T')[0];
  const overdue = allInstallments.filter(i => i.due_date < today);
  const totalOverdue = overdue.reduce((s, i) => s + parseFloat(i.amount), 0);
  const total = allInstallments.reduce((s, i) => s + parseFloat(i.amount), 0);

  const countEl = document.getElementById('overdueCount');
  const totalEl = document.getElementById('totalOpen');
  const heroEl = document.getElementById('overdueHero');

  if (countEl) countEl.textContent = overdue.length;
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (heroEl) {
    if (overdue.length > 0) {
      heroEl.innerHTML = `
        <div class="counter-hero">
          <i data-lucide="alert-circle" style="width:16px;height:16px"></i>
          <span id="heroCount">${overdue.length}</span> parcelas atrasadas —
          <span style="font-size:13px;font-weight:800">${formatCurrency(totalOverdue)}</span>
        </div>`;
      heroEl.classList.remove('hidden');
      if (window.lucide) lucide.createIcons({ nodes: [heroEl] });
    } else {
      heroEl.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:8px;background:var(--success-light);border:1px solid rgba(46,213,115,0.2);border-radius:var(--radius-xl);padding:6px 14px;color:var(--success);font-weight:700;font-size:13px">
          <i data-lucide="check-circle" style="width:16px;height:16px"></i>
          Todas as parcelas em dia!
        </div>`;
      if (window.lucide) lucide.createIcons({ nodes: [heroEl] });
    }
  }
}

function renderInstallments(search = '') {
  const container = document.getElementById('parcelasContainer');
  if (!container) return;

  const today = new Date().toISOString().split('T')[0];
  let filtered = allInstallments;

  if (search) {
    filtered = filtered.filter(i => {
      const clientName = (i.sales?.clients?.name || '').toLowerCase();
      const productName = (i.sales?.products?.name || '').toLowerCase();
      return clientName.includes(search) || productName.includes(search);
    });
  }

  const total = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(start, start + PAGE_SIZE);

  if (!paged.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-title">Nenhuma parcela encontrada</div>
        <div class="empty-desc">Tente outro filtro ou período</div>
      </div>`;
    document.getElementById('paginationContainer').innerHTML = '';
    return;
  }

  container.innerHTML = paged.map(inst => {
    const isOverdue = inst.due_date < today;
    const daysOv = isOverdue ? daysOverdue(inst.due_date) : 0;
    const clientName = inst.sales?.clients?.name || '—';
    const productName = inst.sales?.products?.name || '—';
    const color = avatarColor(clientName);
    const ini = initials(clientName);
    const totalInstallments = inst.sales?.installments_count || '?';

    return `
      <div class="parcela-card" style="border-left:3px solid ${isOverdue ? 'var(--danger)' : 'var(--border)'}">
        <div class="client-avatar" style="background:${color};width:40px;height:40px;font-size:14px;flex-shrink:0">${ini}</div>
        <div class="parcela-info">
          <div class="parcela-client">${clientName}</div>
          <div class="parcela-meta">
            📱 ${productName} · Parc. ${inst.installment_number}/${totalInstallments}
          </div>
          <div class="parcela-meta" style="margin-top:3px;color:${isOverdue ? 'var(--danger)' : 'var(--text-muted)'}">
            ${isOverdue ? `⚠️ Venceu ${formatDate(inst.due_date)} (${daysOv} dias de atraso)` : `📅 Vence ${formatDate(inst.due_date)}`}
          </div>
          ${inst.sales?.clients?.phone ? `
            <a href="https://wa.me/55${inst.sales.clients.phone.replace(/\D/g,'')}" target="_blank"
              style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--success);margin-top:4px;font-weight:600">
              <i data-lucide="message-circle" style="width:11px;height:11px"></i>
              WhatsApp
            </a>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="parcela-amount" style="color:${isOverdue ? 'var(--danger)' : 'var(--text)'}">${formatCurrency(inst.amount)}</div>
          <div style="margin-top:6px">
            ${isOverdue ? `<span class="badge badge-danger" style="font-size:10px">${daysOv}d</span>` : `<span class="badge badge-muted" style="font-size:10px">Pendente</span>`}
          </div>
          <button class="btn btn-success btn-sm" style="margin-top:8px" onclick="openPayModal('${inst.id}', '${clientName}', ${inst.amount}, '${inst.sales?.client_id}', '${inst.sale_id}')">
            <i data-lucide="check" style="width:12px;height:12px"></i> Pagar
          </button>
        </div>
      </div>`;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });

  // Paginação
  renderPagination(total);
}

function renderPagination(total) {
  const paginContainer = document.getElementById('paginationContainer');
  if (!paginContainer) return;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) { paginContainer.innerHTML = ''; return; }

  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pages += `<span style="color:var(--text-dim);padding:0 4px">…</span>`;
    }
  }

  paginContainer.innerHTML = `
    <div class="pagination">
      <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i data-lucide="chevron-left" style="width:13px;height:13px"></i>
      </button>
      ${pages}
      <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i data-lucide="chevron-right" style="width:13px;height:13px"></i>
      </button>
    </div>`;
  if (window.lucide) lucide.createIcons({ nodes: [paginContainer] });
}

function goToPage(page) {
  const total = allInstallments.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderInstallments(document.getElementById('searchParcelas')?.value.toLowerCase() || '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =============================================
   MODAL DE PAGAMENTO
   ============================================= */
function openPayModal(installmentId, clientName, amount, clientId, saleId) {
  const today = new Date().toISOString().split('T')[0];

  showModal(`Registrar Pagamento — ${clientName}`, `
    <div style="background:var(--success-light);border:1px solid rgba(46,213,115,0.2);border-radius:var(--radius-md);padding:14px;text-align:center;margin-bottom:18px">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Valor da parcela</div>
      <div style="font-size:28px;font-weight:800;color:var(--success)">${formatCurrency(amount)}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Método de pagamento</label>
      <select class="form-select" id="payMethod">
        <option value="dinheiro">💵 Dinheiro</option>
        <option value="pix">⚡ Pix</option>
        <option value="cartao_credito">💳 Cartão de Crédito</option>
        <option value="crediario">🏪 Crediário</option>
        <option value="outro">Outro</option>
      </select>
    </div>
    <div class="form-row cols-2">
      <div class="form-group">
        <label class="form-label">Valor recebido (R$)</label>
        <input class="form-input" id="payAmount" type="number" step="0.01" value="${amount}" min="0"
          oninput="updatePartialPayInfo(parseFloat(this.value)||0, ${amount})">
      </div>
      <div class="form-group">
        <label class="form-label">Data do pagamento</label>
        <input class="form-input" id="payDate" type="date" value="${today}">
      </div>
    </div>

    <div id="partialPayInfo" style="display:none;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <i data-lucide="alert-triangle" style="width:13px;height:13px"></i>
        Pagamento parcial
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">
        Saldo de <strong id="partialBalance" style="color:var(--text)">R$ 0,00</strong> será redistribuído nas parcelas restantes.
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label" style="font-size:11px">Como redistribuir o saldo?</label>
        <select class="form-select" id="redistributeMethod">
          <option value="spread">Distribuir igualmente nas parcelas restantes</option>
          <option value="last">Adicionar tudo na última parcela</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Observações</label>
      <input class="form-input" id="payNotes" type="text" placeholder="Opcional...">
    </div>
  `, {
    icon: 'check-circle',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-success" onclick="confirmPayment('${installmentId}','${clientId}','${saleId}',${amount})" id="btnConfirmPay">
        <i data-lucide="check" style="width:14px;height:14px"></i> Confirmar Pagamento
      </button>`
  });
}

function updatePartialPayInfo(paidAmount, originalAmount) {
  const diff = originalAmount - paidAmount;
  const infoDiv = document.getElementById('partialPayInfo');
  const balanceEl = document.getElementById('partialBalance');

  if (diff > 0.01 && paidAmount > 0) {
    if (infoDiv) infoDiv.style.display = 'block';
    if (balanceEl) balanceEl.textContent = formatCurrency(diff);
    if (window.lucide) lucide.createIcons({ nodes: [infoDiv] });
  } else {
    if (infoDiv) infoDiv.style.display = 'none';
  }
}

async function confirmPayment(installmentId, clientId, saleId, originalAmount) {
  const btn = document.getElementById('btnConfirmPay');
  if (btn) btn.classList.add('btn-loading');

  const method = document.getElementById('payMethod')?.value;
  const paidAmount = parseFloat(document.getElementById('payAmount')?.value) || 0;
  const date = document.getElementById('payDate')?.value;
  const notes = document.getElementById('payNotes')?.value;
  const redistributeMethod = document.getElementById('redistributeMethod')?.value || 'spread';

  if (!date || paidAmount <= 0) {
    showToast('Preencha data e valor', 'warning');
    if (btn) btn.classList.remove('btn-loading');
    return;
  }

  try {
    const difference = (originalAmount || paidAmount) - paidAmount;

    // Pagamento parcial: redistribui o saldo nas parcelas restantes
    if (difference > 0.01 && saleId && saleId !== 'undefined') {
      const { data: remaining } = await supabase
        .from('installments')
        .select('id, amount, installment_number')
        .eq('sale_id', saleId)
        .neq('id', installmentId)
        .neq('status', 'pago')
        .order('installment_number');

      if (remaining && remaining.length > 0) {
        if (redistributeMethod === 'last') {
          const last = remaining[remaining.length - 1];
          await supabase.from('installments')
            .update({ amount: Math.round((parseFloat(last.amount) + difference) * 100) / 100 })
            .eq('id', last.id);
        } else {
          const extra = difference / remaining.length;
          for (const inst of remaining) {
            await supabase.from('installments')
              .update({ amount: Math.round((parseFloat(inst.amount) + extra) * 100) / 100 })
              .eq('id', inst.id);
          }
        }
      } else {
        showToast('Sem parcelas restantes para redistribuir o saldo.', 'warning');
      }
    }

    // Marca parcela como paga
    await db.payInstallment(installmentId, new Date(date + 'T12:00:00').toISOString());

    // Registra pagamento
    await db.createPayment({
      installment_id: installmentId,
      sale_id: saleId,
      client_id: clientId,
      amount: paidAmount,
      payment_date: date,
      method,
      notes: notes || null
    });

    // Atualiza status do cliente
    if (clientId && clientId !== 'undefined') await db.updateClientStatus(clientId);

    // Verifica se a venda foi quitada
    if (saleId && saleId !== 'undefined') {
      const { data: remainingAfter } = await supabase
        .from('installments')
        .select('status')
        .eq('sale_id', saleId)
        .neq('status', 'pago');

      if (!remainingAfter || remainingAfter.length === 0) {
        await db.updateSale(saleId, { status: 'quitada' });
      }
    }

    const msg = difference > 0.01
      ? `Pagamento parcial registrado! Saldo de ${formatCurrency(difference)} redistribuído.`
      : 'Pagamento registrado com sucesso!';
    showToast(msg, 'success');
    closeModal();
    await loadInstallments();

  } catch (err) {
    console.error(err);
    showToast('Erro ao registrar pagamento', 'error');
  }

  if (btn) btn.classList.remove('btn-loading');
}

document.addEventListener('DOMContentLoaded', initParcelas);
