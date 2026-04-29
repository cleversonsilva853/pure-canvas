<?php
/** routes/contas_a_receber.php — Contas a Receber (pessoal) */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM contas_a_receber WHERE user_id = ? ORDER BY due_date ASC');
  $stmt->execute([$userId]); jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM contas_a_receber WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Conta não encontrada'], 404); jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['name', 'amount', 'due_date']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO contas_a_receber (id, user_id, name, amount, due_date, start_date, is_received, observation) VALUES (?,?,?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['name'], $body['amount'], $body['due_date'], $body['start_date'] ?? null, isset($body['is_received']) ? (int)$body['is_received'] : 0, $body['observation'] ?? null]);
  $stmt2 = $db->prepare('SELECT * FROM contas_a_receber WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM contas_a_receber WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Conta não encontrada'], 404);
  $fields = []; $params = [];
  foreach (['name','amount','due_date','start_date','is_received','observation'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE contas_a_receber SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM contas_a_receber WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM contas_a_receber WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Conta não encontrada'], 404);
  $db->prepare('DELETE FROM contas_a_receber WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Conta removida']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
