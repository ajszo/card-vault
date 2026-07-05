// Vercel serverless function (Node.js runtime).
// Given a card's already-known identity (no photo needed), searches for
// recent actual sold listings and returns them as individual comps. The
// median/mean are computed here in plain arithmetic rather than trusting
// the model to do the math, so the number is verifiable from the comps list.
export const config = { runtime: 'nodejs' };

import { callClaudeJson } from './_anthropic.js';

const SYSTEM_PROMPT = `You are a sports card pricing and scarcity research assistant.
You will be given the identity of one specific sports card: player, year,
set, parallel/serial numbering, card number, sport, and grade if any.

PART 1 - SOLD COMPS
You will be given an eBay URL that is PRE-FILTERED to sold/completed listings
only (it has LH_Sold=1&LH_Complete=1 in the query string) - every listing on
that page is a real completed sale, not an active one. Fetch that URL FIRST,
before doing any general web search. It's the fastest, most reliable source
and won't waste tool calls on active listings by mistake.

Read individual sold listings directly off that page: price, date, and title.
If it doesn't have enough matching results (wrong parallel/grade, too few, or
too old), THEN use web_search for other sold-comp sources: 130point.com sold
search, CardLadder, PWCC auction results, Goldin auction results. Prioritize
the most recent sales (ideally within the last 6 months) over older ones.

Do not spend tool calls investigating active/asking-price listings (Buy It
Now, Best Offer, current bid) - they are not sold comps and are not useful
here. If a search result is clearly an active listing, skip it without
fetching it.

Return between 3 and 10 individual comps if you can find that many. If you
cannot find sales of the exact parallel/grade, use the closest comps you can
find and explain the discrepancy in "notes". If you find no usable comps at
all, return an empty comps array and explain why in "notes".

PART 2 - SCARCITY DATA (only if a grading company and grade were given)
Look up the population report for this exact card/parallel at that specific
grading company and grade (e.g. PSA population report, CGC census, SGC pop
report - searchable on the grading company's own site or psacard.com). Return
the population count as "popCount". Also estimate how many total sales of
this exact card+grade happened in the last 12 months - not just the handful
of comps above, but the broader count (CardLadder and 130point often show a
total sale count for a card). Return that as "sales12mo". If the card has no
grading company (raw/ungraded), or you cannot find real population/sales
volume data, return null for both rather than guessing.

Respond with ONLY a JSON object, no preamble, no markdown fences, matching
exactly this shape:
{
  "comps": [
    { "date": "YYYY-MM-DD" | null, "price": number, "source": string, "url": string | null, "title": string }
  ],
  "popCount": number | null,
  "sales12mo": number | null,
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

  // web_fetch can only retrieve a URL that's already in the conversation, so
  // this pre-filtered eBay sold-listings search is handed to the model
  // directly rather than relying on it to discover the LH_Sold param itself.
  const ebaySoldUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(description)}&LH_Sold=1&LH_Complete=1`;

  try {
    const parsed = await callClaudeJson({
      apiKey,
      model: 'claude-opus-4-8',
      system: SYSTEM_PROMPT,
      maxTokens: 5000,
      content: [{
        type: 'text',
        text: `Find recent sold comps for this card: ${description}\n\nSold/completed eBay listings for this search (fetch this first): ${ebaySoldUrl}`
      }]
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

    // Scarcity Index = 12-month sales / population count. Ungraded cards have
    // no cert population, so the index doesn't apply regardless of what the
    // model returned - force it to null rather than trust a stray guess.
    const popCount = gradingCompany && typeof parsed.popCount === 'number' && parsed.popCount > 0
      ? parsed.popCount
      : null;
    const sales12mo = gradingCompany && typeof parsed.sales12mo === 'number' && parsed.sales12mo >= 0
      ? parsed.sales12mo
      : null;
    const scarcityIndex = popCount && sales12mo !== null
      ? Math.round((sales12mo / popCount) * 1000) / 10
      : null;

    res.status(200).json({
      comps,
      medianValue,
      meanValue,
      estimatedValue: medianValue,
      valueRange: prices.length ? [prices[0], prices[prices.length - 1]] : null,
      popCount,
      sales12mo,
      scarcityIndex,
      confidence: parsed.confidence || (comps.length ? 'medium' : 'low'),
      notes: parsed.notes || ''
    });
  } catch (err) {
    res.status(err.message?.startsWith('Anthropic API error') ? 502 : 500).json({ error: err.message || 'Unknown server error' });
  }
}
