<?php
/** routes/couples.php + routes/couple_members.php combinados */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT c.* FROM couples c INNER JOIN couple_members cm ON cm.couple_id = c.id WHERE cm.user_id = ?');
  $stmt->execute([$userId]); jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM couples WHERE id = ?'); $stmt->execute([$id]);
  $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Casal não encontrado'], 404); jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['name']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO couples (id, name) VALUES (?,?)')->execute([$newId, $body['name']]);
  // Adiciona criador como membro
  $memberId = generateUUID();
  $db->prepare('INSERT INTO couple_members (id, couple_id, user_id, name) VALUES (?,?,?,?)')
     ->execute([$memberId, $newId, $userId, $body['member_name'] ?? 'Principal']);
  $stmt2 = $db->prepare('SELECT * FROM couples WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'DELETE' && $id) {
  $db->prepare('DELETE FROM couples WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Casal removido']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
