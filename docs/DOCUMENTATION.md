# Documentação do Projeto - Provador Tricolor Virtual

## Visão Geral

O **Provador Tricolor Virtual** é uma aplicação web que permite aos usuários experimentarem virtualmente as camisetas do São Paulo FC. Os usuários fazem upload de uma foto sua, escolhem uma camisa e um cenário de fundo, e a aplicação utiliza IA (Replicate) para gerar uma imagem realista do usuário vestindo a camisa escolhida.

### URL de Produção
- **Preview**: https://id-preview--47c5ea96-0d25-45da-b5ea-f5537a49e6b6.lovable.app
- **Produção**: https://sptryon.lovable.app

### Supabase
- **Project ID**: yxtglwbrdtwmxwrrhroy
- **URL**: https://yxtglwbrdtwmxwrrhroy.supabase.co

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React/Vite)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  src/                                                                       │
│  ├── pages/Index.tsx          → Página principal (wizard de navegação)      │
│  ├── components/wizard/       → Componentes do wizard                       │
│  ├── hooks/                   → Hooks customizados (auth, credits)          │
│  └── config/fanframe.ts       → Configuração do sistema FanFrame            │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐
│   FanFrame API       │  │  Supabase Edge       │  │  Supabase Database       │
│   (WordPress)        │  │  Functions           │  │  (PostgreSQL)            │
├──────────────────────┤  ├──────────────────────┤  ├──────────────────────────┤
│ • Autenticação       │  │ • generate-tryon     │  │ • generations            │
│ • Saldo de créditos  │  │ • replicate-webhook  │  │ • generation_queue       │
│ • Débito de créditos │  │ • health-check       │  │ • daily_stats            │
│ • Compra de créditos │  │ • create-first-admin │  │ • system_alerts          │
└──────────────────────┘  └──────────┬───────────┘  │ • health_checks          │
                                     │              │ • user_roles             │
                                     ▼              └──────────────────────────┘
                          ┌──────────────────────┐
                          │   Replicate API      │
                          │   (Virtual Try-On)   │
                          └──────────────────────┘
```

---

## Stack Tecnológica

### Frontend
- **React 18** - Framework UI
- **Vite** - Build tool
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **React Query** - Cache e estado do servidor
- **React Router DOM** - Navegação
- **Lucide React** - Ícones

### Backend (Supabase)
- **PostgreSQL** - Banco de dados
- **Supabase Edge Functions (Deno)** - Funções serverless
- **Supabase Auth** - Autenticação (admin panel)
- **Row Level Security (RLS)** - Segurança de dados

### APIs Externas
- **Replicate API** - Geração de imagens (Virtual Try-On)
- **FanFrame WordPress API** - Sistema de créditos e autenticação de usuários

---

## Fluxo do Usuário

```
1. ACESSO
   └── Usuário acessa via QR Code no Memorial SPFC com parâmetro ?code=XXX
       ou com token salvo no localStorage

2. AUTENTICAÇÃO (FanFrame)
   └── Exchange do code por app_token
   └── Token salvo em localStorage (vf_app_token)

3. WIZARD (5 etapas)
   ├── Welcome → Tela inicial
   ├── Buy Credits → Comprar/atualizar créditos
   ├── Tutorial → Explicação do processo
   ├── Shirt Selection → Escolher camisa + cenário
   ├── Upload → Fazer upload da foto
   └── Result → Ver imagem gerada

4. GERAÇÃO (Arquitetura Assíncrona)
   ├── Débito de 1 crédito via FanFrame API
   ├── Chamada à Edge Function generate-tryon
   ├── Criação de job na fila (generation_queue)
   ├── Chamada assíncrona ao Replicate
   ├── Webhook recebe resultado
   └── Imagem retornada via Realtime subscription

5. RESULTADO
   ├── Download da imagem (com watermark)
   └── Compartilhamento (WhatsApp, Twitter)
```

---

## Estrutura de Arquivos

### Páginas e Componentes Principais

```
src/
├── pages/
│   ├── Index.tsx              # Página principal - controla o wizard
│   ├── NotFound.tsx           # Página 404
│   └── admin/                 # Painel administrativo
│       ├── Dashboard.tsx
│       ├── Generations.tsx
│       ├── Alerts.tsx
│       └── Login.tsx
│
├── components/
│   ├── wizard/                # Componentes do wizard
│   │   ├── WelcomeScreen.tsx      # Tela inicial
│   │   ├── BuyCreditsScreen.tsx   # Compra de créditos
│   │   ├── TutorialScreen.tsx     # Tutorial
│   │   ├── ShirtSelectionScreen.tsx # Seleção de camisa e fundo
│   │   ├── UploadScreen.tsx       # Upload de foto
│   │   ├── ResultScreen.tsx       # Resultado final
│   │   ├── StepIndicator.tsx      # Indicador de progresso
│   │   └── AccessDeniedScreen.tsx # Acesso negado
│   │
│   ├── admin/                 # Componentes do admin
│   │   ├── AdminLayout.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── GenerationsTable.tsx
│   │   ├── AlertsList.tsx
│   │   └── ProtectedAdminRoute.tsx
│   │
│   └── ui/                    # Componentes shadcn/ui
│       └── ... (button, card, dialog, etc.)
│
├── hooks/
│   ├── useFanFrameAuth.ts     # Autenticação FanFrame
│   ├── useFanFrameCredits.ts  # Gerenciamento de créditos
│   ├── useQueueSubscription.ts # Realtime para fila
│   ├── useAdminAuth.ts        # Autenticação admin
│   └── useAdminStats.ts       # Estatísticas admin
│
├── config/
│   └── fanframe.ts            # Configuração FanFrame + assets
│
└── integrations/
    └── supabase/
        ├── client.ts          # Cliente Supabase (auto-gerado)
        └── types.ts           # Tipos do banco (auto-gerado)
```

---

## Configuração FanFrame (`src/config/fanframe.ts`)

Este arquivo contém TODA a configuração do sistema FanFrame e assets.

### Constantes Importantes

```typescript
// Flag para ativar/desativar integração
export const FANFRAME_ENABLED = true;

// API Base URL - WordPress REST API
export const FANFRAME_API_BASE = "https://tricolorvirtualexperience.net/wp-json/vf-fanframe/v1";

// Endpoints da API
export const FANFRAME_ENDPOINTS = {
  exchange: `${FANFRAME_API_BASE}/handoff/exchange`,  // Trocar code por token
  balance: `${FANFRAME_API_BASE}/credits/balance`,    // Consultar saldo
  debit: `${FANFRAME_API_BASE}/credits/debit`,        // Debitar crédito
};

// Chaves do localStorage
export const FANFRAME_STORAGE_KEYS = {
  appToken: "vf_app_token",           // Token de autenticação
  generationId: "vf_generation_id",   // ID da geração (idempotência)
};
```

### Assets Disponíveis

```typescript
// Camisas
export const SHIRTS = [
  { id: "manto-1", name: "Manto Principal", ... },
  { id: "manto-2", name: "Manto Reserva", ... },
  { id: "manto-3", name: "Manto III", ... },
];

// Cenários de fundo
export const BACKGROUNDS = [
  { id: "morumbi", name: "Estádio Morumbi", assetPath: "/assets/background.webp" },
  { id: "memorial", name: "Memorial SPFC", assetPath: "src/assets/background-memorial.jpg" },
  { id: "idolos", name: "Galeria dos Ídolos", assetPath: "src/assets/background-idolos.jpg" },
  { id: "trofeus", name: "Sala de Troféus", assetPath: "src/assets/background-trofeus.jpg" },
];
```

---

## Sistema de Autenticação FanFrame

### Hook: `useFanFrameAuth`

Gerencia a autenticação do usuário via FanFrame.

#### Fluxo de Autenticação

```
1. Usuário acessa com ?code=XXXX na URL
   ↓
2. Hook detecta o code e chama exchangeCodeForToken()
   ↓
3. POST /handoff/exchange { "code": "XXXX" }
   ↓
4. Resposta: { ok: true, app_token: "...", balance: 5 }
   ↓
5. Token salvo em localStorage["vf_app_token"]
   ↓
6. Code removido da URL
```

#### Estados

```typescript
interface AuthState {
  isAuthenticated: boolean;  // Usuário autenticado?
  isLoading: boolean;        // Carregando?
  error: string | null;      // Erro ocorrido
  balance: number;           // Saldo de créditos
}
```

---

## Sistema de Créditos FanFrame

### Hook: `useFanFrameCredits`

Gerencia o saldo e débito de créditos.

#### Métodos Principais

```typescript
// Consultar saldo
const balance = await fetchBalance();
// GET /credits/balance
// Header: X-Fanframe-Token: <app_token>
// Resposta: { ok: true, balance: 5 }

// Debitar 1 crédito (antes de gerar imagem)
const result = await debitCredit(generationId);
// POST /credits/debit
// Body: { "generation_id": "uuid" }
// Resposta sucesso: { ok: true, balance_after: 4 }
// Resposta sem crédito: { ok: false, reason: "no_credits" }
```

#### Idempotência

O `generation_id` garante que retries não debitem múltiplos créditos:

```typescript
// Gerar ou recuperar ID existente
const generationId = generateGenerationId();
// Salvo em localStorage["vf_generation_id"]

// Após geração bem-sucedida
clearGenerationId();
```

---

## Edge Functions

### `generate-tryon` (Principal)

Edge function responsável por iniciar a geração de imagem usando Replicate.

#### Endpoint
```
POST /functions/v1/generate-tryon
```

#### Payload
```typescript
{
  userImageBase64: string;    // Foto do usuário (base64)
  shirtAssetUrl: string;      // URL completa da camisa
  backgroundAssetUrl: string; // URL completa do cenário
  shirtId: string;            // ID da camisa (para logs)
  userId?: string;            // ID do usuário (opcional)
}
```

#### Resposta
```typescript
// Sucesso
{
  queueId: "uuid",
  message: "Generation queued successfully",
  status: "pending"
}

// Erro
{
  error: "Error message"
}
```

### `replicate-webhook`

Recebe callbacks do Replicate quando a geração é concluída.

#### Endpoint
```
POST /functions/v1/replicate-webhook
```

#### Fluxo
1. Replicate envia resultado da geração
2. Webhook atualiza `generation_queue` com resultado
3. Cliente recebe atualização via Realtime subscription

---

## Banco de Dados (Supabase)

### Tabelas

#### `generations`
Registra todas as gerações de imagem.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID da geração |
| external_user_id | text | ID do usuário FanFrame |
| shirt_id | text | ID da camisa usada |
| status | enum | pending, processing, completed, failed |
| processing_time_ms | integer | Tempo de processamento |
| error_message | text | Mensagem de erro (se houver) |
| created_at | timestamp | Data de criação |
| completed_at | timestamp | Data de conclusão |

#### `generation_queue`
Fila de gerações assíncronas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID da fila |
| user_id | text | ID do usuário |
| shirt_id | text | ID da camisa |
| user_image_url | text | URL da imagem do usuário |
| shirt_asset_url | text | URL da camisa |
| background_asset_url | text | URL do background |
| status | text | pending, processing, completed, failed |
| replicate_prediction_id | text | ID da predição no Replicate |
| result_image_url | text | URL da imagem gerada |
| error_message | text | Mensagem de erro |
| created_at | timestamp | Data de criação |
| started_at | timestamp | Data de início do processamento |
| completed_at | timestamp | Data de conclusão |

#### `system_alerts`
Alertas do sistema para o painel admin.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | ID do alerta |
| type | enum | error_spike, slow_processing, high_usage, api_error |
| severity | enum | info, warning, critical |
| message | text | Mensagem do alerta |
| resolved | boolean | Alerta resolvido? |

#### `user_roles`
Controle de acesso ao painel administrativo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| user_id | uuid | ID do usuário Supabase Auth |
| role | enum | admin, super_admin |

---

## Secrets (Variáveis de Ambiente)

### Secrets Obrigatórios no Supabase

| Nome | Descrição |
|------|-----------|
| `REPLICATE_API_TOKEN` | API Token do Replicate para geração de imagens |
| `ACCESS_PASSWORD` | Senha para criar primeiro admin (opcional) |

### Variáveis do Frontend (.env)

```env
VITE_SUPABASE_PROJECT_ID="yxtglwbrdtwmxwrrhroy"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
VITE_SUPABASE_URL="https://yxtglwbrdtwmxwrrhroy.supabase.co"
```

**IMPORTANTE**: O arquivo `.env` é auto-gerado pelo Lovable Cloud e não deve ser editado manualmente.

---

## Troubleshooting

### Erro: "Sessão expirada" (401)

**Causa**: Token FanFrame expirado ou inválido.

**Solução**: 
- Usuário deve reabrir pelo QR Code do Memorial
- O token é limpo automaticamente e o usuário redirecionado

### Erro: "no_credits"

**Causa**: Usuário sem créditos para gerar imagem.

**Solução**: 
- Usuário deve comprar créditos via FanFrame
- Botões de compra redirecionam para site externo

### Imagem não gerada / Timeout

**Causa**: Processamento demorado do Replicate (normal: 30-60s).

**Solução**:
- O sistema usa webhooks para receber o resultado
- Verificar logs da edge function `replicate-webhook`

### Admin não consegue acessar

**Causa**: Usuário não tem role de admin.

**Solução**:
```sql
-- Criar primeiro admin (necessita ACCESS_PASSWORD configurado)
-- Ou inserir diretamente:
INSERT INTO user_roles (user_id, role)
VALUES ('uuid_do_usuario', 'super_admin');
```

---

## Contatos e Recursos

- **Documentação Supabase**: https://supabase.com/docs
- **Documentação Replicate**: https://replicate.com/docs
- **Documentação FanFrame**: Documento interno fornecido pelo Memorial SPFC

---

## Changelog

### v1.1.0 (Fevereiro 2026)
- Migração para Replicate API
- Arquitetura assíncrona com webhooks
- Sistema de fila (generation_queue)
- Realtime subscriptions para status

### v1.0.0 (Janeiro 2026)
- Lançamento inicial
- Integração FanFrame
- Painel administrativo
- 4 cenários de fundo (Morumbi, Memorial, Ídolos, Troféus)
- 3 camisas (Manto 1, 2 e 3)
