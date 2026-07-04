// Talks to the /api/identify-card serverless function, which holds the
// Anthropic API key server-side and never exposes it to the browser.
export async function identifyCard(imageBase64, mediaType) {
  const res = await fetch('/api/identify-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, mediaType })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Identify request failed (${res.status}): ${text}`);
  }

  return res.json();
  // Expected shape:
  // {
  //   player, year, set, parallel, cardNumber, sport,
  //   gradingCompany, grade, estimatedValue, valueRange: [low, high],
  //   confidence: 'high' | 'medium' | 'low', notes
  // }
}
