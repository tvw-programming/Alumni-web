/** The per-language Prism modules ship without types. */
declare module 'react-syntax-highlighter/dist/esm/prism-light' {
  import type { ComponentType } from 'react';
  import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';

  interface PrismLight extends ComponentType<SyntaxHighlighterProps> {
    registerLanguage: (name: string, language: unknown) => void;
  }
  const PrismLight: PrismLight;
  export default PrismLight;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/*' {
  const language: unknown;
  export default language;
}
