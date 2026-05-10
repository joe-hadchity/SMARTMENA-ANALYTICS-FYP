const { tokenize } = require("./trendTextUtils");

const DIMENSIONS = 64;

async function embedEvidence(evidence) {
  return (evidence || []).map((item) => ({
    ...item,
    embedding: embedText([
      item.title,
      item.caption,
      ...(item.keywords || []),
      ...(item.hashtags || []),
    ].filter(Boolean).join(" ")),
  }));
}

function embedText(text) {
  const vector = Array.from({ length: DIMENSIONS }, () => 0);
  const tokens = tokenize(text);
  if (!tokens.length) return vector;

  for (const token of tokens) {
    const index = hashToken(token) % DIMENSIONS;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Number((v / magnitude).toFixed(6)));
}

function cosine(a = [], b = []) {
  const len = Math.min(a.length, b.length);
  if (!len) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i += 1) {
    const av = Number(a[i] || 0);
    const bv = Number(b[i] || 0);
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function averageEmbedding(items) {
  const vectors = (items || []).map((i) => i.embedding).filter(Boolean);
  if (!vectors.length) return Array.from({ length: DIMENSIONS }, () => 0);
  const out = Array.from({ length: DIMENSIONS }, () => 0);
  for (const vector of vectors) {
    for (let i = 0; i < DIMENSIONS; i += 1) out[i] += Number(vector[i] || 0);
  }
  return out.map((v) => Number((v / vectors.length).toFixed(6)));
}

function hashToken(token) {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

module.exports = {
  DIMENSIONS,
  averageEmbedding,
  cosine,
  embedEvidence,
  embedText,
};
