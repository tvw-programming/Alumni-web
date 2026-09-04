/**
 * USAGE — CourseCard
 *
 * The Algorithms card has `progress: null` — progress is *unavailable*, which is
 * a different thing from zero, and the card says so rather than showing an empty
 * bar that implies no work has been done.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { StateView } from '@ui/molecules/StateView';
import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CourseCardData } from '../types/domain';
import { CourseCard, type CourseCardVariant } from './CourseCard';
import sample from './CourseCard.sample.json';

const { courses } = loadSample<{ courses: CourseCardData[] }>(sample);

export const CourseCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();
  const { width } = useWindowDimensions();

  const [variant, setVariant] = useState<CourseCardVariant>('catalog');
  const [bookmarks, setBookmarks] = useState<string[]>(['c-5']);
  const [errorId, setErrorId] = useState<string>();
  const [empty, setEmpty] = useState(false);

  /** Two columns on tablets, one on phones. */
  const columns = width >= 700 ? 2 : 1;
  const cardWidth = columns === 1 ? undefined : (width - theme.spacing.md * (columns + 1)) / columns;

  const enroll = useCallback(
    (course: CourseCardData) => {
      if (course.id === 'c-5') {
        // Enrollment failure stays on the card rather than vanishing in a toast.
        setErrorId(course.id);
        return;
      }
      toast.success(`Opening ${course.title.slice(0, 24)}…`);
    },
    [toast],
  );

  if (empty) {
    return (
      <StateView
        preset="empty"
        title="You haven't enrolled in any courses yet"
        description="Browse the catalogue to find something to start."
        primaryAction={{ label: 'Show demo courses', onPress: () => setEmpty(false) }}
        testID="courses-empty"
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={variant}
        onValueChange={(next) => setVariant(next as CourseCardVariant)}
        density="small"
        buttons={[
          { value: 'catalog', label: 'Catalog' },
          { value: 'compact', label: 'Compact' },
          { value: 'featured', label: 'Featured' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Thumbnails are unreachable on purpose — each falls back to its alt text. Tap "Start course" on Creative Writing
        to see an inline enrollment error.
      </Text>

      <View style={columns > 1 ? { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md } : { gap: theme.spacing.md }}>
        {courses.map((course, index) => (
          <View key={course.id} style={columns > 1 ? { width: cardWidth } : undefined}>
            <CourseCard
              course={course}
              variant={variant}
              index={index}
              entering="slideUp"
              bookmarked={bookmarks.includes(course.id)}
              errorMessage={errorId === course.id ? "We couldn't enroll you. Check your connection." : undefined}
              onRetry={() => {
                setErrorId(undefined);
                toast.show('Retrying enrollment');
              }}
              onPress={(item) => toast.show(`Opening ${item.title.slice(0, 20)}…`)}
              onAction={enroll}
              onBookmark={(item, next) =>
                setBookmarks((prev) => (next ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
              }
              onExplainProgressRule={(item) =>
                sheet.open(<Text variant="bodyMedium">{item.completionRule}</Text>, {
                  title: 'What counts toward progress?',
                  variant: 'bottom',
                })
              }
            />
          </View>
        ))}
      </View>

      <Text variant="labelLarge">Loading</Text>
      <CourseCard course={courses[0]!} loading onPress={() => {}} testID="course-loading" />

      <Text
        variant="labelSmall"
        onPress={() => setEmpty(true)}
        accessibilityRole="button"
        style={{ color: theme.colors.primary }}
      >
        Show the empty state
      </Text>
    </ScrollView>
  );
};
