<?php
/** routes/business_sales.php */
$payload = requireAuth(); $userId = $payload['user_id']; $ownerId = getBusinessOwnerId($userId);
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

if ($method === 'GET' && !$id) { $stmt = $db->prepare('SELECT * FROM business_sales WHERE user_id = ? ORDER BY date DESC'); $stmt->execute([$ownerId]); jsonResponse($stmt->fetchAll()); }
if ($method === 'GET' && $id) { $stmt = $db->prepare('SELECT * FROM business_sales WHERE id = ? AND user_id = ?'); $stmt->execute([$id, $ownerId]); $row = $stmt->fetch(); if (!$row) jsonResponse(['error' => 'Venda não encontrada'], 404); jsonResponse($row); }
if ($method === 'POST') { 
    $body = getJsonBody(); 
    require_fields($body, ['product_name','unit_price','total_price']); 
    $newId = generateUUID(); 
    $accountId = !empty($body['account_id']) && $body['account_id'] !== 'avulsa' ? $body['account_id'] : null;
    
    $db->prepare('INSERT INTO business_sales (id, user_id, product_id, product_name, quantity, unit_price, total_price, account_id, date) VALUES (?,?,?,?,?,?,?,?,?)')
       ->execute([$newId, $ownerId, $body['product_id'] ?? null, $body['product_name'], $body['quantity'] ?? 1, $body['unit_price'], $body['total_price'], $accountId, $body['date'] ?? date('Y-m-d')]); 
    
    if ($accountId) {
        $db->prepare('UPDATE business_accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
           ->execute([$body['total_price'], $accountId, $ownerId]);
    }
    
    $stmt2 = $db->prepare('SELECT * FROM business_sales WHERE id = ?'); 
    $stmt2->execute([$newId]); 
    jsonResponse($stmt2->fetch(), 201); 
}
if ($method === 'DELETE' && $id) { 
    $stmt = $db->prepare('SELECT total_price, account_id FROM business_sales WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $ownerId]);
    $sale = $stmt->fetch();
    
    if ($sale) {
        if (!empty($sale['account_id'])) {
            $db->prepare('UPDATE business_accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
               ->execute([$sale['total_price'], $sale['account_id'], $ownerId]);
        }
        $db->prepare('DELETE FROM business_sales WHERE id = ? AND user_id = ?')->execute([$id, $ownerId]); 
    }
    jsonResponse(['message' => 'Venda removida']); 
}
jsonResponse(['error' => 'Método não suportado'], 405);
