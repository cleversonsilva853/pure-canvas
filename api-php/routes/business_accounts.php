<?php
/** routes/business_accounts.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_accounts WHERE user_id = ? ORDER BY created_at ASC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_accounts WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $ownerId]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Conta não encontrada'], 404); jsonResponse($row); }
if ($method === 'POST') { $body = getJsonBody(); require_fields($body, ['name','type']); $newId = generateUUID(); $db->prepare('INSERT INTO business_accounts (id, user_id, name, type, balance, color, icon, is_active) VALUES (?,?,?,?,?,?,?,?)')->execute([$newId, $ownerId, $body['name'], $body['type'], $body['balance'] ?? 0, $body['color'] ?? null, $body['icon'] ?? null, isset($body['is_active']) ? (int)$body['is_active'] : 1]); $stmt2 = $db->prepare('SELECT * FROM business_accounts WHERE id = ?'); $stmt2->execute([$newId]); jsonResponse($stmt2->fetch(), 201); }
if ($method === 'PUT' && $id) { $body = getJsonBody(); $fields = []; $params = []; foreach (['name','type','balance','color','icon','is_active'] as $f) { if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; } } $params[] = $id; $db->prepare('UPDATE business_accounts SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params); $stmt2 = $db->prepare('SELECT * FROM business_accounts WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); }
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_accounts WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]); jsonResponse(['message' => 'Conta removida']); }
jsonResponse(['error' => 'Método não suportado'], 405);
