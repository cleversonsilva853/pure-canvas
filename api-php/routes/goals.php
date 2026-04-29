<?php
/** routes/goals.php — CRUD de metas financeiras */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at ASC');
  $stmt->execute([$userId]); jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Meta não encontrada'], 404);
  jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['name', 'target_amount']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, color, icon) VALUES (?,?,?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['name'], $body['target_amount'], $body['current_amount'] ?? 0, $body['deadline'] ?? null, $body['color'] ?? null, $body['icon'] ?? null]);
  $stmt2 = $db->prepare('SELECT * FROM goals WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Meta não encontrada'], 404);
  $fields = []; $params = [];
  foreach (['name','target_amount','current_amount','deadline','is_completed','color','icon'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE goals SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM goals WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Meta não encontrada'], 404);
  $db->prepare('DELETE FROM goals WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Meta removida']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
