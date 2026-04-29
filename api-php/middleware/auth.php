<?php
/**
 * middleware/auth.php
 * Valida o token JWT do header Authorization
 */

function requireAuth(): array {
  $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

  if (empty($authHeader)) {
    jsonResponse(['error' => 'Token de autenticação ausente'], 401);
  }

  if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    jsonResponse(['error' => 'Formato de token inválido. Use: Bearer <token>'], 401);
  }

  $token   = $matches[1];
  $payload = JWT::decode($token);

  if (!$payload) {
    jsonResponse(['error' => 'Token inválido ou expirado. Faça login novamente.'], 401);
  }

  return $payload; // contém: user_id, email, iat, exp
}

/**
 * Retorna o owner_id de negócio para o usuário autenticado.
 * Se for membro de uma empresa, retorna o owner_id.
 * Se for o próprio dono (ou sem empresa), retorna o próprio user_id.
 */
function getBusinessOwnerId(string $userId): string {
  $db   = getDB();
  $stmt = $db->prepare('SELECT owner_id FROM business_members WHERE member_id = ? LIMIT 1');
  $stmt->execute([$userId]);
  $row = $stmt->fetch();
  return $row ? $row['owner_id'] : $userId;
}
