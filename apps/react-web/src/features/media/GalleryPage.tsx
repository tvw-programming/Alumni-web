import { Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { fetchMedia } from '~/api/media';
import MediaGallery from '~/features/media/MediaGallery';

const DEMO_ALUMNI_ID = 1;

export default function GalleryPage() {
  const { data } = useQuery({
    queryKey: ['media', DEMO_ALUMNI_ID],
    queryFn: () => fetchMedia(DEMO_ALUMNI_ID),
  });

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Media gallery</Typography>
        <Typography variant="body2" color="text.secondary">
          Approved media only. Slides are virtualised and read URLs are signed a window at a time.
        </Typography>
      </div>
      <MediaGallery alumniId={DEMO_ALUMNI_ID} items={data ?? []} />
    </Stack>
  );
}
