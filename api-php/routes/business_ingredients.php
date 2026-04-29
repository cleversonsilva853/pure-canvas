<?php
/** routes/business_ingredients.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_ingredients WHERE user_id = ? ORDER BY name ASC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_ingredients WHERE id = ?'); $stmt->execute([$id]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Insumo não encontrado'], 404); jsonResponse($row); }
if ($method === 'POST') { $body = getJsonBody(); require_fields($body, ['name','purchase_price','purchase_quantity']); $newId = generateUUID(); $db->prepare('INSERT INTO business_ingredients (id, user_id, name, unit, purchase_price, purchase_quantity) VALUES (?,?,?,?,?,?)')->execute([$newId, $ownerId, $body['name'], $body['unit'] ?? 'un', $body['purchase_price'], $body['purchase_quantity']]); $stmt2 = $db->prepare('SELECT * FROM business_ingredients WHERE id = ?'); $stmt2->execute([$newId]); jsonResponse($stmt2->fetch(), 201); }
if ($method === 'PUT' && $id) { $body = getJsonBody(); $fields = []; $params = []; foreach (['name','unit','purchase_price','purchase_quantity'] as $f) { if (array_key_exists($f, $body)) { $fields[] = "`$f` = ?"; $params[] = $body[$f]; } } $params[] = $id; $db->prepare('UPDATE business_ingredients SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params); $stmt2 = $db->prepare('SELECT * FROM business_ingredients WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); }
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_ingredients WHERE id = ?')->execute([$id]); jsonResponse(['message' => 'Insumo removido']); }
jsonResponse(['error' => 'Método não suportado'], 405);
