# Integração WordPress/FanFrame - Documentação Técnica

## Visão Geral

Esta aplicação React se integra com um sistema WordPress através da API REST FanFrame. O WordPress atua como o sistema central de autenticação e gerenciamento de créditos, enquanto esta aplicação React é o "app embarcado" que consome esses serviços.

## Arquitetura da Integração

```
┌─────────────────────────────────────────────────────────────────┐
│                        WordPress (FanFrame)                      │
│  - Gerencia usuários e autenticação                             │
│  - Controla saldo de créditos                                   │
│  - Processa compras via WooCommerce                             │
│  - Expõe API REST em /wp-json/vf-fanframe/v1/                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API REST (HTTPS)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     React App (Este Projeto)                     │
│  - Recebe "code" via URL do WordPress                           │
│  - Troca code por app_token (Exchange)                          │
│  - Consulta saldo de créditos                                   │
│  - Debita créditos antes de gerar imagem                        │
│  - Armazena token no localStorage                               │
│  - Supabase: nosobqpiqhskkcfefbuw                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuração Central

**Arquivo:** `src/config/fanframe.ts`

### Flag de Controle

```typescript
export const FANFRAME_ENABLED = true;
```

Quando `false`:
- App funciona sem autenticação
- Créditos não são verificados
- Tela de compra de créditos é pulada

### Base URL da API

```typescript
export const FANFRAME_API_BASE = "https://tricolorvirtualexperience.net/wp-json/vf-fanframe/v1";
```

### Endpoints Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/handoff/exchange` | POST | Troca `code` por `app_token` |
| `/credits/balance` | GET | Consulta saldo atual |
| `/credits/debit` | POST | Debita 1 crédito |

```typescript
export const FANFRAME_ENDPOINTS = {
  exchange: `${FANFRAME_API_BASE}/handoff/exchange`,
  balance: `${FANFRAME_API_BASE}/credits/balance`,
  debit: `${FANFRAME_API_BASE}/credits/debit`,
} as const;
```

### URLs de Compra de Créditos (WooCommerce)

Os links de compra direcionam para o checkout do WooCommerce com `add-to-cart`:

```typescript
// Definidos diretamente no BuyCreditsScreen como checkout URLs do WooCommerce
const packages = [
  { credits: 1, price: "R$ 5,90",  checkoutUrl: "https://tricolorvirtualexperience.net/checkout/?add-to-cart=4516" },
  { credits: 3, price: "R$ 16,90", checkoutUrl: "https://tricolorvirtualexperience.net/checkout/?add-to-cart=4517" }, // Mais Popular
  { credits: 7, price: "R$ 34,90", checkoutUrl: "https://tricolorvirtualexperience.net/checkout/?add-to-cart=4518" }, // Melhor Valor
];
```

> **Nota:** As URLs de compra antigas (`FANFRAME_PURCHASE_URLS`) no config ainda existem como fallback, mas o `BuyCreditsScreen` usa diretamente as URLs do WooCommerce acima.

### Chaves do LocalStorage

```typescript
export const FANFRAME_STORAGE_KEYS = {
  appToken: "vf_app_token",        // Token de autenticação
  userId: "vf_user_id",            // ID do usuário no WordPress
  generationId: "vf_generation_id", // UUID para idempotência
} as const;
```

---

## Fluxo de Autenticação

**Arquivo:** `src/hooks/useFanFrameAuth.ts`

### Diagrama de Fluxo

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE AUTENTICAÇÃO                         │
└──────────────────────────────────────────────────────────────────┘

1. Usuário acessa app via WordPress
   │
   ▼
2. WordPress redireciona com ?code=XXXX na URL
   │
   ▼
3. App detecta "code" na URL
   │
   ▼
4. POST /handoff/exchange { "code": "XXXX" }
   │
   ├─── Sucesso: { ok: true, app_token: "...", user_id: 100, balance: 5 }
   │    │
   │    ▼
   │    Salva token em localStorage["vf_app_token"]
   │    Salva user_id em localStorage["vf_user_id"]
   │    Remove "code" da URL
   │    Usuário autenticado ✓
   │
   └─── Erro: { ok: false, error: "código inválido" }
        │
        ▼
        Mostra tela de acesso negado

───────────────────────────────────────────────────────────────────

ACESSO SUBSEQUENTE (sem code na URL):

1. App verifica localStorage["vf_app_token"]
   │
   ├─── Token existe: usuário autenticado ✓
   │
   └─── Token não existe: mostra tela de acesso negado
```

### Retorno do Hook

```typescript
export function useFanFrameAuth() {
  // Retorna:
  return {
    isAuthenticated,  // boolean - usuário está logado?
    isLoading,        // boolean - processando autenticação?
    error,            // string | null - mensagem de erro
    balance,          // number - saldo atual
    logout,           // () => void - limpa token, userId e generationId
    updateBalance,    // (n: number) => void - atualiza saldo na UI
    getStoredToken,   // () => string | null - retorna token
  };
}
```

---

## Sistema de Créditos

**Arquivo:** `src/hooks/useFanFrameCredits.ts`

### Headers de Autenticação

**IMPORTANTE:** Usa header customizado, NÃO usa Bearer token padrão:

```typescript
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("vf_app_token");
  return {
    "Content-Type": "application/json",
    "X-Fanframe-Token": token || "",  // Header customizado!
  };
};
```

### Consultar Saldo

```typescript
// GET /credits/balance
// Header: X-Fanframe-Token: <app_token>
// cache: "no-store" (sempre consulta direto, sem cache)

// Resposta esperada:
// { ok: true, balance: 7 }

// Se 401: token expirado, fazer logout via onTokenExpired callback
```

### Debitar Crédito

```typescript
// POST /credits/debit
// Header: X-Fanframe-Token: <app_token>
// Body: { "generation_id": "UUID" }
// cache: "no-store"

// Respostas possíveis:
// Sucesso: { ok: true, balance_after: 6 }
// Sem créditos: { ok: false, reason: "no_credits" }
// Erro HTTP: retorna { success: false, errorCode: "http_XXX" }
// Erro rede: retorna { success: false, errorCode: "network_error" }
```

### Retorno do Hook

```typescript
export function useFanFrameCredits(onTokenExpired?: () => void) {
  return {
    isLoading,          // boolean
    error,              // string | null
    fetchBalance,       // () => Promise<number | null>
    debitCredit,        // (generationId: string) => Promise<{ success, balanceAfter?, errorCode? }>
    generateGenerationId, // () => string - gera ou recupera UUID do localStorage
    clearGenerationId,    // () => void - limpa após geração bem-sucedida
  };
}
```

### Idempotência com generation_id

O `generation_id` garante que mesmo com retries, o crédito só é debitado uma vez:

```typescript
const generateGenerationId = (): string => {
  const stored = localStorage.getItem("vf_generation_id");
  if (stored) return stored;
  const newId = crypto.randomUUID();
  localStorage.setItem("vf_generation_id", newId);
  return newId;
};

const clearGenerationId = () => {
  localStorage.removeItem("vf_generation_id");
};
```

---

## Tratamento de Token Expirado

Quando a API retorna HTTP 401:

```typescript
const handleAuthError = (status: number) => {
  if (status === 401) {
    localStorage.removeItem("vf_app_token");
    localStorage.removeItem("vf_generation_id");
    onTokenExpired?.(); // callback passado pelo Index.tsx (= logout)
  }
};
```

O usuário verá a tela `AccessDeniedScreen` com instrução para reabrir via WordPress/tour virtual.

---

## Fluxo Completo do Usuário

```
┌──────────────────────────────────────────────────────────────────┐
│                    JORNADA DO USUÁRIO                            │
└──────────────────────────────────────────────────────────────────┘

WordPress                          React App
    │                                  │
    │  Usuário clica "Abrir App"       │
    │ ─────────────────────────────►   │
    │  Redireciona com ?code=XXXX      │
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Exchange  │
    │  ◄─────────────────────────┤ code→token│
    │  Valida code               └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Welcome   │
    │                            │ Screen    │
    │                            └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Buy       │
    │                            │ Credits   │◄──── Se saldo = 0
    │                            └─────┬─────┘
    │                                  │
    │  ◄───── Usuário compra ──────────┤
    │  (redireciona para WooCommerce)  │
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Tutorial  │
    │                            └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Seleciona │
    │                            │ Camisa    │
    │                            └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Seleciona │
    │                            │ Cenário   │
    │                            └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Upload    │
    │                            │ Foto      │
    │                            └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │  ◄─────── Debit ─────────  │ Gerar     │
    │  Debita 1 crédito          │ Resultado │
    │                            └─────┬─────┘
    │                                  │
    │                            ┌─────┴─────┐
    │                            │ Exibe     │
    │                            │ Resultado │
    │                            └───────────┘
```

---

## Tipos TypeScript

### Respostas da API

```typescript
// POST /handoff/exchange
interface ExchangeResponse {
  ok: boolean;
  app_token?: string;
  user_id?: number;
  expires_at?: string;
  balance?: number;
  error?: string;
}

// GET /credits/balance
interface BalanceResponse {
  ok: boolean;
  balance?: number;
}

// POST /credits/debit
interface DebitResponse {
  ok: boolean;
  balance_after?: number;
  reason?: string;  // "no_credits" quando sem saldo
}
```

---

## Tela de Acesso Negado

**Arquivo:** `src/components/wizard/AccessDeniedScreen.tsx`

Exibida quando:
- Não há `code` na URL E
- Não há `vf_app_token` no localStorage

Instruções para o usuário retornar ao tour virtual do Memorial. Link para o site oficial do São Paulo FC.

---

## Tela de Compra de Créditos

**Arquivo:** `src/components/wizard/BuyCreditsScreen.tsx`

Funcionalidades:
- Mostra saldo atual
- 3 pacotes de créditos com links diretos para checkout WooCommerce
- Botão "Atualizar Saldo" para refresh após compra
- Botão "Continuar" habilitado apenas quando `balance > 0`

```typescript
interface BuyCreditsScreenProps {
  balance: number;
  onRefreshBalance: () => Promise<void>;
  isRefreshing?: boolean;
  onContinue?: () => void;
  fetchBalance: () => Promise<number | null>;
}
```

### Detecção de Retorno de Pagamento

O `Index.tsx` detecta o parâmetro `?payment=success` na URL para mostrar um toast e atualizar o saldo automaticamente após retorno do checkout:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("payment") === "success") {
    window.history.replaceState({}, "", window.location.pathname);
    toast({ title: "Pagamento em processamento! 🎉" });
    setTimeout(async () => {
      const newBalance = await fetchBalance();
      if (newBalance !== null) updateBalance(newBalance);
    }, 2000);
  }
}, []);
```

---

## Integração no Index.tsx

**Arquivo:** `src/pages/Index.tsx`

```typescript
const Index = () => {
  const { isAuthenticated, isLoading: authLoading, balance, updateBalance, logout, getStoredToken } = useFanFrameAuth();
  const { fetchBalance, isLoading: creditsLoading, clearGenerationId } = useFanFrameCredits(logout);

  // Fetch inicial do saldo após autenticação
  useEffect(() => {
    if (isAuthenticated && getStoredToken()) {
      const newBalance = await fetchBalance();
      if (newBalance !== null) updateBalance(newBalance);
    }
  }, [isAuthenticated]);

  // Loading state
  if (FANFRAME_ENABLED && authLoading) return <Loader2 />;

  // Not authenticated
  if (FANFRAME_ENABLED && !isAuthenticated) return <AccessDeniedScreen />;

  // ... wizard com CreditsDisplay fixo no canto superior direito
};
```

---

## Ordem das Telas (Wizard)

Com `FANFRAME_ENABLED = true`:

```typescript
type WizardStep = "welcome" | "buy-credits" | "tutorial" | "shirt" | "background" | "upload" | "result" | "history";

const STEP_ORDER = ["welcome", "buy-credits", "tutorial", "shirt", "background", "upload", "result"];
const STEP_LABELS = ["Início", "Créditos", "Tutorial", "Manto", "Cenário", "Foto", "Resultado"];
```

1. **Welcome** → "Experimentar Agora" (vai para buy-credits se saldo=0, senão tutorial)
2. **Buy Credits** → Mostra saldo, opções de compra via WooCommerce
3. **Tutorial** → Como funciona
4. **Shirt Selection** → Escolhe camisa (manto)
5. **Background Selection** → Escolhe cenário (Mural, Memorial, Galeria dos Ídolos, Sala de Troféus)
6. **Upload** → Envia foto (verifica saldo antes de prosseguir)
7. **Result** → Gera e mostra resultado
8. **History** → Acessível da Welcome, mostra gerações anteriores

### Verificação de Saldo em Múltiplos Pontos

O saldo é verificado antes de prosseguir em:
- Welcome → redireciona para buy-credits se saldo = 0
- Background → redireciona para buy-credits se saldo = 0
- Upload → redireciona para buy-credits se saldo = 0

---

## Assets e Backgrounds

**Arquivo:** `src/config/fanframe.ts`

Assets são servidos do Supabase Storage (`nosobqpiqhskkcfefbuw`):

```typescript
const STORAGE_BASE = "https://nosobqpiqhskkcfefbuw.supabase.co/storage/v1/object/public/tryon-assets";

export const BACKGROUNDS: Background[] = [
  { id: "mural",    name: "Mural dos Ídolos",    imageUrl: `${STORAGE_BASE}/backgrounds/mural.png` },
  { id: "memorial", name: "Memorial SPFC",        imageUrl: "/assets/background-memorial.jpg" },
  { id: "idolos",   name: "Galeria dos Ídolos",   imageUrl: "/assets/background-idolos.jpg" },
  { id: "trofeus",  name: "Sala de Troféus",      imageUrl: "/assets/background-trofeus.jpg" },
];
```

---

## Debug e Logs

Todos os logs usam prefixo `[FanFrame]` com sub-categorias:

```javascript
// Autenticação
console.log("[FanFrame][Init] ...");
console.log("[FanFrame][Exchange] ...");

// Créditos
console.log("[FanFrame][Balance] ...");
console.log("[FanFrame][Debit] ...");

// Compra
console.log("[BuyCredits] ...");
```

---

## Checklist para Migração/Debug

### Verificar Configuração
- [ ] `FANFRAME_ENABLED` está `true`?
- [ ] `FANFRAME_API_BASE` aponta para URL correta?
- [ ] WordPress está respondendo nos endpoints?
- [ ] Supabase project ID: `nosobqpiqhskkcfefbuw`

### Verificar Autenticação
- [ ] URL contém `?code=` quando vindo do WordPress?
- [ ] Exchange retorna `ok: true` e `app_token`?
- [ ] Token está sendo salvo em `localStorage["vf_app_token"]`?
- [ ] User ID está sendo salvo em `localStorage["vf_user_id"]`?

### Verificar Créditos
- [ ] Header `X-Fanframe-Token` está sendo enviado?
- [ ] Balance endpoint retorna `ok: true`?
- [ ] Debit usa `generation_id` único?
- [ ] `cache: "no-store"` está sendo usado nas requisições?

### Verificar CORS
- [ ] WordPress permite origem do app React?
- [ ] Headers `Access-Control-Allow-*` configurados?

### Verificar Compra
- [ ] URLs do WooCommerce (`add-to-cart`) estão corretas?
- [ ] Product IDs: 4516 (1 crédito), 4517 (3 créditos), 4518 (7 créditos)
- [ ] Retorno de pagamento com `?payment=success` funciona?

---

## Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 401 no balance/debit | Token expirado ou inválido | Usuário deve reabrir via WordPress |
| CORS error | WordPress não permite origem | Configurar CORS no WordPress |
| `no_credits` no debit | Saldo zerado | Redirecionar para compra |
| Exchange falha | Code já usado ou expirado | Usuário deve reiniciar fluxo |
| `network_error` no debit | Falha de conexão | Retry automático com mesmo generation_id |

---

## Contato e Suporte

Para questões sobre a API WordPress/FanFrame, consultar a documentação do plugin FanFrame ou o administrador do WordPress em `tricolorvirtualexperience.net`.
