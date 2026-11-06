# Runbook Operacional — ReplyFlow

Este documento contém os procedimentos operacionais para manutenção, diagnóstico e recuperação do ReplyFlow na VPS AWS.

---

## 1. Localização e Arquitetura

- **Diretório da aplicação:** `/opt/replyflow`
- **Ambiente:** Docker Compose (`docker compose`)
- **Porta interna:** `3001` (mapeada para `3000` do container Next.js)
- **Proxy Reverso:** Nginx Proxy Manager (portas 80/443 públicas com SSL Let's Encrypt)
- **Domínio:** `https://app.nexusia.work`
- **Supabase Self-Hosted:** `/root/supabase/docker` (Rede Docker: `supabase_default`, Gateway interno: `http://supabase-kong:8000`)

---

## 2. Comandos do Dia a Dia

### Ver status dos containers
```bash
cd /opt/replyflow
docker compose ps
```

### Ver logs em tempo real
```bash
# Logs do app e do worker
docker compose logs -f --tail 50 app worker

# Apenas worker
docker compose logs -f --tail 50 worker
```

### Reiniciar serviços
```bash
cd /opt/replyflow
docker compose restart app worker
```

### Verificar saúde da aplicação
```bash
curl -s https://app.nexusia.work/api/health
# Retorno esperado: {"ok":true,"db_ms":...,"jobs_due":0,"webhook_failed":0}
```

---

## 3. Atualização e Deploy (Update)

Para atualizar a aplicação com novas versões do código:
```bash
/opt/replyflow/deploy/update.sh
```
*O script salva a imagem anterior como `replyflow:prev`, reconstrói a imagem e valida o `/api/health`.*

---

## 4. Rollback Rápido

Se a nova versão apresentar problemas:
```bash
cd /opt/replyflow
docker tag replyflow:prev replyflow:latest
docker compose up -d
```

---

## 5. Reprocessamento de Webhooks com Falha

Para verificar eventos de webhook que falharam:
```bash
docker exec -i supabase-db psql -U postgres -c \
  "select id, kind, status, last_error, created_at from webhook_events where status = 'failed' order by created_at desc limit 10;"
```

Para colocar os eventos com falha de volta na fila de processamento:
```bash
docker exec -i supabase-db psql -U postgres -c \
  "update webhook_events set status = 'pending', attempts = 0, last_error = null where status = 'failed';"
```

---

## 6. Backups e Restauração

### Backup Diário Automático
- Executado automaticamente todo dia às **03:00** via cron job.
- Armazenado em `/home/ec2-user/backups/`.
- Retenção automática de 14 dias.

### Executar backup manual
```bash
/home/ec2-user/scripts/backup-replyflow.sh
```

### Restaurar Backup
```bash
gunzip -c /home/ec2-user/backups/replyflow-db-<DATA>.sql.gz | docker exec -i supabase-db psql -U postgres postgres
```

---

## 7. Configuração da Meta / Instagram (Passos Finais)

Quando criar o App no Meta for Developers:
1. Acesse [developers.facebook.com](https://developers.facebook.com) e crie um app tipo **Business**.
2. Adicione o produto **Instagram** → **API setup with Instagram login**.
3. Obtenha o **Instagram App ID** e **Instagram App Secret**.
4. Edite `/opt/replyflow/.env` e preencha:
   ```env
   INSTAGRAM_APP_ID=seu_app_id_aqui
   INSTAGRAM_APP_SECRET=seu_app_secret_aqui
   ```
5. Reinicie os containers:
   ```bash
   cd /opt/replyflow && docker compose up -d
   ```
6. No painel da Meta:
   - **Redirect URI:** `https://app.nexusia.work/api/instagram/callback`
   - **Webhooks Callback URL:** `https://app.nexusia.work/api/webhooks/instagram`
   - **Verify Token:** Copie o valor de `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` do seu `/opt/replyflow/.env`.
   - **Assinaturas:** `comments`, `messages`, `messaging_postbacks`, `messaging_seen`, `messaging_referral`.
7. Conecte sua conta Instagram no ReplyFlow em `https://app.nexusia.work/app/settings`.

