// Lightweight client-side search over support articles / SOPs. The corpus is
// small (tens of rows), so we load the rows once and rank in memory rather than
// round-tripping the DB per keystroke. RLS still decides which rows the caller
// ever received, so this filters only what the viewer is already allowed to see.

export interface SearchableArticle {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  tags?: string[] | null;
}

// Field weights — a title hit matters more than a body hit.
const WEIGHT_TITLE = 5;
const WEIGHT_TAGS = 3;
const WEIGHT_EXCERPT = 2;
const WEIGHT_CONTENT = 1;

function scoreArticle(article: SearchableArticle, terms: string[]): number {
  const title = article.title.toLowerCase();
  const tags = (article.tags ?? []).join(" ").toLowerCase();
  const excerpt = (article.excerpt ?? "").toLowerCase();
  const content = (article.content ?? "").toLowerCase();

  let total = 0;
  for (const term of terms) {
    let termScore = 0;
    if (title.includes(term)) termScore += WEIGHT_TITLE;
    if (tags.includes(term)) termScore += WEIGHT_TAGS;
    if (excerpt.includes(term)) termScore += WEIGHT_EXCERPT;
    if (content.includes(term)) termScore += WEIGHT_CONTENT;
    // AND semantics: every term must appear in at least one field.
    if (termScore === 0) return 0;
    total += termScore;
  }
  return total;
}

/**
 * Rank `rows` against `query`, returning only matches (every whitespace-split
 * term must appear somewhere), most relevant first. Empty query returns rows
 * unchanged.
 */
export function searchArticles<T extends SearchableArticle>(
  rows: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;

  return rows
    .map((row) => ({ row, score: scoreArticle(row, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.row);
}
