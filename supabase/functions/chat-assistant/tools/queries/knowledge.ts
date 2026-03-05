import { generateEmbedding } from '../../../_shared/embeddings.ts';

export async function semanticSearch(
  supabase: any,
  args: { query: string; source_types?: string[]; limit?: number },
  clientId: string,
) {
  const { query, source_types, limit = 8 } = args;

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_client_id: clientId,
      source_types: source_types || null,
      match_threshold: 0.2,
      match_count: limit,
    });

    if (error) {
      console.error('[semantic_search] RPC error:', error);
      return { error: error.message };
    }

    return {
      results: (data || []).map((row: any) => ({
        source: row.source_table,
        source_id: row.source_id,
        content: row.content_text,
        metadata: row.metadata,
        relevance: Math.round(row.similarity * 100) / 100,
      })),
      result_count: data?.length || 0,
    };
  } catch (err: any) {
    console.error('[semantic_search] Error:', err);
    return { error: err.message };
  }
}
