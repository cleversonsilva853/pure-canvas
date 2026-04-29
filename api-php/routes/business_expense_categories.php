<?php
/** routes/business_expense_categories.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_expense_categories WHERE user_id = ? ORDER BY name ASC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'POST') { $body = getJsonBody(); require_fields($body, ['name']); $newId = generateUUID(); $db->prepare('INSERT INTO business_expense_categories (id, user_id, name) VALUES (?,?,?)')->execute([$newId, $ownerId, $body['name']]); $stmt2 = $db->prepare('SELECT * FROM business_expense_categories WHERE id = ?'); $stmt2->execute([$newId]); jsonResponse($stmt2->fetch(), 201); }
if ($method === 'PUT' && $id) { $body = getJsonBody(); $db->prepare('UPDATE business_expense_categories SET name = ? WHERE id = ?')->execute([$body['name'], $id]); $stmt2 = $db->prepare('SELECT * FROM business_expense_categories WHERE id = ?'); $stmt2->execute([$id]); jsonResponse($stmt2->fetch()); }
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_expense_categories WHERE id = ?')->execute([$id]); jsonResponse(['message' => 'Categoria removida']); }
jsonResponse(['error' => 'Método não suportado'], 405);
