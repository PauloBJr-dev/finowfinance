

## Correção dos Warnings de Preload

### Problema
O `index.html` faz preload de 2 recursos que não são usados imediatamente:
1. Logo `finow-logo-light@2x.png` — preloaded mas só renderizada após React montar
2. Fonte Inter woff2 — preloaded mas carregada via `media="print"` (lazy), criando conflito

### Solução

**Arquivo: `index.html`** — 2 alterações simples:

1. **Remover o preload da logo** (linha ~35): O React já faz o import via Vite, que otimiza automaticamente. O preload manual é redundante e gera o warning.

2. **Remover o preload do woff2 da fonte** (linha ~39): A técnica `media="print" onload="this.media='all'"` já é suficiente para carregar a fonte. O preload extra entra em conflito porque o CSS ainda não foi aplicado quando o font file chega.

### Resultado
- Zero warnings no console
- Sem impacto visual (os recursos continuam carregando normalmente via React/CSS)
- Melhoria marginal em performance (menos requests desnecessários)

