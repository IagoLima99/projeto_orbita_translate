# Orbita AI - Tradução Semântica (Refactored)

Um aplicativo web de tradução conversacional rápido, focado em minimalismo premium e experiência do usuário (UX).
Esta versão foi refatorada para aderir a boas práticas corporativas de escalabilidade, performance e segurança.

## Tecnologias
- **React 19** + **Vite 6**
- **Tailwind CSS v4** + **CSS Variables**
- **Framer Motion** para animações fluidas
- **Web Speech API** para reconhecimento de voz

## Estrutura do Projeto

```
src/
├── components/          # Componentes visuais desacoplados e focados
│   ├── CosmicBackground.tsx # Fundo em 5 camadas com SVG noise e reatividade ao estado
│   ├── Orb.tsx              # Componente central interativo
│   ├── ResultSheet.tsx      # Exibição de resultados
│   ├── TextInputOverlay.tsx # Fallback para entrada em texto
│   ├── TopBar.tsx
│   └── SettingsModal.tsx
├── hooks/               # Lógica de negócio reutilizável
│   ├── useSpeech.ts     # Hook customizado para Web Speech API
│   └── useTranslation.ts# Orquestração do processo de tradução
├── lib/                 # Utilitários e serviços de integração
│   └── translatorService.ts # Adaptador de serviço para o backend
├── types/               # Tipagens TypeScript (ex: OrbState, TranslationResponse)
├── App.tsx              # Orquestrador da máquina de estados (idle, listening, processing, result)
└── index.css            # Tokens de design globais via variáveis CSS e Tailwind @theme
```

## Como Rodar Localmente

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse em `http://localhost:3000`

## Como Alterar Tokens de Design
O design system central foi movido para o topo do `src/index.css`. Você pode facilmente alterar cores, escala tipográfica e configurações de interface lá:
```css
@theme {
  --color-bg-deep: #020205;
  --color-accent-purple: #8B5CF6;
  /* ... */
}
```

## Integração com Backend Futuro (Segurança First)
Por questões de segurança, **nenhuma API key** é usada no client. Para conectar um backend real (ex: API com Node.js ou Python que se comunique com o Gemini/OpenAI):

1. Vá em `src/lib/translatorService.ts`.
2. Substitua o `MockTranslatorService` por uma classe ou função que faça um `fetch` seguro para a sua API:
```typescript
class RealTranslatorService implements TranslatorService {
  async translate(input: string): Promise<TranslationResponse> {
    const res = await fetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ text: input })
    });
    return await res.json();
  }
}
```
3. O contrato da resposta é garantido pela interface `TranslationResponse` em `src/types/index.ts`. O frontend não precisará de nenhuma refatoração nos componentes para suportar isso.

## Acessibilidade e Performance
- Implementado `prefers-reduced-motion` no CSS.
- Áreas de clique grandes em mobile.
- `aria-live` e navegação focada adicionada ao Orb e overlays.
- Substituídas animações caras (`box-shadow`) por `opacity` e `transform` com mix-blend modes no `CosmicBackground` e no `Orb`.
