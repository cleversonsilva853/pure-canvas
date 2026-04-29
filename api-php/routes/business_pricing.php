<?php
/** routes/business_pricing.php — Precificação (business_food_pricing) */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM business_food_pricing WHERE user_id = ? ORDER BY name ASC');
  $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM business_food_pricing WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $ownerId]); $row = $stmt->fetch();
  if (!$row) jsonResponse(['error' => 'Precificação não encontrada'], 404); jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['name']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO business_food_pricing (id, user_id, name, total_cost, total_quantity, unit, portion_quantity, profit_percentage) VALUES (?,?,?,?,?,?,?,?)')
     ->execute([$newId, $ownerId, $body['name'], $body['total_cost'] ?? 0, $body['total_quantity'] ?? 0, $body['unit'] ?? 'un', $body['portion_quantity'] ?? 1, $body['profit_percentage'] ?? 0]);
  $stmt2 = $db->prepare('SELECT * FROM business_food_pricing WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody(); $fields = []; $params = [];
  foreach (['name','total_cost','total_quantity','unit','portion_quantity','profit_percentage'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE business_food_pricing SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM business_food_pricing WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $db->prepare('DELETE FROM business_food_pricing WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]);
  jsonResponse(['message' => 'Precificação removida']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
