import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import TuneIcon from '@mui/icons-material/Tune';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';

import { GenericCard } from '@/components/GenericCard';
import { GenericPopup, type GenericPopupCloseReason } from '@/components/GenericPopup';
import { snackbar } from '@/components/snackbar/snackbarBus';

type PopupDemo = 'form' | 'delete' | 'drawer' | 'full-screen' | null;

function waitForDemoRequest(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 700));
}

/** Parent-owned orchestration and business state for GenericPopup examples. */
export function ManageGenericPopupPage() {
  const [activePopup, setActivePopup] = useState<PopupDemo>(null);
  const [title, setTitle] = useState('Quarterly planning');
  const [notes, setNotes] = useState('Review targets with the operations team.');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openForm = () => {
    setDirty(false);
    setActivePopup('form');
  };

  const closePopup = (_reason?: GenericPopupCloseReason) => {
    setActivePopup(null);
  };

  const showBlockedMessage = (reason: GenericPopupCloseReason) => {
    snackbar.warning(
      reason === 'backdrop'
        ? 'Clicking outside is disabled for this popup.'
        : 'Save the form before closing, or restore the original values.',
    );
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    await waitForDemoRequest();
    setSaving(false);
    setDirty(false);
    setActivePopup(null);
    snackbar.success('Popup form saved');
  };

  const handleDelete = async () => {
    setDeleting(true);
    await waitForDemoRequest();
    setDeleting(false);
    setActivePopup(null);
    snackbar.success('Demo record deleted');
  };

  return (
    <Stack spacing={3} pb={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">Generic Popup</Typography>
        <Typography color="text.secondary">
          Controlled dialog and drawer variants with parent-owned content, async state, forms, and
          close policies.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <GenericCard
          header={{
            title: 'Form dialog',
            subtitle: 'Dirty-state protection and async submit',
            icon: <EditNoteIcon />,
          }}
          appearance={{ hoverAnimation: true }}
          slots={{
            footer: (
              <Button variant="contained" onClick={openForm}>
                Open form popup
              </Button>
            ),
          }}
        >
          Parent fields are embedded through normal composition. The popup only connects its confirm
          button to the supplied form ID.
        </GenericCard>

        <GenericCard
          header={{
            title: 'Destructive confirmation',
            subtitle: 'Explicit warning styling',
            icon: <DeleteOutlineIcon />,
          }}
          appearance={{ hoverAnimation: true }}
          slots={{
            footer: (
              <Button color="error" variant="outlined" onClick={() => setActivePopup('delete')}>
                Open delete popup
              </Button>
            ),
          }}
        >
          Destructive mode changes the visual hierarchy while the parent remains responsible for the
          actual delete operation.
        </GenericCard>

        <GenericCard
          header={{
            title: 'Drawer popup',
            subtitle: 'Custom header, body, and footer slots',
            icon: <TuneIcon />,
          }}
          appearance={{ hoverAnimation: true, surface: 'subtle' }}
          slots={{
            footer: (
              <Button variant="outlined" onClick={() => setActivePopup('drawer')}>
                Open drawer
              </Button>
            ),
          }}
        >
          The same close rules and focus management apply when presentation switches from Dialog to
          Drawer.
        </GenericCard>

        <GenericCard
          header={{
            title: 'Full-screen dialog',
            subtitle: 'Responsive long-form workspace',
            icon: <FullscreenIcon />,
          }}
          appearance={{ hoverAnimation: true, surface: 'glass' }}
          slots={{
            footer: (
              <Button variant="outlined" onClick={() => setActivePopup('full-screen')}>
                Open full screen
              </Button>
            ),
          }}
        >
          Full-screen mode keeps the action footer visible while the parent content scrolls.
        </GenericCard>
      </Box>

      <GenericPopup
        open={activePopup === 'form'}
        onClose={closePopup}
        onBlockedClose={showBlockedMessage}
        size="medium"
        header={{
          title: 'Edit planning note',
          description: 'This form and its values belong to the admin parent.',
          action: dirty ? (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setDirty(false);
                setActivePopup(null);
              }}
            >
              Discard changes
            </Button>
          ) : undefined,
        }}
        actions={{
          formId: 'generic-popup-form',
          confirmLabel: 'Save changes',
          loadingLabel: 'Saving…',
          loading: saving,
        }}
        closeBehavior={{
          closeOnBackdrop: false,
          closeOnEscape: true,
          dirty,
          preventCloseWhenDirty: true,
        }}
        stickyFooter
      >
        <Stack component="form" id="generic-popup-form" spacing={2} onSubmit={handleFormSubmit}>
          <TextField
            label="Title"
            value={title}
            required
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
          />
          <TextField
            label="Notes"
            value={notes}
            multiline
            minRows={4}
            onChange={(event) => {
              setNotes(event.target.value);
              setDirty(true);
            }}
          />
          {dirty && <Chip label="Unsaved changes" color="warning" size="small" />}
        </Stack>
      </GenericPopup>

      <GenericPopup
        open={activePopup === 'delete'}
        onClose={closePopup}
        size="small"
        mode="destructive"
        header={{
          title: 'Delete demo record?',
          description: 'This action cannot be undone.',
        }}
        actions={{
          onConfirm: () => void handleDelete(),
          confirmLabel: 'Delete record',
          loadingLabel: 'Deleting…',
          loading: deleting,
        }}
        closeBehavior={{ preventCloseWhileLoading: true }}
      >
        <Typography>
          The parent performs the asynchronous delete and controls when this popup closes.
        </Typography>
      </GenericPopup>

      <GenericPopup
        open={activePopup === 'drawer'}
        onClose={closePopup}
        variant="drawer"
        drawerAnchor="right"
        size="medium"
        mode="warning"
        header={{ showCloseButton: true }}
        slots={{
          header: (
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningAmberIcon color="warning" />
              <Box>
                <Typography variant="h6">Review preferences</Typography>
                <Typography variant="body2" color="text.secondary">
                  Completely custom header slot
                </Typography>
              </Box>
            </Stack>
          ),
          body: (
            <Stack spacing={2}>
              <Typography>
                Drawer content is supplied by the parent and can contain filters, forms, or any
                other feature UI.
              </Typography>
              <Divider />
              <TextField label="Filter name" fullWidth />
            </Stack>
          ),
          footer: (
            <Button variant="contained" onClick={() => setActivePopup(null)}>
              Apply preferences
            </Button>
          ),
        }}
        ariaLabel="Review preferences"
        stickyFooter
      />

      <GenericPopup
        open={activePopup === 'full-screen'}
        onClose={closePopup}
        size="full-screen"
        header={{
          title: 'Full-screen workspace',
          description: 'Use this variant for complex, focused workflows.',
        }}
        actions={{ onConfirm: () => setActivePopup(null), confirmLabel: 'Done', hideCancel: true }}
        stickyFooter
      >
        <Stack spacing={3}>
          <Typography variant="h6">Parent-owned workspace</Typography>
          {Array.from({ length: 8 }, (_, index) => (
            <TextField key={index} label={`Workspace field ${index + 1}`} fullWidth />
          ))}
        </Stack>
      </GenericPopup>
    </Stack>
  );
}
