<?php
/** routes/business_product_compositions.php — Ficha Técnica */
$payload = requireAuth(); $userId = $payload['user_id'];
$method = $GLOBALS['route_method']; $id = $GLOBALS['route_id']; $db = getDB();

// GET /business/compositions?product_id=XXX
if ($method === 'GET' && !$id) {
  $productId = $_GET['product_id'] ?? null;
  if ($productId) {
    $stmt = $db->prepare('SELECT bpc.*, bi.name AS ingredient_name, bi.unit, bi.purchase_price, bi.purchase_quantity FROM business_product_compositions bpc LEFT JOIN business_ingredients bi ON bi.id = bpc.ingredient_id WHERE bpc.product_id = ?');
    $stmt->execute([$productId]);
    $rows = array_map(function($r) {
      $r['ingredient'] = ['id' => $r['ingredient_id'], 'name' => $r['ingredient_name'], 'unit' => $r['unit'], 'purchase_price' => $r['purchase_price'], 'purchase_quantity' => $r['purchase_quantity']];
      unset($r['ingredient_name']); return $r;
    }, $stmt->fetchAll());
    jsonResponse($rows);
  } else {
    $stmt = $db->prepare('SELECT * FROM business_product_compositions'); $stmt->execute(); jsonResponse($stmt->fetchAll());
  }
}
// POST /business/compositions — upsert de ficha técnica inteira (igual à Edge Function Supabase)
if ($method === 'POST') {
  $body = getJsonBody(); require_fields($body, ['product_id', 'compositions']);
  $productId = $body['product_id'];
  // Remove antigas e insere novas
  $db->prepare('DELETE FROM business_product_compositions WHERE product_id = ?')->execute([$productId]);
  foreach ($body['compositions'] as $comp) {
    $db->prepare('INSERT INTO business_product_compositions (id, product_id, ingredient_id, quantity) VALUES (?,?,?,?)')
       ->execute([generateUUID(), $productId, $comp['ingredient_id'], $comp['quantity']]);
  }
  jsonResponse(['message' => 'Ficha técnica atualizada']);
}
if ($method === 'DELETE' && $id) { $db->prepare('DELETE FROM business_product_compositions WHERE id = ?')->execute([$id]); jsonResponse(['message' => 'Composição removida']); }
jsonResponse(['error' => 'Método não suportado'], 405);
