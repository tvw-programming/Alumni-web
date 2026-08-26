import type { DocNode } from '../types/workflow';

import overview from '../docs/00-overview.md?raw';
import concepts from '../docs/01-concepts.md?raw';
import runningAndConfiguring from '../docs/10-running-and-configuring.md?raw';
import architecture from '../docs/02-architecture.md?raw';
import protocol from '../docs/03-a2a-protocol.md?raw';
import configuration from '../docs/04-configuration.md?raw';
import stepsReference from '../docs/05-steps-reference.md?raw';
import safety from '../docs/06-safety-model.md?raw';
import extending from '../docs/07-extending.md?raw';
import claudeCode from '../docs/08-claude-code-workflow.md?raw';
import conventions from '../docs/09-agent-conventions.md?raw';
import adr1 from '../docs/adr-0001-no-langgraph.md?raw';
import adr2 from '../docs/adr-0002-single-config-json.md?raw';

/**
 * The documentation tree.
 *
 * Grouped by what a reader is trying to do rather than by filename, because
 * "Understand the system" and "Change the system" are different errands.
 */
export const docTree: DocNode[] = [
  {
    id: 'group-start',
    label: 'Start here',
    children: [
      { id: '00-overview', label: 'Overview', content: overview },
      { id: '01-concepts', label: 'Concepts', content: concepts },
      { id: '10-running-and-configuring', label: 'Running & configuring', content: runningAndConfiguring },
    ],
  },
  {
    id: 'group-understand',
    label: 'Understand the system',
    children: [
      { id: '02-architecture', label: 'Architecture', content: architecture },
      { id: '03-a2a-protocol', label: 'A2A protocol', content: protocol },
      { id: '04-configuration', label: 'Configuration', content: configuration },
      { id: '05-steps-reference', label: 'Step reference', content: stepsReference },
      { id: '06-safety-model', label: 'Safety model', content: safety },
    ],
  },
  {
    id: 'group-change',
    label: 'Change the system',
    children: [
      { id: '07-extending', label: 'Extending', content: extending },
      { id: '08-claude-code', label: 'Claude Code workflow', content: claudeCode },
      { id: '09-conventions', label: 'Agent conventions', content: conventions },
    ],
  },
  {
    id: 'group-adr',
    label: 'Decisions',
    children: [
      { id: 'adr-0001', label: 'ADR 0001 — No LangGraph', content: adr1 },
      { id: 'adr-0002', label: 'ADR 0002 — Single config.json', content: adr2 },
    ],
  },
];

/** Flat lookup for routing by slug. */
export const docsById = new Map<string, DocNode>();
for (const group of docTree) {
  for (const child of group.children ?? []) docsById.set(child.id, child);
}

export const allGroupIds = docTree.map((g) => g.id);
export const defaultDocId = '01-concepts';

export function searchDocs(query: string): DocNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return [...docsById.values()].filter(
    (d) => d.label.toLowerCase().includes(q) || (d.content ?? '').toLowerCase().includes(q),
  );
}
