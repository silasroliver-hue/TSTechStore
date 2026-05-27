/* =============================================
   financeiro.js — Relatórios e fluxo de caixa
   ============================================= */

let finChart = null;
let finPeriod = 'mes'; // 'mes', 'semana', 'trimestre', 'ano'

async function initFinanceiro() {
  initPage('financeiro');
  setDefaultDates();
  await loadFinanceiro();
  setupFinanceiroListeners();
}

function setDefaultDates() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const fromInput = document.getElementById('dateFrom');
  const toInput = document.getElementById('dateTo');
  if (fromInput) fromInput.value = firstOfMonth;
  if (toInput) toInput.value = lastOfMonth;
}

function setupFinanceiroListeners() {
  document.getElementById('btnApplyFilter')?.addEventListener('click', loadFinanceiro);

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      finPeriod = btn.dataset.period;
      applyPeriod(finPeriod);
      loadFinanceiro();
    });
  });
}

function applyPeriod(period) {
  const today = new Date();
  let from, to;

  switch(period) {
    case 'semana':
      from = new Date(today.getTime() - 7 * 86400000);
      to = today;
      break;
    case 'mes':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'trimestre':
      from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'ano':
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31);
      break;
  }

  const fromInput = document.getElementById('dateFrom');
  const toInput = document.getElementById('dateTo');
  if (fromInput && from) fromInput.value = from.toISOString().split('T')[0];
  if (toInput && to) toInput.value = to.toISOString().split('T')[0];
}

async function loadFinanceiro() {
  const from = document.getElementById('dateFrom')?.value;
  const to = document.getElementById('dateTo')?.value;

  if (!from || !to) return;

  // Skeleton
  document.getElementById('finMetrics')?.querySelectorAll('.metric-card').forEach(c => {
    c.innerHTML = `<div class="skeleton" style="height:80px;border-radius:var(--radius-md)"></div>`;
  });

  const [
    { data: payments },
    { data: expenses },
    { data: sales }
  ] = await Promise.all([
    supabase.from('payments').select('amount, method, payment_date').gte('payment_date', from).lte('payment_date', to),
    supabase.from('expenses').select('amount, category, expense_date, description').gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false }),
    supabase.from('sales').select('total_amount, payment_type, cost_price:products(cost_price)').gte('created_at', from).lte('created_at', to + 'T23:59:59')
  ]);

  const totalEntradas = (payments || []).reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalSaidas = (expenses || []).reduce((s, e) => s + parseFloat(e.amount), 0);
  const lucroLiquido = totalEntradas - totalSaidas;

  // Breakdown por método
  const byMethod = { pix: 0, cartao_credito: 0, crediario: 0, dinheiro: 0, outro: 0 };
  (payments || []).forEach(p => { if (byMethod[p.method] !== undefined) byMethod[p.method] += parseFloat(p.amount); });

  renderFinMetrics(totalEntradas, totalSaidas, lucroLiquido, byMethod);
  renderExpensesTable(expenses || []);
  renderFinChart(payments || [], expenses || [], from, to);
}

function renderFinMetrics(entradas, saidas, lucro, byMethod) {
  const container = document.getElementById('finMetrics');
  if (!container) return;

  container.innerHTML = `
    <div class="metric-card" style="--card-accent:var(--success)">
      <div class="metric-icon" style="background:var(--success-light)">
        <i data-lucide="arrow-down-circle" style="width:20px;height:20px;color:var(--success)"></i>
      </div>
      <div class="metric-value">${formatCurrency(entradas)}</div>
      <div class="metric-label">Total de Entradas</div>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px">
          <span style="color:var(--accent-2)">⚡ Pix</span><strong>${formatCurrency(byMethod.pix)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px">
          <span style="color:var(--accent)">💳 Cartão</span><strong>${formatCurrency(byMethod.cartao_credito)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px">
          <span style="color:var(--warning)">🏪 Crediário</span><strong>${formatCurrency(byMethod.crediario)}</strong>
        </div>
      </div>
    </div>

    <div class="metric-card" style="--card-accent:var(--danger)">
      <div class="metric-icon" style="background:var(--danger-light)">
        <i data-lucide="arrow-up-circle" style="width:20px;height:20px;color:var(--danger)"></i>
      </div>
      <div class="metric-value">${formatCurrency(saidas)}</div>
      <div class="metric-label">Total de Saídas</div>
    </div>

    <div class="metric-card" style="--card-accent:${lucro >= 0 ? 'var(--success)' : 'var(--danger)'}">
      <div class="metric-icon" style="background:${lucro >= 0 ? 'var(--success-light)' : 'var(--danger-light)'}">
        <i data-lucide="${lucro >= 0 ? 'trending-up' : 'trending-down'}" style="width:20px;height:20px;color:${lucro >= 0 ? 'var(--success)' : 'var(--danger)'}"></i>
      </div>
      <div class="metric-value" style="color:${lucro >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(Math.abs(lucro))}</div>
      <div class="metric-label">${lucro >= 0 ? 'Lucro Líquido' : 'Prejuízo'}</div>
    </div>
  `;

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

function renderExpensesTable(expenses) {
  const tbody = document.getElementById('expensesBody');
  if (!tbody) return;

  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">Nenhuma despesa no período</td></tr>`;
    return;
  }

  tbody.innerHTML = expenses.map(e => `
    <tr>
      <td>${formatDate(e.expense_date)}</td>
      <td style="font-weight:500">${e.description}</td>
      <td><span class="badge badge-muted">${e.category || 'Geral'}</span></td>
      <td style="font-weight:700;color:var(--danger)">${formatCurrency(e.amount)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-ghost btn-sm" onclick="deleteExpense('${e.id}')">
            <i data-lucide="trash-2" style="width:13px;height:13px"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons({ nodes: [tbody] });
}

function renderFinChart(payments, expenses, from, to) {
  const ctx = document.getElementById('finChart');
  if (!ctx) return;
  if (finChart) finChart.destroy();

  // Agrupa por semana ou dia
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffDays = (toDate - fromDate) / 86400000;

  const labels = [];
  const entering = [];
  const leaving = [];

  if (diffDays <= 31) {
    // Por dia
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
      entering.push(payments.filter(p => p.payment_date === ds).reduce((s, p) => s + parseFloat(p.amount), 0));
      leaving.push(expenses.filter(e => e.expense_date === ds).reduce((s, e) => s + parseFloat(e.amount), 0));
    }
  } else {
    // Por semana
    let weekStart = new Date(fromDate);
    while (weekStart <= toDate) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const wsStr = weekStart.toISOString().split('T')[0];
      const weStr = weekEnd.toISOString().split('T')[0];
      labels.push(weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
      entering.push(payments.filter(p => p.payment_date >= wsStr && p.payment_date <= weStr).reduce((s, p) => s + parseFloat(p.amount), 0));
      leaving.push(expenses.filter(e => e.expense_date >= wsStr && e.expense_date <= weStr).reduce((s, e) => s + parseFloat(e.amount), 0));
      weekStart.setDate(weekStart.getDate() + 7);
    }
  }

  finChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Entradas',
          data: entering,
          backgroundColor: 'rgba(46,213,115,0.7)',
          borderColor: '#2ED573',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Saídas',
          data: leaving,
          backgroundColor: 'rgba(255,71,87,0.7)',
          borderColor: '#FF4757',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#8888A8', font: { size: 12 } } },
        tooltip: {
          backgroundColor: 'rgba(26,26,36,0.95)',
          titleColor: '#E8E8F0',
          bodyColor: '#8888A8',
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8888A8', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#8888A8', font: { size: 11 }, callback: v => `R$ ${(v/1000).toFixed(0)}k` }
        }
      }
    }
  });
}

/* =============================================
   DESPESAS
   ============================================= */
function openNewExpenseModal() {
  const today = new Date().toISOString().split('T')[0];
  const categories = ['Aluguel', 'Fornecedores', 'Funcionários', 'Marketing', 'Manutenção', 'Impostos', 'Transporte', 'Outros'];

  showModal('Nova Despesa', `
    <form id="expenseForm" onsubmit="event.preventDefault()">
      <div class="form-group">
        <label class="form-label">Descrição *</label>
        <input class="form-input" id="expDesc" type="text" placeholder="Ex: Aluguel do mês" required>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Valor (R$) *</label>
          <input class="form-input" id="expAmount" type="number" step="0.01" min="0" placeholder="0,00" required>
        </div>
        <div class="form-group">
          <label class="form-label">Data *</label>
          <input class="form-input" id="expDate" type="date" value="${today}" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-select" id="expCategory">
          ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-textarea" id="expNotes" placeholder="Opcional..."></textarea>
      </div>
    </form>
  `, {
    icon: 'minus-circle',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="saveExpense()" id="btnSaveExp">
        <i data-lucide="save" style="width:14px;height:14px"></i> Registrar Despesa
      </button>`
  });
}

async function saveExpense() {
  const btn = document.getElementById('btnSaveExp');
  if (btn) btn.classList.add('btn-loading');

  const data = {
    description: document.getElementById('expDesc')?.value.trim(),
    amount: parseFloat(document.getElementById('expAmount')?.value) || 0,
    expense_date: document.getElementById('expDate')?.value,
    category: document.getElementById('expCategory')?.value,
    notes: document.getElementById('expNotes')?.value.trim() || null
  };

  if (!data.description || !data.amount || !data.expense_date) {
    showToast('Preencha os campos obrigatórios', 'warning');
    if (btn) btn.classList.remove('btn-loading');
    return;
  }

  const { error } = await db.createExpense(data);
  if (btn) btn.classList.remove('btn-loading');
  if (error) { showToast('Erro ao registrar despesa', 'error'); return; }

  showToast('Despesa registrada!', 'success');
  closeModal();
  await loadFinanceiro();
}

async function deleteExpense(id) {
  const confirmed = await confirmDialog('Excluir esta despesa?');
  if (!confirmed) return;
  const { error } = await db.deleteExpense(id);
  if (error) { showToast('Erro ao excluir', 'error'); return; }
  showToast('Despesa excluída', 'success');
  await loadFinanceiro();
}

/* =============================================
   FLUXO DE CAIXA
   ============================================= */
async function initFluxoCaixa() {
  initPage('fluxo-caixa');
  setFluxoDates();
  await loadFluxoCaixa();
}

function setFluxoDates() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const fromInput = document.getElementById('fluxoFrom');
  const toInput = document.getElementById('fluxoTo');
  if (fromInput) fromInput.value = firstOfMonth;
  if (toInput) toInput.value = lastOfMonth;
}

async function loadFluxoCaixa() {
  const from = document.getElementById('fluxoFrom')?.value;
  const to = document.getElementById('fluxoTo')?.value;
  if (!from || !to) return;

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase.from('payments').select('*, clients(name)').gte('payment_date', from).lte('payment_date', to).order('payment_date', { ascending: false }),
    supabase.from('expenses').select('*').gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false })
  ]);

  renderFluxoCaixa(payments || [], expenses || []);
}

function renderFluxoCaixa(payments, expenses) {
  // Combina e ordena
  const allEntries = [
    ...payments.map(p => ({ ...p, type: 'entrada', date: p.payment_date })),
    ...expenses.map(e => ({ ...e, type: 'saida', date: e.expense_date }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const totalEntradas = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalSaidas = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const saldo = totalEntradas - totalSaidas;

  const summaryEl = document.getElementById('fluxoSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div class="metric-card" style="--card-accent:var(--success);flex:1;min-width:160px">
          <div class="metric-label">Entradas</div>
          <div class="metric-value" style="font-size:20px;color:var(--success)">${formatCurrency(totalEntradas)}</div>
        </div>
        <div class="metric-card" style="--card-accent:var(--danger);flex:1;min-width:160px">
          <div class="metric-label">Saídas</div>
          <div class="metric-value" style="font-size:20px;color:var(--danger)">${formatCurrency(totalSaidas)}</div>
        </div>
        <div class="metric-card" style="--card-accent:${saldo >= 0 ? 'var(--accent)' : 'var(--danger)'};flex:1;min-width:160px">
          <div class="metric-label">Saldo do Período</div>
          <div class="metric-value" style="font-size:20px;color:${saldo >= 0 ? 'var(--accent)' : 'var(--danger)'}">${formatCurrency(saldo)}</div>
        </div>
      </div>`;
  }

  const tbody = document.getElementById('fluxoBody');
  if (!tbody) return;

  if (!allEntries.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">Nenhum movimento no período</td></tr>`;
    return;
  }

  tbody.innerHTML = allEntries.map(entry => {
    const isEntrada = entry.type === 'entrada';
    return `
      <tr>
        <td style="color:var(--text-muted)">${formatDate(entry.date)}</td>
        <td>
          <span style="font-size:11px;padding:2px 7px;border-radius:var(--radius-xl);background:${isEntrada ? 'var(--success-light)' : 'var(--danger-light)'};color:${isEntrada ? 'var(--success)' : 'var(--danger)'}">
            ${isEntrada ? '▲ Entrada' : '▼ Saída'}
          </span>
        </td>
        <td style="font-weight:500">${isEntrada ? (entry.clients?.name || '—') : (entry.description || '—')}</td>
        <td><span class="badge badge-muted">${isEntrada ? entry.method?.replace('_', ' ') : (entry.category || 'Geral')}</span></td>
        <td style="font-weight:700;color:${isEntrada ? 'var(--success)' : 'var(--danger)'}">
          ${isEntrada ? '+' : '-'}${formatCurrency(entry.amount)}
        </td>
        <td>
          <div class="table-actions">
            ${isEntrada
              ? `<button class="btn btn-icon btn-ghost btn-sm" title="Editar pagamento" onclick="openEditPaymentModal('${entry.id}')">
                   <i data-lucide="pencil" style="width:13px;height:13px"></i>
                 </button>`
              : `<button class="btn btn-icon btn-ghost btn-sm" title="Excluir despesa" onclick="deleteExpense('${entry.id}')">
                   <i data-lucide="trash-2" style="width:13px;height:13px"></i>
                 </button>`}
          </div>
        </td>
      </tr>`;
  }).join('');
}

// Init dinâmico
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('finMetrics')) initFinanceiro();
  if (document.getElementById('fluxoBody')) initFluxoCaixa();
});
