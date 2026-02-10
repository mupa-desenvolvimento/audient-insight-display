# Diagnóstico da Integração Canva

**Data da Análise:** 10/02/2026
**Status Geral:** ✅ Operacional / Estável

## Resumo da Situação Atual
A integração com o Canva foi completamente refatorada para utilizar **Supabase Edge Functions**, eliminando problemas de segurança e configuração hardcoded. O fluxo de autenticação OAuth 2.0 com PKCE está implementado corretamente, assim como o gerenciamento de tokens e refresh tokens.

Os arquivos legados (`src/integrations/canva.ts`, `src/pages/client/Canva.tsx`) foram removidos e substituídos por uma arquitetura moderna baseada em hooks e serviços.

---

## Análise dos Problemas Anteriores

### 1. Callback URL
- **Status Anterior:** Inválida/Hardcoded (`http://localhost:8080/canva/callback`).
- **Solução Implementada:** O frontend (`src/hooks/useCanvaIntegration.ts`) agora gera a URL de callback dinamicamente usando `window.location.origin`. Isso garante funcionamento tanto em desenvolvimento (localhost) quanto em produção.
- **Status Atual:** ✅ **RESOLVIDO**

### 2. Backend Ausente
- **Status Anterior:** Não havia backend para troca de tokens segura.
- **Solução Implementada:** Criada a Edge Function `canva-auth` (`supabase/functions/canva-auth/index.ts`). Ela gerencia:
  - Geração de URLs de autenticação com PKCE.
  - Troca de código por tokens (Code Exchange).
  - Armazenamento seguro de tokens no banco de dados (`canva_connections`).
  - Refresh automático de tokens expirados.
  - Proxy para chamadas à API do Canva (Listar designs, pastas, exportar).
- **Status Atual:** ✅ **RESOLVIDO**

### 3. Configuração Hardcoded
- **Status Anterior:** Client ID e Secret expostos no frontend.
- **Solução Implementada:** As credenciais agora são variáveis de ambiente (`CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`) acessíveis apenas pela Edge Function.
- **Status Atual:** ✅ **RESOLVIDO**

### 4. Sessão e Token
- **Status Anterior:** Gerenciamento incompleto, sem refresh token.
- **Solução Implementada:** A Edge Function verifica a validade do token antes de cada chamada à API do Canva. Se o token estiver expirado, ele é renovado automaticamente usando o `refresh_token` e o escopo `offline_access`.
- **Status Atual:** ✅ **RESOLVIDO**

### 5. Divergência de Permissões
- **Status Anterior:** Escopos solicitados incorretos.
- **Solução Implementada:** A Edge Function solicita explicitamente os escopos: `design:meta:read`, `design:content:read`, `folder:read`, `asset:read`, `profile:read`, `offline_access`.
- **Status Atual:** ✅ **RESOLVIDO**

### 6. Modo Demonstração
- **Status Anterior:** Falta de clareza sobre ambiente de teste vs produção.
- **Solução Implementada:** A interface (`src/pages/admin/CanvaIntegration.tsx`) trata o estado "não conectado" de forma graciosa, convidando o usuário a conectar. Mensagens de erro são exibidas via `toast`.
- **Status Atual:** ✅ **RESOLVIDO**

---

## Limitações Conhecidas e Próximos Passos

### Criação de Novos Designs
- **Situação:** A funcionalidade de "Criar Design" (botão para iniciar um design em branco) ainda não está totalmente automatizada.
- **Causa:** A API do Canva não suporta iframe para o editor completo. A integração atual foca em *importar* designs existentes.
- **Código:** Em `src/services/canvaEditorService.ts`, o método `startNewDesign` retorna null/placeholder.
- **Recomendação:** Implementar integração com o **Canva Connect SDK** (Button SDK) se a criação direta for um requisito crítico, ou manter o fluxo atual onde o usuário cria no Canva e importa via painel.

### Edição de Designs
- **Situação:** A edição funciona redirecionando o usuário para o site do Canva em uma nova aba (`window.open`).
- **Status:** Funcional, mas a experiência não é "embedded" (o que é uma limitação da plataforma Canva, não um erro de implementação).

## Arquivos Chave da Implementação Atual
- **Frontend Hook:** `src/hooks/useCanvaIntegration.ts` (Lógica de conexão e estado)
- **Frontend Service:** `src/services/canvaEditorService.ts` (Serviço para o editor/criação)
- **Frontend Pages:**
  - `src/pages/admin/CanvaIntegration.tsx` (Painel principal)
  - `src/pages/admin/CanvaCallback.tsx` (Processamento do retorno OAuth)
  - `src/pages/admin/CanvaEditor.tsx` (Interface de "editor" local)
- **Backend (Edge Function):** `supabase/functions/canva-auth/index.ts` (Core da autenticação e proxy API)
