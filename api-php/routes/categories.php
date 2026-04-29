<?php
/** routes/categories.php — CRUD de categorias */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $stmt = $db->prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC');
  $stmt->execute([$userId]);
  jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  $row = $stmt->fetch();
  if (!$row) jsonResponse(['error' => 'Categoria não encontrada'], 404);
  jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody();
  require_fields($body, ['name']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO categories (id, user_id, name, type, color, icon, parent_id) VALUES (?,?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['name'], $body['type'] ?? 'expense', $body['color'] ?? null, $body['icon'] ?? null, $body['parent_id'] ?? null]);
  $stmt2 = $db->prepare('SELECT * FROM categories WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Categoria não encontrada'], 404);
  $fields = []; $params = [];
  foreach (['name','type','color','icon','parent_id'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM categories WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Categoria não encontrada'], 404);
  $db->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Categoria removida']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
