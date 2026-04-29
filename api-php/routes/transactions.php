<?php
/**
 * routes/transactions.php
 * GET    /transactions              → lista (filtros: month, year)
 * POST   /transactions              → cria
 * GET    /transactions/{id}         → busca por ID
 * PUT    /transactions/{id}         → atualiza
 * DELETE /transactions/{id}         → remove
 */

$payload = requireAuth();
$userId  = $payload['user_id'];
$method  = $GLOBALS['route_method'];
$id      = $GLOBALS['route_id'];
$db      = getDB();

if ($method === 'GET' && !$id) {
  $month = $_GET['month'] ?? date('n');
  $year  = $_GET['year']  ?? date('Y');

  $startDate = sprintf('%04d-%02d-01', $year, $month);
  $endDate   = $month == 12
    ? sprintf('%04d-01-01', $year + 1)
    : sprintf('%04d-%02d-01', $year, $month + 1);

  $stmt = $db->prepare('
    SELECT t.*,
      c.id AS cat_id, c.name AS cat_name, c.color AS cat_color, c.type AS cat_type,
      a.id AS acc_id, a.name AS acc_name,
      cc.id AS card_id, cc.name AS card_name
    FROM transactions t
    LEFT JOIN categories c  ON t.category_id    = c.id
    LEFT JOIN accounts a    ON t.account_id      = a.id
    LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
    WHERE t.user_id = ? AND t.date >= ? AND t.date < ?
    ORDER BY t.date DESC, t.created_at DESC
  ');
  $stmt->execute([$userId, $startDate, $endDate]);
  $rows = $stmt->fetchAll();

  // Montar objetos aninhados (category, account, card)
  $result = array_map(function($row) {
    $row['category'] = $row['cat_id'] ? ['id' => $row['cat_id'], 'name' => $row['cat_name'], 'color' => $row['cat_color'], 'type' => $row['cat_type']] : null;
    $row['account']  = $row['acc_id'] ? ['id' => $row['acc_id'], 'name' => $row['acc_name']] : null;
    $row['card']     = $row['card_id'] ? ['id' => $row['card_id'], 'name' => $row['card_name']] : null;
    foreach (['cat_id','cat_name','cat_color','cat_type','acc_id','acc_name','card_id','card_name'] as $k) unset($row[$k]);
    return $row;
  }, $rows);

  jsonResponse($result);
}

if ($method === 'GET' && $id) {
  $stmt = $db->prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  $row = $stmt->fetch();
  if (!$row) jsonResponse(['error' => 'Transação não encontrada'], 404);
  jsonResponse($row);
}

if ($method === 'POST') {
  $body = getJsonBody();
  require_fields($body, ['amount', 'date', 'type']);
  $newId = generateUUID();
  $stmt = $db->prepare('
    INSERT INTO transactions (id, user_id, account_id, category_id, credit_card_id, parent_transaction_id,
      context_id, context_type, type, amount, description, date, is_paid, is_recurring,
      recurrence_type, installment_number, total_installments, paid_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ');
  $stmt->execute([
    $newId, $userId,
    $body['account_id']            ?? null,
    $body['category_id']           ?? null,
    $body['credit_card_id']        ?? null,
    $body['parent_transaction_id'] ?? null,
    $body['context_id']            ?? null,
    $body['context_type']          ?? null,
    $body['type'],
    $body['amount'],
    $body['description']           ?? null,
    $body['date'],
    isset($body['is_paid'])        ? (int)$body['is_paid']        : 1,
    isset($body['is_recurring'])   ? (int)$body['is_recurring']   : 0,
    $body['recurrence_type']       ?? null,
    $body['installment_number']    ?? null,
    $body['total_installments']    ?? null,
    $body['paid_by']               ?? null,
  ]);
  $stmt2 = $db->prepare('SELECT * FROM transactions WHERE id = ?');
  $stmt2->execute([$newId]);
  jsonResponse($stmt2->fetch(), 201);
}

if ($method === 'PUT' && $id) {
  $body = getJsonBody();
  $stmt = $db->prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Transação não encontrada'], 404);

  $allowed = ['account_id','category_id','credit_card_id','type','amount','description','date','is_paid','is_recurring','recurrence_type','paid_by'];
  $fields = []; $params = [];
  foreach ($allowed as $f) {
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; }
  }
  if (empty($fields)) jsonResponse(['error' => 'Nenhum campo para atualizar'], 422);
  $params[] = $id;
  $db->prepare('UPDATE transactions SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
  $stmt2 = $db->prepare('SELECT * FROM transactions WHERE id = ?');
  $stmt2->execute([$id]);
  jsonResponse($stmt2->fetch());
}

if ($method === 'DELETE' && $id) {
  $stmt = $db->prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $userId]);
  if (!$stmt->fetch()) jsonResponse(['error' => 'Transação não encontrada'], 404);
  $db->prepare('DELETE FROM transactions WHERE id = ?')->execute([$id]);
  jsonResponse(['message' => 'Transação removida']);
}

jsonResponse(['error' => 'Método não suportado'], 405);
