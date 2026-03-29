/* =============================================
   clientes.js — Gestão de clientes
   ============================================= */

let allClients = [];
let viewMode = 'grid'; // 'grid' ou 'table'
let filterStatus = '';
let searchTerm = '';

async function initClientes() {
  initPage('clientes');
  await loadClients();
  setupListeners();
}

function setupListeners() {
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    renderClients();
  });

  document.getElementById('btnViewGrid')?.addEventListener('click', () => setView('grid'));
  document.getElementById('btnViewTable')?.addEventListener('click', () => setView('table'));
  document.getElementById('btnNewClient')?.addEventListener('click', openNewClientModal);
}

async function loadClients() {
  const container = document.getElementById('clientsContainer');
  if (container) container.innerHTML = `<div class="grid-4">${skeletonCards(8, '160px')}</div>`;

  const { data, error } = await db.getClients();
  if (error) { showToast('Erro ao carregar clientes', 'error'); return; }

  allClients = data || [];

  // Verifica filtro na URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('filter')) filterStatus = urlParams.get('filter');

  renderClients();
  updateStats();
}

function getFilteredClients() {
  return allClients.filter(c => {
    const matchSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm) ||
      (c.cpf || '').includes(searchTerm) ||
      (c.phone || '').includes(searchTerm);
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });
}

function renderClients() {
  const filtered = getFilteredClients();
  const container = document.getElementById('clientsContainer');
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">Nenhum cliente encontrado</div>
        <div class="empty-desc">Tente ajustar os filtros ou adicione um novo cliente</div>
        <button class="btn btn-primary" onclick="openNewClientModal()">
          <i data-lucide="user-plus" style="width:14px;height:14px"></i> Novo Cliente
        </button>
      </div>`;
    if (window.lucide) lucide.createIcons({ nodes: [container] });
    return;
  }

  if (viewMode === 'grid') {
    container.innerHTML = `<div class="client-grid">
      ${filtered.map(c => renderClientCard(c)).join('')}
    </div>`;
  } else {
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Cidade</th>
              <th>Status</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(c => renderClientRow(c)).join('')}
          </tbody>
        </table>
      </div>`;
  }

  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

function renderClientCard(client) {
  const color = avatarColor(client.name);
  const ini = initials(client.name);
  return `
    <div class="client-card" onclick="openClientDrawer('${client.id}')">
      <div class="client-avatar" style="background:${color}">${ini}</div>
      <div class="client-name">${client.name}</div>
      <div class="client-phone">${client.phone || 'Sem telefone'}</div>
      ${badgeStatus(client.status)}
      <div style="margin-top:10px;display:flex;gap:6px;justify-content:center">
        <button class="btn btn-icon btn-ghost btn-sm" title="Editar" onclick="event.stopPropagation();openEditClientModal('${client.id}')">
          <i data-lucide="edit-2" style="width:13px;height:13px"></i>
        </button>
        <button class="btn btn-icon btn-ghost btn-sm" title="Excluir" onclick="event.stopPropagation();deleteClient('${client.id}','${client.name}')">
          <i data-lucide="trash-2" style="width:13px;height:13px"></i>
        </button>
      </div>
    </div>`;
}

function renderClientRow(client) {
  return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="client-avatar" style="background:${avatarColor(client.name)};width:32px;height:32px;font-size:12px;flex-shrink:0">${initials(client.name)}</div>
          <span style="font-weight:600;cursor:pointer;color:var(--accent)" onclick="openClientDrawer('${client.id}')">${client.name}</span>
        </div>
      </td>
      <td style="color:var(--text-muted)">${client.cpf || '—'}</td>
      <td style="color:var(--text-muted)">${client.phone || '—'}</td>
      <td style="color:var(--text-muted)">${client.city || '—'}</td>
      <td>${badgeStatus(client.status)}</td>
      <td style="color:var(--text-muted);font-size:12px">${formatDate(client.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-icon btn-ghost btn-sm" title="Ver detalhes" onclick="openClientDrawer('${client.id}')">
            <i data-lucide="eye" style="width:14px;height:14px"></i>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" title="Editar" onclick="openEditClientModal('${client.id}')">
            <i data-lucide="edit-2" style="width:14px;height:14px"></i>
          </button>
          <button class="btn btn-icon btn-ghost btn-sm" title="Excluir" onclick="deleteClient('${client.id}','${client.name}')">
            <i data-lucide="trash-2" style="width:14px;height:14px"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

function setView(mode) {
  viewMode = mode;
  document.getElementById('btnViewGrid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('btnViewTable')?.classList.toggle('active', mode === 'table');
  renderClients();
}

function setFilter(status) {
  filterStatus = status;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-filter="${status}"]`)?.classList.add('active');
  renderClients();
}

function updateStats() {
  document.getElementById('totalClients').textContent = allClients.length;
  document.getElementById('clientsEmDia').textContent = allClients.filter(c => c.status === 'em_dia').length;
  document.getElementById('clientsAtrasado').textContent = allClients.filter(c => c.status === 'atrasado').length;
  document.getElementById('clientsInadim').textContent = allClients.filter(c => c.status === 'inadimplente').length;
}

/* =============================================
   MODAL — NOVO / EDITAR CLIENTE
   ============================================= */
function clientFormHTML(client = {}) {
  return `
    <form id="clientForm" onsubmit="saveClient(event)">
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Nome completo *</label>
          <input class="form-input" id="clientName" type="text" placeholder="João Silva" value="${client.name || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">CPF</label>
          <input class="form-input" id="clientCpf" type="text" placeholder="000.000.000-00" value="${client.cpf || ''}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Telefone / WhatsApp</label>
          <input class="form-input" id="clientPhone" type="text" placeholder="(11) 99999-9999" value="${client.phone || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Cidade</label>
          <input class="form-input" id="clientCity" type="text" placeholder="São Paulo" value="${client.city || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Endereço</label>
        <input class="form-input" id="clientAddress" type="text" placeholder="Rua, número, bairro" value="${client.address || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-textarea" id="clientNotes" placeholder="Informações adicionais...">${client.notes || ''}</textarea>
      </div>
      <input type="hidden" id="clientId" value="${client.id || ''}">
    </form>
  `;
}

function openNewClientModal() {
  showModal('Novo Cliente', clientFormHTML(), {
    icon: 'user-plus',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveClient(event)" id="btnSaveClient">
        <i data-lucide="save" style="width:14px;height:14px"></i> Salvar
      </button>`
  });

  const cpfInput = document.getElementById('clientCpf');
  const phoneInput = document.getElementById('clientPhone');
  if (cpfInput) maskCPF(cpfInput);
  if (phoneInput) maskPhone(phoneInput);
}

function openEditClientModal(id) {
  const client = allClients.find(c => c.id === id);
  if (!client) return;

  showModal('Editar Cliente', clientFormHTML(client), {
    icon: 'edit-2',
    footer: `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveClient(event)" id="btnSaveClient">
        <i data-lucide="save" style="width:14px;height:14px"></i> Salvar
      </button>`
  });

  const cpfInput = document.getElementById('clientCpf');
  const phoneInput = document.getElementById('clientPhone');
  if (cpfInput) maskCPF(cpfInput);
  if (phoneInput) maskPhone(phoneInput);
}

async function saveClient(event) {
  event.preventDefault();

  const btn = document.getElementById('btnSaveClient');
  if (btn) btn.classList.add('btn-loading');

  const id = document.getElementById('clientId')?.value;
  const data = {
    name: document.getElementById('clientName')?.value.trim(),
    cpf: document.getElementById('clientCpf')?.value.replace(/\D/g, '') || null,
    phone: document.getElementById('clientPhone')?.value.trim() || null,
    city: document.getElementById('clientCity')?.value.trim() || null,
    address: document.getElementById('clientAddress')?.value.trim() || null,
    notes: document.getElementById('clientNotes')?.value.trim() || null,
  };

  if (id) data.id = id;

  const { error } = await db.upsertClient(data);

  if (btn) btn.classList.remove('btn-loading');

  if (error) {
    showToast(error.message?.includes('unique') ? 'CPF já cadastrado' : 'Erro ao salvar cliente', 'error');
    return;
  }

  showToast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
  closeModal();
  await loadClients();
}

async function deleteClient(id, name) {
  const confirmed = await confirmDialog(`Deseja excluir o cliente <strong>${name}</strong>? Esta ação não pode ser desfeita.`);
  if (!confirmed) return;

  const { error } = await db.deleteClient(id);
  if (error) { showToast('Erro ao excluir cliente', 'error'); return; }

  showToast('Cliente excluído', 'success');
  await loadClients();
}

/* =============================================
   DRAWER — DETALHES DO CLIENTE
   ============================================= */
async function openClientDrawer(id) {
  const client = allClients.find(c => c.id === id);
  if (!client) return;

  const color = avatarColor(client.name);
  const ini = initials(client.name);

  showDrawer(client.name, `
    <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid var(--border);margin-bottom:16px">
      <div class="client-avatar" style="background:${color};width:56px;height:56px;font-size:20px;margin:0 auto 10px">${ini}</div>
      <div style="font-weight:700;font-size:16px">${client.name}</div>
      <div style="margin-top:6px">${badgeStatus(client.status)}</div>
    </div>

    <div style="margin-bottom:16px">
      ${client.phone ? `<div class="stat-row"><span class="stat-label">📱 Telefone</span><a href="https://wa.me/55${client.phone?.replace(/\D/g,'')}" target="_blank" style="color:var(--success);font-weight:600">${client.phone}</a></div>` : ''}
      ${client.cpf ? `<div class="stat-row"><span class="stat-label">🪪 CPF</span><span class="stat-value">${client.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span></div>` : ''}
      ${client.city ? `<div class="stat-row"><span class="stat-label">📍 Cidade</span><span class="stat-value">${client.city}</span></div>` : ''}
      ${client.address ? `<div class="stat-row"><span class="stat-label">🏠 Endereço</span><span class="stat-value" style="text-align:right;max-width:200px">${client.address}</span></div>` : ''}
      <div class="stat-row"><span class="stat-label">📅 Cadastro</span><span class="stat-value">${formatDate(client.created_at)}</span></div>
    </div>

    <div id="drawerInstallments">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--text)">Parcelas em Aberto</div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
    </div>

    <div style="margin-top:16px;display:flex;gap:8px">
      <button class="btn btn-secondary w-full" onclick="openEditClientModal('${id}');closeDrawer()">
        <i data-lucide="edit-2" style="width:14px;height:14px"></i> Editar
      </button>
      <a href="vendas-nova.html?client=${id}" class="btn btn-primary w-full" style="text-align:center">
        <i data-lucide="shopping-cart" style="width:14px;height:14px"></i> Nova Venda
      </a>
    </div>

    ${client.notes ? `<div style="margin-top:14px;padding:12px;background:var(--bg);border-radius:var(--radius-md);font-size:12.5px;color:var(--text-muted)"><strong style="color:var(--text)">📝 Obs:</strong> ${client.notes}</div>` : ''}
  `, 'user');

  if (window.lucide) lucide.createIcons({ nodes: [document.getElementById('drawerPanel')] });

  // Carrega parcelas do cliente
  loadClientInstallments(id);
}

async function loadClientInstallments(clientId) {
  const { data } = await supabase
    .from('installments')
    .select('*, sales!inner(client_id, products(name))')
    .eq('sales.client_id', clientId)
    .in('status', ['pendente', 'atrasado'])
    .order('due_date')
    .limit(10);

  const container = document.getElementById('drawerInstallments');
  if (!container) return;

  if (!data || !data.length) {
    container.innerHTML = `<div style="color:var(--success);font-size:13px;font-weight:600">✅ Sem parcelas em aberto</div>`;
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div style="font-weight:700;font-size:13px;margin-bottom:10px;color:var(--text)">
      Parcelas em Aberto (${data.length})
    </div>
    ${data.map(inst => {
      const isOverdue = inst.due_date < today;
      const days = daysOverdue(inst.due_date);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:12.5px;color:var(--text)">${inst.sales?.products?.name || 'Produto'} — Parc. ${inst.installment_number}</div>
            <div style="font-size:11px;color:${isOverdue ? 'var(--danger)' : 'var(--text-muted)'}">
              ${isOverdue ? `Venceu ${formatDate(inst.due_date)} (${days}d)` : `Vence ${formatDate(inst.due_date)}`}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:13px">${formatCurrency(inst.amount)}</div>
            <button class="btn btn-success btn-sm" style="margin-top:4px" onclick="quickPayInstallment('${inst.id}')">
              Pagar
            </button>
          </div>
        </div>`;
    }).join('')}
  `;
}

async function quickPayInstallment(installmentId) {
  const confirmed = await confirmDialog('Confirmar pagamento desta parcela?', 'Registrar Pagamento', 'info');
  if (!confirmed) return;

  const { error } = await db.payInstallment(installmentId);
  if (error) { showToast('Erro ao registrar pagamento', 'error'); return; }

  showToast('Pagamento registrado!', 'success');
  closeDrawer();
  await loadClients();
}

// Inicia ao carregar
document.addEventListener('DOMContentLoaded', initClientes);
