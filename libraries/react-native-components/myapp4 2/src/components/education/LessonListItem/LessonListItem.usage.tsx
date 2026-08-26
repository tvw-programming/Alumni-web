/**
 * USAGE — LessonListItem
 *
 * A full curriculum with collapsible modules. Opening a lesson changes which row
 * is "playing"; it does not mark anything complete — that decision belongs to the
 * course service.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LessonItem } from '../types/domain';
import { LessonListItem } from './LessonListItem';
import sample from './LessonListItem.sample.json';

interface Section {
  id: string;
  title: string;
  lessons: LessonItem[];
}

const { sections: initial } = loadSample<{ sections: Section[] }>(sample);

export const LessonListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [sections, setSections] = useState<Section[]>(initial);
  const [expanded, setExpanded] = useState<string[]>(['sec-1', 'sec-2', 'sec-3']);

  /** Selecting a lesson moves the "playing" marker — nothing else. */
  const play = useCallback(
    (lesson: LessonItem) => {
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          lessons: section.lessons.map((item) => {
            if (item.id === lesson.id) return { ...item, state: 'playing' as const };
            if (item.state === 'playing') return { ...item, state: item.progress ? ('notStarted' as const) : ('notStarted' as const) };
            return item;
          }),
        })),
      );
      toast.show(`Playing: ${lesson.title.slice(0, 28)}…`);
    },
    [toast],
  );

  const download = useCallback(
    (lesson: LessonItem) => {
      if (lesson.state === 'downloaded') {
        toast.show('Already available offline');
        return;
      }
      toast.success(`Downloading ${lesson.title.slice(0, 22)}…`);
    },
    [toast],
  );

  let counter = 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.md }}>
        The optional reading is marked as excluded from completion, the graded quiz shows a previous failed attempt, and
        locked lessons explain their prerequisite rather than just showing a padlock.
      </Text>

      {sections.map((section) => (
        <View key={section.id}>
          <List.Accordion
            title={section.title}
            description={`${section.lessons.filter((l) => l.state === 'completed').length} of ${
              section.lessons.filter((l) => !l.optional).length
            } required complete`}
            expanded={expanded.includes(section.id)}
            onPress={() =>
              setExpanded((prev) =>
                prev.includes(section.id) ? prev.filter((id) => id !== section.id) : [...prev, section.id],
              )
            }
            testID={`section-${section.id}`}
          >
            {section.lessons.map((lesson, index) => {
              counter += 1;
              return (
                <LessonListItem
                  key={lesson.id}
                  lesson={lesson}
                  position={counter}
                  index={index}
                  entering="slideUp"
                  onPress={play}
                  onDownload={download}
                  onRetry={() => toast.show('Retrying…')}
                />
              );
            })}
          </List.Accordion>
          <Divider />
        </View>
      ))}

      <Text variant="labelLarge" style={{ padding: theme.spacing.md }}>
        Compact density
      </Text>
      <View style={styles.compact}>
        {initial[0]!.lessons.map((lesson, index) => (
          <LessonListItem key={lesson.id} lesson={lesson} position={index + 1} compact showType={false} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  compact: { opacity: 0.95 },
});
