/**
 * USAGE — FileAttachmentItem
 *
 * Download and Remove stay independent icon buttons on every row — tapping
 * the row itself only opens an available file, never triggers a delete.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { FileAttachment } from '../types/domain';
import { FileAttachmentItem } from './FileAttachmentItem';
import sample from './FileAttachmentItem.sample.json';

const { files: initial } = loadSample<{ files: FileAttachment[] }>(sample);

export const FileAttachmentItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [files, setFiles] = useState(initial);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {files.map((file, index) => (
        <React.Fragment key={file.id}>
          <FileAttachmentItem
            file={file}
            onPress={(item) => toast.show(`Opening ${item.name}`)}
            onDownload={(item) => toast.show(`Downloading ${item.name}…`)}
            onRetry={(item) => {
              setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0.1 } : f)));
              toast.show(`Retrying upload for ${item.name}`);
            }}
            onRemove={(item) => {
              setFiles((prev) => prev.filter((f) => f.id !== item.id));
              toast.success(`Removed ${item.name}`);
            }}
          />
          {index < files.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
