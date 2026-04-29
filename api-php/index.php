<?php
/**
 * InforControl API — Roteador Principal
 * Coloque este arquivo na raiz do domínio da API.
 *
 * Estrutura de URL:
 *   GET    /accounts           → lista
 *   POST   /accounts           → cria
 *   GET    /accounts/{id}      → busca um
 *   PUT    /accounts/{id}      → atualiza
 *   DELETE /accounts/{id}      → remove
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/jwt.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/uuid.php';

// Parse da URL
$requestUri    = $_SERVER['REQUEST_URI'];
$scriptName    = dirname($_SERVER['SCRIPT_NAME']);
$path          = str_replace($scriptName, '', parse_url($requestUri, PHP_URL_PATH));
$path          = trim($path, '/');
$method        = $_SERVER['REQUEST_METHOD'];
$segments      = array_values(array_filter(explode('/', $path)));

// Identificar rota base e possível ID
$route    = $segments[0] ?? '';
$subRoute = $segments[1] ?? null;
$id       = null;

// Mapear rotas de negócios: /business/expenses → route=business_expenses
if ($route === 'business' && $subRoute !== null) {
  $route = 'business_' . $subRoute;
  $id    = $segments[2] ?? null;
} elseif ($route === 'auth') {
  $id = $subRoute;
} else {
  $id = $subRoute;
}

// Mapear nomes de rota → arquivo de handler
$routeMap = [
  // Auth
  'auth'                          => 'auth',
  // Pessoal
  'accounts'                      => 'accounts',
  'transactions'                  => 'transactions',
  'categories'                    => 'categories',
  'credit_cards'                  => 'credit_cards',
  'credit-cards'                  => 'credit_cards',
  'budgets'                       => 'budgets',
  'goals'                         => 'goals',
  'contas_a_pagar'                => 'contas_a_pagar',
  'contas-a-pagar'                => 'contas_a_pagar',
  'contas_a_receber'              => 'contas_a_receber',
  'contas-a-receber'              => 'contas_a_receber',
  'notifications'                 => 'notifications',
  'push_subscriptions'            => 'push_subscriptions',
  'push-subscriptions'            => 'push_subscriptions',
  'couples'                       => 'couples',
  'couple_members'                => 'couple_members',
  'couple-members'                => 'couple_members',
  // Empresarial
  'business_accounts'             => 'business_accounts',
  'business_expenses'             => 'business_expenses',
  'business_sales'                => 'business_sales',
  'business_products'             => 'business_products',
  'business_ingredients'          => 'business_ingredients',
  'business_product_compositions' => 'business_product_compositions',
  'business_compositions'         => 'business_product_compositions',
  'business_pricing'              => 'business_pricing',
  'business_members'              => 'business_members',
  'business_expense_categories'   => 'business_expense_categories',
  'business_contas_a_pagar'       => 'business_contas_a_pagar',
  'business_contas_a_receber'     => 'business_contas_a_receber',
];

$handler = $routeMap[$route] ?? null;

if (!$handler) {
  jsonResponse(['error' => "Rota '/{$route}' não encontrada"], 404);
}

$handlerFile = __DIR__ . "/routes/{$handler}.php";
if (!file_exists($handlerFile)) {
  jsonResponse(['error' => "Handler para '{$route}' não implementado"], 501);
}

// Disponibilizar para os handlers
$GLOBALS['route_id']    = $id;
$GLOBALS['route_method'] = $method;

require $handlerFile;
