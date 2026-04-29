<?php
/**
 * routes/auth.php
 * POST /auth/login    → login
 * POST /auth/register → cadastro
 * GET  /auth/me       → dados do usuário autenticado
 * POST /auth/logout   → logout (client-side, apenas confirmação)
 */

$method = $GLOBALS['route_method'];
$action = $GLOBALS['route_id']; // login | register | me | logout

$db = getDB();

// ── POST /auth/login ──────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
  $body = getJsonBody();
  require_fields($body, ['email', 'password']);

  $stmt = $db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([strtolower(trim($body['email']))]);
  $user = $stmt->fetch();

  if (!$user || !password_verify($body['password'], $user['password_hash'])) {
    jsonResponse(['error' => 'Email ou senha inválidos'], 401);
  }

  $token = JWT::encode([
    'user_id' => $user['id'],
    'email'   => $user['email'],
    'iat'     => time(),
    'exp'     => time() + JWT_EXPIRY,
  ]);

  jsonResponse([
    'token' => $token,
    'user'  => [
      'id'         => $user['id'],
      'email'      => $user['email'],
      'full_name'  => $user['full_name'],
      'created_by' => $user['created_by'],
      'created_at' => $user['created_at'],
    ],
  ]);
}

// ── POST /auth/register ───────────────────────────────────────
if ($method === 'POST' && $action === 'register') {
  $body = getJsonBody();
  require_fields($body, ['email', 'password']);

  $email    = strtolower(trim($body['email']));
  $password = $body['password'];
  $fullName = trim($body['full_name'] ?? '');

  if (strlen($password) < 6) {
    jsonResponse(['error' => 'A senha deve ter pelo menos 6 caracteres'], 422);
  }

  // Verificar email duplicado
  $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  if ($stmt->fetch()) {
    jsonResponse(['error' => 'Este email já está cadastrado'], 409);
  }

  $id           = generateUUID();
  $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
  $createdBy    = $body['created_by'] ?? null;

  $stmt = $db->prepare('INSERT INTO users (id, email, password_hash, full_name, created_by) VALUES (?, ?, ?, ?, ?)');
  $stmt->execute([$id, $email, $passwordHash, $fullName ?: null, $createdBy]);

  // Criar perfil automaticamente
  $profileId = generateUUID();
  $stmtP = $db->prepare('INSERT INTO profiles (id, user_id, full_name) VALUES (?, ?, ?)');
  $stmtP->execute([$profileId, $id, $fullName ?: null]);

  $token = JWT::encode([
    'user_id' => $id,
    'email'   => $email,
    'iat'     => time(),
    'exp'     => time() + JWT_EXPIRY,
  ]);

  jsonResponse([
    'token' => $token,
    'user'  => [
      'id'         => $id,
      'email'      => $email,
      'full_name'  => $fullName ?: null,
      'created_by' => $createdBy,
    ],
  ], 201);
}

// ── GET /auth/me ──────────────────────────────────────────────
if ($method === 'GET' && $action === 'me') {
  $payload = requireAuth();
  $stmt    = $db->prepare('SELECT id, email, full_name, avatar_url, created_by, created_at FROM users WHERE id = ?');
  $stmt->execute([$payload['user_id']]);
  $user = $stmt->fetch();

  if (!$user) {
    jsonResponse(['error' => 'Usuário não encontrado'], 404);
  }

  jsonResponse(['user' => $user]);
}

// ── POST /auth/logout ─────────────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
  // JWT é stateless — o logout é feito no cliente removendo o token
  jsonResponse(['message' => 'Logout realizado com sucesso']);
}

jsonResponse(['error' => "Ação '{$action}' não suportada em /auth"], 404);
