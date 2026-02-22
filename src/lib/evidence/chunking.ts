const CHUNK_CHAR_LIMIT = 1200;

export function splitIntoChunks(text: string) {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_CHAR_LIMIT) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }

      let start = 0;
      while (start < paragraph.length) {
        chunks.push(paragraph.slice(start, start + CHUNK_CHAR_LIMIT));
        start += CHUNK_CHAR_LIMIT;
      }
      continue;
    }

    if ((current + '\n\n' + paragraph).trim().length > CHUNK_CHAR_LIMIT) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
