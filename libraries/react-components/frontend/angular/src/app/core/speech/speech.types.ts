/**
 * Minimal typings for the Web Speech API.
 *
 * TypeScript's DOM library does not declare `SpeechRecognition` — it is still
 * a draft, and Chrome ships it prefixed. Declaring only what is used keeps the
 * service honest about its dependency surface, and means a browser without it
 * fails a feature check rather than a type error.
 */

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  /** `not-allowed`, `no-speech`, `network`, `aborted`, … */
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** Chrome exposes the constructor prefixed; Safari and Edge follow Chrome. */
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const scope = globalThis as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export type MicStatus =
  | 'unsupported'
  | 'denied'
  /** The user has it switched off. */
  | 'off'
  /** Switched on, waiting for the engine to actually start. */
  | 'starting'
  | 'listening';
