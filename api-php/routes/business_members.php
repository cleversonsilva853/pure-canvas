<?php
/** routes/business_members.php */
$payload = requireAuth(); $userId = $payload['user_id'];
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM business_members WHERE owner_id = ?');
  $stmt->execute([$userId]); jsonResponse($stmt->fetchAll());
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['member_id']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO business_members (id, owner_id, member_id) VALUES (?,?,?)')->execute([$newId, $userId, $body['member_id']]);
  jsonResponse(['id' => $newId, 'owner_id' => $userId, 'member_id' => $body['member_id']], 201);
}
if ($method === 'DELETE' && $id) {
  $db->prepare('DELETE FROM business_members WHERE id = ? AND owner_id = ?')->execute([$id, $userId]);
  jsonResponse(['message' => 'Membro removido']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
