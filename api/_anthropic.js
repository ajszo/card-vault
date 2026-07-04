// Shared helper for calling Claude with the web_search tool and parsing a
// JSON object out of the text response. Used by both identify-card.js and
// price-card.js so the "call model, strip fences, parse JSON" logic isn't
// duplicated.
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
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
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
