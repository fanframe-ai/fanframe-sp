-- Tabela para histórico de pedidos PIX
CREATE TABLE public.pix_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagbank_order_id TEXT NOT NULL,
  reference_id TEXT NOT NULL UNIQUE,
  fanframe_user_id TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  qr_code_text TEXT,
  qr_code_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pix_orders ENABLE ROW LEVEL SECURITY;

-- Política para permitir que Edge Functions (service_role) gerenciem pedidos
CREATE POLICY "Service role can manage pix orders"
ON public.pix_orders
FOR ALL
USING (true)
WITH CHECK (true);

-- Índices para busca
CREATE INDEX idx_pix_orders_reference ON public.pix_orders(reference_id);
CREATE INDEX idx_pix_orders_fanframe_user ON public.pix_orders(fanframe_user_id);
CREATE INDEX idx_pix_orders_status ON public.pix_orders(status);