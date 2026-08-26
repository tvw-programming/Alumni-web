/**
 * USAGE — PrescriptionCard + ReportListItem
 *
 * Note how the two abnormal lab results differ: one is simply out of range and
 * stays calm; the other carries a clinician's follow-up flag and says so.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { HealthDocument, Prescription } from '../types/domain';
import { PrescriptionCard } from './PrescriptionCard';
import { ReportListItem } from './ReportListItem';
import sample from './HealthDocuments.sample.json';

const data = loadSample<{ documents: HealthDocument[]; prescriptions: Prescription[] }>(sample);

export const HealthDocumentsUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();

  const [tab, setTab] = useState<'reports' | 'prescriptions'>('reports');
  const [downloadingId, setDownloadingId] = useState<string>();
  const [refillingId, setRefillingId] = useState<string>();

  const open = useCallback(
    (document: HealthDocument) => {
      if (document.status === 'restricted') {
        toast.warning(document.restrictedReason ?? 'This document is not available yet');
        return;
      }
      if (document.status === 'expired') {
        toast.error('That link has expired. Requesting a fresh one…');
        return;
      }
      sheet.open(
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="titleSmall">{document.title}</Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {document.provider} · {new Date(document.date).toLocaleDateString()}
          </Text>
          {document.clinicianNote ? (
            <AppCard variant="filled">
              <Text variant="bodySmall">{document.clinicianNote}</Text>
            </AppCard>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            A real build renders the PDF here, alongside an accessible table of the same values — a chart or scan alone
            is not a usable representation of a result.
          </Text>
        </View>,
        { title: 'Report', variant: 'bottom', scrollable: true },
      );
    },
    [sheet, theme, toast],
  );

  const download = useCallback(
    async (document: HealthDocument) => {
      setDownloadingId(document.id);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setDownloadingId(undefined);
      toast.success('Saved to your device');
    },
    [toast],
  );

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ paddingHorizontal: theme.spacing.md }}>
        <SegmentedButtons
          value={tab}
          onValueChange={(next) => setTab(next as 'reports' | 'prescriptions')}
          buttons={[
            { value: 'reports', label: 'Reports' },
            { value: 'prescriptions', label: 'Prescriptions' },
          ]}
        />
      </View>

      {tab === 'reports' ? (
        data.documents.length === 0 ? (
          <StateView
            preset="empty"
            title="No reports yet"
            description="Your reports will appear here after your care team releases them."
          />
        ) : (
          <View>
            {data.documents.map((document, index) => (
              <ReportListItem
                key={document.id}
                document={document}
                index={index}
                entering="slideUp"
                downloading={downloadingId === document.id}
                onOpen={open}
                onDownload={(item) => void download(item)}
              />
            ))}
          </View>
        )
      ) : (
        <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.md }}>
          {data.prescriptions.map((prescription, index) => (
            <PrescriptionCard
              key={prescription.id}
              prescription={prescription}
              index={index}
              entering="slideUp"
              refillPending={refillingId === prescription.id}
              onRequestRefill={async (item) => {
                setRefillingId(item.id);
                await new Promise((resolve) => setTimeout(resolve, 900));
                setRefillingId(undefined);
                toast.success('Refill requested — your clinic will confirm');
              }}
              onViewDocument={() => toast.show('Opening the prescription PDF')}
              onFindPharmacy={() => toast.show('Searching nearby pharmacies')}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};
