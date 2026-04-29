<?php
/**
 * config/jwt.php
 * Geração e validação de JWT (sem biblioteca externa)
 *
 * Altere JWT_SECRET para uma string aleatória longa e segura!
 * Sugestão: gere com: openssl rand -base64 64
 */

define('JWT_SECRET', 'TROQUE_POR_UMA_CHAVE_SECRETA_MUITO_LONGA_E_ALEATORIA_123!@#');
define('JWT_EXPIRY', 60 * 60 * 24 * 30); // 30 dias em segundos

class JWT {
  /**
   * Gera um token JWT
   * @param array $payload Dados a incluir no token (não inclua dados sensíveis)
   */
  public static function encode(array $payload): string {
    $header  = self::base64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = self::base64url(json_encode($payload));
    $sig     = self::base64url(hash_hmac('sha256', "{$header}.{$payload}", JWT_SECRET, true));
    return "{$header}.{$payload}.{$sig}";
  }

  /**
   * Valida e decodifica um JWT
   * @return array|null Payload decodificado, ou null se inválido/expirado
   */
  public static function decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $sig] = $parts;
    $expectedSig = self::base64url(hash_hmac('sha256', "{$header}.{$payload}", JWT_SECRET, true));

    if (!hash_equals($sig, $expectedSig)) return null;

    $data = json_decode(base64_decode(str_pad(strtr($payload, '-_', '+/'), strlen($payload) % 4, '=')), true);
    if (!$data) return null;
    if (isset($data['exp']) && $data['exp'] < time()) return null;

    return $data;
  }

  private static function base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }
}
