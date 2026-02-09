

## Ajuste dos Botoes de Compartilhamento

### Situacao Atual
- Existem 3 botoes: WhatsApp (so compartilha texto), Twitter/X e Copiar texto
- Nenhum deles envia a imagem gerada de fato

### O que sera feito

**1. Botao WhatsApp - Compartilhar imagem real**
- Usar a Web Share API (`navigator.share`) quando disponivel (funciona em celulares)
  - Converte a imagem gerada para um `File` blob e compartilha via `navigator.share({ files: [...] })`
  - Isso abre o seletor nativo do celular e o usuario pode escolher WhatsApp diretamente
- Como fallback (desktop ou navegadores sem suporte), abrir o WhatsApp Web com texto + link da imagem

**2. Botao Instagram Stories**
- Substituir o botao do Twitter/X por um botao do Instagram
- No celular: usar `navigator.share` com a imagem (o usuario pode escolher Instagram Stories no seletor nativo)
- Como fallback: baixar a imagem automaticamente e mostrar uma instrucao para o usuario abrir o Instagram e postar no Stories manualmente
- Nota: nao existe API web publica para postar diretamente nos Stories, entao a melhor experiencia e via Web Share API ou download + instrucao

**3. Remover botao de copiar texto**
- Simplificar para apenas 2 botoes: Instagram e WhatsApp

### Detalhes Tecnicos

- Criar funcao auxiliar `getImageBlob()` que converte a imagem gerada (URL ou base64) para um `Blob`/`File`, aplicando a watermark antes
- O `handleShare` sera refatorado para os dois casos:
  - `"instagram"`: tenta `navigator.share` com arquivo de imagem; fallback faz download + toast com instrucao
  - `"whatsapp"`: tenta `navigator.share` com arquivo + texto; fallback abre `wa.me` com texto
- Atualizar os icones e cores dos botoes (verde WhatsApp, gradiente Instagram)
- Arquivo modificado: `src/components/wizard/ResultScreen.tsx`

