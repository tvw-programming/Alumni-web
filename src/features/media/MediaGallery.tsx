/**
 * Alumni media gallery — Swiper with virtual slides.
 *
 * Virtual is not decoration here. A prolific alumnus can have hundreds of
 * photos, and Swiper without `virtual` puts every one of them in the DOM at
 * once: hundreds of decoded images, most off-screen, on a phone. With it,
 * Swiper keeps a small window of slides around the active one and the rest are
 * placeholders costing nothing.
 *
 * The other half of the problem is the URLs. Nothing in the bucket is public,
 * so each image needs a signed read URL, and signing hundreds up front would be
 * both slow and wasteful — most are never looked at. This component asks for
 * URLs a window at a time, ahead of where the user is.
 */
import { Box, Skeleton, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Navigation, Pagination, Virtual } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/virtual';

import { fetchMediaUrls, type MediaItem } from '~/api/media';

/** How many slides either side of the active one get real, signed URLs. */
const URL_WINDOW = 6;

interface Props {
  alumniId: number;
  items: MediaItem[];
  height?: number | string;
}

export default function MediaGallery({ alumniId, items, height = 460 }: Props) {
  const [active, setActive] = useState(0);

  // The window of ids that should have URLs right now. Rounded outwards to a
  // whole window so scrolling one slide does not invalidate the query and
  // re-request everything — the key only changes once per window crossed.
  const windowStart = Math.max(0, Math.floor((active - URL_WINDOW) / URL_WINDOW) * URL_WINDOW);
  const visibleIds = useMemo(
    () => items.slice(windowStart, windowStart + URL_WINDOW * 3).map((m) => m.id),
    [items, windowStart],
  );

  const { data: urls } = useQuery({
    queryKey: ['media-urls', alumniId, windowStart],
    queryFn: () => fetchMediaUrls(alumniId, visibleIds),
    enabled: visibleIds.length > 0,
    // Signed reads outlive this comfortably; refetching sooner would sign URLs
    // nobody asked for again.
    staleTime: 4 * 60 * 1000,
  });

  const handleSlideChange = useCallback((swiper: { activeIndex: number }) => {
    setActive(swiper.activeIndex);
  }, []);

  if (items.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">No approved media yet.</Typography>
      </Box>
    );
  }

  return (
    <Swiper
      modules={[Virtual, Navigation, Pagination, Keyboard]}
      virtual={{
        // Swiper needs the cache key to change when a placeholder becomes a
        // real URL, or the slide it already rendered stays a placeholder.
        cache: true,
        slides: items,
        renderExternal: undefined,
      }}
      navigation
      keyboard={{ enabled: true }}
      pagination={{ type: 'fraction' }}
      spaceBetween={16}
      slidesPerView={1}
      onSlideChange={handleSlideChange}
      style={{ height }}
      breakpoints={{ 900: { slidesPerView: 2 }, 1400: { slidesPerView: 3 } }}
    >
      {items.map((item, index) => (
        // virtualIndex is what lets Swiper position a slide it has not rendered.
        // Without it every slide lands at index 0 and the gallery shows one photo.
        <SwiperSlide key={item.id} virtualIndex={index}>
          <MediaSlide item={item} url={urls?.[item.id]} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

function MediaSlide({ item, url }: { item: MediaItem; url?: string }) {
  if (!url) {
    return <Skeleton variant="rectangular" sx={{ width: '100%', height: '100%', borderRadius: 1 }} />;
  }

  if (item.contentType === 'video/mp4') {
    // preload="none": a gallery of videos would otherwise start fetching every
    // one that scrolls near the viewport.
    return <video src={url} controls preload="none" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  }

  return (
    <Box
      component="img"
      src={url}
      alt={item.caption ?? ''}
      loading="lazy"
      // Reserving the real aspect ratio stops the layout jumping as each image
      // arrives; width and height come from the moderation pass.
      width={item.width ?? undefined}
      height={item.height ?? undefined}
      sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }}
    />
  );
}
