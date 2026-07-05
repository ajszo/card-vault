// Shared helper for calling Claude with web_search + web_fetch and parsing a
// JSON object out of the text response. Used by both identify-card.js and
// price-card.js so the "call model, strip fences, parse JSON" logic isn't
// duplicated.
//
// web_fetch can only retrieve a URL that's already appeared in the
// conversation - in practice that means a URL surfaced by a prior
// web_search result. So the model's usual path is: search for candidate
// listings, then fetch the promising ones to read actual page content
// instead of just the search snippet (snippets alone often don't contain
// confirmed sold prices).
export async function callClaudeJson({ apiKey, model, system, content, maxTokens = 1200 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      // Caps worst-case cost on a hard-to-price card: with the direct
      // pre-filtered eBay URL and "don't retry dead ends" prompt guidance,
      // a well-behaved run rarely needs anywhere near this many calls -
      // this budget mainly exists to make failures cheap instead of
      // letting the model grind through many search/fetch attempts.
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 8 },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 6, max_content_tokens: 2500 }
      ],
      messages: [{ role: 'user', content }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${errText}`);
  }

  const data = await response.json();
  const textBlocks = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const cleaned = textBlocks.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to grabbing the last {...} block in case the model added stray text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse a JSON result from the model response');
  }
}
