import CallIcon from '@mui/icons-material/Call';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import StarIcon from '@mui/icons-material/Star';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe } from '../../../foundation';

export interface Driver {
  name: string;
  photoUri?: string;
  rating?: number;
  tripCount?: number;
  vehicleModel: string;
  vehicleColour: string;
  /** Displayed in the format people read off a car, spaced. */
  plateNumber: string;
}

export interface DriverCardProps {
  driver: Driver;
  /** Both go through a masking proxy — never the driver's real number. */
  onCall?: () => void;
  onMessage?: () => void;
}

/**
 * The assigned driver and vehicle.
 *
 * The **plate is the largest thing on the card**. It is the one piece of
 * information that confirms the right car, and riders check it from a few
 * metres away in bad light. Colour and model are next, name and photo last —
 * that is the order people actually verify in.
 *
 * Call and message go through a masking proxy. Showing a driver's real number,
 * or a rider's, is a safety failure that outlives the trip.
 */
export function DriverCard({ driver, onCall, onMessage }: DriverCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={driver.photoUri} alt="" sx={{ width: 52, height: 52 }}>
            {driver.name.charAt(0)}
          </Avatar>

          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Largest, first: the plate is what confirms the right car. */}
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontFamily: 'monospace', letterSpacing: 1 }}
              aria-label={describe(
                `Number plate ${driver.plateNumber.split('').join(' ')}`,
                `${driver.vehicleColour} ${driver.vehicleModel}`,
                driver.name,
                driver.rating ? `rated ${driver.rating.toFixed(1)}` : undefined,
              )}
            >
              {driver.plateNumber}
            </Typography>

            <Typography variant="body2" aria-hidden>
              {`${driver.vehicleColour} ${driver.vehicleModel}`}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" aria-hidden>
              <Typography variant="caption" color="text.secondary">
                {driver.name}
              </Typography>
              {driver.rating !== undefined ? (
                <>
                  <StarIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    {driver.rating.toFixed(1)}
                  </Typography>
                </>
              ) : null}
              {driver.tripCount !== undefined ? (
                <Typography variant="caption" color="text.secondary">
                  {`${String(driver.tripCount)} trips`}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.5}>
            {onMessage ? (
              <IconButton aria-label={`Message ${driver.name}`} onClick={onMessage}>
                <ChatBubbleOutlineIcon />
              </IconButton>
            ) : null}
            {onCall ? (
              <IconButton aria-label={`Call ${driver.name}`} onClick={onCall} color="primary">
                <CallIcon />
              </IconButton>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
