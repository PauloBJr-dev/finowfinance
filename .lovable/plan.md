

## Plano Consolidado: Landing Page Finow

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/LandingPage.tsx` | Criar |
| `src/hooks/use-scroll-animation.ts` | Criar |
| `src/App.tsx` | Editar rota `/` condicional |

### Roteamento

Em `App.tsx`, a rota `/` renderiza `<LandingPage />` para visitantes e `<Dashboard />` para usuarios logados.

### Secoes da Landing Page

**1. Navbar fixa** — Logo Finow, links ancora (Recursos, Como funciona, Depoimentos, Precos, FAQ), botoes "Entrar" (ghost) + "Comecar gratis" (primary). Mobile: hamburger. Transparente no topo, opaca no scroll.

**2. Hero** — Headline: "Pare de sobreviver no mes. Comece a dominar seu dinheiro." Sub-headline sobre mentor financeiro IA. CTA duplo + badge "Gratuito - Sem cartao de credito". Mockup estilizado do dashboard com glassmorphism.

**3. Features** — Grid 3 colunas, 6 cards: Controle total, Faturas no radar, Mentor IA, Metas inteligentes, Relatorios PDF, Seguranca maxima.

**4. Como funciona** — 3 steps animados com delay sequencial: Cadastre-se em 30s, Registre transacoes, Veja sua vida financeira com clareza.

**5. Testimonials** — Carousel com 3 depoimentos ficticios (nome, idade, profissao, texto).

**6. Pricing** — 3 cards lado a lado:

- **Gratis (R$ 0)**: Transacoes ilimitadas, 2 contas bancarias, categorias personalizadas, dark mode, sem prazo de validade. CTA: "Comecar gratis"

- **Premium (badge "Mais popular")**: R$ 6,90/mes ou R$ 70/ano. Copy mensal: "Por menos de R$ 0,23/dia, tenha um mentor financeiro 24h". Copy anual: "R$ 5,83/mes no anual — economize 15%". Inclui tudo do gratis + IA mentor, relatorios PDF, metas, contas ilimitadas, suporte prioritario. Renovacao automatica, cancele quando quiser. CTA: "Assinar Premium"

- **Vitalicio (badge "Melhor custo-beneficio")**: R$ 160 pagamento unico. Copy: "Pague uma vez. Use para sempre. Atualizacoes inclusas." Sub-copy: "Equivale a menos de 2 anos de Premium — e voce tem acesso eterno." Tudo do Premium. CTA: "Garantir acesso vitalicio"

Todos redirecionam para `/auth`.

**Bloco de conformidade CDC/PROCON** abaixo dos cards:
- Cancelamento: a qualquer momento, sem multa, acesso ate fim do periodo pago
- Reembolso: garantia de 7 dias, devolucao integral
- Renovacao: mensal/anual renovam automaticamente com aviso previo
- Vitalicio: pagamento unico, inclui atualizacoes futuras, nao inclui produtos independentes lancados separadamente
- Dados: criptografados, nunca compartilhados, exclusao sob demanda
- Contato: suporte@finow.com.br

**7. FAQ** — Accordion com 6-7 perguntas incluindo:
- "Preciso conectar minha conta bancaria?" 
- "Posso cancelar minha assinatura?"
- "O que inclui o plano vitalicio?"
- "Meus dados estao seguros?"
- Outras perguntas gerais sobre o produto

**8. Footer** — Logo, links, "Feito com carinho no Brasil", redes sociais placeholder.

### Animacoes

Hook `use-scroll-animation.ts` com Intersection Observer. Fade-in/slide-up em cada secao ao entrar na viewport. Steps com delay sequencial. Navbar com transicao de transparencia.

### Design

Cores: Primary Green `#1F7A63`, Amber `#E0B84C`, BG Light `#F7F8F6`, BG Dark `#0F1A17`. Glassmorphism no hero card. Mobile-first. Dark mode respeitado via ThemeProvider existente.

