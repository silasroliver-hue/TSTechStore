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

No painel do Supabase, vá em **SQL Editor** e execute:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  status TEXT DEFAULT 'em_dia' CHECK (status IN ('em_dia', 'atrasado', 'inadimplente')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  cost_price NUMERIC(10,2) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  product_id UUID REFERENCES products(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('crediario', 'cartao_credito', 'pix')),
  total_amount NUMERIC(10,2) NOT NULL,
  down_payment NUMERIC(10,2) DEFAULT 0,
  installments_count INTEGER,
  installment_value NUMERIC(10,2),
  first_due_date DATE,
  card_installments INTEGER,
  card_fee_percent NUMERIC(5,2) DEFAULT 0,
  card_total_with_fee NUMERIC(10,2),
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'quitada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID REFERENCES installments(id),
  sale_id UUID REFERENCES sales(id),
  client_id UUID REFERENCES clients(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('pix', 'cartao_credito', 'crediario', 'dinheiro', 'outro')),
  card_installments INTEGER,
  card_fee_percent NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  installment_id UUID REFERENCES installments(id),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Habilitar acesso anônimo (Row Level Security)

No Supabase, em cada tabela vá em **Authentication → Policies** e adicione:
- Policy: `Enable read/write for anon` — ou desative RLS temporariamente para uso interno.

---

## 🌐 Deploy na VPS Hostinger (Nginx)

### Instalar Nginx

```bash
apt update && apt install nginx -y
```

### Copiar arquivos

```bash
# Copie todos os arquivos para o servidor
scp -r /caminho/local/TSTechStore/* root@SEU-IP:/var/www/html/
```

Ou via Git:
```bash
cd /var/www/html
git clone SEU-REPO .
```

### Configurar Nginx

```nginx
# /etc/nginx/sites-available/tstechstore
server {
    listen 80;
    server_name SEU-DOMINIO.com www.SEU-DOMINIO.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(css|js|png|jpg|ico|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Compressão gzip
    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

```bash
ln -s /etc/nginx/sites-available/tstechstore /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### HTTPS (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d SEU-DOMINIO.com
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

### Fluxo de uma venda com crediário

1. Acesse **Nova Venda**
2. Busque e selecione o cliente
3. Busque e selecione o produto
4. Escolha **Crediário**, preencha entrada, nº de parcelas e data do 1° vencimento
5. Clique em **Confirmar Venda** — as parcelas são criadas automaticamente

### Registrar pagamento de parcela

1. Acesse **Parcelas**
2. Clique em **Pagar** na parcela desejada
3. Selecione método, confirme data e valor
4. O status do cliente é atualizado automaticamente

---

## 🔗 Integração futura com n8n

A tabela `notification_queue` foi criada para integração com n8n para envio automático de cobranças via WhatsApp.

### Fluxo sugerido no n8n

```
Cron (diário 8h)
  → Supabase: busca installments vencidos hoje
  → Para cada parcela:
      → Formata mensagem com nome do cliente e valor
      → Insere em notification_queue (status = 'pendente')
      → WhatsApp API (Evolution API / Z-API)
      → Atualiza notification_queue (status = 'enviado')
```

### Exemplo de query n8n (Supabase node)

```sql
SELECT
  i.id,
  i.amount,
  i.due_date,
  c.name,
  c.phone
FROM installments i
JOIN sales s ON s.id = i.sale_id
JOIN clients c ON c.id = s.client_id
WHERE i.due_date = CURRENT_DATE
  AND i.status = 'pendente'
  AND c.phone IS NOT NULL;
```

---

## 🏗️ Estrutura de Arquivos

```
TSTechStore/
├── index.html              ← Dashboard
├── clientes.html           ← Gestão de clientes
├── produtos.html           ← Catálogo e estoque
├── vendas.html             ← Histórico de vendas
├── vendas-nova.html        ← Wizard de nova venda
├── parcelas.html           ← Cobranças do crediário
├── financeiro.html         ← Relatórios financeiros
├── fluxo-caixa.html        ← Extrato de movimentos
└── assets/
    ├── css/
    │   └── style.css       ← Design system completo
    └── js/
        ├── supabase-client.js  ← Cliente + helpers de DB
        ├── theme.js            ← Dark/Light mode
        ├── ui.js               ← Toasts, modais, sidebar, formatters
        ├── dashboard.js
        ├── clientes.js
        ├── produtos.js
        ├── vendas.js           ← Lista + wizard de nova venda
        ├── parcelas.js
        └── financeiro.js       ← Financeiro + fluxo de caixa
```

---

## 🎨 Customização

### Mudar nome da loja

Em `assets/js/ui.js`, na função `initPage()`, altere:
```js
<span class="logo-text">TSTechStore</span>
```

### Mudar cor accent

Em `assets/css/style.css`:
```css
--accent: #6C63FF; /* Roxo elétrico — altere aqui */
```

### Adicionar categorias de despesa

Em `assets/js/financeiro.js`, função `openNewExpenseModal()`:
```js
const categories = ['Aluguel', 'Fornecedores', ...]; // adicione aqui
```
