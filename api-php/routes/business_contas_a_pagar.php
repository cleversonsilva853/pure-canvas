<?php
/** routes/business_contas_a_pagar.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_contas_a_pagar WHERE user_id = ? ORDER BY due_date ASC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_contas_a_pagar WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $ownerId]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Conta não encontrada'], 404); jsonResponse($row); }
if ($method === 'POST') { $body = getJsonBody(); require_fields($body, ['name','amount','due_date','start_date']); $newId = generateUUID(); $db->prepare('INSERT INTO business_contas_a_pagar (id, user_id, name, amount, due_date, start_date, is_paid, observation) VALUES (?,?,?,?,?,?,?,?)')->execute([$newId, $ownerId, $body['name'], $body['amount'], $body['due_date'], $body['start_date'], isset($body['is_paid']) ? (int)$body['is_paid'] : 0, $body['observation'] ?? null]); $stmt2 = $db->prepare('SELECT * FROM business_contas_a_pagar WHERE id = ?'); $stmt2->execute([$newId]); jsonResponse($stmt2->fetch(), 201); }
if ($method === 'PUT' && $id) { $body = getJsonBody(); $fields = []; $params = []; foreach (['name','amount','due_date','start_date','is_paid','observation'] as $f) { if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; } } $params[] = $id; $db->prepare('UPDATE business_contas_a_pagar SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params); $stmt2 = $db->prepare('SELECT * FROM business_contas_a_pagar WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); }
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_contas_a_pagar WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]); jsonResponse(['message' => 'Conta removida']); }
jsonResponse(['error' => 'Método não suportado'], 405);
