<?php
/**
 * cron/send-notifications.php
 * ============================================================
 * Equivalente à Edge Function "process-scheduled-notifications"
 * do sistema anterior, agora em PHP para HostGator.
 *
 * CONFIGURAÇÃO NO cPANEL:
 *   Cron Jobs → Adicionar cron:
 *   Comando: php /home/SEU_USUARIO/public_html/api/cron/send-notifications.php
 *   Frequência: * * * * * (a cada minuto)
 *
 * DEPENDÊNCIA: minishlink/web-push via Composer
 *   composer require minishlink/web-push
 *
 * VARIÁVEIS — configure abaixo:
 * ============================================================
 */

define('CRON_KEY', 'TROQUE_POR_UMA_CHAVE_SECRETA_DO_CRON'); // Segurança extra (opcional)

// Configurações VAPID (mesmas do .env do frontend)
define('VAPID_PUBLIC_KEY',  'BLol-lQbtqEmeGBRNIKC5zlGpyI6HNg7s_HXonSv-bKqNMwhWA456lq0hBLFCWmrKVoqR4tJkM2Jp0Z0YsPgFtA');
define('VAPID_PRIVATE_KEY', 'COLE_AQUI_SUA_VAPID_PRIVATE_KEY'); // Dashboard anterior → Secrets → VAPID_PRIVATE_KEY
define('VAPID_SUBJECT',     'mailto:contato@infornexa.com.br');

// Inclusões
$apiRoot = dirname(__DIR__);
require_once $apiRoot . '/config/database.php';

// Tenta carregar o autoloader do Composer
$composerAutoload = $apiRoot . '/vendor/autoload.php';
$webPushAvailable = file_exists($composerAutoload);
if ($webPushAvailable) {
  require_once $composerAutoload;
}

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

$db  = getDB();
$now = (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');

// ─── 1. Buscar notificações pendentes ────────────────────────
$stmt = $db->prepare("SELECT * FROM notifications WHERE status = 'pending' AND scheduled_for <= ?");
$stmt->execute([$now]);
$notifications = $stmt->fetchAll();

if (empty($notifications)) {
  echo "[" . date('Y-m-d H:i:s') . "] Nenhuma notificação pendente.\n";
  exit(0);
}

$notificationIds = array_column($notifications, 'id');

// ─── 2. Lock anti-race (marca como 'sent' antes de processar) ─
$placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
$db->prepare("UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE id IN ($placeholders)")
   ->execute($notificationIds);

// ─── 3. Buscar inscrições push dos usuários afetados ─────────
$userIds      = array_unique(array_column($notifications, 'user_id'));
$userPh       = implode(',', array_fill(0, count($userIds), '?'));
$stmtSubs     = $db->prepare("SELECT * FROM push_subscriptions WHERE user_id IN ($userPh)");
$stmtSubs->execute($userIds);
$allSubs      = $stmtSubs->fetchAll();

// ─── 4. Inicializar WebPush (se Composer disponível) ─────────
$webPush = null;
if ($webPushAvailable) {
  $auth = [
    'VAPID' => [
      'subject'    => VAPID_SUBJECT,
      'publicKey'  => VAPID_PUBLIC_KEY,
      'privateKey' => VAPID_PRIVATE_KEY,
    ],
  ];
  $webPush = new WebPush($auth);
}

// ─── 5. Processar cada notificação ───────────────────────────
foreach ($notifications as $notification) {
  $userSubs = array_filter($allSubs, fn($s) => $s['user_id'] === $notification['user_id']);

  $payload = json_encode([
    'title' => $notification['title'],
    'body'  => $notification['description'],
    'data'  => ['url' => '/notifications'],
  ]);

  if (empty($userSubs)) {
    // Sem dispositivo inscrito
    $db->prepare("UPDATE notifications SET status = 'failed', updated_at = NOW() WHERE id = ?")->execute([$notification['id']]);
    echo "[{$notification['id']}] AVISO: nenhum dispositivo push encontrado.\n";
    continue;
  }

  if (!$webPush) {
    // WebPush não disponível — marca como enviado (sem entrega real)
    echo "[{$notification['id']}] WebPush não disponível (instale Composer + minishlink/web-push).\n";
    continue;
  }

  $allSent = true;

  foreach ($userSubs as $sub) {
    $subscription = Subscription::create([
      'endpoint'        => $sub['endpoint'],
      'publicKey'       => $sub['p256dh'],
      'authToken'       => $sub['auth_key'],
      'contentEncoding' => 'aesgcm',
    ]);
    $webPush->queueNotification($subscription, $payload);
  }

  foreach ($webPush->flush() as $report) {
    $endpoint = $report->getRequest()->getUri()->__toString();
    if (!$report->isSuccess()) {
      $statusCode = $report->getResponse() ? $report->getResponse()->getStatusCode() : 0;
      echo "[{$notification['id']}] FALHA push endpoint $endpoint (HTTP $statusCode)\n";
      // Remove inscrição inválida (410 Gone / 404 Not Found)
      if (in_array($statusCode, [404, 410])) {
        $db->prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')->execute([$endpoint]);
        echo "  → Inscrição inválida removida.\n";
      } else {
        $allSent = false;
      }
    }
  }

  // ── Recorrência ──────────────────────────────────────────────
  $recurrence = $notification['recurrence'] ?? 'none';

  if (!$allSent) {
    $db->prepare("UPDATE notifications SET status = 'failed', updated_at = NOW() WHERE id = ?")->execute([$notification['id']]);
    echo "[{$notification['id']}] Falha parcial no envio.\n";
  } elseif ($recurrence !== 'none') {
    $nextDate = calculateNextDate(
      new DateTime($notification['scheduled_for'], new DateTimeZone('UTC')),
      $recurrence,
      $notification['weekdays_config']
    );
    $db->prepare("UPDATE notifications SET status = 'pending', scheduled_for = ?, updated_at = NOW() WHERE id = ?")
       ->execute([$nextDate->format('Y-m-d H:i:s'), $notification['id']]);
    echo "[{$notification['id']}] Enviada. Próximo disparo: {$nextDate->format('Y-m-d H:i:s')}\n";
  } else {
    echo "[{$notification['id']}] Enviada com sucesso.\n";
  }
}

echo "[" . date('Y-m-d H:i:s') . "] Processamento concluído. " . count($notifications) . " notificação(ões).\n";

// ─── Função de recorrência ────────────────────────────────────
function calculateNextDate(DateTime $current, string $recurrence, ?string $weekdaysConfig): DateTime {
  $next = clone $current;
  $now  = new DateTime('now', new DateTimeZone('UTC'));

  switch ($recurrence) {
    case 'daily':
      do { $next->modify('+1 day'); } while ($next <= $now);
      break;

    case 'weekdays':
      $selectedDays = [];
      if ($weekdaysConfig) {
        $decoded = json_decode($weekdaysConfig, true);
        if (is_array($decoded)) $selectedDays = array_map('intval', $decoded);
      }
      if (empty($selectedDays)) {
        do { $next->modify('+1 day'); } while ($next <= $now);
        break;
      }
      do {
        $next->modify('+1 day');
      } while (!in_array((int)$next->format('w'), $selectedDays) || $next <= $now);
      break;

    case 'monthly':
      $originalDay = (int)$current->format('j');
      do {
        $next->modify('+1 month');
        $maxDay = (int)$next->format('t');
        $next->setDate((int)$next->format('Y'), (int)$next->format('n'), min($originalDay, $maxDay));
      } while ($next <= $now);
      break;
  }

  return $next;
}
