<?php
/** routes/business_product_sale_units.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) {
    $productId = $_GET['product_id'] ?? null;
    if (!$productId) jsonResponse(['error' => 'product_id é obrigatório'], 400);
    $stmt = $db->prepare('SELECT * FROM business_product_sale_units WHERE product_id = ? ORDER BY conversion_factor ASC');
    $stmt->execute([$productId]);
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = getJsonBody();
    require_fields($body, ['product_id', 'name', 'conversion_factor']);
    $newId = generateUUID();
    $db->prepare('INSERT INTO business_product_sale_units (id, product_id, name, conversion_factor) VALUES (?,?,?,?)')
       ->execute([$newId, $body['product_id'], $body['name'], $body['conversion_factor']]);
    $stmt2 = $db->prepare('SELECT * FROM business_product_sale_units WHERE id = ?');
    $stmt2->execute([$newId]);
    jsonResponse($stmt2->fetch(), 201);
}

if ($method === 'DELETE' && $id) {
    $db->prepare('DELETE FROM business_product_sale_units WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Unidade de venda removida']);
}

jsonResponse(['error' => 'Método não suportado'], 405);
