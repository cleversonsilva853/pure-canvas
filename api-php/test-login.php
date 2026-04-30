<?php
/**
 * test-login.php
 * Script temporário para diagnosticar falhas de login.
 */
require_once __DIR__ . '/config/database.php';
header('Content-Type: text/plain; charset=utf-8');

try {
    $db = getDB();
    $userToTest = 'admin';
    $passToTest = 'admin123';

    echo "--- DIAGNÓSTICO DE LOGIN ---\n\n";

    // 1. Verificar se a tabela existe e colunas
    echo "1. Verificando estrutura da tabela...\n";
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Colunas encontradas: " . implode(', ', $columns) . "\n\n";

    // 2. Buscar o usuário
    echo "2. Buscando usuário '{$userToTest}'...\n";
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$userToTest]);
    $user = $stmt->fetch();

    if (!$user) {
        echo "❌ ERRO: Usuário '{$userToTest}' NÃO encontrado na tabela 'users'.\n";
        echo "DICA: Verifique se você inseriu o usuário corretamente via SQL no phpMyAdmin.\n";
    } else {
        echo "✅ Usuário encontrado!\n";
        echo "   Username: " . $user['username'] . "\n";
        echo "   Hash no banco: " . $user['password_hash'] . "\n";
        
        // 3. Testar a senha
        echo "\n3. Testando verificação de senha para '{$passToTest}'...\n";
        if (password_verify($passToTest, $user['password_hash'])) {
            echo "✅ SUCESSO: A senha 'admin123' é VÁLIDA para esta hash!\n";
            echo "DICA: Se aqui deu sucesso, o problema pode ser cache no navegador ou no token antigo.\n";
        } else {
            echo "❌ ERRO: A senha 'admin123' NÃO confere com a hash gravada.\n";
            echo "DICA: Tente rodar o comando SQL de INSERT novamente que te passei por último.\n";
        }
    }

} catch (Exception $e) {
    echo "❌ ERRO FATAL: " . $e->getMessage();
}
