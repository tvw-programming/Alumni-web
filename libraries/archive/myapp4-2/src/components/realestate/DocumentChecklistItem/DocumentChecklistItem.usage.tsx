/**
 * USAGE — DocumentChecklistItem
 *
 * "Title deed" is verified (reviewer-confirmed) while "Encumbrance
 * certificate" is only uploaded — the two states use different icons and
 * words, since an uploaded file is not the same claim as a verified one.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { DocumentChecklistData } from '../types/domain';
import { DocumentChecklistItem } from './DocumentChecklistItem';
import sample from './DocumentChecklistItem.sample.json';

const { documents: initial } = loadSample<{ documents: DocumentChecklistData[] }>(sample);

export const DocumentChecklistItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [documents, setDocuments] = useState(initial);

  const update = (docId: string, patch: Partial<DocumentChecklistData>) => setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...patch } : d)));

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {documents.map((document, index) => (
        <React.Fragment key={document.id}>
          <DocumentChecklistItem
            document={document}
            onUpload={(item) => {
              update(item.id, { status: 'uploading' });
              setTimeout(() => update(item.id, { status: 'uploaded', fileName: 'new_upload.pdf', updatedAtLabel: 'just now' }), 900);
            }}
            onView={(item) => toast.show(`Opening ${item.title}`)}
            onRetry={(item) => {
              update(item.id, { status: 'uploading' });
              setTimeout(() => update(item.id, { status: 'uploaded' }), 700);
            }}
          />
          {index < documents.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
