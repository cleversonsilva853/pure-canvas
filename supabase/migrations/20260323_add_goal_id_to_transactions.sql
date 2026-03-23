-- Migration to add goal_id to transactions table
ALTER TABLE transactions 
ADD COLUMN goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

COMMENT ON COLUMN transactions.goal_id IS 'Vincula uma transação (normalmente receita) a uma meta financeira.';
