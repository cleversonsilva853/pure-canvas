<?php
/** routes/business_products.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_products WHERE user_id = ? ORDER BY name ASC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_products WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $ownerId]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Produto não encontrado'], 404); jsonResponse($row); }
if ($method === 'POST') { $body = getJsonBody(); require_fields($body, ['name']); $newId = generateUUID(); $db->prepare('INSERT INTO business_products (id, user_id, name, sale_price, cost_price, stock) VALUES (?,?,?,?,?,?)')->execute([$newId, $ownerId, $body['name'], $body['sale_price'] ?? 0, $body['cost_price'] ?? 0, $body['stock'] ?? null]); $stmt2 = $db->prepare('SELECT * FROM business_products WHERE id = ?'); $stmt2->execute([$newId]); jsonResponse($stmt2->fetch(), 201); }
if ($method === 'PUT' && $id) { $body = getJsonBody(); $fields = []; $params = []; foreach (['name','sale_price','cost_price','stock'] as $f) { if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; } } $params[] = $id; $params[] = $ownerId; $db->prepare('UPDATE business_products SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?')->execute($params); $stmt2 = $db->prepare('SELECT * FROM business_products WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); }
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_products WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]); jsonResponse(['message' => 'Produto removido']); }
jsonResponse(['error' => 'Método não suportado'], 405);
