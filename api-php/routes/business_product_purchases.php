<?php
/** routes/business_product_purchases.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) {
    $productId = $_GET['product_id'] ?? null;
    $query = 'SELECT * FROM business_product_purchases';
    $params = [];
    if ($productId) {
        $query .= ' WHERE product_id = ?';
        $params[] = $productId;
    }
    $query .= ' ORDER BY date DESC, created_at DESC';
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = getJsonBody();
    require_fields($body, ['product_id', 'quantity', 'unit', 'total_value', 'date']);
    $newId = generateUUID();
    $db->prepare('INSERT INTO business_product_purchases (id, product_id, quantity, unit, total_value, date) VALUES (?,?,?,?,?,?)')
       ->execute([$newId, $body['product_id'], $body['quantity'], $body['unit'], $body['total_value'], $body['date']]);
    
    // Opcional: Atualizar o cost_price do produto automaticamente para o último preço unitário?
    // Vamos deixar o cálculo manual pelo botão "Calcular" no frontend como solicitado.
    
    $stmt2 = $db->prepare('SELECT * FROM business_product_purchases WHERE id = ?');
    $stmt2->execute([$newId]);
    jsonResponse($stmt2->fetch(), 201);
}

if ($method === 'DELETE' && $id) {
    $db->prepare('DELETE FROM business_product_purchases WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Registro de compra removido']);
}

jsonResponse(['error' => 'Método não suportado'], 405);
