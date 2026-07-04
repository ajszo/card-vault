// Vercel serverless function (Node.js runtime).
// Given a card's already-known identity (no photo needed), searches for
// recent actual sold listings and returns them as individual comps. The
// median/mean are computed here in plain arithmetic rather than trusting
// the model to do the math, so the number is verifiable from the comps list.
export const config = { runtime: 'nodejs' };

import { callClaudeJson } from './_anthropic.js';

const SYSTEM_PROMPT = `You are a sports card pricing research assistant.
You will be given the identity of one specific sports card: player, year,
set, parallel/serial numbering, card number, sport, and grade if any.

Search the web for RECENT actual SOLD listings for this exact card - same
parallel/serial and same grade/grading company if one was given. Do not use
active/asking-price listings, only completed sales. Good sources: eBay
sold/completed listings, PWCC auction results, Goldin auction results,
130point.com sold search, CardLadder. Prioritize the most recent sales
(ideally within the last 6 months) over older ones.

Search result snippets are often not enough to confirm an actual sold price
and date - use the fetch tool to open promising listing pages (eBay sold
listings, 130point results, auction house pages) and read the real sale
price, date, and title directly from the page before including it as a comp.
Only include a comp once you've confirmed its price and date this way, or
from a search snippet that already clearly states them.

Return between 3 and 10 individual comps if you can find that many. If you
cannot find sales of the exact parallel/grade, use the closest comps you can
find and explain the discrepancy in "notes". If you find no usable comps at
all, return an empty comps array and explain why in "notes".

Respond with ONLY a JSON object, no preamble, no markdown fences, matching
exactly this shape:
{
  "comps": [
    { "date": "YYYY-MM-DD" | null, "price": number, "source": string, "url": string | null, "title": string }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { player, year, set, parallel, cardNumber, sport, gradingCompany, grade } = req.body || {};
  if (!player) {
    res.status(400).json({ error: 'Missing card identity (player is required)' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    return;
  }

  const description = [
    year, set, parallel, cardNumber && `#${cardNumber}`, player, sport,
    gradingCompany && grade && `${gradingCompany} ${grade}`
  ].filter(Boolean).join(' ');

  try {
    const parsed = await callClaudeJson({
      apiKey,
      model: 'claude-opus-4-8',
      system: SYSTEM_PROMPT,
      maxTokens: 3000,
      content: [{ type: 'text', text: `Find recent sold comps for this card: ${description}` }]
    });

    const comps = Array.isArray(parsed.comps)
      ? parsed.comps.filter((c) => c && typeof c.price === 'number' && c.price > 0)
      : [];
    const prices = comps.map((c) => c.price).sort((a, b) => a - b);

    let medianValue = null;
    let meanValue = null;
    if (prices.length) {
      const mid = Math.floor(prices.length / 2);
      medianValue = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
      meanValue = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    }

    res.status(200).json({
      comps,
      medianValue,
      meanValue,
      estimatedValue: medianValue,
      valueRange: prices.length ? [prices[0], prices[prices.length - 1]] : null,
      confidence: parsed.confidence || (comps.length ? 'medium' : 'low'),
      notes: parsed.notes || ''
    });
  } catch (err) {
    res.status(err.message?.startsWith('Anthropic API error') ? 502 : 500).json({ error: err.message || 'Unknown server error' });
  }
}
