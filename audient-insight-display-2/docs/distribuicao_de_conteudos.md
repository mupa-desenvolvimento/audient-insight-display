# 📺 Mupa Lite — Documento Oficial de Distribuição de Conteúdos

Este documento define **de forma obrigatória e sem ambiguidades** como funciona a distribuição de conteúdos (imagens e vídeos) no **Mupa Lite**, incluindo a lógica de **Canais, Regiões, Lojas, Grupos e Dispositivos**.

O objetivo é garantir:
- Performance máxima em dispositivos
- Previsibilidade do sistema
- Facilidade de uso para clientes
- Base sólida para evolução futura

---

## 🎯 Escopo do Mupa Lite

O **Mupa Lite** é uma versão simplificada do sistema de mídias, focada exclusivamente em:
- Exibição de **imagens**
- Exibição de **vídeos**
- Distribuição organizada por hierarquia

❌ Fora do escopo:
- Editor visual
- IA
- Reconhecimento facial
- Integrações externas

---

## 🧱 Entidades Principais (Hierarquia)

A distribuição de conteúdo segue **exatamente esta hierarquia**, sem exceções:

```
Empresa
 └── Canal
      └── Região
           └── Loja
                └── Grupo de Dispositivos
                     └── Dispositivo
```

---

## 🏢 Empresa

- Representa o cliente principal
- Todas as entidades abaixo pertencem a uma única empresa

---

## 📡 Canal (Entidade Central)

### Conceito
O **Canal** é o **núcleo da distribuição de conteúdo** no Mupa Lite.

Tudo acontece **a partir do Canal**.

### Exemplos de Canais
- Canal Ofertas
- Canal Endomarketing
- Canal Institucional
- Canal Açougue

### Regras
- Conteúdos **são sempre vinculados a um Canal**
- Um Canal pode ser exibido em várias regiões, lojas e dispositivos
- Um dispositivo pode receber **mais de um Canal**

---

## 🌎 Região

### Conceito
Agrupamento lógico definido pelo cliente.

### Exemplos
- Região Sul
- Região Norte
- Região Metropolitana

### Regras
- Região pertence a um Canal
- Região pode conter várias lojas
- Região **não é geográfica obrigatoriamente**, é organizacional

---

## 🏬 Loja

### Conceito
Unidade física do cliente.

### Dados obrigatórios
- Nome
- Cidade
- Estado

### Regras
- Loja pertence a uma Região
- Loja pode conter vários grupos de dispositivos

---

## 🧩 Grupo de Dispositivos

### Conceito
Agrupamento funcional dentro da loja.

### Exemplos
- Grupo Açougue
- Grupo Padaria
- Grupo Frente de Caixa

### Regras
- Grupo pertence a uma Loja
- Grupo pode conter vários dispositivos
- Conteúdos podem ser enviados para o grupo inteiro

---

## 📺 Dispositivo

### Conceito
Tela física (TV, terminal, totem, tablet, etc.)

### Vinculação
- Cada dispositivo recebe um **link único**
- O link é gerado pela plataforma

### Ativação
1. Usuário liga o dispositivo
2. Acessa a tela de ativação
3. Insere o **código de ativação**
4. Dispositivo é vinculado ao link único

---

## 🔗 Lógica de Distribuição de Conteúdo

### Princípio Fundamental
> **Conteúdo nunca é enviado diretamente para o dispositivo.**

O conteúdo é distribuído por **associação hierárquica**.

---

### Fluxo de Associação

```
Conteúdo → Canal → Região → Loja → Grupo → Dispositivo
```

O sistema resolve automaticamente quais dispositivos devem exibir o conteúdo.

---

## 🖼️ Conteúdos (Imagens e Vídeos)

### Tipos permitidos
- Imagens: WebP, AVIF
- Vídeos: MP4 (H.264 ou H.265)

---

### Upload de Conteúdo

Ao fazer upload:
- Arquivo é salvo localmente no servidor
- Metadados são registrados no banco
- Nenhuma cópia é enviada ao dispositivo neste momento

---

## 📦 Playlists por Canal

### Conceito
Cada Canal possui **uma playlist única**.

### Regras
- Playlist é composta por imagens e vídeos
- Ordem é definida no painel admin
- Todos os dispositivos vinculados ao Canal exibem a mesma playlist

---

## ⏱️ Comportamento do Player no Dispositivo

### Inicialização
1. Dispositivo acessa o link único
2. Busca configuração do Canal
3. Baixa a playlist
4. Faz cache local
5. Inicia reprodução

---

### Reprodução

- Loop infinito
- Sem travamentos
- Sem chamadas desnecessárias à API

---

### Cache

- Conteúdos são armazenados localmente
- Player só baixa novamente se houver mudança de versão

---

## 🚀 Performance (Regras Obrigatórias)

### Imagens
- Lazy loading
- Placeholder blur
- Resolução adequada ao device

### Vídeos
- `preload="metadata"`
- `autoplay + muted`
- Poster obrigatório

---

## 🔐 Segurança

- Cada link de dispositivo é único
- Token associado ao dispositivo
- Links podem ser revogados

---

## 🧠 Filosofia do Mupa Lite

> **Simples para o cliente. Previsível para o sistema. Rápido para o dispositivo.**

Nada deve ser implementado que quebre:
- A hierarquia
- A lógica de Canal
- A performance

---

## ✅ Resumo Final

- Canal é o centro de tudo
- Conteúdo nunca vai direto ao dispositivo
- Hierarquia resolve a distribuição
- Player é simples, rápido e offline-first

---

📌 Este documento é a **regra máxima** para qualquer implementação do Mupa Lite.

