import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';

import type {
  GenericPopupActions,
  GenericPopupCloseBehavior,
  GenericPopupCloseReason,
  GenericPopupHeaderConfig,
  GenericPopupMode,
  GenericPopupProps,
  GenericPopupSize,
} from './GenericPopup.types';

const DIALOG_MAX_WIDTH: Record<Exclude<GenericPopupSize, 'full-screen'>, 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

const DRAWER_WIDTH: Record<GenericPopupSize, number | string> = {
  small: 360,
  medium: 520,
  large: 720,
  'full-screen': '100vw',
};

function modeIcon(mode: GenericPopupMode): ReactNode {
  if (mode === 'warning') return <WarningAmberIcon color="warning" />;
  if (mode === 'destructive') return <DeleteOutlineIcon color="error" />;
  return null;
}

function modeBorderColor(mode: GenericPopupMode): string {
  if (mode === 'warning') return 'warning.main';
  if (mode === 'destructive') return 'error.main';
  return 'divider';
}

function Header({
  config,
  customHeader,
  mode,
  titleId,
  descriptionId,
  fallbackLabel,
  requestClose,
}: {
  config: GenericPopupHeaderConfig;
  customHeader: ReactNode;
  mode: GenericPopupMode;
  titleId: string;
  descriptionId: string;
  fallbackLabel: string;
  requestClose: (reason: GenericPopupCloseReason) => void;
}) {
  const showCloseButton = config.showCloseButton ?? true;
  const hasContent =
    customHeader !== undefined ||
    config.title !== undefined ||
    config.description !== undefined ||
    config.icon !== undefined ||
    config.action !== undefined ||
    showCloseButton;

  if (!hasContent) return null;

  return (
    <DialogTitle
      component="div"
      sx={{
        p: 2,
        borderBottom: 1,
        borderColor: modeBorderColor(mode),
        bgcolor: (theme) =>
          mode === 'default'
            ? 'transparent'
            : alpha(
                mode === 'warning' ? theme.palette.warning.main : theme.palette.error.main,
                0.08,
              ),
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        {customHeader !== undefined ? (
          <Box flexGrow={1} minWidth={0}>
            {customHeader}
          </Box>
        ) : (
          <>
            {config.icon ?? modeIcon(mode)}
            <Box flexGrow={1} minWidth={0}>
              {config.title !== undefined && (
                <Typography id={titleId} component="h2" variant="h6">
                  {config.title}
                </Typography>
              )}
              {config.title === undefined && (
                <Typography
                  id={titleId}
                  component="h2"
                  sx={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    p: 0,
                    m: -1,
                    overflow: 'hidden',
                    clip: 'rect(0 0 0 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                  }}
                >
                  {fallbackLabel}
                </Typography>
              )}
              {config.description !== undefined && (
                <Typography id={descriptionId} variant="body2" color="text.secondary" mt={0.25}>
                  {config.description}
                </Typography>
              )}
            </Box>
          </>
        )}
        {config.action}
        {showCloseButton && (
          <Tooltip title="Close">
            <IconButton
              aria-label="Close popup"
              size="small"
              onClick={() => requestClose('close-button')}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </DialogTitle>
  );
}

function Footer({
  customFooter,
  actions,
  mode,
  sticky,
  requestClose,
}: {
  customFooter: ReactNode;
  actions: GenericPopupActions | undefined;
  mode: GenericPopupMode;
  sticky: boolean;
  requestClose: (reason: GenericPopupCloseReason) => void;
}) {
  if (customFooter === undefined && actions === undefined) return null;

  const hasConfirm = actions?.formId !== undefined || actions?.onConfirm !== undefined;
  const footerSx: SxProps<Theme> = {
    px: 2,
    py: 1.5,
    gap: 1,
    borderTop: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    ...(sticky && { position: 'sticky', bottom: 0, zIndex: 1 }),
  };

  return (
    <DialogActions sx={footerSx}>
      {customFooter ?? (
        <>
          {!actions?.hideCancel && (
            <Button
              color="inherit"
              disabled={actions?.loading}
              onClick={() => requestClose('cancel')}
            >
              {actions?.cancelLabel ?? 'Cancel'}
            </Button>
          )}
          {hasConfirm && (
            <Button
              variant="contained"
              color={mode === 'destructive' ? 'error' : mode === 'warning' ? 'warning' : 'primary'}
              type={actions?.formId ? 'submit' : 'button'}
              form={actions?.formId}
              disabled={actions?.loading === true || actions?.confirmDisabled === true}
              onClick={actions?.formId ? undefined : actions?.onConfirm}
              startIcon={
                actions?.loading ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              {actions?.loading
                ? (actions.loadingLabel ?? 'Working…')
                : (actions?.confirmLabel ?? 'Confirm')}
            </Button>
          )}
        </>
      )}
    </DialogActions>
  );
}

function isCloseBlocked(
  reason: GenericPopupCloseReason,
  behavior: GenericPopupCloseBehavior,
  loading: boolean,
): boolean {
  if (loading && (behavior.preventCloseWhileLoading ?? true)) return true;
  if (behavior.dirty && behavior.preventCloseWhenDirty) return true;
  if (reason === 'backdrop' && behavior.closeOnBackdrop === false) return true;
  if (reason === 'escape' && behavior.closeOnEscape === false) return true;
  return false;
}

/**
 * Controlled popup shell. MUI Dialog/Drawer provide the portal, focus trap,
 * focus restoration, and aria-modal semantics; parents provide all content and
 * own business state.
 */
export function GenericPopup({
  open,
  onClose,
  onBlockedClose,
  variant = 'dialog',
  size = 'medium',
  mode = 'default',
  drawerAnchor = 'right',
  header = {},
  actions,
  closeBehavior = {},
  slots,
  children,
  stickyFooter = false,
  keepMounted = false,
  ariaLabel = 'Popup',
}: GenericPopupProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const labelledBy = slots?.header === undefined ? titleId : undefined;
  const describedBy =
    slots?.header === undefined && header.description !== undefined ? descriptionId : undefined;

  const requestClose = (reason: GenericPopupCloseReason) => {
    if (isCloseBlocked(reason, closeBehavior, actions?.loading ?? false)) {
      onBlockedClose?.(reason);
      return;
    }
    onClose(reason);
  };

  const handleOverlayClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    requestClose(reason === 'backdropClick' ? 'backdrop' : 'escape');
  };

  const popupContent = (
    <>
      <Header
        config={header}
        customHeader={slots?.header}
        mode={mode}
        titleId={titleId}
        descriptionId={descriptionId}
        fallbackLabel={ariaLabel}
        requestClose={requestClose}
      />
      <DialogContent dividers sx={{ p: 2, flexGrow: 1 }}>
        {slots?.body ?? children}
      </DialogContent>
      <Footer
        customFooter={slots?.footer}
        actions={actions}
        mode={mode}
        sticky={stickyFooter}
        requestClose={requestClose}
      />
    </>
  );

  if (variant === 'drawer') {
    return (
      <Drawer
        open={open}
        anchor={drawerAnchor}
        onClose={handleOverlayClose}
        ModalProps={{ keepMounted }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-modal': true,
            'aria-label': labelledBy === undefined ? ariaLabel : undefined,
            'aria-labelledby': labelledBy,
            'aria-describedby': describedBy,
            sx: {
              width: { xs: '100vw', sm: DRAWER_WIDTH[size] },
              maxWidth: '100vw',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {popupContent}
      </Drawer>
    );
  }

  const fullScreen = size === 'full-screen';
  return (
    <Dialog
      open={open}
      onClose={handleOverlayClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={fullScreen ? false : DIALOG_MAX_WIDTH[size]}
      keepMounted={keepMounted}
      scroll="paper"
      aria-label={labelledBy === undefined ? ariaLabel : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      slotProps={{
        paper: {
          sx: {
            borderTop: mode === 'default' ? 0 : 4,
            borderColor: modeBorderColor(mode),
          },
        },
      }}
    >
      {popupContent}
    </Dialog>
  );
}
