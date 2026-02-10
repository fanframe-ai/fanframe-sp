

## Compactar a barra de steps (StepIndicator)

Reduzir o tamanho da barra de progresso no topo para liberar mais espaco vertical para o conteudo das telas, especialmente a tela de upload com foto.

### Alteracoes em `src/components/wizard/StepIndicator.tsx`

- Reduzir padding vertical do container de `py-3` para `py-1.5`
- Reduzir altura da progress bar de `h-1` para `h-0.5`
- Reduzir margem inferior da progress bar de `mb-2` para `mb-1`
- Reduzir tamanho dos dots de `w-3 h-3` para `w-2 h-2`
- Reduzir tamanho das labels de `text-[10px]` para `text-[8px]`
- Reduzir gap entre dot e label de `gap-1` para `gap-0.5`

### Alteracao em `src/components/wizard/UploadScreen.tsx`

- Reduzir `pt-14` para `pt-10` para acompanhar a barra menor

Nenhum arquivo novo sera criado. Apenas dois arquivos editados.

