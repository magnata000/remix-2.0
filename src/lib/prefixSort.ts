/**
 * Extrai o número do prefixo do nome do cliente (ex.: "AND.99 - Cliente" → 99).
 * Reconhece variações como "AND.1", "AND. 111 -", "AND-ELDA.134" e "OCT.138".
 * Retorna null quando não houver prefixo numérico.
 */
export function extractPrefixNumber(name: string): number | null {
  const match = name.match(/^[A-Z]+(?:-[A-Z]+)?\.\s?(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Comparação numérica para ordenar por prefixo do nome.
 * Nomes sem prefixo vão para o final, ordenados alfabeticamente.
 */
export function compareByPrefixNumber(aName: string, bName: string): number {
  const aNum = extractPrefixNumber(aName);
  const bNum = extractPrefixNumber(bName);
  if (aNum !== null && bNum !== null) return aNum - bNum;
  if (aNum !== null) return -1;
  if (bNum !== null) return 1;
  return aName.localeCompare(bName, "pt-BR");
}
