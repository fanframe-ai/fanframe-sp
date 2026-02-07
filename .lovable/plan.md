# Plano: Otimização para Picos de Requisição (Replicate API)

## Status: ✅ Fase A Implementada

### O que foi feito:

#### 1. Tabela `generation_queue` criada
- Armazena requisições de geração com status: pending, processing, completed, failed
- Índices otimizados para consultas de fila
- RLS configurado para permitir operações do service_role
- Realtime habilitado para atualizações em tempo real

#### 2. Edge Function `replicate-webhook` criada
- Recebe callbacks do Replicate quando a geração é concluída
- Atualiza a tabela `generation_queue` com o resultado
- Gerencia circuit breaker automaticamente
- Registra métricas no `generations` table

#### 3. Edge Function `generate-tryon` refatorada
- Usa webhook em vez de polling (reduz de ~60 para 1 requisição por geração)
- Retorna imediatamente com `queueId` e `queuePosition`
- Não bloqueia mais a Edge Function por 30-120 segundos
- Suporta até 25 gerações/hora por usuário

#### 4. Frontend com Supabase Realtime
- `useQueueSubscription` hook escuta atualizações da fila
- Mostra posição na fila quando > 5 usuários
- Animação de progresso adaptativa baseada na posição
- Fallback com polling para verificar status

---

## Comparativo: Antes vs Depois

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo na Edge Function | 30-120s | <1s |
| Requisições ao Replicate/geração | ~60 (polling) | 1 (webhook) |
| Timeout possível | Sim | Não |
| Pico de 100 usuários simultâneos | Pode falhar | Fila ordena |
| Feedback ao usuário | Genérico | Posição na fila |

---

## Fluxo Atualizado

```text
[Usuário clica "Gerar"]
        ↓
[generate-tryon] → Cria entry na `generation_queue` → Chama Replicate com webhook
        ↓                                                    
[Retorna imediatamente com queueId]                          
        ↓                                                    
[Frontend abre Realtime subscription]     [Replicate processa imagem ~30-40s]
        ↓                                          ↓
[Usuário vê animação de progresso]     [replicate-webhook recebe callback]
        ↓                                          ↓
[Supabase Realtime] ←←←←←←←←←←←←←←←←←← [Atualiza generation_queue]
        ↓
[Frontend recebe imagem via websocket]
```

---

## Próximas Fases (Opcionais)

### Fase B: Queue Worker com Throttling
- Criar worker separado para processar a fila com rate limiting
- Limitar a 8 requisições/segundo ao Replicate
- Priorizar first-time users

### Fase C: UX Avançada
- Notificação push quando imagem pronta
- Permitir cancelar na fila
- Estimativa de tempo mais precisa

---

## Arquivos Modificados

- `supabase/functions/generate-tryon/index.ts` - Refatorado para webhook
- `supabase/functions/replicate-webhook/index.ts` - NOVO
- `supabase/config.toml` - Adicionada configuração do webhook
- `src/hooks/useQueueSubscription.ts` - NOVO hook para Realtime
- `src/components/wizard/ResultScreen.tsx` - Atualizado para usar Realtime

---

## Deploy Status

⚠️ **Deploy pendente** - O Supabase está com timeout temporário no bundle generation.
As Edge Functions serão deployadas automaticamente na próxima build ou podem ser deployadas manualmente.

Links úteis:
- [Edge Function logs (generate-tryon)](https://supabase.com/dashboard/project/yxtglwbrdtwmxwrrhroy/functions/generate-tryon/logs)
- [Edge Function logs (replicate-webhook)](https://supabase.com/dashboard/project/yxtglwbrdtwmxwrrhroy/functions/replicate-webhook/logs)
