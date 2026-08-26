import type { ReactNode } from 'react';

export type GenericPopupSize = 'small' | 'medium' | 'large' | 'full-screen';
export type GenericPopupVariant = 'dialog' | 'drawer';
export type GenericPopupMode = 'default' | 'warning' | 'destructive';
export type GenericPopupCloseReason = 'backdrop' | 'escape' | 'close-button' | 'cancel';
export type GenericPopupDrawerAnchor = 'left' | 'right';

export interface GenericPopupHeaderConfig {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  /** Defaults to true. */
  showCloseButton?: boolean;
}

interface GenericPopupActionBase {
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  loadingLabel?: ReactNode;
  loading?: boolean;
  confirmDisabled?: boolean;
  hideCancel?: boolean;
}

/** A confirm action either invokes a callback or submits a parent-owned form. */
export type GenericPopupActions = GenericPopupActionBase &
  ({ formId: string; onConfirm?: never } | { formId?: never; onConfirm?: () => void });

export interface GenericPopupCloseBehavior {
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventCloseWhenDirty?: boolean;
  dirty?: boolean;
  /** Defaults to true when `actions.loading` is true. */
  preventCloseWhileLoading?: boolean;
}

export interface GenericPopupSlots {
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
}

export interface GenericPopupProps {
  open: boolean;
  onClose: (reason: GenericPopupCloseReason) => void;
  onBlockedClose?: (reason: GenericPopupCloseReason) => void;
  variant?: GenericPopupVariant;
  size?: GenericPopupSize;
  mode?: GenericPopupMode;
  drawerAnchor?: GenericPopupDrawerAnchor;
  header?: GenericPopupHeaderConfig;
  actions?: GenericPopupActions;
  closeBehavior?: GenericPopupCloseBehavior;
  slots?: GenericPopupSlots;
  children?: ReactNode;
  stickyFooter?: boolean;
  keepMounted?: boolean;
  /** Accessible fallback when a completely custom header has no visible title. */
  ariaLabel?: string;
}
