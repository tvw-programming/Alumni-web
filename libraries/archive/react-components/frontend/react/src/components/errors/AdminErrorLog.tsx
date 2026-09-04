import BugReportIcon from '@mui/icons-material/BugReport';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ScienceIcon from '@mui/icons-material/Science';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';

import { useSpeechCommands } from '@/speech/useSpeechCommands';
import { getLogs, subscribe } from '@/utils/errorLogger';
import { getRelease, getSessionId } from '@/utils/monitoring';

import { ApiErrorsTab } from './tabs/ApiErrorsTab';
import { AppErrorsTab } from './tabs/AppErrorsTab';
import { TestErrorsTab } from './tabs/TestErrorsTab';

import type { SpeechCommand } from '@/speech/commandMatcher';
import type { ErrorLogChannel } from '@/types/errorLog';

type TabKey = ErrorLogChannel;

/**
 * Admin console over the error log, one tab per channel.
 *
 * The shell owns only tab selection and the unread badges. Each tab owns its
 * own filter state and columns via `useErrorLog`, so adding a fourth channel is
 * a new tab component plus one `<Tab>` — nothing here changes shape.
 */
export function AdminErrorLog() {
  const [tab, setTab] = useState<TabKey>('api');
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>(() => countChannels());

  // Badges must track the live log, not just this component's mount.
  useEffect(() => subscribe(() => setChannelCounts(countChannels())), []);

  // Tabs are as navigable as routes are, and switching them by voice saves the
  // same clicking. Memoized so registration happens once, not per render.
  const speechCommands = useMemo<SpeechCommand[]>(
    () => [
      {
        id: 'tab:api',
        phrases: ['api tab', 'api errors', 'api calls tab'],
        group: 'Error console',
        run: () => {
          setTab('api');
        },
      },
      {
        id: 'tab:app',
        phrases: ['application tab', 'app errors', 'application errors'],
        group: 'Error console',
        run: () => {
          setTab('app');
        },
      },
      {
        id: 'tab:test',
        phrases: ['unit tests tab', 'unit tests', 'test failures'],
        group: 'Error console',
        run: () => {
          setTab('test');
        },
      },
    ],
    [],
  );
  useSpeechCommands(speechCommands);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Admin — Error &amp; Monitoring Console
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Entries are written to a rotating localStorage buffer (max 500) and handed to the monitoring
        sink — console in dev, <code>VITE_ERROR_LOG_ENDPOINT</code> in production, or whatever{' '}
        <code>setMonitoringSink</code> installs. Release <code>{getRelease()}</code>, session{' '}
        <code>{getSessionId()}</code>.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_event, next: TabKey) => {
          setTab(next);
        }}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab
          value="api"
          icon={<CloudOffIcon />}
          iconPosition="start"
          label={<TabLabel text="API calls" count={channelCounts.api ?? 0} />}
        />
        <Tab
          value="app"
          icon={<BugReportIcon />}
          iconPosition="start"
          label={<TabLabel text="Application" count={channelCounts.app ?? 0} />}
        />
        <Tab value="test" icon={<ScienceIcon />} iconPosition="start" label="Unit tests" />
      </Tabs>

      {/* Mounted one at a time: each tab subscribes to the log and fetches, and
          keeping the other two alive would mean paying for both. */}
      {tab === 'api' && <ApiErrorsTab />}
      {tab === 'app' && <AppErrorsTab />}
      {tab === 'test' && <TestErrorsTab />}
    </Box>
  );
}

function TabLabel({ text, count }: { text: string; count: number }) {
  return (
    <Badge badgeContent={count} color="error" max={99} sx={{ pr: count > 0 ? 2 : 0 }}>
      {text}
    </Badge>
  );
}

function countChannels(): Record<string, number> {
  return getLogs().reduce<Record<string, number>>((acc, entry) => {
    acc[entry.channel] = (acc[entry.channel] ?? 0) + 1;
    return acc;
  }, {});
}
