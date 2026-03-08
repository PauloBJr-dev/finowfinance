

## Plano: Adicionar tela de criação de conta na página Auth

### Resumo
Transformar a página Auth em um fluxo com duas abas (Login / Criar conta) usando tabs ou toggle de estado. O formulário de registro exige nome, email, telefone, senha forte com indicador visual de requisitos, e confirmação de senha.

### 1. Estado e alternância Login/Registro (Auth.tsx)
- Adicionar estado `mode: "login" | "register"`
- Renderizar link/botão para alternar entre modos: "Ainda não tem conta? Criar conta" / "Já tem conta? Entrar"

### 2. Formulário de registro — campos
- **Nome** (obrigatório, 2-100 chars)
- **Email** (obrigatório, sem validação de formato rigorosa — apenas campo não vazio)
- **Telefone** (opcional, sem validação)
- **Senha** com requisitos visuais em tempo real:
  - Mínimo 8 caracteres
  - Pelo menos 1 letra maiúscula
  - Pelo menos 1 letra minúscula
  - Pelo menos 1 número
  - Pelo menos 1 caractere especial (!@#$%...)
  - Cada requisito exibido como checklist (verde quando atendido, cinza quando não)
- **Confirmar senha** — validação de match antes de submeter

### 3. Submissão do registro
- Chamar `signUp(email, password, name, phone)` do `useAuth()`
- A edge function `register` já existe e valida server-side
- Após sucesso, exibir toast "Conta criada! Verifique seu email para confirmar." e voltar ao modo login

### 4. Componente de força de senha
- Inline no formulário (não componente separado), lista de requisitos com ícones Check/X e cores condicionais
- Botão de submit desabilitado enquanto requisitos não forem todos atendidos ou senhas não coincidirem

### Arquivos modificados
- `src/pages/Auth.tsx` — reescrita com modo login/register, campos adicionais e checklist de senha

