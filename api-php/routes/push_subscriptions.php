<?php
/** routes/push_subscriptions.php — Gerencia inscrições Web Push */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

// GET /push_subscriptions — lista subscrições do usuário
if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT id, user_id, endpoint, p256dh, created_at FROM push_subscriptions WHERE user_id = ?');
  $stmt->execute([$userId]);
  jsonResponse($stmt->fetchAll());
}

// POST /push_subscriptions — salva ou atualiza uma inscrição
if ($method === 'POST') {
  $body = getJsonBody();
  require_fields($body, ['endpoint', 'p256dh', 'auth']);

  // Verifica se já existe (upsert por endpoint)
  $stmt = $db->prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?');
  $stmt->execute([$userId, $body['endpoint']]);
  $existing = $stmt->fetch();

  if ($existing) {
    // Atualiza chaves (caso o browser gere novas)
    $db->prepare('UPDATE push_subscriptions SET p256dh = ?, auth_key = ? WHERE id = ?')
       ->execute([$body['p256dh'], $body['auth'], $existing['id']]);
    jsonResponse(['message' => 'Inscrição atualizada', 'id' => $existing['id']]);
  } else {
    $newId = generateUUID();
    $db->prepare('INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth_key) VALUES (?,?,?,?,?)')
       ->execute([$newId, $userId, $body['endpoint'], $body['p256dh'], $body['auth']]);
    jsonResponse(['message' => 'Inscrição salva', 'id' => $newId], 201);
  }
}

// DELETE /push_subscriptions/{id} — remove uma inscrição
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM push_subscriptions WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Inscrição não encontrada'], 404);
  $db->prepare('DELETE FROM push_subscriptions WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Inscrição removida']);
}

jsonResponse(['error' => 'Método não suportado'], 405);
