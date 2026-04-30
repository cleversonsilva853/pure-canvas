#!/usr/bin/env node
/**
 * export-via-postgres.mjs
 * ============================================================
 * Exporta dados do Supabase conectando DIRETAMENTE no PostgreSQL
 * (porta 5432), SEM usar a REST API — contorna o erro 522.
 *
 * COMO USAR:
 *   1. Obtenha a senha do banco no Supabase:
 *      Dashboard → Settings → Database → Database password → "Reveal"
 *   2. Cole a senha na variável DB_PASSWORD abaixo
 *   3. Instale a dependência: npm install pg
 *   4. Execute: node api-php/export-via-postgres.mjs
 * ============================================================
 */

import pkg from 'pg';
const { Client } = pkg;
import { writeFileSync } from 'fs';

// ─── CONFIGURAÇÃO ────────────────────────────────────────────
const DB_PASSWORD = 'COLE_AQUI_A_SENHA_DO_BANCO'; // ← Supabase → Settings → Database → "Reveal"
const DB_HOST     = 'db.oaxylfbcnshpkuiymsmv.supabase.co';
const DB_NAME     = 'postgres';
const DB_USER     = 'postgres';
const DB_PORT     = 5432;

// Tabelas a exportar (na ordem correta para respeitar FKs)
const TABLES = [
  'profiles',
  'accounts',
  'categories',
  'credit_cards',
  'transactions',
  'budgets',
  'goals',
  'couples',
  'couple_members',
  'contas_a_pagar',
  'contas_a_receber',
  'notifications',
  'push_subscriptions',
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

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "\\'")}'`;
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

function rowToInsert(table, row) {
  const columns = Object.keys(row);
  const mysqlColumns = columns.map(col => {
    // Renomear 'auth' → 'auth_key' (reservado no MySQL)
    if (col === 'auth' && table === 'push_subscriptions') return '`auth_key`';
    return `\`${col}\``;
  });
  const values = columns.map(col => escapeSQL(row[col]));
  return `INSERT IGNORE INTO \`${table}\` (${mysqlColumns.join(', ')}) VALUES (${values.join(', ')});`;
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  if (DB_PASSWORD === 'COLE_AQUI_A_SENHA_DO_BANCO') {
    console.error('\n❌ Preencha DB_PASSWORD no script!');
    console.error('   Supabase Dashboard → Settings → Database → "Database password" → Reveal\n');
    process.exit(1);
  }

  const client = new Client({
    host:     DB_HOST,
    database: DB_NAME,
    user:     DB_USER,
    password: DB_PASSWORD,
    port:     DB_PORT,
    ssl:      { rejectUnauthorized: false }, // necessário para Supabase
  });

  console.log('🔌 Conectando ao banco de dados...');
  try {
    await client.connect();
    console.log('✅ Conectado!\n');
  } catch (err) {
    console.error('❌ Falha na conexão:', err.message);
    process.exit(1);
  }

  const lines = [];
  lines.push('-- ==========================================================');
  lines.push('-- InforControl — Dados exportados do Supabase (via PostgreSQL)');
  lines.push(`-- Gerado em: ${new Date().toISOString()}`);
  lines.push('-- Execute APÓS o schema.sql');
  lines.push('-- ==========================================================');
  lines.push('');
  lines.push('SET FOREIGN_KEY_CHECKS = 0;');
  lines.push('SET NAMES utf8mb4;');
  lines.push('');

  let totalRows = 0;

  // --- Passo Especial: Usuários (auth.users) ---
  process.stdout.write(`📦 Exportando: users (de auth.users)...`);
  try {
    const resUsers = await client.query('SELECT id, email, encrypted_password, created_at, raw_user_meta_data FROM auth.users');
    const users = resUsers.rows;

    lines.push(`-- ----------------------------------------------------------`);
    lines.push(`-- users (${users.length} registros vindos de auth.users)`);
    lines.push(`-- ----------------------------------------------------------`);

    for (const u of users) {
      const meta = u.raw_user_meta_data || {};
      const row = {
        id:            u.id,
        email:         u.email,
        password_hash: u.encrypted_password,
        full_name:     meta.full_name || meta.name || null,
        avatar_url:    meta.avatar_url || null,
        created_at:    u.created_at
      };
      lines.push(rowToInsert('users', row));
    }
    lines.push('');
    totalRows += users.length;
    console.log(` ✅ ${users.length} registros`);
  } catch (err) {
    console.log(` ⚠️  Erro ao exportar auth.users: ${err.message}`);
    lines.push(`-- ERRO ao exportar auth.users: ${err.message}`);
    lines.push('-- Você precisará criar os usuários manualmente ou via registro na API.');
    lines.push('');
  }

  for (const table of TABLES) {
    process.stdout.write(`📦 Exportando: ${table}...`);
    try {
      // Verifica se a tabela existe no schema público
      const checkRes = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [table]
      );

      if (!checkRes.rows[0].exists) {
        console.log(` ⚠️  Tabela não encontrada no Supabase (skip)`);
        continue;
      }

      const result = await client.query(`SELECT * FROM public."${table}"`);
      const rows = result.rows;

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
      console.log(` ✅ ${rows.length} registros`);
    } catch (err) {
      console.log(` ⚠️  Erro: ${err.message}`);
      lines.push(`-- ERRO ao exportar ${table}: ${err.message}`);
      lines.push('');
    }
  }

  await client.end();

  lines.push('SET FOREIGN_KEY_CHECKS = 1;');
  lines.push('');
  lines.push(`-- Total de registros exportados: ${totalRows}`);

  const output = lines.join('\n');
  writeFileSync('supabase_export_data.sql', output, 'utf8');

  console.log('\n✅ Exportação concluída!');
  console.log(`   📁 Arquivo gerado: supabase_export_data.sql`);
  console.log(`   📊 Total de registros: ${totalRows}`);
  console.log('\n💡 Dica: Os usuários foram exportados do schema auth.users.');
  console.log('   As senhas criptografadas do Supabase devem funcionar se forem BCrypt.\n');
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
