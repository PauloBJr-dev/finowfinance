
# Plano: Layout de Três Colunas com Sidebars Fixas

## Visão Geral

Adaptar o layout atual do Finow para um design de três colunas inspirado na referência do V0:

```text
┌────────────┬───────────────────────────────┬─────────────────┐
│            │                               │                 │
│  SIDEBAR   │         CONTEÚDO              │    SIDEBAR      │
│  ESQUERDA  │        SCROLLÁVEL             │    DIREITA      │
│   (fixa)   │                               │     (fixa)      │
│            │                               │                 │
│  - Menu    │  Dashboard, Transações, etc.  │ - Relógio       │
│  - Logo    │                               │ - Data/Local    │
│            │                               │ - Notificações  │
│ ────────── │                               │ - Chat IA       │
│  Perfil +  │                               │   (escondido)   │
│  Opções    │                               │                 │
└────────────┴───────────────────────────────┴─────────────────┘
```

---

## Comportamento Responsivo

### Desktop (>= 1280px)
- Layout completo de três colunas
- Sidebar esquerda: 240px (fixa)
- Sidebar direita: 320px (fixa)
- Centro: Scrollável, ocupa o restante

### Tablet (768px - 1279px)
- Sidebar esquerda: colapsável para 64px (mini)
- Sidebar direita: botão flutuante abre um drawer
- Centro: ocupa toda a largura restante

### Mobile (< 768px)
- Sidebar esquerda: oculta (menu via BottomNav existente)
- Sidebar direita: botão flutuante no canto superior direito abre um Sheet/Drawer
- Centro: ocupa toda a tela

---

## Sidebar Esquerda (Atualizada)

### Estrutura

```text
┌─────────────────────────────────┐
│  ┌─────┐                        │
│  │  F  │  Finow                 │
│  └─────┘                        │
├─────────────────────────────────┤
│                                 │
│  MENU (com fundo destacado)     │
│  ┌─────────────────────────────┐│
│  │ ▣ Dashboard                 ││
│  │ ▢ Transações                ││
│  │ ▢ Contas a pagar            ││
│  │ ▢ Faturas                   ││
│  │ ▢ Metas                     ││
│  │ ▢ Cofrinho                  ││
│  └─────────────────────────────┘│
│                                 │
│                                 │
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │
│  │ ⬤  João Silva        ⋯  │   │
│  │     joao@email.com   🚪  │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### Alterações
- Remover botão "Configurações" da navegação principal
- Adicionar seção de perfil no rodapé com:
  - Avatar do usuário (iniciais se não houver foto)
  - Nome e email
  - Botão de três pontos (⋯) abrindo menu com "Configurações"
  - Ícone de sair (🚪) ao lado
- Aplicar fundo destacado nos botões de navegação usando a cor `sidebar-accent`

---

## Sidebar Direita (Nova)

### Estrutura

```text
┌─────────────────────────────────┐
│                                 │
│  ████████████████████████████   │  <- Background animado
│  ███   14:27   ███████████████  │     (partículas ou
│  █████████████████████████████  │      gradiente suave)
│  █  Segunda-feira, 26 Jan  ███  │
│  █████████████████████████████  │
│  █  📍 São Paulo, BR • UTC-3 █  │
│  ████████████████████████████   │
│                                 │
├─────────────────────────────────┤
│                                 │
│  2  NOTIFICAÇÕES    Limpar tudo │
│  ─────────────────────────────  │
│  ● Fatura vence em 3 dias       │
│    Nubank - R$ 1.240,00         │
│                                 │
│  ● Conta de luz pendente        │
│    Vence amanhã - R$ 180,00     │
│                                 │
│  [Ver menos ▲]                  │
│  [Ver mais ▼] (se houver mais)  │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ▼ Chat com Mentor IA           │
│    (clique para expandir)       │
│                                 │
│  ┌─────────────────────────────┐│
│  │                             ││
│  │  [Área de chat quando       ││
│  │   expandido]                ││
│  │                             ││
│  │  ┌─────────────────────┐    ││
│  │  │ Digite sua dúvida...│    ││
│  │  └─────────────────────┘    ││
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

### Componentes

1. **Área do Relógio/Data/Local**
   - Relógio digital grande (formato 24h)
   - Data completa com dia da semana em PT-BR
   - Localização: cidade e país
   - Fuso horário (UTC-3)
   - Background animado com partículas sutis nas cores do Finow (verde #1F7A63)

2. **Área de Notificações**
   - Título com contador de não lidas
   - Botão "Limpar tudo"
   - Lista de notificações vindas do sistema de reminders existente
   - Botão toggle "Ver mais/Ver menos" (padrão: mostra 3, expandido: mostra todas)
   - Reutiliza lógica do `useReminders` já existente

3. **Chat com Mentor IA**
   - Colapsado por padrão (apenas header clicável)
   - Ao clicar, expande área de chat
   - Campo de input para enviar mensagens
   - Histórico de conversa scrollável
   - Usa Lovable AI (Gemini) com streaming
   - Persona: mentor financeiro calmo, casual, em PT-BR

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/layout/ThreeColumnLayout.tsx` | Novo layout principal de 3 colunas |
| `src/components/layout/RightSidebar.tsx` | Sidebar direita completa |
| `src/components/layout/ClockWidget.tsx` | Widget de relógio, data e localização |
| `src/components/layout/NotificationsPanel.tsx` | Painel de notificações expandível |
| `src/components/layout/MentorChat.tsx` | Chat com IA colapsável |
| `src/components/layout/AnimatedBackground.tsx` | Background com partículas animadas |
| `src/components/layout/UserProfileFooter.tsx` | Rodapé da sidebar com perfil |
| `supabase/functions/mentor-chat/index.ts` | Edge function para chat com Lovable AI |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/MainLayout.tsx` | Substituir pela nova estrutura de 3 colunas |
| `src/components/navigation/Sidebar.tsx` | Adicionar fundo destacado nos botões e trocar rodapé |
| `src/components/navigation/navigation-items.ts` | Remover settings da navegação principal |
| `src/index.css` | Adicionar variáveis CSS para sidebar direita e animações |
| `tailwind.config.ts` | Adicionar keyframes para partículas animadas |

---

## Seção Técnica

### Estrutura CSS do Layout

```css
/* Layout de 3 colunas */
.three-column-layout {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  min-height: 100vh;
}

/* Tablet */
@media (max-width: 1279px) {
  .three-column-layout {
    grid-template-columns: 64px 1fr;
  }
}

/* Mobile */
@media (max-width: 767px) {
  .three-column-layout {
    grid-template-columns: 1fr;
  }
}
```

### Animação de Partículas (Canvas ou CSS)

Opção 1: CSS puro com pseudo-elementos e keyframes
Opção 2: Canvas simples com partículas flutuantes nas cores do Finow

Recomendação: CSS puro para melhor performance, com gradientes animados e pequenos pontos de luz.

```css
@keyframes float-particle {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
  50% { transform: translateY(-10px) scale(1.1); opacity: 0.6; }
}
```

### Edge Function para Chat (mentor-chat)

```typescript
// Persona do mentor
const SYSTEM_PROMPT = `Você é um mentor financeiro calmo e amigável do app Finow.
Seu papel é ajudar o usuário a entender suas finanças de forma simples.
- Fale em português brasileiro, de forma casual
- Seja breve e direto (máximo 3 parágrafos)
- Use emojis com moderação
- NUNCA dê conselhos de investimento específicos
- Se perguntarem sobre investimentos, explique conceitos gerais e recomende um profissional`;

// Usa Lovable AI com streaming
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
    stream: true,
  }),
});
```

### Hook para Localização

```typescript
// Obter cidade via IP (API gratuita)
// ou permitir usuário definir manualmente nas configurações
const useLocation = () => {
  // Fallback: São Paulo, BR
  return { city: "São Paulo", country: "BR", timezone: "UTC-3" };
};
```

### Variáveis CSS Novas

```css
:root {
  /* Sidebar direita */
  --right-sidebar-bg: hsl(160 25% 11%);
  --right-sidebar-border: hsl(160 20% 18%);
  
  /* Animação de partículas */
  --particle-color: hsl(161 59% 30% / 0.3);
}
```

---

## Fluxo de Implementação

1. **Fase 1: Estrutura base**
   - Criar `ThreeColumnLayout.tsx` com grid responsivo
   - Modificar `MainLayout.tsx` para usar nova estrutura
   - Testar responsividade básica

2. **Fase 2: Sidebar Esquerda**
   - Atualizar `Sidebar.tsx` com novo rodapé (perfil + opções)
   - Criar `UserProfileFooter.tsx`
   - Aplicar fundo destacado nos itens de navegação
   - Remover Settings da navegação

3. **Fase 3: Sidebar Direita - Widgets**
   - Criar `ClockWidget.tsx` com relógio em tempo real
   - Criar `AnimatedBackground.tsx` com partículas
   - Criar `NotificationsPanel.tsx` reutilizando `useReminders`

4. **Fase 4: Chat com IA**
   - Criar Edge Function `mentor-chat`
   - Criar `MentorChat.tsx` com streaming
   - Integrar com Lovable AI

5. **Fase 5: Mobile**
   - Implementar botão flutuante para sidebar direita
   - Criar Sheet/Drawer para sidebar direita mobile
   - Testar em diferentes tamanhos de tela

---

## Considerações de UX

### Performance
- Relógio atualiza a cada segundo (requestAnimationFrame)
- Partículas via CSS (não JavaScript)
- Chat lazy-loaded (só carrega quando expande)

### Acessibilidade
- Foco gerenciado ao abrir/fechar chat
- Labels ARIA para widgets
- Contraste adequado (WCAG AA)

### Mobile-First
- Sidebar direita oculta em mobile
- Botão flutuante discreto (não conflita com FAB de Quick Add)
- Posição: canto superior direito (diferente do FAB que fica embaixo)
