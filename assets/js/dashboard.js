/* =============================================
   dashboard.js — Lógica do painel principal
   ============================================= */

let chartEntradas = null;
let chartBreakdown = null;

async function initDashboard() {
  initPage('dashboard');
  await db.syncOverdueInstallments();
  renderSkeletons();

  const [metrics, chartData, recentSales, upcomingInstallments] = await Promise.all([
    loadMetrics(),
    loadChartData(),
    loadRecentSales(),
    loadUpcomingInstallments()
  ]);

  renderMetrics(metrics);
  renderCharts(chartData);
  renderRecentSales(recentSales);
  renderUpcomingInstallments(upcomingInstallments);
}

function renderSkeletons() {
  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric-card">${skeletonMetric()}</div>
    <div class="metric-card">${skeletonMetric()}</div>
    <div class="metric-card">${skeletonMetric()}</div>
    <div class="metric-card">${skeletonMetric()}</div>
  `;
}

function skeletonMetric() {
  return `
    <div class="skeleton" style="width:40px;height:40px;border-radius:var(--radius-md);margin-bottom:14px"></div>
    <div class="skeleton skeleton-title" style="width:70%"></div>
    <div class="skeleton skeleton-text" style="width:50%"></div>
    <div class="skeleton" style="height:4px;border-radius:999px;margin-top:12px"></div>
  `;
}

async function loadMetrics() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const firstOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
  const lastOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

  const [
    { data: openInstallments },
    { data: paymentsThisMonth },
    { data: paymentsLastMonth },
    { data: inadimplentes },
    { data: lowStock }
  ] = await Promise.all([
    supabase.from('installments').select('amount').eq('status', 'pendente'),
    supabase.from('payments').select('amount').gte('payment_date', firstOfMonth),
    supabase.from('payments').select('amount').gte('payment_date', firstOfLastMonth).lte('payment_date', lastOfLastMonth),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'inadimplente'),
    supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock_quantity', 3).gt('stock_quantity', -1)
  ]);

  const totalOpen = (openInstallments || []).reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalThisMonth = (paymentsThisMonth || []).reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalLastMonth = (paymentsLastMonth || []).reduce((s, r) => s + parseFloat(r.amount), 0);
  const changePercent = totalLastMonth > 0
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth * 100).toFixed(1)
    : 0;

  return {
    totalOpen,
    totalThisMonth,
    changePercent,
    inadimplentesCount: inadimplentes?.count || 0,
    lowStockCount: lowStock?.count || 0
  };
}

function renderMetrics({ totalOpen, totalThisMonth, changePercent, inadimplentesCount, lowStockCount }) {
  const isUp = changePercent >= 0;
  const progress = totalOpen > 0 ? Math.min((totalThisMonth / totalOpen) * 100, 100) : 0;

  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric-card" style="--card-accent:var(--accent);--card-accent-light:var(--accent-light)">
      <div class="metric-icon">
        <i data-lucide="wallet" style="width:20px;height:20px;color:var(--accent)"></i>
      </div>
      <div class="metric-value" id="metricOpen">R$ 0</div>
      <div class="metric-label">Total em Aberto</div>
      <div class="metric-bar"><div class="metric-bar-fill" style="width:${progress}%"></div></div>
    </div>

    <div class="metric-card" style="--card-accent:var(--success);--card-accent-light:var(--success-light)">
      <div class="metric-icon">
        <i data-lucide="trending-up" style="width:20px;height:20px;color:var(--success)"></i>
      </div>
      <div class="metric-value" id="metricMonth">R$ 0</div>
      <div class="metric-label">Recebido no Mês</div>
      <div class="metric-change ${isUp ? 'up' : 'down'}" style="margin-top:8px">
        <i data-lucide="${isUp ? 'arrow-up-right' : 'arrow-down-right'}" style="width:14px;height:14px"></i>
        ${Math.abs(changePercent)}% vs. mês anterior
      </div>
    </div>

    <div class="metric-card" style="--card-accent:var(--danger);--card-accent-light:var(--danger-light)">
      <div class="metric-icon">
        <i data-lucide="user-x" style="width:20px;height:20px;color:var(--danger)"></i>
      </div>
      <div class="metric-value" id="metricInadim">0</div>
      <div class="metric-label">Clientes Inadimplentes</div>
      <a href="clientes.html?filter=inadimplente" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--danger);margin-top:10px">
        Ver todos <i data-lucide="arrow-right" style="width:12px;height:12px"></i>
      </a>
    </div>

    <div class="metric-card" style="--card-accent:var(--warning);--card-accent-light:var(--warning-light)">
      <div class="metric-icon">
        <i data-lucide="package-x" style="width:20px;height:20px;color:var(--warning)"></i>
      </div>
      <div class="metric-value" id="metricStock">0</div>
      <div class="metric-label">Produtos com Estoque Baixo</div>
      <a href="produtos.html?filter=baixo" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--warning);margin-top:10px">
        Ver todos <i data-lucide="arrow-right" style="width:12px;height:12px"></i>
      </a>
    </div>
  `;

  if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('metricsGrid')] });

  // Anima contadores
  animateCounter(document.getElementById('metricOpen'), totalOpen, 1200, 'R$ ', '');
  animateCounter(document.getElementById('metricMonth'), totalThisMonth, 1200, 'R$ ', '');
  animateCounter(document.getElementById('metricInadim'), inadimplentesCount, 800);
  animateCounter(document.getElementById('metricStock'), lowStockCount, 800);

  // Formata como moeda após animação
  setTimeout(() => {
    const metricOpen = document.getElementById('metricOpen');
    const metricMonth = document.getElementById('metricMonth');
    if (metricOpen) metricOpen.textContent = formatCurrency(totalOpen);
    if (metricMonth) metricMonth.textContent = formatCurrency(totalThisMonth);
  }, 1400);
}

async function loadChartData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [{ data: payments }, { data: expenses }] = await Promise.all([
    supabase.from('payments').select('amount, payment_date, method').gte('payment_date', thirtyDaysAgo).order('payment_date'),
    supabase.from('expenses').select('amount, expense_date').gte('expense_date', thirtyDaysAgo).order('expense_date')
  ]);

  // Agrupa por dia
  const days = [];
  const entering = [];
  const leaving = [];
  const paymentMethods = { pix: 0, cartao_credito: 0, crediario: 0, dinheiro: 0 };

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    days.push(dayLabel);

    const dayPayments = (payments || []).filter(p => p.payment_date === dateStr);
    const dayExpenses = (expenses || []).filter(e => e.expense_date === dateStr);

    entering.push(dayPayments.reduce((s, p) => s + parseFloat(p.amount), 0));
    leaving.push(dayExpenses.reduce((s, e) => s + parseFloat(e.amount), 0));
  }

  (payments || []).forEach(p => {
    if (paymentMethods[p.method] !== undefined) paymentMethods[p.method] += parseFloat(p.amount);
  });

  return { days, entering, leaving, paymentMethods };
}

function renderCharts({ days, entering, leaving, paymentMethods }) {
  // Gráfico de linha — Entradas vs Saídas
  const ctxLine = document.getElementById('chartEntradasSaidas');
  if (ctxLine) {
    if (chartEntradas) chartEntradas.destroy();
    chartEntradas = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: days.filter((_, i) => i % 3 === 0),
        datasets: [
          {
            label: 'Entradas',
            data: entering.filter((_, i) => i % 3 === 0),
            borderColor: '#6C63FF',
            backgroundColor: 'rgba(108,99,255,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#6C63FF',
            pointRadius: 3,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Saídas',
            data: leaving.filter((_, i) => i % 3 === 0),
            borderColor: '#FF4757',
            backgroundColor: 'rgba(255,71,87,0.06)',
            borderWidth: 2.5,
            pointBackgroundColor: '#FF4757',
            pointRadius: 3,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26,26,36,0.95)',
            titleColor: '#E8E8F0',
            bodyColor: '#8888A8',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#8888A8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#8888A8',
              font: { size: 11 },
              callback: v => `R$ ${(v/1000).toFixed(0)}k`
            }
          }
        }
      }
    });
  }

  // Donut breakdown de pagamentos
  const ctxDonut = document.getElementById('chartBreakdown');
  if (ctxDonut) {
    if (chartBreakdown) chartBreakdown.destroy();
    const total = Object.values(paymentMethods).reduce((s, v) => s + v, 0);

    chartBreakdown = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: ['Pix', 'Cartão', 'Crediário', 'Dinheiro'],
        datasets: [{
          data: [paymentMethods.pix, paymentMethods.cartao_credito, paymentMethods.crediario, paymentMethods.dinheiro],
          backgroundColor: ['#00D4AA', '#6C63FF', '#FFA502', '#2ED573'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(26,26,36,0.95)',
            callbacks: {
              label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`
            }
          }
        }
      }
    });

    // Legenda manual
    const legend = document.getElementById('breakdownLegend');
    if (legend) {
      const colors = ['#00D4AA', '#6C63FF', '#FFA502', '#2ED573'];
      const labels = ['Pix', 'Cartão', 'Crediário', 'Dinheiro'];
      const values = [paymentMethods.pix, paymentMethods.cartao_credito, paymentMethods.crediario, paymentMethods.dinheiro];
      legend.innerHTML = labels.map((l, i) => `
        <div class="legend-item">
          <div class="legend-dot" style="background:${colors[i]}"></div>
          <span>${l}</span>
          <span class="legend-value">${formatCurrency(values[i])}</span>
        </div>
      `).join('');
    }
  }
}

async function loadRecentSales() {
  const { data } = await supabase
    .from('sales')
    .select('*, clients(name), products(name)')
    .order('created_at', { ascending: false })
    .limit(8);
  return data || [];
}

function renderRecentSales(sales) {
  const tbody = document.getElementById('recentSalesBody');
  if (!tbody) return;

  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">Nenhuma venda registrada</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.map(s => `
    <tr>
      <td><span style="font-weight:600">${s.clients?.name || '—'}</span></td>
      <td style="color:var(--text-muted)">${s.products?.name || '—'}</td>
      <td>${badgePayment(s.payment_type, s.installments_count || s.card_installments)}</td>
      <td style="font-weight:700">${formatCurrency(s.total_amount)}</td>
      <td>${badgeStatus(s.status)}</td>
      <td style="color:var(--text-muted);font-size:12px">${formatDate(s.created_at)}</td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons({ nodes: [tbody] });
}

async function loadUpcomingInstallments() {
  const today = new Date().toISOString().split('T')[0];
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data } = await supabase
    .from('installments')
    .select('*, sales!inner(*, clients(name))')
    .eq('status', 'pendente')
    .lte('due_date', sevenDays)
    .order('due_date')
    .limit(8);

  return data || [];
}

function renderUpcomingInstallments(installments) {
  const container = document.getElementById('upcomingInstallments');
  if (!container) return;

  if (!installments.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px">
      <div style="font-size:28px;margin-bottom:8px">🎉</div>
      <div style="color:var(--text-muted);font-size:13px">Nenhuma parcela vencendo esta semana</div>
    </div>`;
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = installments.map(inst => {
    const isOverdue = inst.due_date < today;
    const days = daysOverdue(inst.due_date);
    const clientName = inst.sales?.clients?.name || '—';

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:50%;background:${isOverdue ? 'var(--danger-light)' : 'var(--accent-light)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i data-lucide="${isOverdue ? 'alert-circle' : 'calendar'}" style="width:15px;height:15px;color:${isOverdue ? 'var(--danger)' : 'var(--accent)'}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${clientName}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">
            Parc. ${inst.installment_number} • Vence ${formatDate(inst.due_date)}
            ${isOverdue ? `<span style="color:var(--danger);font-weight:600"> • ${days}d atraso</span>` : ''}
          </div>
        </div>
        <div style="font-weight:700;font-size:14px;color:${isOverdue ? 'var(--danger)' : 'var(--text)'};white-space:nowrap">
          ${formatCurrency(inst.amount)}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

// Inicia ao carregar a página
document.addEventListener('DOMContentLoaded', initDashboard);
