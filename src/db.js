import { get, set, del, keys } from 'idb-keyval';

const CARD_PREFIX = 'card:';

function cardKey(id) {
  return `${CARD_PREFIX}${id}`;
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveCard(card) {
  const toSave = { ...card, updatedAt: Date.now() };
  await set(cardKey(toSave.id), toSave);
  return toSave;
}

export async function deleteCard(id) {
  await del(cardKey(id));
}

export async function getAllCards() {
  const allKeys = await keys();
  const cardKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(CARD_PREFIX));
  const cards = await Promise.all(cardKeys.map((k) => get(k)));
  return cards.filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}
