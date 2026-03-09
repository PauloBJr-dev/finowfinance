

# Notificação de Atualização Disponível

## Abordagem

Criar um componente que detecta quando uma nova versão do app foi deployada e exibe um banner persistente pedindo ao usuário para atualizar a página. A detecção será feita via **polling de um arquivo de versão** (`/version.json`) a cada 60 segundos, comparando o hash do build atual com o do servidor.

## Implementação

### 1. Arquivo de versão — `public/version.json`
Contém `{ "version": "<BUILD_HASH>" }`. Será sobrescrito automaticamente a cada build via plugin Vite.

### 2. Plugin Vite — `vite.config.ts`
Adicionar um plugin simples que gera `version.json` no diretório de output com um hash aleatório a cada build. Isso garante que o hash mude em cada deploy.

### 3. Componente `UpdateBanner` — `src/components/shared/UpdateBanner.tsx`
- Ao montar, salva o hash atual (primeira resposta do `/version.json`)
- Polling a cada 60s comparando hash atual vs. servidor
- Se diferir, exibe um banner fixo no topo com botão "Atualizar agora" que faz `window.location.reload()`
- Estilo: banner sutil com `bg-primary text-primary-foreground`, ícone `RefreshCw`, botão de ação
- Banner dismissível temporariamente (volta após 5 min)

### 4. Integração — `src/App.tsx`
Renderizar `<UpdateBanner />` dentro do `App` component, antes do `BrowserRouter`.

### Arquivos
- **Criar:** `src/components/shared/UpdateBanner.tsx`
- **Criar:** `public/version.json`
- **Editar:** `vite.config.ts` (adicionar plugin de versão)
- **Editar:** `src/App.tsx` (adicionar `<UpdateBanner />`)

