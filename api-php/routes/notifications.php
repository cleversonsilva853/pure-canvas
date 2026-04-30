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
  $rows = $stmt->fetchAll();
  foreach ($rows as &$row) {
    if (!empty($row['weekdays_config'])) {
      $row['weekdays_config'] = json_decode($row['weekdays_config'], true);
    }
  }
  jsonResponse($rows);
}
if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  $row = $stmt->fetch();
  if (!$row) jsonResponse(['error' => 'Notificação não encontrada'], 404);
  if (!empty($row['weekdays_config'])) {
    $row['weekdays_config'] = json_decode($row['weekdays_config'], true);
  }
  jsonResponse($row);
}
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['title', 'description', 'scheduled_for']);
  $newId = generateUUID();
  $weekdays = isset($body['weekdays_config']) ? json_encode($body['weekdays_config']) : null;
  $db->prepare('INSERT INTO notifications (id, user_id, title, description, scheduled_for, status, recurrence, weekdays_config, context) VALUES (?,?,?,?,?,?,?,?,?)')
     ->execute([$newId, $userId, $body['title'], $body['description'], $body['scheduled_for'], $body['status'] ?? 'pending', $body['recurrence'] ?? 'none', $weekdays, $body['context'] ?? null]);
  $stmt2 = $db->prepare('SELECT * FROM notifications WHERE id = ?'); $stmt2->execute([$newId]);
  $row = $stmt2->fetch();
  if ($row && !empty($row['weekdays_config'])) {
    $row['weekdays_config'] = json_decode($row['weekdays_config'], true);
  }
  jsonResponse($row, 201);
}
if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Notificação não encontrada'], 404);
  $fields = []; $params = [];
  foreach (['title','description','scheduled_for','status','recurrence','weekdays_config','context'] as $f) {
    if (array_key_exists($f, $body)) {
      $fields[] = "`$f` = ?";
      $val = $body[$f];
      if ($f === 'weekdays_config' && is_array($val)) {
        $val = json_encode($val);
      }
      $params[] = $val;
    }
  }
  $params[] = $id;
  $db->prepare('UPDATE notifications SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM notifications WHERE id = ?');
  $stmt2->execute([$id]);
  $row = $stmt2->fetch();
  if ($row && !empty($row['weekdays_config'])) {
    $row['weekdays_config'] = json_decode($row['weekdays_config'], true);
  }
  jsonResponse($row);
}
if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Notificação não encontrada'], 404);
  $db->prepare('DELETE FROM notifications WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Notificação removida']);
}
jsonResponse(['error' => 'Método não suportado'], 405);
