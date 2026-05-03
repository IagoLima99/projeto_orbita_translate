# Orbita AI — Documentação Técnica do Projeto

> **Versão:** 4.0  
> **Última atualização:** 2026-05-02  
> **Stack:** React 19 + Vite 6 + Tailwind CSS v4 + Framer Motion (motion/react) + TypeScript + Google Gemini SDK

---

## 📋 Log de Sessões de Desenvolvimento

> **Uso:** Cada sessão registra o que foi feito, o que está funcionando e qual é o próximo passo. Serve como handoff para qualquer LLM ou desenvolvedor.

---

### 🗓️ Sessão 2026-05-02 (Atual) — Inteligência Artificial, Espacialidade e Posicionamento (Fase 3)

**Objetivo da sessão:** Substituir o motor de tradução legado (MyMemory) por uma IA real (Google Gemini) capaz de entender intenções e contexto, aprimorar a imersão de navegação criando scroll espacial e consolidar o posicionamento de marketing do produto com uma Hero Headline.

#### O que foi feito (em ordem cronológica):

1. **Scroll-Driven Spatial Navigation (`App.tsx` & `CosmicBackground.tsx`)**
   - Transição de layout single-page travado para um canvas com `300vh` de rolagem real nativa.
   - O scroll nativo atua como **Driver Espacial**: O eixo Y do scroll alimenta o hook de animação para transladar levemente as estrelas e nebulosas no eixo Y e Z, criando uma sensação profunda de "viagem cósmica" à medida que o usuário desce a página.
   - As camadas de UI (Orb, TopBar, Headline) permanecem `fixed` e não perdem o centro de foco.

2. **Spatial Impulse e Refinamento de Interação (`Orb.tsx`)**
   - Implementada emissão de eventos Customizados (`orbita:spatial-impulse`) quando o mouse entra na Órbita. Isso empurra todo o background momentaneamente para criar a ilusão de que o universo "reage à presença do usuário".
   - **Correção Crítica:** O bloom atmosférico (`orb-bloom`) que pulsa de tamanho foi tornado `pointer-events-none`. Isso curou um bug de "flicker/stutter" severo que ocorria quando as bordas animadas do bloom passavam rapidamente sobre o mouse, repetindo eventos `onMouseEnter`.
   - Responsividade no Orb (`w-32` para mobile, `w-44` para desktop).

3. **Integração do Núcleo Neural (Persona ORBITA via Gemini AI)**
   - O SDK `@google/generative-ai` foi instalado e configurado (`translatorService.ts`).
   - O serviço agora usa o **Gemini 2.5 Flash** operando estritamente em `application/json` via `responseSchema`.
   - **Roteamento de Intenção:** O motor agora classifica a intenção do usuário (`ask_translation`, `direct_translation`, `clarify`). Caso o áudio ou texto seja incerto (ex: "hmmm"), a ORBITA fará uma pergunta curta em vez de traduzir palavras aleatórias ("alucinação").
   - **Robustez de Parse:** Adicionada limpeza cirúrgica de blocos de Markdown (` ```json `) para prevenir erros severos de `JSON.parse`.

4. **Hero Headline SaaS Premium (`App.tsx`)**
   - Inserida uma declaração de produto ("Seu tradutor inteligente em tempo real") centralizada acima da Orb.
   - Design fluido em uma linha (`whitespace-nowrap`, text scale `[4.5vw] md:text-3xl`), peso Medium/Semibold, gradient-text fosco com `bg-clip-text` e tracking ajustado.
   - Corrigido o bug visual do Tailwind que cortava descendentes de fontes ("g") graças ao uso da combinação `pb-2` com `leading-tight`.

---

## 📌 Visão do Produto

**Orbita AI** é um tradutor conversacional premium, minimalista e rápido para monetizar.

- **Entrada:** Voz (Web Speech API) + texto como fallback
- **Motor Cognitivo:** Google Gemini AI (Roteamento de intenção, precisão contextual)
- **Saída:** Tradução semântica inteligente PT ↔ EN ↔ ES ↔ FR ↔ DE
- **Diferencial:** UX de alto nível com um ORB central inteligente, respostas de IA, fundo procedural de imersão espacial.
- **Monetização:** Freemium → backend próprio seguro → planos premium

---

## 🗂️ Estrutura do Projeto

```
src/
├── App.tsx                    # Orquestrador de estado e layout fixed + 300vh scroll
├── main.tsx                   # Entry point
├── index.css                  # Design tokens (Tailwind v4 @theme)
├── types/
│   └── index.ts               # Interfaces do Core Neural (intent, sourceLanguage, etc)
├── hooks/
│   ├── useSpeech.ts           # Motor de reconhecimento de voz (Web Speech API)
│   ├── useTranslation.ts      # Integração com a IA Gemini
│   ├── useTTS.ts              # Text-to-Speech (SpeechSynthesis API)
│   ├── useHistory.ts          # Histórico de traduções (localStorage, max 20)
│   └── useLangSettings.ts     # Preferências de idioma (localStorage)
├── lib/
│   └── translatorService.ts   # Core neural (Google Gemini SDK + JSON enforcement)
└── components/
    ├── CosmicBackground.tsx   # Fundo nebulosa com parallax 3D e espacialidade de scroll
    ├── Orb.tsx                # Núcleo interativo, gatilhos de pulso espacial e estados da IA
    ├── ResultSheet.tsx        # Bottom sheet com tradução, áudio e copy
    ├── TextInputOverlay.tsx   # Modal de entrada de texto com suporte a interrupções
    ├── TopBar.tsx             # Header com logo + histórico + settings
    ├── SettingsModal.tsx      # Seletor de idiomas
    └── HistoryPanel.tsx       # Painel de histórico
```

---

## 🎯 Estados da Máquina de Estados (OrbState)

| Estado | Descrição | Comportamento da IA |
|---|---|---|
| `idle` | Repouso | Pulsação natural, aguardando clique |
| `listening` | Microfone ativo | Detectando voz, transcrevendo em tempo real |
| `processing` | Processando | Call à API do Gemini em andamento. Halo acelerado. |
| `result` | Resultado visível | Tradução extraída ou Pedido de Clarificação exibido |

---

## 🔧 Decisões Arquiteturais Atuais

### Inteligência e Confiabilidade (O Prompt ORBITA)
Diferente de apps padrão de tradução, nosso motor usa LLMs para deduzir contexto. O modelo obedece regras estritas: ele nunca inverte a direção de tradução se configurada na força bruta, e sempre usa a flag `clarify` caso a entrada seja ruidosa, pedindo confirmação ao usuário para evitar traduções errôneas. O SDK exige o schema exato em JSON nativo para não haver falhas de mapeamento na UI.

### Espacialidade Unificada
Ao combinar `mousemove` e o `scrollY` da página, fundimos dois eixos num sistema contínuo. Usamos `requestAnimationFrame` em um hook único de animação global para não entupir a thread do React e preservar cravados 60 FPS, mesmo calculando opacidade, zoom in, push-back e mix-blend-mode dinâmicos em componentes renderizados fora do DOM principal.

---

## ✅ Funcionalidades Implementadas

| Feature | Status | Ferramenta |
|---|---|---|
| Reconhecimento de voz em Browser | ✅ | Web Speech API |
| Classificador Inteligente e Tradução | ✅ | Google Gemini (SDK) |
| Formato Rígido JSON de Output | ✅ | Gemini JSON Schema |
| Múltiplos Idiomas de Destino | ✅ | Configuração na IA |
| Pronúncia (Text-to-Speech) | ✅ | SpeechSynthesis API |
| Fundo interativo Scroll-driven | ✅ | Framer Motion + rAF |
| PWA (Acesso Nativo/Instalável) | ✅ | Manifest.json |
| Micro-interações táteis/hover | ✅ | CSS 3D + Spring Physics |

---

## 🔵 Próximos Passos (Backlog Priorizado)

### Fase 4 — Infraestrutura de Servidor (Prioridade Máxima)

#### 4.1 Proxificação da Chave de API ⭐ HIGH
- **Problema Atual:** A chave `GEMINI_API_KEY` está sendo carregada via Vite no client-side (`translatorService.ts`). Em produção, isso expõe a cota e o cofre de pagamentos a acessos indevidos no source do navegador.
- **Solução Exigida:** Mover a chamada do `@google/generative-ai` para um Backend em Vercel Edge Functions ou Cloudflare Workers.
- O Frontend só fará um POST cego com o prompt e variáveis, e a nuvem responderá com o JSON.

#### 4.2 Lógica de Banco de Dados
- Substituir o Histórico atual (localStorage) por uma integração leve (ex: Supabase) para manter histórico logado se aplicarmos Auth.

#### 4.3 Limites Computacionais (Rate Limiting)
- Impedir spam de cliques ou robôs de executarem traduções contínuas, garantindo que o custo da nuvem não seja esgotado.

---

## 🟢 STATUS ATUAL DO PRODUTO (Snapshot para Handoff)

> **Data:** 2026-05-02  
> **Para qualquer LLM ou desenvolvedor que assumir a partir daqui.**

### Sistema Visual Vigente:
- **Hero Headline:** Estilo Landing Page `bg-clip-text`, gradient do branco para branco transparente. Ponto focal acima da esfera. Sem wrap no mobile.
- **Cor Primária Orbita:** Roxo `#6D28D9` predominante e radial em conjunto com Ciano na esfera.
- **Intangibilidade:** Aura externa (`orb-bloom`) e textos da órbita configurados como `pointer-events-none` para estabilizar FPS em hover.
- O fluxo de uso ponta-a-ponta está operacional do front-end à IA!
