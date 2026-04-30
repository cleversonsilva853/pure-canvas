-- ==========================================================
-- Migração: Precificação Avançada
-- ==========================================================

-- 1. Atualizar tabela de produtos
ALTER TABLE business_products 
ADD COLUMN base_unit VARCHAR(20) DEFAULT 'un',
ADD COLUMN fixed_cost DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN loss_percentage DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN tax_percentage DECIMAL(7,2) DEFAULT 0.00,
ADD COLUMN margin_percentage DECIMAL(7,2) DEFAULT 0.00;

-- 2. Tabela de Adições de Custo (Embalagens, Taxas, etc.)
CREATE TABLE IF NOT EXISTS business_product_additions (
  id         VARCHAR(36)   NOT NULL PRIMARY KEY,
  product_id VARCHAR(36)   NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  type       ENUM('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
  value      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpa_product FOREIGN KEY (product_id) REFERENCES business_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Unidades de Venda (Conversões)
CREATE TABLE IF NOT EXISTS business_product_sale_units (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  product_id        VARCHAR(36)   NOT NULL,
  name              VARCHAR(100)  NOT NULL, -- Ex: "Caixa c/ 10", "Pacote 500g"
  conversion_factor DECIMAL(15,4) NOT NULL DEFAULT 1.0000,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpsu_product FOREIGN KEY (product_id) REFERENCES business_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Histórico de Compras (para calcular custo médio)
CREATE TABLE IF NOT EXISTS business_product_purchases (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  product_id  VARCHAR(36)   NOT NULL,
  quantity    DECIMAL(15,4) NOT NULL,
  unit        VARCHAR(20)   NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  date        DATE          NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpp_product FOREIGN KEY (product_id) REFERENCES business_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
