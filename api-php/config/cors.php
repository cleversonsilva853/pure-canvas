<?php
/**
 * config/cors.php
 * Headers CORS — permite chamadas do frontend React
 *
 * Altere ALLOWED_ORIGIN para o domínio real do seu frontend.
 */

// Domínio do frontend (onde o React está hospedado)
// Use '*' apenas em desenvolvimento. Em produção, especifique o domínio exato.
$allowedOrigin = $_ENV['FRONTEND_URL'] ?? '*';

header('Access-Control-Allow-Origin: ' . $allowedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Responde preflight OPTIONS imediatamente
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}
