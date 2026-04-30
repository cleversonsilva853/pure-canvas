<?php
/** routes/business_expenses.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_expenses WHERE user_id = ? ORDER BY date DESC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_expenses WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $ownerId]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Despesa não encontrada'], 404); jsonResponse($row); }
if ($method === 'POST') { $body = getJsonBody(); require_fields($body, ['name','amount']); $newId = generateUUID(); $db->prepare('INSERT INTO business_expenses (id, user_id, name, category, amount, date, observation) VALUES (?,?,?,?,?,?,?)')->execute([$newId, $ownerId, $body['name'], $body['category'] ?? 'geral', $body['amount'], $body['date'] ?? date('Y-m-d'), $body['observation'] ?? null]); $stmt2 = $db->prepare('SELECT * FROM business_expenses WHERE id = ?'); $stmt2->execute([$newId]); jsonResponse($stmt2->fetch(), 201); }
if ($method === 'PUT' && $id) { $body = getJsonBody(); $fields = []; $params = []; foreach (['name','category','amount','date','observation'] as $f) { if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; } } $params[] = $id; $params[] = $ownerId; $db->prepare('UPDATE business_expenses SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?')->execute($params); $stmt2 = $db->prepare('SELECT * FROM business_expenses WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); }
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_expenses WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]); jsonResponse(['message' => 'Despesa removida']); }
jsonResponse(['error' => 'Método não suportado'], 405);
