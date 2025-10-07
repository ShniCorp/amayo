export type DisplayBlock =
  | { kind: 'text'; content: string }
  | { kind: 'divider'; divider?: boolean; spacing?: number };

export const textBlock = (content: string): DisplayBlock => ({ kind: 'text', content });

export const dividerBlock = (options: { divider?: boolean; spacing?: number } = {}): DisplayBlock => ({
  kind: 'divider',
  divider: options.divider,
  spacing: options.spacing,
});

export function buildDisplay(accentColor: number, blocks: DisplayBlock[]) {
  return {
    type: 17 as const,
    accent_color: accentColor,
    components: blocks.map((block) => {
      if (block.kind === 'text') {
        return { type: 10 as const, content: block.content };
      }

      return {
        type: 14 as const,
        divider: block.divider ?? true,
        ...(block.spacing !== undefined ? { spacing: block.spacing } : {}),
      };
    }),
  };
}
