-- ============================================
-- Correção: Permitir que Edge Functions leiam API Keys
-- ============================================
-- O problema: Edge functions usam SUPABASE_SERVICE_ROLE_KEY que bypassa RLS,
-- MAS a função getAvailableApiKeys() usa o client com service key que DEVERIA funcionar.
-- Vamos adicionar uma política específica para leitura via service role para garantir.

-- Política para permitir que service role (edge functions) leia API keys
CREATE POLICY "Service role can read API keys" ON openai_api_keys
  FOR SELECT USING (true);

-- Também garantir que edge functions possam atualizar stats das keys
CREATE POLICY "Service role can update API keys" ON openai_api_keys
  FOR UPDATE USING (true);

-- ============================================
-- Correção: Permitir que Edge Functions insiram/atualizem generations
-- ============================================
CREATE POLICY "Service role can update generations" ON generations
  FOR UPDATE USING (true);

-- ============================================
-- Correção: Permitir que Edge Functions gerenciem health_checks
-- ============================================
CREATE POLICY "Service role can manage health checks" ON health_checks
  FOR ALL USING (true);

-- ============================================
-- Correção: Permitir que Edge Functions criem alertas
-- ============================================
CREATE POLICY "Service role can insert alerts" ON system_alerts
  FOR INSERT WITH CHECK (true);