import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import OpenIcon from '@mui/icons-material/OpenInNewOutlined';
import type { Artifact } from '../../types/workflow';
import { artifactUrl, fetchArtifactText } from '../../api/client';
import { fonts, tokens } from '../../theme';
import MarkdownView from '../docs/MarkdownView';
import JsonView from './JsonView';

/**
 * The content of one artifact, read from the orchestrator.
 *
 * A gate is a decision about a document, so the document has to be readable
 * where the decision is made. The list of filenames upstream of this component
 * tells a reviewer what exists; this tells them what it says.
 *
 * Text artifacts are fetched and rendered in the app; binary ones (the rendered
 * PDF, error snapshots) are handed to the browser by URL, which keeps the bytes
 * the reviewer sees identical to the bytes the checksum was taken over.
 */

const TEXT_EXT = new Set(['md', 'json', 'diff', 'txt']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

const MIME: Record<string, string> = {
  md: 'text/markdown',
  json: 'application/json',
  diff: 'text/x-diff',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Colour a unified diff by line role — the shape of a change before the words. */
function DiffView({ text }: { text: string }) {
  const lines = useMemo(() => text.split('\n'), [text]);
  return (
    <Box sx={{ fontFamily: fonts.mono, fontSize: 12.5, lineHeight: 1.7, p: 1.5, bgcolor: tokens.ink }}>
      {lines.map((line, i) => {
        const color = line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ')
          ? tokens.muted
          : line.startsWith('@@')
            ? tokens.signal
            : line.startsWith('+')
              ? tokens.pass
              : line.startsWith('-')
                ? tokens.fail
                : tokens.text;
        return (
          <Box key={i} component="pre" sx={{ m: 0, color, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {line || ' '}
          </Box>
        );
      })}
    </Box>
  );
}

interface Props {
  artifact: Artifact;
}

export default function ArtifactView({ artifact }: Props) {
  const ext = artifact.ext.toLowerCase();
  const [text, setText] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isText = TEXT_EXT.has(ext);

  useEffect(() => {
    let alive = true;
    setText(null);
    setUrl(null);
    setError(null);
    setCopied(false);

    artifactUrl(artifact.file)
      .then((href) => {
        if (alive) setUrl(href);
      })
      .catch(() => {
        /* A missing download link is not worth an error banner of its own. */
      });

    if (!isText) return () => {
      alive = false;
    };

    setLoading(true);
    fetchArtifactText(artifact.file)
      .then((body) => {
        if (alive) setText(body);
      })
      .catch((cause: unknown) => {
        if (alive) setError(cause instanceof Error ? cause.message : 'Could not read this artifact.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [artifact.file, isText]);

  const parsed = useMemo(() => {
    if (ext !== 'json' || text === null) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  }, [ext, text]);

  const copy = async () => {
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box sx={{ border: `1px solid ${tokens.rule}`, borderRadius: 1, overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          borderBottom: `1px solid ${tokens.rule}`,
          bgcolor: tokens.panel,
        }}
      >
        <Typography variant="overline" sx={{ color: 'text.secondary' }} noWrap>
          {MIME[ext] ?? `application/octet-stream (.${ext})`}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {text !== null && (
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton size="small" onClick={copy} aria-label={`Copy ${artifact.file}`}>
                {copied ? (
                  <DoneIcon sx={{ fontSize: 15, color: tokens.pass }} />
                ) : (
                  <CopyIcon sx={{ fontSize: 15 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
          {url && (
            <>
              <Button
                size="small"
                href={url}
                target="_blank"
                rel="noopener"
                startIcon={<OpenIcon sx={{ fontSize: 15 }} />}
                sx={{ fontSize: 11, color: 'text.secondary' }}
              >
                Open
              </Button>
              <Button
                size="small"
                href={url}
                download={artifact.file}
                startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
                sx={{ fontSize: 11, color: 'text.secondary' }}
              >
                Download
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {loading && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 3 }}>
          <CircularProgress size={16} sx={{ color: tokens.signal }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Reading {artifact.file}
          </Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" variant="outlined" sx={{ m: 1.5, borderColor: tokens.rule }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {/* The body's height is viewport-relative, so a document uses whatever
          height the window has rather than a fixed box in a full-width dialog. */}
      {!loading && !error && (
        <Box sx={{ maxHeight: '58vh', overflow: 'auto', bgcolor: ext === 'md' ? tokens.panel : tokens.ink }}>
          {ext === 'md' && text !== null && <MarkdownView content={text} title={artifact.file} dense />}

          {ext === 'json' &&
            text !== null &&
            (parsed === undefined ? (
              <Box sx={{ fontFamily: fonts.mono, fontSize: 12.5, whiteSpace: 'pre-wrap', p: 1.5 }}>
                {text}
              </Box>
            ) : (
              /* The store writes indented JSON; show it with the same tree the
                 step output uses so both tabs read the same way. */
              <Box sx={{ p: 1.5 }}>
                <JsonView value={parsed} maxHeight="none" />
              </Box>
            ))}

          {ext === 'diff' && text !== null && <DiffView text={text} />}

          {ext === 'txt' && text !== null && (
            <Box sx={{ fontFamily: fonts.mono, fontSize: 12.5, whiteSpace: 'pre-wrap', p: 1.5 }}>
              {text}
            </Box>
          )}

          {ext === 'pdf' &&
            (url ? (
              <Box
                component="iframe"
                src={url}
                title={artifact.file}
                sx={{ display: 'block', width: '100%', height: '56vh', border: 0, bgcolor: tokens.panel }}
              />
            ) : (
              <Unavailable file={artifact.file} />
            ))}

          {IMAGE_EXT.has(ext) &&
            (url ? (
              <Box
                component="img"
                src={url}
                alt={artifact.file}
                sx={{ display: 'block', maxWidth: '100%', m: '0 auto' }}
              />
            ) : (
              <Unavailable file={artifact.file} />
            ))}

          {!isText && ext !== 'pdf' && !IMAGE_EXT.has(ext) && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {url
                  ? 'This format cannot be shown in the browser. Download it to read it.'
                  : `No preview for .${ext}.`}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/** Binary artifact with no URL behind it — the mock transport, in practice. */
function Unavailable({ file }: { file: string }) {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {file} is a rendered file with no bytes behind it in this transport.
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Point the dashboard at a running orchestrator (VITE_API_BASE) to read it.
      </Typography>
    </Box>
  );
}
