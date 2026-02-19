# Mupa – Plataforma de Gestão de Mídia em Pontos de Venda

Este repositório contém o frontend da plataforma de mídia da Mupa, responsável por:

- Painel administrativo (admin) para gestão de:
  - Empresas, regiões, lojas, grupos de dispositivos
  - Canais, playlists, galeria de mídia
  - Integrações (Canva, Inky Intelligence, etc.)
- Players (web e Android/Capacitor) para exibição de conteúdo em displays
- Módulos inteligentes como:
  - Terminal inteligente (price check + IA + métricas)
  - Player offline com cache de mídia
  - Monitoramento em tempo real de dispositivos

---

## ✔ Tecnologias principais

Projeto construído com:

- Vite + React + TypeScript
- shadcn-ui (Radix UI + Tailwind)
- Supabase (auth, banco, edge functions)
- Firebase Realtime Database (sincronização de devices)
- Capacitor (build Android / WebView Player)

---

## 🚀 Como rodar localmente

Pré-requisitos:

- Node.js + npm instalados
- Acesso às variáveis de ambiente (arquivo `.env`)

Passos:

```bash
# 1. Clonar o repositório
git clone <URL_DO_REPOSITORIO>

# 2. Entrar na pasta do projeto
cd audient-insight-display-2

# 3. Instalar dependências
npm install

# 4. Rodar em desenvolvimento
npm run dev

# URL padrão (via Vite, configurado para porta 8080)
http://localhost:8080/
```

---

## 🧱 Principais módulos da aplicação

### Admin Web (Painel)

Local principal: `src/pages/admin/*`

- `Dashboard`: visão geral
- `Devices`: gestão de dispositivos e links de player
- `Stores` e `Regions`: cadastro de lojas e regiões
- `Channels` e `Playlists`: gestão de canais e playlists
- `Media`: galeria de mídia
- `Settings`: configurações gerais
- `Tenants` / `Companies`: multi-tenant (revendas / empresas)
- `ProductDisplayConfig` / `ProductAnalytics`: configurações de exibição de produto e métricas
- `CanvaIntegration` / `CanvaEditor`: integração com Canva
- `InkyIntelligence`: módulo de inteligência/assistente

### Player e Terminal Inteligente

- `WebViewPlayer` (`/webview/:deviceCode`, `/play/:deviceCode`, `/android-player`):
  - Player responsivo para WebView (web + app Android)
  - Sincronização com Supabase + Firebase
  - Suporte a cache offline de mídia

- `OfflinePlayer`:
  - Usa o hook `useOfflinePlayer` para:
    - Baixar playlists e mídia
    - Armazenar em IndexedDB / filesystem (Android)
    - Manter estado offline-first por `device_code`
  - Integra com:
    - Métricas de terminal
    - IA de recomendação (placeholder)
    - Contador de pessoas e reconhecimento facial

- `PlayerDevice`:
  - Player minimalista focado em um único dispositivo (`?id=...`)
  - Rotação simples de itens com barra de progresso

### Terminal Inteligente (Smart Terminal)

Componentes principais em `src/components/smart-terminal`:

- Overlays:
  - Métricas, IA, fidelidade, contador de pessoas, configurações
- Hooks de suporte:
  - Detecção facial, métricas, IA, people counter

---

## 🔁 Sincronização e arquitetura de player

### useOfflinePlayer

Hook centralizado em `src/hooks/useOfflinePlayer.ts`:

- Gerencia:
  - `deviceState` (playlists, override_media, flags de bloqueio, etc.)
  - `isLoading`, `isSyncing`, `syncError`
  - `downloadProgress` (total, baixados, mídia atual)
- Fontes de sincronização:
  - RPCs Supabase (estado do device, playlists)
  - Realtime Supabase (updates em `devices`, `playlists`, `playlist_items`)
  - Firebase Realtime Database (comandos remotos via outro módulo)
- Offline:
  - Indexa mídia em IndexedDB / filesystem (quando nativo)
  - Usa `blob_url` local quando disponível

APIs principais expostas pelo hook:

- `getActivePlaylist()`
- `getActiveItems()`
- `getActiveChannel()`
- `syncWithServer()`
- `isPlaylistActiveNow(playlist)`
- `clearAllData()`

### Device API (Edge Function)

Em `supabase/functions/device-api/index.ts`:

- Endpoints REST para:
  - Validar empresa (`validate-company`)
  - Listar lojas (`stores`) e grupos (`groups`)
  - Registrar dispositivo (`register`)
  - Buscar configuração (`config`)
  - Heartbeat (`heartbeat`)
  - Prova de exibição (`proof`)

Implementado como edge function usando Deno (`Deno.serve`) e Supabase JS.

---

## 🧪 Comandos úteis

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Preview da build:

```bash
npm run preview
```

---

## 📦 Build Android (Capacitor)

Fluxo básico:

```bash
# Gerar build web
npm run build

# Sincronizar com projeto Android
npx cap sync

# Abrir Android Studio
npx cap open android
```

O app Android utiliza um WebView que carrega o `WebViewPlayer` com suporte a:

- Cache offline de mídia
- Kiosk mode (fullscreen travado)
- Atualizações em tempo real via Supabase/Firebase

---

## 🗺 Roadmap (alto nível)

Alguns módulos em evolução (não exaustivo):

- Retail Media / Gestão de Slots:
  - Inventário de slots por canal
  - Precificação por horário/dia/segmento
  - Campanhas e anunciantes
  - Relatórios de ocupação e receita
- Módulos de IA:
  - Assistente para configuração e diagnóstico
  - Recomendações de conteúdo com base em métricas do terminal

Este README é um resumo de alto nível da arquitetura atual do frontend.  
Para detalhes de domínio ou fluxos específicos (ex.: terminal inteligente, apresentações, integrações), consulte os módulos correspondentes em `src/`.
