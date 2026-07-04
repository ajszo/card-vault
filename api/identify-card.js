// Vercel serverless function (Node.js runtime).
// Holds ANTHROPIC_API_KEY server-side. Never call the Anthropic API with a
// key embedded in frontend code.
//
// This function only identifies the card. Pricing is a separate call
// (see price-card.js) so it can be re-run later ("refresh value") without
// needing the photo again, and so pricing always uses the same
// comps-based logic whether it's the first estimate or a later refresh.
export const config = { runtime: 'nodejs' };

import { callClaudeJson } from './_anthropic.js';

const SYSTEM_PROMPT = `You are a sports card identification assistant.
You will be shown one or two photos of a single sports trading card (front,
and optionally back). Look closely at small print - set logos, copyright
lines, card number, serial numbering (e.g. "12/99"), and foil/parallel
patterns - since these are usually what distinguishes the exact card and
parallel from similar-looking ones. If a back photo is included, use it to
confirm the set/manufacturer and card number, since those are often clearer
on the back than the front.

Identify it as precisely as you can. You may use web search only to verify
uncertain details (e.g. confirming a parallel/insert name against a set
checklist) - do not attempt to price the card here.

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

  const { image, mediaType, backImage, backMediaType } = req.body || {};
  if (!image) {
    res.status(400).json({ error: 'Missing image' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    return;
  }

  const content = [
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image }
    }
  ];
  if (backImage) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: backMediaType || 'image/jpeg', data: backImage }
    });
  }
  content.push({
    type: 'text',
    text: backImage
      ? 'First image is the front, second is the back. Identify this card.'
      : 'Identify this card.'
  });

  try {
    const parsed = await callClaudeJson({
      apiKey,
      model: 'claude-opus-4-8',
      system: SYSTEM_PROMPT,
      content,
      maxTokens: 800
    });
    res.status(200).json(parsed);
  } catch (err) {
    res.status(err.message?.startsWith('Anthropic API error') ? 502 : 500).json({ error: err.message || 'Unknown server error' });
  }
}
