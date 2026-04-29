<?php
/** routes/budgets.php — CRUD de orçamentos (filtra por month/year) */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $month = $_GET['month'] ?? date('n');
  $year  = $_GET['year']  ?? date('Y');
  $stmt = $db->prepare('SELECT b.*, c.name AS cat_name, c.color AS cat_color FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ? AND b.month = ? AND b.year = ?');
  $stmt->execute([$userId, $month, $year]);
  $rows = array_map(function($r) {
    $r['category'] = $r['cat_name'] ? ['id' => $r['category_id'], 'name' => $r['cat_name'], 'color' => $r['cat_color']] : null;
    unset($r['cat_name'], $r['cat_color']); return $r;
  }, $stmt->fetchAll());
  jsonResponse($rows);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['category_id', 'amount', 'month', 'year']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO budgets (id, user_id, category_id, amount, month, year) VALUES (?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['category_id'], $body['amount'], $body['month'], $body['year']]);
  $stmt2 = $db->prepare('SELECT * FROM budgets WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Orçamento não encontrado'], 404);
  $fields = []; $params = [];
  foreach (['amount','category_id','month','year'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE budgets SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM budgets WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Orçamento não encontrado'], 404);
  $db->prepare('DELETE FROM budgets WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Orçamento removido']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
