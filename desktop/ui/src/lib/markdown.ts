function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(input: string) {
  let output = escapeHtml(input);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return output;
}

function flushParagraph(buffer: string[], blocks: string[]) {
  if (buffer.length === 0) {
    return;
  }
  const text = buffer.join(" ").trim();
  if (text) {
    blocks.push(`<p>${formatInline(text)}</p>`);
  }
  buffer.length = 0;
}

function flushList(items: string[], blocks: string[], ordered: boolean) {
  if (items.length === 0) {
    return;
  }
  const tag = ordered ? "ol" : "ul";
  blocks.push(`<${tag}>${items.map((item) => `<li>${formatInline(item)}</li>`).join("")}</${tag}>`);
  items.length = 0;
}

export function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  const paragraph: string[] = [];
  const unorderedList: string[] = [];
  const orderedList: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraph, blocks);
      flushList(unorderedList, blocks, false);
      flushList(orderedList, blocks, true);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph(paragraph, blocks);
      flushList(unorderedList, blocks, false);
      flushList(orderedList, blocks, true);
      const level = Math.min(6, headingMatch[1].length);
      blocks.push(`<h${level}>${formatInline(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^- (.+)$/);
    if (unorderedMatch) {
      flushParagraph(paragraph, blocks);
      flushList(orderedList, blocks, true);
      unorderedList.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph(paragraph, blocks);
      flushList(unorderedList, blocks, false);
      orderedList.push(orderedMatch[1].trim());
      continue;
    }

    flushList(unorderedList, blocks, false);
    flushList(orderedList, blocks, true);
    paragraph.push(trimmed);
  }

  flushParagraph(paragraph, blocks);
  flushList(unorderedList, blocks, false);
  flushList(orderedList, blocks, true);

  return blocks.join("\n");
}
