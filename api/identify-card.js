// Vercel serverless function (Node.js runtime).
// Holds ANTHROPIC_API_KEY server-side. Never call the Anthropic API with a
// key embedded in frontend code.
export const config = { runtime: 'nodejs' };

const SYSTEM_PROMPT = `You are a sports card identification and pricing assistant.
You will be shown a photo of a single sports trading card (front or back).
Identify it as precisely as you can, then search the web for recent comparable
sales (eBay sold listings, PWCC, Goldin, 130point, etc.) to estimate current
market value for that exact card, parallel/serial number, and grade if visible.

Respond with ONLY a JSON object, no preamble, no markdown fences, matching
exactly this shape:
{
  "player": string,
  "year": string,
  "set": string,
  "parallel": string | null,
  "cardNumber": string | null,
  "sport": "Baseball" | "Basketball" | "Football" | "Hockey" | "Soccer" | "Other",
  "gradingCompany": string | null,
  "grade": string | null,
  "estimatedValue": number,
  "valueRange": [number, number],
  "confidence": "high" | "medium" | "low",
  "notes": string
}
If you cannot identify the card with reasonable confidence, still return your
best guess with "confidence": "low" and explain what's unclear in "notes".`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { image, mediaType } = req.body || {};
  if (!image) {
    res.status(400).json({ error: 'Missing image' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image }
              },
              { type: 'text', text: 'Identify this card and estimate its current market value.' }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `Anthropic API error: ${errText}` });
      return;
    }

    const data = await response.json();
    const textBlocks = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const cleaned = textBlocks.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fall back to grabbing the last {...} block in case the model added stray text
      const match = cleaned.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) {
      res.status(502).json({ error: 'Could not parse a card result from the model response' });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
