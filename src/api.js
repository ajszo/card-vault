// Talks to the /api/identify-card serverless function, which holds the
// Anthropic API key server-side and never exposes it to the browser.
export async function identifyCard(imageBase64, mediaType, backImageBase64, backMediaType) {
  const res = await fetch('/api/identify-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: imageBase64,
      mediaType,
      backImage: backImageBase64 || undefined,
      backMediaType: backImageBase64 ? backMediaType : undefined
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Identify request failed (${res.status}): ${text}`);
  }

  return res.json();
  // Expected shape:
  // {
  //   player, year, set, parallel, cardNumber, sport,
  //   gradingCompany, grade, confidence: 'high' | 'medium' | 'low', notes
  // }
}

// Talks to /api/price-card - takes a known card identity (no photo) and
// returns recent sold comps plus a median/mean computed from them. Used both
// right after identifying a new card and for a later "refresh value".
export async function priceCard({ player, year, set, parallel, cardNumber, sport, gradingCompany, grade }) {
  const res = await fetch('/api/price-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player, year, set, parallel, cardNumber, sport, gradingCompany, grade })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pricing request failed (${res.status}): ${text}`);
  }

  return res.json();
  // Expected shape:
  // {
  //   comps: [{ date, price, source, url, title }],
  //   medianValue, meanValue, estimatedValue, valueRange: [low, high],
  //   estimateType: 'confirmed' | 'unconfirmed' | null,
  //   popCount, sales12mo, scarcityIndex,
  //   confidence: 'high' | 'medium' | 'low', notes
  // }
}
