# TSTechStore — Sistema de Gestão

Sistema web completo para gestão de loja de celulares com crediário próprio.
Dark mode por padrão · Responsivo · Sem login · Supabase + JS puro

---

## 🚀 Configuração Inicial

### 1. Supabase — Projeto

**URL do projeto (já configurada no código):** `https://kpmkeozrladrfkxnrmsb.supabase.co`

1. No [painel do Supabase](https://supabase.com/dashboard), abra esse projeto (ou crie um novo e atualize a URL em `assets/js/supabase-client.js`).
2. Vá em **Settings → API** e copie a **anon public key** (a URL pública já está definida no cliente).

### 2. Configurar credenciais

Todas as páginas usam o mesmo arquivo: `assets/js/supabase-client.js`.

A **Project URL** já está definida. Falta apenas colar a **anon public key**:

```js
const SUPABASE_URL = 'https://kpmkeozrladrfkxnrmsb.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI'; // Settings → API → anon public
```

### 3. Executar SQL no Supabase

No painel do Supabase, vá em **SQL Editor** e execute as migrações do arquivo `schema.sql`.

---

## 🌐 Deploy com Docker (Easypanel)

```bash
docker build -t tstechstore .
docker run -p 80:80 tstechstore
```

---

## 📱 Guia Rápido de Uso

| Tela | Função |
|------|--------|
| **Dashboard** | Visão geral: métricas, gráficos, parcelas vencendo |
| **Vendas** | Histórico de todas as vendas com filtros |
| **Nova Venda** | Wizard em 3 passos: cliente → produto → pagamento |
| **Parcelas** | Lista de cobranças pendentes; botão Pagar em cada linha |
| **Clientes** | Cards com status; drawer lateral com histórico completo |
| **Produtos** | Tabela com margem de lucro e controle de estoque |
| **Financeiro** | Gráficos de entradas vs saídas + registro de despesas |
| **Fluxo de Caixa** | Extrato completo de todas as movimentações |
