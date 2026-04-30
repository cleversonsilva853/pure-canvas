<?php
/**
 * config/cors.php
 * Headers CORS — permite chamadas do frontend
 * API: https://api.financeiro.infornexa.com.br
 */

// Lista de origens permitidas (adicione mais se precisar)
$allowedOrigins = [
  'https://financeiro.infornexa.com.br',
  'https://www.financeiro.infornexa.com.br',
  'https://infornexa.com.br',
  'http://localhost:5173',  // desenvolvimento local
  'http://localhost:3000',  // desenvolvimento local alternativo
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
  header('Access-Control-Allow-Origin: ' . $origin);
} else {
  // Fallback: permite qualquer origem (remova em produção se quiser mais segurança)
  header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Responde preflight OPTIONS imediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}
