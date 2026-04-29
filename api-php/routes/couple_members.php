<?php
/** routes/couple_members.php */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM couple_members');
  $stmt->execute(); jsonResponse($stmt->fetchAll());
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['couple_id', 'name']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO couple_members (id, couple_id, user_id, name) VALUES (?,?,?,?)')
     ->execute([$newId, $body['couple_id'], $body['user_id'] ?? null, $body['name']]);
  $stmt2 = $db->prepare('SELECT * FROM couple_members WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'DELETE' && $id) {
  $db->prepare('DELETE FROM couple_members WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Membro removido']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
