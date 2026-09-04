/**
 * Shared media and content primitives.
 *
 * Promoted out of the e-commerce folder once healthcare needed the same shapes
 * (a doctor avatar and a product image have identical requirements). Lives here
 * with `money.ts` as a cross-domain primitive.
 */

export interface ImageAsset {
  uri?: string;
  /**
   * Required, deliberately. An image with no text alternative is unusable to a
   * screen reader, and making it optional guarantees it will be omitted.
   */
  alt: string;
  width?: number;
  height?: number;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  src: string;
  alt: string;
}

export interface Rating {
  average: number;
  count: number;
}

/**
 * A user-supplied file in flight or at rest.
 *
 * Upload and scanning are explicit states rather than silent waits, because a
 * file that is "attached" but still being virus-scanned is not yet safe to
 * treat as delivered.
 */
export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  /** Short-lived signed URL. Never logged or sent to analytics. */
  url?: string;
  state?: 'uploading' | 'scanning' | 'ready' | 'blocked' | 'failed';
  progress?: number;
  blockedReason?: string;
}

/** Lightweight rich text. Real products swap this for a document model. */
export type RichText = string;
