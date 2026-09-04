import CallEndIcon from '@mui/icons-material/CallEnd';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

export type CallQuality = 'good' | 'fair' | 'poor' | 'reconnecting';

export interface VideoCallControlsProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  quality: CallQuality;
  elapsedSeconds: number;
  unreadMessages?: number;
  screenSharing?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare?: () => void;
  onOpenChat?: () => void;
  onEndCall: () => void;
}

const QUALITY_LABEL: Record<CallQuality, string> = {
  good: 'Connection good',
  fair: 'Connection fair',
  poor: 'Connection poor — try turning off your camera',
  reconnecting: 'Reconnecting…',
};

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * The control bar for a consultation.
 *
 * Mute state is **local and immediate** — it belongs to the media engine, not
 * to a server round trip, and a mute that waits for a network hop is a mute
 * that fails when the network is the reason you are muting.
 *
 * That is also why there is no Action here: nothing on this bar is a mutation.
 * Saving a preference for next time is a separate concern.
 *
 * The poor-connection message suggests the fix ("turn off your camera") rather
 * than only reporting the problem.
 */
export function VideoCallControls({
  micEnabled,
  cameraEnabled,
  quality,
  elapsedSeconds,
  unreadMessages = 0,
  screenSharing = false,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onOpenChat,
  onEndCall,
}: VideoCallControlsProps) {
  return (
    <Paper elevation={3} sx={{ p: 1.5, borderRadius: 999, display: 'inline-block' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Stack sx={{ px: 1, minWidth: 92 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatElapsed(elapsedSeconds)}
          </Typography>
          {/* Never colour alone, and never a bare dot: the wording says what
              to do about it. */}
          <Chip
            size="small"
            variant="outlined"
            color={quality === 'good' ? 'success' : quality === 'fair' ? 'default' : 'warning'}
            label={QUALITY_LABEL[quality]}
            sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }}
            role="status"
          />
        </Stack>

        <Tooltip title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}>
          <IconButton
            onClick={onToggleMic}
            aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            aria-pressed={!micEnabled}
            color={micEnabled ? 'default' : 'error'}
          >
            {micEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}>
          <IconButton
            onClick={onToggleCamera}
            aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
            aria-pressed={!cameraEnabled}
            color={cameraEnabled ? 'default' : 'error'}
          >
            {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
        </Tooltip>

        {onToggleScreenShare ? (
          <Tooltip title={screenSharing ? 'Stop sharing your screen' : 'Share your screen'}>
            <IconButton
              onClick={onToggleScreenShare}
              aria-label={screenSharing ? 'Stop sharing your screen' : 'Share your screen'}
              aria-pressed={screenSharing}
              color={screenSharing ? 'primary' : 'default'}
            >
              <ScreenShareIcon />
            </IconButton>
          </Tooltip>
        ) : null}

        {onOpenChat ? (
          <Tooltip title="Open chat">
            <IconButton
              onClick={onOpenChat}
              aria-label={`Open chat, ${String(unreadMessages)} unread`}
            >
              <Badge badgeContent={unreadMessages} color="primary">
                <ChatBubbleOutlineIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        ) : null}

        <Tooltip title="End call">
          <IconButton
            onClick={onEndCall}
            aria-label="End call"
            sx={{
              bgcolor: 'error.main',
              color: 'error.contrastText',
              '&:hover': { bgcolor: 'error.dark' },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
