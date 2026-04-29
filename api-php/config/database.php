<?php
/**
 * config/database.php
 * Conexão PDO com MySQL (HostGator)
 *
 * Configure as variáveis abaixo com seus dados do cPanel → MySQL.
 */

define('DB_HOST', 'localhost');         // Geralmente 'localhost' na HostGator
define('DB_NAME', 'SEU_BANCO_MYSQL');   // Nome do banco criado no cPanel
define('DB_USER', 'SEU_USUARIO_MYSQL'); // Usuário MySQL criado no cPanel
define('DB_PASS', 'SUA_SENHA_MYSQL');   // Senha do usuário MySQL
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
  static $pdo = null;
  if ($pdo !== null) return $pdo;

  $dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    DB_HOST, DB_NAME, DB_CHARSET
  );

  try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Falha ao conectar ao banco de dados: ' . $e->getMessage()]);
    exit;
  }
}
