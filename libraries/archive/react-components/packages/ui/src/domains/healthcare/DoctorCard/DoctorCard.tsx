import LanguageIcon from '@mui/icons-material/Language';
import StarIcon from '@mui/icons-material/Star';
import VerifiedIcon from '@mui/icons-material/Verified';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, formatMoney, type Money } from '../../../foundation';

export interface Doctor {
  id: string;
  name: string;
  /** Post-nominals as registered. Not a marketing string. */
  qualifications: string;
  specialty: string;
  yearsExperience?: number;
  languages?: string[];
  rating?: number;
  reviewCount?: number;
  consultationFee?: Money;
  nextAvailable?: string;
  photoUri?: string;
  /** Council registration, shown because patients are told to check it. */
  registrationNumber?: string;
  verified?: boolean;
}

export interface DoctorCardProps {
  doctor: Doctor;
  onPress: () => void;
  onBook?: () => void;
}

/**
 * A clinician in a search result.
 *
 * The registration number is on the card rather than behind a tap: patients are
 * repeatedly told to verify a practitioner's registration, and a UI that hides
 * it makes that advice impossible to follow.
 *
 * `nextAvailable` is a claim about the schedule and goes stale — it is rendered
 * as given and never cached beyond the query that produced it.
 */
export const DoctorCard = memo(function DoctorCard({ doctor, onPress, onBook }: DoctorCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2}>
          <Avatar src={doctor.photoUri} alt="" sx={{ width: 56, height: 56 }}>
            {doctor.name.charAt(0)}
          </Avatar>

          <Stack sx={{ flexGrow: 1, minWidth: 0 }} spacing={0.25}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {doctor.name}
              </Typography>
              {doctor.verified ? (
                <VerifiedIcon
                  fontSize="small"
                  color="primary"
                  titleAccess="Registration verified"
                />
              ) : null}
            </Stack>

            <Typography variant="caption" color="text.secondary">
              {doctor.qualifications}
            </Typography>
            <Typography variant="body2">{doctor.specialty}</Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {doctor.yearsExperience !== undefined ? (
                <Typography variant="caption" color="text.secondary">
                  {`${String(doctor.yearsExperience)} years`}
                </Typography>
              ) : null}
              {doctor.rating !== undefined ? (
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption">
                    {doctor.rating.toFixed(1)}
                    {doctor.reviewCount ? ` (${String(doctor.reviewCount)})` : ''}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            {doctor.languages?.length ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LanguageIcon sx={{ fontSize: 14 }} color="action" />
                <Typography variant="caption" color="text.secondary">
                  {doctor.languages.join(', ')}
                </Typography>
              </Stack>
            ) : null}

            {doctor.registrationNumber ? (
              <Typography variant="caption" color="text.secondary">
                {`Reg. ${doctor.registrationNumber}`}
              </Typography>
            ) : null}
          </Stack>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 1.5 }}
          flexWrap="wrap"
          useFlexGap
        >
          {doctor.consultationFee ? (
            <Chip size="small" variant="outlined" label={formatMoney(doctor.consultationFee)} />
          ) : null}
          {doctor.nextAvailable ? (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`Next: ${doctor.nextAvailable}`}
            />
          ) : null}

          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <Button
              size="small"
              onClick={onPress}
              aria-label={describe(
                `View profile for ${doctor.name}`,
                doctor.specialty,
                doctor.qualifications,
                doctor.consultationFee ? `fee ${formatMoney(doctor.consultationFee)}` : undefined,
              )}
            >
              Profile
            </Button>
            {onBook ? (
              <Button
                size="small"
                variant="contained"
                onClick={onBook}
                aria-label={`Book with ${doctor.name}`}
              >
                Book
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});
