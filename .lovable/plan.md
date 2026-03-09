

# Redesign da Bottom Navigation Mobile

## Problemas atuais
- Visual genérico: borda simples `border-t`, sem profundidade
- Dropdown "Mais" usa `DropdownMenu` padrão — aparece como popup pequeno e feio
- Sem indicador visual de item ativo além da cor
- Sem glassmorphism ou identidade Finow

## Solução

### 1. Redesign da barra (`BottomNav.tsx`)
- Trocar `border-t bg-background` por **glassmorphism**: `backdrop-blur-xl` com fundo semi-transparente e borda sutil superior
- Adicionar **pill indicator** no item ativo: um fundo arredondado com `bg-primary/10` e transição suave ao redor do ícone
- Ícones ativos ganham um leve scale (`scale-110`) com transição

### 2. Substituir DropdownMenu por Sheet bottom (`BottomNav.tsx`)
- Trocar o `DropdownMenu` por um **Sheet** (drawer de baixo) ao tocar em "Mais"
- O Sheet terá visual elegante: grid de ícones ou lista espaçada com ícones maiores, labels claras
- Cada item com `rounded-xl`, padding generoso, ícone colorido quando ativo
- Animação `slide-up` nativa do Sheet

### 3. Ajustes visuais finos
- Labels em `text-2xs` (menor) para dar mais espaço ao ícone
- Gap entre ícone e label reduzido
- Sombra superior suave na barra (em vez de border)

### Arquivos modificados
- `src/components/navigation/BottomNav.tsx` — redesign completo
- `src/components/navigation/FloatingActionButton.tsx` — ajustar `bottom` se altura da nav mudar

