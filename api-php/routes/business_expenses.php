<?php
/** routes/business_expenses.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_expenses WHERE user_id = ? ORDER BY date DESC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_expenses WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $ownerId]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Despesa não encontrada'], 404); jsonResponse($row); }
if ($method === 'POST') { 
  $body = getJsonBody(); 
  require_fields($body, ['name','amount']); 
  $newId = generateUUID(); 
  $accId = $body['account_id'] ?? null;
  $amount = (float)$body['amount'];

  try {
    $db->beginTransaction();

    // 1. Inserir a despesa
    $stmt = $db->prepare('INSERT INTO business_expenses (id, user_id, account_id, name, category, amount, date, observation) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([
      $newId, 
      $ownerId, 
      $accId,
      $body['name'], 
      $body['category'] ?? 'geral', 
      $amount, 
      $body['date'] ?? date('Y-m-d'), 
      $body['observation'] ?? null
    ]);

    // 2. Se informou conta, subtrai do saldo
    if ($accId) {
      $stmtAcc = $db->prepare('UPDATE business_accounts SET balance = balance - ? WHERE id = ? AND user_id = ?');
      $stmtAcc->execute([$amount, $accId, $ownerId]);
    }

    $db->commit();

    $stmt2 = $db->prepare('SELECT * FROM business_expenses WHERE id = ?');
    $stmt2->execute([$newId]);
    jsonResponse($stmt2->fetch(), 201);

  } catch (Exception $e) {
    $db->rollBack();
    jsonResponse(['error' => 'Falha ao processar despesa: ' . $e->getMessage()], 500);
  }
}

if ($method === 'PUT' && $id) { 
  $body = getJsonBody(); 
  $fields = []; $params = []; 
  foreach (['name','category','amount','date','observation','account_id'] as $f) { 
    if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; } 
  } 
  $params[] = $id; $params[] = $ownerId; 
  $db->prepare('UPDATE business_expenses SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?')->execute($params); 
  $stmt2 = $db->prepare('SELECT * FROM business_expenses WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); 
}

if ($method === 'DELETE' && $id) { 
  // Opcional: Poderia devolver o saldo ao deletar, mas manteremos simples conforme solicitado
  $db->prepare('DELETE FROM business_expenses WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]); 
  jsonResponse(['message' => 'Despesa removida']); 
}
jsonResponse(['error' => 'Método não suportado'], 405);
