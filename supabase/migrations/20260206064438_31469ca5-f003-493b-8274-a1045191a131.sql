-- Remove tabelas não utilizadas (OpenAI e PagBank foram descontinuados)

-- Primeiro remove as políticas RLS das tabelas
DROP POLICY IF EXISTS "Admins can delete API keys" ON public.openai_api_keys;
DROP POLICY IF EXISTS "Admins can insert API keys" ON public.openai_api_keys;
DROP POLICY IF EXISTS "Admins can update API keys" ON public.openai_api_keys;
DROP POLICY IF EXISTS "Admins can view API keys" ON public.openai_api_keys;
DROP POLICY IF EXISTS "Service role can read API keys" ON public.openai_api_keys;
DROP POLICY IF EXISTS "Service role can update API keys" ON public.openai_api_keys;

DROP POLICY IF EXISTS "Service role can manage pix orders" ON public.pix_orders;

-- Remove as tabelas
DROP TABLE IF EXISTS public.openai_api_keys;
DROP TABLE IF EXISTS public.pix_orders;

-- Comentário para documentação
COMMENT ON TABLE public.generation_queue IS 'Fila de gerações usando Replicate API';
COMMENT ON TABLE public.generations IS 'Histórico de todas as gerações de imagens';
COMMENT ON TABLE public.system_settings IS 'Configurações do sistema (prompt, etc)';