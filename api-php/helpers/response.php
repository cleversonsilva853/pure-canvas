<?php
/**
 * helpers/response.php
 * Funções utilitárias de resposta JSON
 */

function jsonResponse(mixed $data, int $status = 200): never {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function getJsonBody(): array {
  $body = file_get_contents('php://input');
  if (empty($body)) return [];
  $decoded = json_decode($body, true);
  return is_array($decoded) ? $decoded : [];
}

function require_fields(array $body, array $fields): void {
  foreach ($fields as $field) {
    if (!isset($body[$field]) || (is_string($body[$field]) && trim($body[$field]) === '')) {
      jsonResponse(['error' => "Campo obrigatório ausente: '{$field}'"], 422);
    }
  }
}
