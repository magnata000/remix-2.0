/**
 * Detecção de @menções em textos livres (descrições e comentários).
 * Puramente funcional: recebe um `TeamNameIndex` como entrada e não conhece
 * mocks, contexto ou stores.
 */

/** Mapa `nome minúsculo → id`. Construa uma vez por render/consumidor. */
export type TeamNameIndex = ReadonlyMap<string, string>;

/** Constrói o índice a partir de uma lista `{ id, name }`. */
export function buildTeamNameIndex(
  members: ReadonlyArray<{ id: string; name: string }>,
): TeamNameIndex {
  const idx = new Map<string, string>();
  for (const m of members) idx.set(m.name.toLowerCase(), m.id);
  return idx;
}

/** Resolve um nome (ou "todos") para um id — ou `null`. */
export function resolveMentionId(name: string, index: TeamNameIndex): string | null {
  return index.get(name.toLowerCase()) ?? null;
}

/**
 * Extrai menções válidas de um texto. Aceita `@Nome Sobrenome` de forma gulosa
 * (maior prefixo casável ganha) e a palavra-chave `@todos`.
 */
export function extractMentions(text: string, index: TeamNameIndex): string[] {
  if (!text) return [];
  const re = /@([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)/g;
  const found: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const words = match[1].trim().split(/\s+/);
    for (let n = words.length; n >= 1; n--) {
      const candidate = words.slice(0, n).join(" ");
      const lc = candidate.toLowerCase();
      if (lc === "todos" || index.has(lc)) {
        found.push(candidate);
        break;
      }
    }
  }
  return found;
}

/**
 * `true` se o texto contém pelo menos uma menção que atinge `userId`
 * (menção direta ou `@todos`).
 */
export function textMentionsUser(
  text: string,
  userId: string,
  index: TeamNameIndex,
  cache?: Map<string, string[]>,
): boolean {
  let mentions = cache?.get(text);
  if (!mentions) {
    mentions = extractMentions(text, index);
    cache?.set(text, mentions);
  }
  return mentions.some((m) => {
    const lc = m.toLowerCase();
    if (lc === "todos") return true;
    return index.get(lc) === userId;
  });
}
