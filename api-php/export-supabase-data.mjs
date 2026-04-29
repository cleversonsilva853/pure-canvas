#!/usr/bin/env node
/**
 * export-supabase-data.mjs
 * ============================================================
 * Exporta TODOS os dados do Supabase e gera um arquivo SQL
 * com INSERT INTO prontos para importar no MySQL (HostGator).
 *
 * COMO USAR:
 *   1. Adicione sua SERVICE_ROLE_KEY abaixo (ou coloque no .env)
 *   2. Execute: node export-supabase-data.mjs
 *   3. Um arquivo "supabase_export_data.sql" será gerado
 *   4. Importe no MySQL via phpMyAdmin ou mysql CLI
 *
 * IMPORTANTE: Use a SERVICE_ROLE_KEY (não a anon key) para
 * exportar dados protegidos por RLS.
 * Você encontra em: Supabase Dashboard > Settings > API > service_role
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// ─── CONFIGURAÇÃO ────────────────────────────────────────────
const SUPABASE_URL     = 'https://oaxylfbcnshpkuiymsmv.supabase.co';
const SERVICE_ROLE_KEY = 'COLE_AQUI_SUA_SERVICE_ROLE_KEY'; // ← substitua

// Tabelas a exportar (na ordem correta para respeitar FKs no MySQL)
const TABLES = [
  // Auth / Usuários
  'profiles',

  // Pessoal
  'accounts',
  'categories',
  'credit_cards',
  'transactions',
  'budgets',
  'goals',

  // Casal
  'couples',
  'couple_members',

  // Contas pessoal
  'contas_a_pagar',
  'contas_a_receber',

  // Notificações
  'notifications',
  'push_subscriptions',

  // Empresarial
  'business_accounts',
  'business_expense_categories',
  'business_expenses',
  'business_products',
  'business_ingredients',
  'business_product_compositions',
  'business_food_pricing',
  'business_sales',
  'business_members',
  'business_contas_a_pagar',
  'business_contas_a_receber',
];

// ─── FUNÇÕES AUXILIARES ───────────────────────────────────────

/** Escapa strings para SQL */
function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  // String — escape de aspas simples
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

/** Converte uma linha do Postgres em INSERT MySQL */
function rowToInsert(table, row) {
  const columns = Object.keys(row);
  const values  = columns.map(col => {
    // Supabase auth retorna 'auth' como coluna, MySQL usa 'auth_key'
    if (col === 'auth' && table === 'push_subscriptions') return escapeSQL(row[col]);
    return escapeSQL(row[col]);
  });

  // Remapear colunas especiais
  const mysqlColumns = columns.map(col => {
    if (col === 'auth' && table === 'push_subscriptions') return '`auth_key`';
    return `\`${col}\``;
  });

  return `INSERT IGNORE INTO \`${table}\` (${mysqlColumns.join(', ')}) VALUES (${values.join(', ')});`;
}

/** Busca todos os registros de uma tabela (paginado) */
async function fetchAll(client, table) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn(`  ⚠️  Erro na tabela "${table}": ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  if (SERVICE_ROLE_KEY === 'COLE_AQUI_SUA_SERVICE_ROLE_KEY') {
    console.error('\n❌ Você precisa preencher SERVICE_ROLE_KEY no script!\n');
    console.error('   Acesse: Supabase Dashboard → Settings → API → service_role\n');
    process.exit(1);
  }

  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const lines = [];
  lines.push('-- ==========================================================');
  lines.push('-- InforControl — Dados exportados do Supabase');
  lines.push(`-- Gerado em: ${new Date().toISOString()}`);
  lines.push('-- Execute APÓS o schema.sql');
  lines.push('-- ==========================================================');
  lines.push('');
  lines.push('SET FOREIGN_KEY_CHECKS = 0;');
  lines.push('SET NAMES utf8mb4;');
  lines.push('');

  let totalRows = 0;

  for (const table of TABLES) {
    console.log(`📦 Exportando: ${table}...`);
    const rows = await fetchAll(client, table);

    lines.push(`-- ----------------------------------------------------------`);
    lines.push(`-- ${table} (${rows.length} registros)`);
    lines.push(`-- ----------------------------------------------------------`);

    if (rows.length === 0) {
      lines.push(`-- (nenhum dado)`);
    } else {
      for (const row of rows) {
        lines.push(rowToInsert(table, row));
      }
    }

    lines.push('');
    totalRows += rows.length;
    console.log(`   ✅ ${rows.length} registros`);
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  lines.push('');
  lines.push(`-- Total de registros exportados: ${totalRows}`);

  const output = lines.join('\n');
  writeFileSync('supabase_export_data.sql', output, 'utf8');

  console.log('\n✅ Exportação concluída!');
  console.log(`   📁 Arquivo gerado: supabase_export_data.sql`);
  console.log(`   📊 Total de registros: ${totalRows}`);
  console.log('\n📋 Próximos passos:');
  console.log('   1. Importe schema.sql no phpMyAdmin');
  console.log('   2. Importe supabase_export_data.sql no phpMyAdmin');
  console.log('   3. ⚠️  Os usuários do Supabase Auth NÃO são exportados via API.');
  console.log('      Eles precisam se registrar novamente na nova API PHP.');
  console.log('      (As senhas do Supabase Auth são criptografadas e inacessíveis)\n');
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
