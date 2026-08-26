/**
 * USAGE — KanbanColumn + KanbanCard
 *
 * "In progress" is over its WIP limit of 3 with 4 cards — the limit note
 * renders as text, not just a colour change, and "Move to…" (via the card's
 * overflow menu) is a real non-drag alternative to reordering.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { KanbanColumnData } from '../types/domain';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';
import sample from './Kanban.sample.json';

const { columns: initial } = loadSample<{ columns: KanbanColumnData[] }>(sample);

export const KanbanUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [columns, setColumns] = useState(initial);

  const handleMove = (cardId: string, toColumnId: string) => {
    setColumns((prev) => {
      let moved: (typeof prev)[number]['cards'][number] | undefined;
      const withoutCard = prev.map((col) => {
        const card = col.cards.find((c) => c.id === cardId);
        if (card) moved = card;
        return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
      });
      if (!moved) return prev;
      return withoutCard.map((col) => (col.id === toColumnId ? { ...col, cards: [...col.cards, moved!] } : col));
    });
    toast.success('Card moved');
  };

  return (
    <ScrollView horizontal contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          onAdd={(columnId) => toast.show(`Adding task to ${columns.find((c) => c.id === columnId)?.title}`)}
          renderCard={(card) => (
            <KanbanCard card={card} columns={columns.filter((c) => c.id !== column.id)} onPress={(item) => toast.show(`Opening ${item.title}`)} onMoveTo={handleMove} />
          )}
        />
      ))}
    </ScrollView>
  );
};
