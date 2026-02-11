
# Plano: Historico de Fotos Geradas

## Objetivo
Permitir que o usuario consulte todas as fotos que ja gerou, a qualquer momento, sem perder nenhuma imagem.

## Situacao Atual
- A tabela `generation_queue` ja armazena `result_image_url`, `shirt_id`, `created_at` e `status`
- O campo `user_id` existe mas **nao esta sendo preenchido** pelo frontend (sempre `null`)
- As imagens ficam hospedadas no Replicate (URLs temporarias que podem expirar)

## Etapas

### 1. Salvar o user_id nas geracoes
- Alterar `ResultScreen.tsx` para enviar o `vf_user_id` do localStorage no body da chamada `generate-tryon`
- Isso permite associar cada geracao ao usuario

### 2. Copiar imagem para storage permanente
- Na edge function `replicate-webhook` (quando a geracao completa), copiar a imagem do Replicate para o bucket `tryon-temp` do Supabase Storage
- Salvar a URL permanente do Storage no campo `result_image_url` da `generation_queue`
- Isso garante que as imagens nao expirem

### 3. Criar pagina/tela de Historico
- Criar novo componente `HistoryScreen.tsx` no wizard
- Exibir grid de miniaturas das fotos geradas, ordenadas por data (mais recente primeiro)
- Ao tocar numa foto, exibir em tela cheia com opcao de download (com watermark)
- Mostrar data da geracao e qual manto foi usado
- Estado vazio amigavel quando nao houver fotos

### 4. Adicionar navegacao para o Historico
- Adicionar o step "history" no wizard (acessivel a partir da tela de Welcome ou Result)
- Adicionar botao "Meu Historico" na WelcomeScreen
- Na ResultScreen, apos gerar foto, adicionar link "Ver historico"

### 5. Hook useGenerationHistory
- Criar hook que busca as geracoes completadas do usuario na tabela `generation_queue`
- Filtrar por `user_id` e `status = 'completed'`
- Retornar lista paginada

### 6. Ajustar RLS da generation_queue
- A politica "Users can read own queue entries" atual permite leitura com `USING (true)` -- precisa ser restrita para `user_id = current_setting('request.headers')` ou manter como esta (ja que o user_id e texto do FanFrame, nao UUID do Supabase auth)
- Como o app usa autenticacao FanFrame (nao Supabase Auth), a consulta sera feita via service role na edge function ou manter a politica aberta de leitura

---

## Detalhes Tecnicos

### Frontend
- **`ResultScreen.tsx`**: Adicionar `localStorage.getItem('vf_user_id')` ao body da chamada `generate-tryon`
- **`useGenerationHistory.ts`**: Novo hook que faz `supabase.from('generation_queue').select('*').eq('user_id', userId).eq('status', 'completed').order('created_at', { ascending: false })`
- **`HistoryScreen.tsx`**: Grid responsivo com thumbnails, modal de visualizacao, download com watermark
- **`Index.tsx`**: Novo step "history" no wizard, botao de acesso na WelcomeScreen

### Backend (Edge Function)
- **`replicate-webhook/index.ts`**: Apos receber resultado do Replicate, fazer fetch da imagem, upload para bucket `tryon-temp`, e atualizar `result_image_url` com URL do Storage
- **`generate-tryon/index.ts`**: Nenhuma alteracao necessaria (ja aceita userId no body)

### Banco de Dados
- Nenhuma migracao necessaria -- a tabela `generation_queue` ja tem todos os campos necessarios
