<?php
/** routes/credit_cards.php — CRUD de cartões de crédito */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at ASC');
  $stmt->execute([$userId]); jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Cartão não encontrado'], 404);
  jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['name']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO credit_cards (id, user_id, name, limit_total, closing_day, due_day, color, is_active) VALUES (?,?,?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['name'], $body['limit_total'] ?? 0, $body['closing_day'] ?? 1, $body['due_day'] ?? 10, $body['color'] ?? null, isset($body['is_active']) ? (int)$body['is_active'] : 1]);
  $stmt2 = $db->prepare('SELECT * FROM credit_cards WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM credit_cards WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Cartão não encontrado'], 404);
  $fields = []; $params = [];
  foreach (['name','limit_total','closing_day','due_day','color','is_active'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE credit_cards SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM credit_cards WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM credit_cards WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Cartão não encontrado'], 404);
  $db->prepare('DELETE FROM credit_cards WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Cartão removido']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
