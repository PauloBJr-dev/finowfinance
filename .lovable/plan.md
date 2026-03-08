

## Plano: Logos Finow + Modo Light Inteligente + Sistema de Tema

### Logos enviadas

| Arquivo | Tamanho | Uso |
|---------|---------|-----|
| `finow-icon-32.png` | 32px | favicon |
| `finow-icon-48.png` | 48px | PWA icon |
| `finow-icon-96.png` | 96px | PWA icon |
| `finow-icon-180.png` | 180px | apple-touch-icon |
| `finow-icon-192.png` | 192px | PWA icon |
| `finow-icon-512.png` | 512px | PWA splash |
| `finow-logo-light@1x.png` | 1x | Sidebar/Auth (light mode) |
| `finow-logo-light@2x.png` | 2x | Sidebar/Auth (light mode, retina) |
| `finow-logo-dark@1x.png` | 1x | Sidebar/Auth (dark mode) |
| `finow-logo-dark@2x.png` | 2x | Sidebar/Auth (dark mode, retina) |

### Onde inserir logos

1. **Sidebar (desktop)** — substituir o ícone "F" + texto "Finow" pela logo horizontal (dark/light conforme tema). Collapsed: mostrar apenas o ícone hexagonal
2. **Tela de login (Auth)** — substituir o ícone "F" pela logo horizontal centralizada
3. **PWA manifest** — atualizar icons com os tamanhos corretos (48, 96, 192, 512)
4. **index.html** — atualizar favicon e apple-touch-icon
5. **Chat** — o header do chat pode usar o ícone hexagonal como avatar do mentor

### Modo Light Inteligente

O dark mode atual já está bem implementado. O light mode precisa de refinamento para não ser "branco puro". Ajustes no `index.css`:

- **Background light**: manter `#F7F8F6` (já bom, tom esverdeado sutil)
- **Cards light**: trocar de `#FFFFFF` puro para `#FAFBF9` (off-white quente)
- **Sidebar light**: usar tom levemente mais escuro `#F0F2EE` para criar hierarquia visual
- **Muted backgrounds**: intensificar levemente para `#ECEFEA`
- **Borders light**: tornar mais sutis com tom esverdeado `#E2E6DE`
- **Sombras light**: adicionar sombras suaves com tom verde (já existe no glass, expandir para cards)

### Tema segue sistema por padrão

O hook `use-theme.tsx` já suporta `system` como default — funciona corretamente. Apenas garantir que o default localStorage key seja `"system"` (já é).

### Seletor de Tema nas Configurações

Adicionar na tab **Perfil** das Configurações um seletor de aparência (Light / Dark / Sistema) usando radio group ou segmented control.

### Arquivos

| Ação | Arquivo |
|------|---------|
| Copiar | 10 imagens → `public/images/` (ícones) e `src/assets/` (logos) |
| Editar | `public/manifest.json` — icons PWA |
| Editar | `index.html` — favicon + apple-touch-icon |
| Editar | `src/index.css` — refinamento light mode |
| Editar | `src/components/navigation/Sidebar.tsx` — logo real com tema |
| Editar | `src/pages/Auth.tsx` — logo real |
| Editar | `src/pages/Chat.tsx` — ícone hexagonal no header |
| Editar | `src/components/settings/ProfileTab.tsx` — seletor de tema |

