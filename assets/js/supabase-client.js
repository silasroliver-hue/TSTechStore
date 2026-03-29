/* =============================================
   supabase-client.js — Instância única do Supabase
   Configure SUPABASE_URL e SUPABASE_ANON_KEY abaixo
   ============================================= */

const SUPABASE_URL = 'https://kpmkeozrladrfkxnrmsb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Z4bLyqLw_oS2f-XroNvMlA_CnmgsplL';

// Cria instância global — sobrescreve window.supabase (lib) com o cliente
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers de query comuns
const db = {
  // Clientes
  async getClients(filters = {}) {
    let q = supabase.from('clients').select('*').order('name');
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.search) q = q.ilike('name', `%${filters.search}%`);
    return q;
  },

  async getClient(id) {
    return supabase.from('clients').select('*').eq('id', id).single();
  },

  async upsertClient(data) {
    if (data.id) return supabase.from('clients').update(data).eq('id', data.id).select().single();
    return supabase.from('clients').insert(data).select().single();
  },

  async deleteClient(id) {
    return supabase.from('clients').delete().eq('id', id);
  },

  // Produtos
  async getProducts(filters = {}) {
    let q = supabase.from('products').select('*').order('name');
    if (filters.search) q = q.ilike('name', `%${filters.search}%`);
    return q;
  },

  async getProduct(id) {
    return supabase.from('products').select('*').eq('id', id).single();
  },

  async upsertProduct(data) {
    if (data.id) return supabase.from('products').update(data).eq('id', data.id).select().single();
    return supabase.from('products').insert(data).select().single();
  },

  async deleteProduct(id) {
    return supabase.from('products').delete().eq('id', id);
  },

  async decrementStock(productId, qty = 1) {
    const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', productId).single();
    if (p) {
      return supabase.from('products')
        .update({ stock_quantity: Math.max(0, p.stock_quantity - qty) })
        .eq('id', productId);
    }
  },

  // Vendas
  async getSales(filters = {}) {
    let q = supabase.from('sales')
      .select(`*, clients(name, phone), products(name, brand)`)
      .order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.client_id) q = q.eq('client_id', filters.client_id);
    return q;
  },

  async getSale(id) {
    return supabase.from('sales')
      .select(`*, clients(name, phone, cpf), products(name, brand, model)`)
      .eq('id', id).single();
  },

  async createSale(data) {
    return supabase.from('sales').insert(data).select().single();
  },

  async updateSale(id, data) {
    return supabase.from('sales').update(data).eq('id', id).select().single();
  },

  // Parcelas
  async getInstallments(filters = {}) {
    let q = supabase.from('installments')
      .select(`*, sales(*, clients(name, phone), products(name))`)
      .order('due_date');
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.sale_id) q = q.eq('sale_id', filters.sale_id);
    if (filters.from) q = q.gte('due_date', filters.from);
    if (filters.to) q = q.lte('due_date', filters.to);
    return q;
  },

  async createInstallments(installments) {
    return supabase.from('installments').insert(installments).select();
  },

  async payInstallment(id, paidAt = new Date().toISOString()) {
    return supabase.from('installments').update({ status: 'pago', paid_at: paidAt }).eq('id', id).select().single();
  },

  // Pagamentos
  async createPayment(data) {
    return supabase.from('payments').insert(data).select().single();
  },

  async getPayments(filters = {}) {
    let q = supabase.from('payments')
      .select(`*, clients(name), installments(due_date, installment_number)`)
      .order('payment_date', { ascending: false });
    if (filters.client_id) q = q.eq('client_id', filters.client_id);
    if (filters.from) q = q.gte('payment_date', filters.from);
    if (filters.to) q = q.lte('payment_date', filters.to);
    return q;
  },

  // Despesas
  async getExpenses(filters = {}) {
    let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (filters.from) q = q.gte('expense_date', filters.from);
    if (filters.to) q = q.lte('expense_date', filters.to);
    return q;
  },

  async createExpense(data) {
    return supabase.from('expenses').insert(data).select().single();
  },

  async updateExpense(id, data) {
    return supabase.from('expenses').update(data).eq('id', id).select().single();
  },

  async deleteExpense(id) {
    return supabase.from('expenses').delete().eq('id', id);
  },

  // Dashboard helpers
  async getOverdueCount() {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase.from('installments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .lt('due_date', today);
    return count || 0;
  },

  // Atualiza status das parcelas vencidas
  async syncOverdueInstallments() {
    const today = new Date().toISOString().split('T')[0];
    return supabase.from('installments')
      .update({ status: 'atrasado' })
      .eq('status', 'pendente')
      .lt('due_date', today);
  },

  // Atualiza status do cliente baseado nas parcelas
  async updateClientStatus(clientId) {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: overdue } = await supabase
      .from('installments')
      .select('due_date, sales!inner(client_id)')
      .eq('sales.client_id', clientId)
      .eq('status', 'pendente')
      .lt('due_date', today);

    let status = 'em_dia';
    if (overdue && overdue.length > 0) {
      const hasInadimplente = overdue.some(p => p.due_date < thirtyDaysAgo);
      status = hasInadimplente ? 'inadimplente' : 'atrasado';
    }

    return supabase.from('clients').update({ status }).eq('id', clientId);
  }
};
