-- ==========================================================
-- InforControl — Schema MySQL
-- Migração: PostgreSQL → MySQL (HostGator)
-- Gerado automaticamente. Execute no phpMyAdmin ou MySQL CLI.
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ----------------------------------------------------------
-- TABELA: users (substitui o Auth anterior)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  username      VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  avatar_url    TEXT,
  created_by    VARCHAR(36)  DEFAULT NULL COMMENT 'Preenchido quando for conta de parceiro de casal',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: profiles
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL UNIQUE,
  full_name  VARCHAR(255),
  avatar_url TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: accounts (contas pessoais)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)   NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  type       VARCHAR(50)   NOT NULL DEFAULT 'checking',
  balance    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  color      VARCHAR(50)   DEFAULT NULL,
  icon       VARCHAR(100)  DEFAULT NULL,
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: categories
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'expense',
  color      VARCHAR(50)  DEFAULT NULL,
  icon       VARCHAR(100) DEFAULT NULL,
  parent_id  VARCHAR(36)  DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_user   FOREIGN KEY (user_id)   REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: credit_cards
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_cards (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  limit_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  closing_day INT           NOT NULL DEFAULT 1,
  due_day     INT           NOT NULL DEFAULT 10,
  color       VARCHAR(50)   DEFAULT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_credit_cards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: transactions
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                     VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id                VARCHAR(36)   NOT NULL,
  account_id             VARCHAR(36)   DEFAULT NULL,
  category_id            VARCHAR(36)   DEFAULT NULL,
  credit_card_id         VARCHAR(36)   DEFAULT NULL,
  parent_transaction_id  VARCHAR(36)   DEFAULT NULL,
  context_id             VARCHAR(36)   DEFAULT NULL,
  context_type           VARCHAR(50)   DEFAULT NULL,
  type                   VARCHAR(20)   NOT NULL DEFAULT 'expense',
  amount                 DECIMAL(15,2) NOT NULL,
  description            TEXT          DEFAULT NULL,
  date                   DATE          NOT NULL,
  is_paid                TINYINT(1)    NOT NULL DEFAULT 1,
  is_recurring           TINYINT(1)    NOT NULL DEFAULT 0,
  recurrence_type        VARCHAR(50)   DEFAULT NULL,
  installment_number     INT           DEFAULT NULL,
  total_installments     INT           DEFAULT NULL,
  paid_by                VARCHAR(36)   DEFAULT NULL,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_user   FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
  CONSTRAINT fk_transactions_acc    FOREIGN KEY (account_id) REFERENCES accounts(id)    ON DELETE SET NULL,
  CONSTRAINT fk_transactions_cat    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_card   FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
  CONSTRAINT fk_transactions_parent FOREIGN KEY (parent_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: budgets
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  category_id VARCHAR(36)   NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  month       INT           NOT NULL,
  year        INT           NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_budgets_user_cat_period (user_id, category_id, month, year),
  CONSTRAINT fk_budgets_user FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_budgets_cat  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: goals
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id             VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id        VARCHAR(36)   NOT NULL,
  name           VARCHAR(255)  NOT NULL,
  target_amount  DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  deadline       DATE          DEFAULT NULL,
  is_completed   TINYINT(1)    NOT NULL DEFAULT 0,
  color          VARCHAR(50)   DEFAULT NULL,
  icon           VARCHAR(100)  DEFAULT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: couples
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS couples (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: couple_members
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS couple_members (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  couple_id  VARCHAR(36)  NOT NULL,
  user_id    VARCHAR(36)  DEFAULT NULL,
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_couple_members_couple FOREIGN KEY (couple_id) REFERENCES couples(id)  ON DELETE CASCADE,
  CONSTRAINT fk_couple_members_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: contas_a_pagar (pessoal)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_a_pagar (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  due_date    DATE          NOT NULL,
  start_date  DATE          NOT NULL,
  is_paid     TINYINT(1)    NOT NULL DEFAULT 0,
  observation TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: contas_a_receber (pessoal)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS contas_a_receber (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  due_date    DATE          NOT NULL,
  start_date  DATE          DEFAULT NULL,
  is_received TINYINT(1)    NOT NULL DEFAULT 0,
  observation TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_car_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: notifications
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id             VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id        VARCHAR(36)  NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT         NOT NULL,
  scheduled_for  DATETIME     NOT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  recurrence     VARCHAR(20)  NOT NULL DEFAULT 'none',
  weekdays_config TEXT        DEFAULT NULL COMMENT 'JSON ex: [1,2,3]',
  context        VARCHAR(100) DEFAULT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: push_subscriptions
-- Nota: coluna 'auth' renomeada para 'auth_key' (auth é reservado no MySQL)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth_key   TEXT        NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_push_user_endpoint (user_id, endpoint(500)),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_accounts
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_accounts (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)   NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  type       VARCHAR(50)   NOT NULL,
  balance    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  color      VARCHAR(50)   DEFAULT NULL,
  icon       VARCHAR(100)  DEFAULT NULL,
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_expense_categories
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_expense_categories (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_exp_cat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_expenses
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_expenses (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  account_id  VARCHAR(36)   DEFAULT NULL,
  name        VARCHAR(255)  NOT NULL,
  category    VARCHAR(255)  NOT NULL DEFAULT 'geral',
  amount      DECIMAL(15,2) NOT NULL,
  date        DATE          NOT NULL DEFAULT (CURDATE()),
  observation TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_biz_expenses_acc  FOREIGN KEY (account_id) REFERENCES business_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_products
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_products (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)   NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  sale_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  stock      INT           DEFAULT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_products_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_ingredients
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_ingredients (
  id                VARCHAR(36)    NOT NULL PRIMARY KEY,
  user_id           VARCHAR(36)    DEFAULT NULL,
  name              VARCHAR(255)   NOT NULL,
  unit              VARCHAR(50)    NOT NULL DEFAULT 'un',
  purchase_price    DECIMAL(15,4)  NOT NULL,
  purchase_quantity DECIMAL(15,4)  NOT NULL,
  created_at        DATETIME       DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_ingr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_product_compositions (Ficha Técnica)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_product_compositions (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  product_id    VARCHAR(36)   DEFAULT NULL,
  ingredient_id VARCHAR(36)   DEFAULT NULL,
  quantity      DECIMAL(15,4) NOT NULL,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpc_product    FOREIGN KEY (product_id)    REFERENCES business_products(id)    ON DELETE CASCADE,
  CONSTRAINT fk_bpc_ingredient FOREIGN KEY (ingredient_id) REFERENCES business_ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_food_pricing
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_food_pricing (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id           VARCHAR(36)   NOT NULL,
  name              VARCHAR(255)  NOT NULL,
  total_cost        DECIMAL(15,4) NOT NULL DEFAULT 0,
  total_quantity    DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit              VARCHAR(50)   NOT NULL DEFAULT 'un',
  portion_quantity  DECIMAL(15,4) NOT NULL DEFAULT 1,
  profit_percentage DECIMAL(7,2)  NOT NULL DEFAULT 0,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_pricing_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_sales
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_sales (
  id           VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id      VARCHAR(36)   NOT NULL,
  product_id   VARCHAR(36)   DEFAULT NULL,
  product_name VARCHAR(255)  NOT NULL,
  quantity     INT           NOT NULL DEFAULT 1,
  unit_price   DECIMAL(15,2) NOT NULL,
  total_price  DECIMAL(15,2) NOT NULL,
  date         DATE          NOT NULL DEFAULT (CURDATE()),
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_biz_sales_user    FOREIGN KEY (user_id)    REFERENCES users(id)             ON DELETE CASCADE,
  CONSTRAINT fk_biz_sales_product FOREIGN KEY (product_id) REFERENCES business_products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_members
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_members (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  owner_id   VARCHAR(36) NOT NULL,
  member_id  VARCHAR(36) NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_biz_member (owner_id, member_id),
  CONSTRAINT fk_biz_members_owner  FOREIGN KEY (owner_id)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_biz_members_member FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_contas_a_pagar
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_contas_a_pagar (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  due_date    DATE          NOT NULL,
  start_date  DATE          NOT NULL,
  is_paid     TINYINT(1)    NOT NULL DEFAULT 0,
  observation TEXT          DEFAULT NULL,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bcap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TABELA: business_contas_a_receber
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_contas_a_receber (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  due_date    DATE          NOT NULL,
  start_date  DATE          NOT NULL,
  is_received TINYINT(1)    NOT NULL DEFAULT 0,
  observation TEXT          DEFAULT NULL,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bcar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================================
-- Equivalente à função SQL anterior
-- ==========================================================
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS get_business_owner_id(IN p_user_id VARCHAR(36), OUT p_owner_id VARCHAR(36))
BEGIN
  DECLARE v_owner VARCHAR(36);
  SELECT owner_id INTO v_owner
    FROM business_members
   WHERE member_id = p_user_id
   LIMIT 1;
  IF v_owner IS NULL THEN
    SET p_owner_id = p_user_id;
  ELSE
    SET p_owner_id = v_owner;
  END IF;
END$$
DELIMITER ;
