/** Shapes of `public/specdoc/manifest.json`, written by `scripts/sync-specdocs.mjs`. */

export interface SpecFileNode {
  type: 'file';
  name: string;
  /** Path relative to the set root, e.g. `auth/auth-service.md`. */
  path: string;
  title: string;
  bytes: number;
}

export interface SpecFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: SpecNode[];
}

export type SpecNode = SpecFileNode | SpecFolderNode;

export interface SpecSet {
  id: string;
  label: string;
  tree: SpecNode[];
  fileCount: number;
}

export interface SpecManifest {
  generatedAt: string;
  sets: SpecSet[];
}

/** Depth-first list of the files in a tree, in display order. */
export function flattenFiles(nodes: readonly SpecNode[]): SpecFileNode[] {
  return nodes.flatMap((node) => (node.type === 'file' ? [node] : flattenFiles(node.children)));
}

/** Folder paths on the way to a file, so the tree can open to a selection. */
export function ancestorsOf(path: string): string[] {
  const parts = path.split('/');
  parts.pop();
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}
