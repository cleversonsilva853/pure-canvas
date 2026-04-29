<?php
/** routes/notifications.php — CRUD de notificações agendadas */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $context = $_GET['context'] ?? null;
  if ($context) {
    $stmt = $db->prepare('SELECT * FROM notifications WHERE user_id = ? AND context = ? ORDER BY scheduled_for DESC');
    $stmt->execute([$userId, $context]);
  } else {
    $stmt = $db->prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY scheduled_for DESC');
    $stmt->execute([$userId]);
  }
  jsonResponse($stmt->fetchAll());
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Notificação não encontrada'], 404); jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['title', 'description', 'scheduled_for']);
  $newId = generateUUID();
  $db->prepare('INSERT INTO notifications (id, user_id, title, description, scheduled_for, status, recurrence, weekdays_config, context) VALUES (?,?,?,?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['title'], $body['description'], $body['scheduled_for'], $body['status'] ?? 'pending', $body['recurrence'] ?? 'none', $body['weekdays_config'] ?? null, $body['context'] ?? null]);
  $stmt2 = $db->prepare('SELECT * FROM notifications WHERE id = ?'); $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Notificação não encontrada'], 404);
  $fields = []; $params = [];
  foreach (['title','description','scheduled_for','status','recurrence','weekdays_config','context'] as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  $params[] = $id;
  $db->prepare('UPDATE notifications SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM notifications WHERE id = ?'); $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Notificação não encontrada'], 404);
  $db->prepare('DELETE FROM notifications WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Notificação removida']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
