<?php
/** routes/business_product_additions.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

// GET all for a product or specific ID
if ($method === 'GET' && !$id) {
    $productId = $_GET['product_id'] ?? null;
    if (!$productId) jsonResponse(['error' => 'product_id é obrigatório'], 400);
    $stmt = $db->prepare('SELECT * FROM business_product_additions WHERE product_id = ? ORDER BY created_at ASC');
    $stmt->execute([$productId]);
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = getJsonBody();
    require_fields($body, ['product_id', 'name', 'type', 'value']);
    $newId = generateUUID();
    $db->prepare('INSERT INTO business_product_additions (id, product_id, name, type, value) VALUES (?,?,?,?,?)')
       ->execute([$newId, $body['product_id'], $body['name'], $body['type'], $body['value']]);
    $stmt2 = $db->prepare('SELECT * FROM business_product_additions WHERE id = ?');
    $stmt2->execute([$newId]);
    jsonResponse($stmt2->fetch(), 201);
}

if ($method === 'DELETE' && $id) {
    $db->prepare('DELETE FROM business_product_additions WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Adição removida']);
}

jsonResponse(['error' => 'Método não suportado'], 405);
