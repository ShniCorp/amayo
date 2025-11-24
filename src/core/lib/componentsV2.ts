import { DisplayComponentV2Builder } from "./displayComponents/builders";

export type DisplayBlock =
  | { kind: "text"; content: string }
  | { kind: "divider"; divider?: boolean; spacing?: number }
  | { kind: "image"; url: string };

export const textBlock = (content: string): DisplayBlock => ({
  kind: "text",
  content,
});

export const dividerBlock = (
  options: { divider?: boolean; spacing?: number } = {}
): DisplayBlock => ({
  kind: "divider",
  divider: options.divider,
  spacing: options.spacing,
});

export function buildDisplay(accentColor: number, blocks: DisplayBlock[]) {
  const builder = new DisplayComponentV2Builder().setAccentColor(accentColor);

  for (const block of blocks) {
    if (block.kind === "text") {
      builder.addText(block.content);
    } else if (block.kind === "image") {
      builder.addImage(block.url);
    } else if (block.kind === "divider") {
      builder.addSeparator(block.spacing, block.divider);
    }
  }

  return builder.toJSON();
}
