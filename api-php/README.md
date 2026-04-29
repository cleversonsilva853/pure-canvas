# InforControl — API PHP para HostGator
> Migração: Supabase (PostgreSQL) → MySQL (HostGator Plano M)

## 📁 Estrutura de Arquivos

```
api-php/
├── .htaccess                        ← Roteamento Apache
├── index.php                        ← Roteador principal
├── schema.sql                       ← Schema MySQL (execute PRIMEIRO)
├── export-supabase-data.mjs         ← Script de exportação dos dados
│
├── config/
│   ├── database.php                 ← ⚙️  CONFIGURE AQUI: host, banco, usuário, senha
│   ├── jwt.php                      ← ⚙️  CONFIGURE AQUI: JWT_SECRET
│   └── cors.php                     ← Headers CORS
│
├── middleware/
│   └── auth.php                     ← Validação do token JWT
│
├── helpers/
│   ├── response.php                 ← jsonResponse(), getJsonBody()
│   └── uuid.php                     ← generateUUID()
│
├── routes/                          ← Um arquivo por entidade
│   ├── auth.php                     ← /auth/login, /auth/register, /auth/me
│   ├── accounts.php                 ← /accounts
│   ├── transactions.php             ← /transactions
│   ├── categories.php               ← /categories
│   ├── credit_cards.php             ← /credit-cards
│   ├── budgets.php                  ← /budgets
│   ├── goals.php                    ← /goals
│   ├── contas_a_pagar.php           ← /contas-a-pagar
│   ├── contas_a_receber.php         ← /contas-a-receber
│   ├── notifications.php            ← /notifications
│   ├── push_subscriptions.php       ← /push-subscriptions
│   ├── couples.php                  ← /couples
│   ├── couple_members.php           ← /couple-members
│   ├── business_accounts.php        ← /business/accounts
│   ├── business_expenses.php        ← /business/expenses
│   ├── business_sales.php           ← /business/sales
│   ├── business_products.php        ← /business/products
│   ├── business_ingredients.php     ← /business/ingredients
│   ├── business_product_compositions.php ← /business/compositions
│   ├── business_pricing.php         ← /business/pricing
│   ├── business_members.php         ← /business/members
│   ├── business_expense_categories.php   ← /business/expense_categories
│   ├── business_contas_a_pagar.php  ← /business/contas_a_pagar
│   └── business_contas_a_receber.php    ← /business/contas_a_receber
│
└── cron/
    └── send-notifications.php       ← Cron de push notifications
```

---

## 🚀 Passo a Passo de Deploy

### PASSO 1 — Banco de Dados (phpMyAdmin na HostGator)

1. Acesse **cPanel → MySQL Databases**
2. Crie um banco: ex. `inforcontrol_db`
3. Crie um usuário MySQL e conceda **All Privileges** ao banco
4. Abra **phpMyAdmin → selecione o banco**
5. Aba **Import → Selecionar arquivo → `schema.sql`** → Executar
6. (Se tiver dados) repita o import com `supabase_export_data.sql`

---

### PASSO 2 — Exportar Dados do Supabase

1. Abra o arquivo `export-supabase-data.mjs`
2. Substitua `COLE_AQUI_SUA_SERVICE_ROLE_KEY` pela chave encontrada em:
   **Supabase Dashboard → Settings → API → service_role secret**
3. Execute no terminal:
   ```bash
   node export-supabase-data.mjs
   ```
4. Isso gerará o arquivo `supabase_export_data.sql`
5. Importe esse arquivo no phpMyAdmin (após o schema.sql)

> ⚠️ **ATENÇÃO**: Os usuários do Supabase Auth **NÃO são exportáveis** (as senhas são criptografadas e inacessíveis). Cada usuário precisará **criar uma nova conta** na nova API PHP. Os dados financeiros (transações, contas etc.) serão migrados normalmente.

---

### PASSO 3 — Configurar a API

Edite os arquivos:

**`config/database.php`**:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'inforcontrol_db');   // nome do banco criado
define('DB_USER', 'seu_usuario');        // usuário MySQL
define('DB_PASS', 'sua_senha');          // senha MySQL
```

**`config/jwt.php`**:
```php
define('JWT_SECRET', 'CHAVE_SUPER_SECRETA_ALEATORIA_MINIMO_32_CHARS');
```
> Gere uma chave segura com: `openssl rand -base64 48`

---

### PASSO 4 — Upload para HostGator

1. Acesse **cPanel → File Manager** ou use **FTP (FileZilla)**
2. Navegue até a pasta do domínio da API (ex: `public_html/api/`)
3. Faça upload de **todos os arquivos** da pasta `api-php/`
   - **NÃO envie** `export-supabase-data.mjs`, `schema.sql` (ficam locais)
   - **Envie**: `.htaccess`, `index.php`, `config/`, `middleware/`, `helpers/`, `routes/`, `cron/`
4. Verifique se o `.htaccess` está visível (habilite "Show Hidden Files" no File Manager)

---

### PASSO 5 — Notificações Push (Cron Job)

1. **Instalar Composer** na HostGator (via SSH Terminal):
   ```bash
   cd ~/public_html/api
   curl -sS https://getcomposer.org/installer | php
   php composer.phar require minishlink/web-push
   ```

2. Edite `cron/send-notifications.php` e preencha `VAPID_PRIVATE_KEY`
   (encontrada nos Secrets da Edge Function do Supabase)

3. **Configurar Cron Job** no cPanel:
   - cPanel → **Cron Jobs**
   - Frequência: `* * * * *` (a cada minuto)
   - Comando:
     ```
     php /home/SEU_USUARIO_CPANEL/public_html/api/cron/send-notifications.php >> /home/SEU_USUARIO_CPANEL/logs/push-cron.log 2>&1
     ```

---

### PASSO 6 — Testar a API

Teste com curl ou Postman:

```bash
# Registrar usuário
curl -X POST https://seu-dominio-api.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@email.com","password":"123456","full_name":"Teste"}'

# Login
curl -X POST https://seu-dominio-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@email.com","password":"123456"}'

# Listar contas (com token)
curl https://seu-dominio-api.com/accounts \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🔄 Próximo Passo: Adaptar o Frontend React

Após a API funcionar, o frontend React precisará ser ajustado para:
1. Usar `fetch()` para a nova API em vez do Supabase client
2. Novo `AuthContext` com login/registro via API PHP
3. Reescrever os hooks `useFinanceData`, `useBusinessData`, etc.

Avise quando quiser que eu faça essa adaptação!

---

## 📌 Endpoints Disponíveis

| Método | URL | Descrição |
|---|---|---|
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Cadastro |
| GET | `/auth/me` | Dados do usuário |
| GET/POST | `/accounts` | Contas pessoais |
| GET/POST | `/transactions?month=4&year=2026` | Transações |
| GET/POST | `/categories` | Categorias |
| GET/POST | `/credit-cards` | Cartões de crédito |
| GET/POST | `/budgets?month=4&year=2026` | Orçamentos |
| GET/POST | `/goals` | Metas |
| GET/POST | `/contas-a-pagar` | Contas a pagar |
| GET/POST | `/contas-a-receber` | Contas a receber |
| GET/POST | `/notifications` | Notificações |
| GET/POST | `/business/accounts` | Contas empresa |
| GET/POST | `/business/expenses` | Despesas empresa |
| GET/POST | `/business/sales` | Vendas |
| GET/POST | `/business/products` | Produtos |
| GET/POST | `/business/pricing` | Precificação |
| GET/POST | `/business/contas-a-pagar` | Contas a pagar PJ |
| GET/POST | `/business/contas-a-receber` | Contas a receber PJ |

Para `/accounts/{id}`, `/transactions/{id}`, etc.: use PUT e DELETE com o ID na URL.
