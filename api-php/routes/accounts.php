<?php
/**
 * routes/accounts.php
 * GET    /accounts        → lista contas do usuário
 * POST   /accounts        → cria conta
 * GET    /accounts/{id}   → busca conta por ID
 * PUT    /accounts/{id}   → atualiza conta
 * DELETE /accounts/{id}   → remove conta
 */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC');
  $stmt->execute([$userId]);
  jsonResponse($stmt->fetchAll());
}

if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  $row = $stmt->fetch();
  if (!$row) jsonResponse(['error' => 'Conta não encontrada'], 404);
  jsonResponse($row);
}

if ($method === 'POST') {
  $body = getJsonBody();
  require_fields($body, ['name']);
  $newId = generateUUID();
  $stmt = $db->prepare('INSERT INTO accounts (id, user_id, name, type, balance, color, icon, is_active) VALUES (?,?,?,?,?,?,?,?)');
  $stmt->execute([
    $newId, $userId,
    $body['name'],
    $body['type']      ?? 'checking',
    $body['balance']   ?? 0,
    $body['color']     ?? null,
    $body['icon']      ?? null,
    isset($body['is_active']) ? (int)$body['is_active'] : 1,
  ]);
  $stmt2 = $db->prepare('SELECT * FROM accounts WHERE id = ?');
  $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}

if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Conta não encontrada'], 404);

  $fields = [];
  $params = [];
  foreach (['name','type','balance','color','icon','is_active'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  if (empty($fields)) jsonResponse(['error' => 'Nenhum campo para atualizar'], 422);
  $params[] = $id;
  $db->prepare('UPDATE accounts SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM accounts WHERE id = ?');
  $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}

if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Conta não encontrada'], 404);
  $db->prepare('DELETE FROM accounts WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Conta removida com sucesso']);
}

jsonResponse(['error' => 'Método não suportado'], 405);
