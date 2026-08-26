import { useMemo } from 'react';
import { Box, Divider, Link as MuiLink, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import { fonts, tokens } from '../../theme';

// Register only the languages that appear in these docs. The full Prism bundle
// is ~700 kB; this keeps the highlighter closer to 40 kB.
for (const [name, lang] of Object.entries({ bash, json, python, typescript, diff, markdown, yaml })) {
  SyntaxHighlighter.registerLanguage(name, lang);
}
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('text', markdown);

/** Prism theme derived from our own tokens, so code matches the rest of the app. */
const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: tokens.text,
    fontFamily: fonts.mono,
    fontSize: 12.5,
    lineHeight: 1.7,
    background: 'none',
  },
  'pre[class*="language-"]': { background: 'none', margin: 0, padding: 0 },
  comment: { color: tokens.faint, fontStyle: 'italic' },
  punctuation: { color: tokens.muted },
  property: { color: '#8FB8E8' },
  string: { color: '#9BD3A8' },
  number: { color: tokens.signal },
  boolean: { color: tokens.live },
  keyword: { color: tokens.live },
  function: { color: tokens.signal },
  operator: { color: tokens.muted },
  'class-name': { color: '#8FB8E8' },
  builtin: { color: '#8FB8E8' },
  tag: { color: tokens.live },
  'attr-name': { color: tokens.signal },
  'attr-value': { color: '#9BD3A8' },
  deleted: { color: tokens.fail },
  inserted: { color: tokens.pass },
};

interface Props {
  content: string;
  title: string;
  /** Tighter padding, for rendering inside a dialog rather than a page. */
  dense?: boolean;
}

export default function MarkdownView({ content, title, dense = false }: Props) {
  // Prose gets a measure, not the container's full width — a line much past
  // this is hard to track back to. The dialog is wider than the docs column, so
  // it earns a wider measure; tables and code blocks are exempt either way.
  const measure = dense ? '96ch' : '72ch';

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <Typography
          variant="h1"
          component="h1"
          sx={{ mt: 0, mb: 2.5, fontSize: '2rem', letterSpacing: '-0.025em' }}
        >
          {children}
        </Typography>
      ),
      h2: ({ children }) => (
        <>
          <Divider sx={{ mt: 5, mb: 2.5, borderColor: tokens.rule }} />
          <Typography variant="h2" component="h2" sx={{ mb: 1.5, scrollMarginTop: 80 }}>
            {children}
          </Typography>
        </>
      ),
      h3: ({ children }) => (
        <Typography variant="h3" component="h3" sx={{ mt: 3.5, mb: 1.25 }}>
          {children}
        </Typography>
      ),
      h4: ({ children }) => (
        <Typography variant="h4" component="h4" sx={{ mt: 2.5, mb: 1, color: 'text.primary' }}>
          {children}
        </Typography>
      ),
      p: ({ children }) => (
        <Typography variant="body1" sx={{ mb: 2, color: 'text.primary', maxWidth: measure }}>
          {children}
        </Typography>
      ),
      a: ({ children, href }) => (
        <MuiLink
          href={href}
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel="noopener"
          sx={{
            color: tokens.signal,
            textDecorationColor: alpha(tokens.signal, 0.4),
            '&:hover': { textDecorationColor: tokens.signal },
          }}
        >
          {children}
        </MuiLink>
      ),
      ul: ({ children }) => (
        <Box component="ul" sx={{ pl: 3, mb: 2, maxWidth: measure, '& li': { mb: 0.75 } }}>
          {children}
        </Box>
      ),
      ol: ({ children }) => (
        <Box component="ol" sx={{ pl: 3, mb: 2, maxWidth: measure, '& li': { mb: 0.75 } }}>
          {children}
        </Box>
      ),
      li: ({ children }) => (
        <Box
          component="li"
          sx={{
            fontSize: '0.9375rem',
            lineHeight: 1.65,
            color: 'text.primary',
            '&::marker': { color: tokens.faint },
          }}
        >
          {children}
        </Box>
      ),
      blockquote: ({ children }) => (
        <Box
          sx={{
            borderLeft: `2px solid ${tokens.signal}`,
            bgcolor: alpha(tokens.signal, 0.05),
            pl: 2,
            pr: 2,
            py: 0.5,
            my: 2.5,
            maxWidth: measure,
            '& p': { mb: 1, '&:last-child': { mb: 0 } },
          }}
        >
          {children}
        </Box>
      ),
      hr: () => <Divider sx={{ my: 4, borderColor: tokens.rule }} />,
      table: ({ children }) => (
        <Box sx={{ overflowX: 'auto', my: 3 }}>
          <Box
            component="table"
            sx={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: '0.8125rem',
              '& th, & td': {
                border: `1px solid ${tokens.rule}`,
                px: 1.5,
                py: 1,
                textAlign: 'left',
                verticalAlign: 'top',
              },
              '& th': {
                bgcolor: tokens.ink,
                fontFamily: fonts.mono,
                fontSize: '0.6875rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: tokens.muted,
                fontWeight: 600,
              },
              '& tbody tr:hover': { bgcolor: tokens.panelRaised },
            }}
          >
            {children}
          </Box>
        </Box>
      ),
      code: ({ className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className ?? '');
        const text = String(children).replace(/\n$/, '');
        const isBlock = className?.startsWith('language-') || text.includes('\n');

        if (!isBlock) {
          return (
            <Box
              component="code"
              sx={{
                fontFamily: fonts.mono,
                fontSize: '0.8125em',
                bgcolor: alpha(tokens.live, 0.1),
                color: '#A9B6EE',
                border: `1px solid ${tokens.rule}`,
                borderRadius: 0.75,
                px: 0.6,
                py: 0.15,
                whiteSpace: 'nowrap',
              }}
              {...props}
            >
              {children}
            </Box>
          );
        }

        return (
          <Box
            sx={{
              my: 2.5,
              border: `1px solid ${tokens.rule}`,
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: tokens.ink,
            }}
          >
            {match && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderBottom: `1px solid ${tokens.rule}`,
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: tokens.faint,
                }}
              >
                {match[1]}
              </Box>
            )}
            <Box sx={{ p: 1.75, overflowX: 'auto' }}>
              <SyntaxHighlighter
                language={match?.[1] ?? 'text'}
                style={codeTheme}
                PreTag="div"
                customStyle={{ background: 'none', padding: 0, margin: 0 }}
              >
                {text}
              </SyntaxHighlighter>
            </Box>
          </Box>
        );
      },
      strong: ({ children }) => (
        <Box component="strong" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {children}
        </Box>
      ),
      input: ({ checked, type }) =>
        type === 'checkbox' ? (
          <Box
            component="span"
            aria-hidden
            sx={{
              display: 'inline-block',
              width: 12,
              height: 12,
              mr: 1,
              borderRadius: 0.5,
              border: `1px solid ${checked ? tokens.pass : tokens.ruleStrong}`,
              bgcolor: checked ? alpha(tokens.pass, 0.35) : 'transparent',
              verticalAlign: 'middle',
            }}
          />
        ) : null,
    }),
    [measure],
  );

  return (
    <Box
      component="article"
      aria-label={title}
      sx={
        dense
          ? { px: 2, py: 1.5, pb: 2.5, '& > *:first-of-type': { mt: 0 } }
          : { px: { xs: 2.5, md: 5 }, py: { xs: 3, md: 4 }, pb: 10, maxWidth: 980 }
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </Box>
  );
}
