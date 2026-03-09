

# Configurar vite-plugin-pwa para suporte offline

## O que muda
O projeto já tem um `manifest.json` manual e meta tags PWA no HTML. Com o `vite-plugin-pwa`, ganhamos:
- **Service Worker automático** com cache de assets (JS, CSS, imagens, fontes)
- **Suporte offline** — o app carrega mesmo sem internet
- **Atualização automática** — detecta novas versões e atualiza em background

## Alterações

### 1. Instalar dependência
- `vite-plugin-pwa`

### 2. `vite.config.ts`
- Importar `VitePWA` do plugin
- Adicionar ao array de plugins com configuração:
  - `registerType: 'autoUpdate'` — atualiza o SW automaticamente
  - `workbox.navigateFallbackDenylist: [/^\/~oauth/]` — protege rotas OAuth
  - `workbox.runtimeCaching` — cache de fontes do Google e API do backend
  - `manifest` inline com os mesmos dados do `manifest.json` atual (nome, ícones, cores, display standalone)
  - `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`

### 3. `index.html`
- Remover `<link rel="manifest">` manual (o plugin injeta automaticamente)

### 4. Remover `public/manifest.json`
- O plugin gera o manifest a partir da config do Vite

### 5. `src/components/shared/UpdateBanner.tsx`
- Verificar se há conflito com a lógica de `version.json` polling existente — manter ambas as estratégias (o SW cuida do cache, o banner cuida da UX de atualização)

## Sem impacto em
- Nenhuma Edge Function, tabela ou componente de UI existente
- O `versionPlugin()` existente continua funcionando normalmente

