// supabase/functions/_shared/embeddings.ts

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_INPUT_CHARS = 32000;

/**
 * Generate a 1536-dim embedding vector for the given text using OpenAI.
 * Truncates input to 32000 chars to stay within model limits.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const input = text.slice(0, MAX_INPUT_CHARS);

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Embedding API error:', response.status, errorText);
    throw new Error(`Embedding API error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('No embedding returned from OpenAI API');
  }

  return embedding;
}

/**
 * Build a human-readable text blob for a given source table row.
 * Used as input to generateEmbedding().
 */
export function buildContentText(sourceTable: string, row: any): string {
  switch (sourceTable) {
    case 'meetings': {
      const decisions = Array.isArray(row.decisions)
        ? row.decisions.join('; ')
        : row.decisions ?? '';
      const nextSteps = Array.isArray(row.next_steps)
        ? row.next_steps.join('; ')
        : row.next_steps ?? '';
      const transcript = typeof row.transcript === 'string'
        ? row.transcript.slice(0, 5000)
        : '';
      return [
        row.summary && `Summary: ${row.summary}`,
        row.date && `Date: ${row.date}`,
        row.attendees && `Attendees: ${row.attendees}`,
        decisions && `Decisions: ${decisions}`,
        nextSteps && `Next Steps: ${nextSteps}`,
        transcript && `Transcript: ${transcript}`,
      ].filter(Boolean).join('\n');
    }

    case 'tasks': {
      const comments = Array.isArray(row.comments)
        ? row.comments.map((c: any) => c?.content ?? c).filter(Boolean).join(' | ')
        : '';
      return [
        row.title && `Task: ${row.title}`,
        row.description && `Description: ${row.description}`,
        row.status && `Status: ${row.status}`,
        row.priority && `Priority: ${row.priority}`,
        row.due_date && `Due: ${row.due_date}`,
        comments && `Comments: ${comments}`,
      ].filter(Boolean).join('\n');
    }

    case 'quarterly_goals': {
      const title = row.title ?? row.goal ?? '';
      return [
        title && `Goal: ${title}`,
        row.description && `Description: ${row.description}`,
        row.target_metric && `Target Metric: ${row.target_metric}`,
        row.status && `Status: ${row.status}`,
      ].filter(Boolean).join('\n');
    }

    case 'website_form_submissions': {
      const formData = row.form_data
        ? JSON.stringify(row.form_data).slice(0, 2000)
        : '';
      return [
        row.form_name && `Form: ${row.form_name}`,
        row.submitter_name && `Submitter: ${row.submitter_name}`,
        row.submitter_email && `Email: ${row.submitter_email}`,
        formData && `Data: ${formData}`,
        row.created_at && `Submitted: ${row.created_at}`,
      ].filter(Boolean).join('\n');
    }

    case 'reports': {
      const content = typeof row.content === 'string'
        ? row.content.slice(0, 5000)
        : '';
      return [
        row.title && `Report: ${row.title}`,
        row.type && `Type: ${row.type}`,
        content && `Content: ${content}`,
        row.created_at && `Created: ${row.created_at}`,
      ].filter(Boolean).join('\n');
    }

    case 'communication_logs': {
      const subject = row.subject ?? row.type ?? '';
      const content = typeof row.content === 'string'
        ? row.content.slice(0, 3000)
        : '';
      return [
        subject && `Subject: ${subject}`,
        row.direction && `Direction: ${row.direction}`,
        content && `Content: ${content}`,
        row.created_at && `Date: ${row.created_at}`,
      ].filter(Boolean).join('\n');
    }

    case 'social_media_posts': {
      const content = typeof row.content === 'string'
        ? row.content.slice(0, 2000)
        : '';
      const analytics = row.analytics
        ? JSON.stringify(row.analytics).slice(0, 500)
        : '';
      return [
        row.platform && `Platform: ${row.platform}`,
        content && `Content: ${content}`,
        row.status && `Status: ${row.status}`,
        row.published_at && `Published: ${row.published_at}`,
        analytics && `Analytics: ${analytics}`,
      ].filter(Boolean).join('\n');
    }

    case 'blog_posts': {
      const content = typeof row.content === 'string'
        ? row.content.slice(0, 5000)
        : '';
      return [
        row.title && `Title: ${row.title}`,
        content && `Content: ${content}`,
        row.status && `Status: ${row.status}`,
        row.published_at && `Published: ${row.published_at}`,
      ].filter(Boolean).join('\n');
    }

    case 'marketing_ideas': {
      const title = row.title ?? row.idea ?? '';
      return [
        title && `Idea: ${title}`,
        row.description && `Description: ${row.description}`,
        row.category && `Category: ${row.category}`,
        row.status && `Status: ${row.status}`,
      ].filter(Boolean).join('\n');
    }

    default:
      return JSON.stringify(row).slice(0, 5000);
  }
}
