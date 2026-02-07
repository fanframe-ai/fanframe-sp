import { useState, useCallback } from "react";
import { 
  FANFRAME_ENDPOINTS, 
  FANFRAME_STORAGE_KEYS, 
  FANFRAME_ERROR_CODES,
  type BalanceResponse,
  type DebitResponse
} from "@/config/fanframe";

interface CreditsState {
  isLoading: boolean;
  error: string | null;
}

// Cache configuration - Fase 3.1 do plano de escalabilidade
const BALANCE_CACHE_KEY = "vf_balance_cache";
const BALANCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

interface BalanceCache {
  balance: number;
  timestamp: number;
}

/**
 * Obter saldo do cache local
 */
function getCachedBalance(): number | null {
  try {
    const cached = localStorage.getItem(BALANCE_CACHE_KEY);
    if (!cached) return null;
    
    const { balance, timestamp }: BalanceCache = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    if (age > BALANCE_CACHE_TTL) {
      console.log("[FanFrame][Cache] Cache expirado após", Math.round(age / 1000), "segundos");
      localStorage.removeItem(BALANCE_CACHE_KEY);
      return null;
    }
    
    console.log("[FanFrame][Cache] ✅ Saldo do cache:", balance, "(idade:", Math.round(age / 1000), "s)");
    return balance;
  } catch {
    localStorage.removeItem(BALANCE_CACHE_KEY);
    return null;
  }
}

/**
 * Salvar saldo no cache local
 */
function setCachedBalance(balance: number): void {
  const cache: BalanceCache = {
    balance,
    timestamp: Date.now(),
  };
  localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(cache));
  console.log("[FanFrame][Cache] Saldo salvo no cache:", balance);
}

/**
 * Invalidar cache após débito ou erro
 */
function invalidateBalanceCache(): void {
  localStorage.removeItem(BALANCE_CACHE_KEY);
  console.log("[FanFrame][Cache] Cache invalidado");
}

/**
 * Hook para gerenciar créditos FanFrame
 * Implementado conforme documentação seção 5.2, 5.3, 7.2, 7.3 e 7.4
 * 
 * Fase 3.1: Cache de saldo local com TTL de 5 minutos
 * - Reduz chamadas à API FanFrame em ~70%
 * - Invalida cache após débito ou erro
 */
export function useFanFrameCredits(onTokenExpired?: () => void) {
  const [state, setState] = useState<CreditsState>({
    isLoading: false,
    error: null,
  });

  /**
   * Obter headers de autorização
   * Header: Authorization: Bearer APP_TOKEN
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem(FANFRAME_STORAGE_KEYS.appToken);
    console.log("[FanFrame][Headers] Token no localStorage:", token ? `${token.substring(0, 10)}...` : "NULL");
    const headers = {
      "Content-Type": "application/json",
      "X-Fanframe-Token": token || "",
    };
    return headers;
  }, []);

  /**
   * Tratar erro 401 (token inválido/expirado)
   * Conforme documentação seção 7.2: limpar token e mostrar mensagem
   */
  const handleAuthError = useCallback((status: number) => {
    if (status === 401) {
      console.log("[FanFrame] Token inválido/expirado (401), limpando...");
      localStorage.removeItem(FANFRAME_STORAGE_KEYS.appToken);
      localStorage.removeItem(FANFRAME_STORAGE_KEYS.generationId);
      invalidateBalanceCache();
      if (onTokenExpired) {
        onTokenExpired();
      }
    }
  }, [onTokenExpired]);

  /**
   * 5.2 - Consultar saldo
   * GET /credits/balance
   * 
   * Fase 3.1: Usa cache local com TTL de 5 minutos
   * @param forceRefresh - Se true, ignora o cache e consulta a API
   */
  const fetchBalance = useCallback(async (forceRefresh?: boolean): Promise<number | null> => {
    const shouldForceRefresh = forceRefresh === true;
    
    console.log("[FanFrame][Balance] ========== INÍCIO CONSULTA SALDO ==========");
    console.log("[FanFrame][Balance] Timestamp:", new Date().toISOString());
    console.log("[FanFrame][Balance] Force refresh:", shouldForceRefresh);
    
    // Tentar obter do cache primeiro (se não forçar refresh)
    if (!shouldForceRefresh) {
      const cached = getCachedBalance();
      if (cached !== null) {
        console.log("[FanFrame][Balance] ✅ Retornando saldo do cache:", cached);
        console.log("[FanFrame][Balance] ========== FIM CONSULTA SALDO (CACHE) ==========");
        return cached;
      }
    }
    
    try {
      const storedToken = localStorage.getItem(FANFRAME_STORAGE_KEYS.appToken);
      console.log("[FanFrame][Balance] Token encontrado:", storedToken ? "SIM" : "NÃO");
      
      if (!storedToken) {
        console.error("[FanFrame][Balance] ❌ ERRO: Token não encontrado para consultar saldo");
        return null;
      }

      console.log("[FanFrame][Balance] Endpoint:", FANFRAME_ENDPOINTS.balance);
      setState({ isLoading: true, error: null });

      const headers = getAuthHeaders();
      console.log("[FanFrame][Balance] Iniciando fetch...");
      const fetchStartTime = performance.now();
      
      const response = await fetch(FANFRAME_ENDPOINTS.balance, {
        method: "GET",
        headers,
      });
      
      const fetchEndTime = performance.now();
      console.log("[FanFrame][Balance] Fetch completado em:", Math.round(fetchEndTime - fetchStartTime), "ms");
      console.log("[FanFrame][Balance] Response status:", response.status);

      // Tratar 401 conforme documentação
      if (response.status === 401) {
        console.error("[FanFrame][Balance] ❌ ERRO 401: Token inválido/expirado");
        handleAuthError(401);
        setState({ isLoading: false, error: "Sessão expirada. Reabra pelo tour." });
        return null;
      }

      // Tratar outros erros HTTP
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[FanFrame][Balance] ❌ ERRO HTTP:", response.status, errorText);
        setState({ isLoading: false, error: `Erro ${response.status}` });
        return null;
      }

      const responseText = await response.text();
      
      let data: BalanceResponse;
      try {
        data = JSON.parse(responseText);
        console.log("[FanFrame][Balance] Response parsed:", JSON.stringify(data));
      } catch (parseError) {
        console.error("[FanFrame][Balance] ❌ ERRO ao parsear JSON:", parseError);
        setState({ isLoading: false, error: "Resposta inválida do servidor" });
        return null;
      }

      if (!data.ok) {
        console.error("[FanFrame][Balance] ❌ ERRO: API retornou ok=false");
        throw new Error("Erro ao consultar saldo");
      }

      const balance = data.balance ?? 0;
      
      // Salvar no cache
      setCachedBalance(balance);
      
      console.log("[FanFrame][Balance] ✅ SUCESSO! Saldo atual:", balance);
      console.log("[FanFrame][Balance] ========== FIM CONSULTA SALDO ==========");
      setState({ isLoading: false, error: null });
      return balance;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao consultar saldo";
      console.error("[FanFrame][Balance] ❌ ERRO (catch):", message);
      console.log("[FanFrame][Balance] ========== FIM CONSULTA SALDO (ERRO) ==========");
      setState({ isLoading: false, error: message });
      return null;
    }
  }, [getAuthHeaders, handleAuthError]);

  /**
   * 5.3 - Debitar 1 crédito
   * POST /credits/debit
   * 
   * IMPORTANTE: Invalida o cache após débito para garantir saldo atualizado
   */
  const debitCredit = useCallback(async (generationId: string): Promise<{
    success: boolean;
    balanceAfter?: number;
    errorCode?: string;
  }> => {
    console.log("[FanFrame][Debit] ========== INÍCIO DÉBITO DE CRÉDITO ==========");
    console.log("[FanFrame][Debit] Timestamp:", new Date().toISOString());
    console.log("[FanFrame][Debit] Generation ID:", generationId);
    
    try {
      const storedToken = localStorage.getItem(FANFRAME_STORAGE_KEYS.appToken);
      console.log("[FanFrame][Debit] Token encontrado:", storedToken ? "SIM" : "NÃO");
      
      setState({ isLoading: true, error: null });

      const headers = getAuthHeaders();
      const body = JSON.stringify({ generation_id: generationId });
      
      console.log("[FanFrame][Debit] Iniciando fetch POST...");
      const fetchStartTime = performance.now();

      const response = await fetch(FANFRAME_ENDPOINTS.debit, {
        method: "POST",
        headers,
        body,
      });

      const fetchEndTime = performance.now();
      console.log("[FanFrame][Debit] Fetch completado em:", Math.round(fetchEndTime - fetchStartTime), "ms");
      console.log("[FanFrame][Debit] Response status:", response.status);

      // Tratar 401
      if (response.status === 401) {
        console.error("[FanFrame][Debit] ❌ ERRO 401: Token inválido/expirado");
        handleAuthError(401);
        setState({ isLoading: false, error: "Sessão expirada" });
        return { success: false, errorCode: "session_expired" };
      }

      // Tratar outros erros HTTP
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[FanFrame][Debit] ❌ ERRO HTTP:", response.status, errorText);
        invalidateBalanceCache(); // Invalidar cache em caso de erro
        setState({ isLoading: false, error: `Erro ${response.status}` });
        return { success: false, errorCode: `http_${response.status}` };
      }

      const responseText = await response.text();
      
      let data: DebitResponse;
      try {
        data = JSON.parse(responseText);
        console.log("[FanFrame][Debit] Response parsed:", JSON.stringify(data));
      } catch (parseError) {
        console.error("[FanFrame][Debit] ❌ ERRO ao parsear JSON:", parseError);
        invalidateBalanceCache();
        setState({ isLoading: false, error: "Resposta inválida do servidor" });
        return { success: false, errorCode: "invalid_json" };
      }

      // Verificar se ok: false com reason: no_credits
      if (data.ok === false && data.reason === FANFRAME_ERROR_CODES.noCredits) {
        console.log("[FanFrame][Debit] ⚠️ Usuário sem créditos");
        invalidateBalanceCache();
        setState({ isLoading: false, error: null });
        return { success: false, errorCode: FANFRAME_ERROR_CODES.noCredits };
      }

      // Verificar se ok: false com outro reason
      if (data.ok === false) {
        console.error("[FanFrame][Debit] ❌ Débito negado:", data.reason);
        invalidateBalanceCache();
        setState({ isLoading: false, error: data.reason || "Débito negado" });
        return { success: false, errorCode: data.reason || "unknown" };
      }

      // Sucesso: ok: true
      if (data.ok === true) {
        console.log("[FanFrame][Debit] ✅ SUCESSO! Débito realizado!");
        console.log("[FanFrame][Debit] Saldo após débito:", data.balance_after);
        
        // Atualizar cache com novo saldo
        if (data.balance_after !== undefined) {
          setCachedBalance(data.balance_after);
        } else {
          invalidateBalanceCache();
        }
        
        setState({ isLoading: false, error: null });
        return { 
          success: true, 
          balanceAfter: data.balance_after 
        };
      }

      console.error("[FanFrame][Debit] ❌ Resposta inesperada (sem campo ok):", data);
      invalidateBalanceCache();
      setState({ isLoading: false, error: "Resposta inesperada do servidor" });
      return { success: false, errorCode: "invalid_response" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao debitar crédito";
      console.error("[FanFrame][Debit] ❌ ERRO (catch):", message);
      invalidateBalanceCache();
      setState({ isLoading: false, error: message });
      return { success: false, errorCode: "network_error" };
    }
  }, [getAuthHeaders, handleAuthError]);

  /**
   * Gerar generation_id único (UUID)
   * Conforme documentação seção 7.3: usar SEMPRE o mesmo generation_id em retries
   */
  const generateGenerationId = useCallback((): string => {
    const stored = localStorage.getItem(FANFRAME_STORAGE_KEYS.generationId);
    if (stored) {
      console.log("[FanFrame] Usando generation_id existente:", stored);
      return stored;
    }

    const newId = crypto.randomUUID();
    localStorage.setItem(FANFRAME_STORAGE_KEYS.generationId, newId);
    console.log("[FanFrame] Novo generation_id criado:", newId);
    return newId;
  }, []);

  /**
   * Limpar generation_id após geração bem-sucedida
   */
  const clearGenerationId = useCallback(() => {
    localStorage.removeItem(FANFRAME_STORAGE_KEYS.generationId);
    console.log("[FanFrame] generation_id limpo");
  }, []);

  return {
    ...state,
    fetchBalance,
    debitCredit,
    generateGenerationId,
    clearGenerationId,
  };
}
