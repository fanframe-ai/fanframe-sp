

## Otimizacao das Telas para Nao Precisar Rolar

### Problema Atual
As telas do wizard exigem scroll no celular, especialmente a tela de selecao que combina camisas + cenarios em uma unica tela longa.

### O que sera feito

**1. Dividir a tela de selecao em duas telas separadas**
- **Tela "shirt"**: Apenas selecao de camisa (3 opcoes) + botoes Continuar/Voltar
- **Nova tela "background"**: Apenas selecao de cenario (4 opcoes) + botoes Continuar/Voltar
- Criar novo componente `BackgroundSelectionScreen.tsx` extraido do `ShirtSelectionScreen.tsx`
- `ShirtSelectionScreen` passa a ter apenas camisas, sem props de background

**2. Atualizar o fluxo do wizard no Index.tsx**
- Adicionar o step "background" no `STEP_ORDER` entre "shirt" e "upload"
- Atualizar `STEP_LABELS` para incluir o novo passo
- Navegacao: tutorial -> shirt -> background -> upload -> result
- O `StepIndicator` se ajusta automaticamente (agora 7 steps)

**3. Otimizar espacamentos em todas as telas**
- Reduzir paddings verticais (`py-8` -> `py-4`, `pt-20` -> `pt-16`)
- Reduzir margens entre secoes (`mb-6` -> `mb-4`, etc.)
- Usar `justify-center` ou `justify-between` nos containers flex para centralizar o conteudo na viewport sem scroll
- Ajustar `min-h-screen` com `justify-center` onde fizer sentido (WelcomeScreen ja faz isso bem)

**4. Telas afetadas e ajustes especificos**
- **TutorialScreen**: Reduzir tamanho do before/after e espacamentos para caber na tela
- **ShirtSelectionScreen**: Remover secao de backgrounds, ajustar para caber sem scroll
- **BackgroundSelectionScreen** (novo): Layout similar ao de camisas, compacto
- **UploadScreen**: Reduzir espacamentos do header e area de upload
- **BuyCreditsScreen**: Reduzir espacamentos entre pacotes

### Detalhes Tecnicos

**Novo arquivo:** `src/components/wizard/BackgroundSelectionScreen.tsx`
- Recebe props: `selectedBackground`, `onSelectBackground`, `onContinue`, `onBack`
- Lista os 4 backgrounds com cards selecionaveis (mesmo estilo dos cards de camisa)

**Arquivos modificados:**
- `src/components/wizard/ShirtSelectionScreen.tsx` - remover backgrounds, ajustar espacamentos
- `src/pages/Index.tsx` - adicionar step "background", importar novo componente, atualizar navegacao
- `src/components/wizard/TutorialScreen.tsx` - reduzir espacamentos
- `src/components/wizard/UploadScreen.tsx` - reduzir espacamentos
- `src/components/wizard/BuyCreditsScreen.tsx` - reduzir espacamentos

