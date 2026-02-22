const HASH_DIMENSION = 128;

function hashToken(token: string) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash *= 16777619;
  }
  return Math.abs(hash >>> 0);
}

function normalize(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
}

export function createHashedEmbedding(text: string, dimensions = HASH_DIMENSION) {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const index = hashToken(token) % dimensions;
    vector[index] += 1;
  }

  return normalize(vector);
}

export async function createEmbedding(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return createHashedEmbedding(text);
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small'
    })
  });

  if (!response.ok) {
    return createHashedEmbedding(text);
  }

  const json = await response.json();
  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    return createHashedEmbedding(text);
  }

  return normalize(embedding.map((value: unknown) => Number(value)));
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  const size = Math.min(a.length, b.length);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < size; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / Math.sqrt(normA * normB);
}
