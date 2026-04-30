# InforControl API (PHP + MySQL)

Este diretório contém a API REST para o sistema InforControl, desenvolvida para hospedagem em ambiente PHP (HostGator).

## Estrutura
- `/config`: Conexão com banco de dados e CORS.
- `/routes`: Handlers para cada endpoint.
- `/middleware`: Autenticação JWT.
- `/helpers`: Funções utilitárias.
- `/cron`: Scripts para tarefas agendadas.

## Requisitos
- PHP 7.4 ou superior.
- MySQL.
- Composer (para Web Push).

## Instalação
1. Envie os arquivos para o servidor.
2. Configure o banco de dados em `config/database.php`.
3. Importe o `schema.sql` no seu banco MySQL.
4. Execute `composer install` para dependências de notificação.

## Endpoints
A API segue o padrão `/route/id`. Exemplo: `GET /transactions`, `POST /accounts`.
Para rotas empresariais, use `/business/expenses`, etc.
