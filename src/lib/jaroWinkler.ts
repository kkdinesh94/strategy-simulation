/**
 * Jaro-Winkler string similarity.
 * Mirrors the algorithm inline in functions/api/[[route]].ts's jaroWinkler() exactly,
 * so scores computed client-side and server-side always agree.
 */

export function jaroSimilarity(s1: string, s2: string): number {
  const a = s1.trim().toLowerCase();
  const b = s2.trim().toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const firstMatches = new Array(a.length).fill(false);
  const secondMatches = new Array(b.length).fill(false);
  let matches = 0;

  for (let firstIndex = 0; firstIndex < a.length; firstIndex += 1) {
    const start = Math.max(0, firstIndex - matchDistance);
    const end = Math.min(firstIndex + matchDistance + 1, b.length);
    for (let secondIndex = start; secondIndex < end; secondIndex += 1) {
      if (secondMatches[secondIndex] || a[firstIndex] !== b[secondIndex]) continue;
      firstMatches[firstIndex] = true;
      secondMatches[secondIndex] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;

  const firstOrdered = a.split("").filter((_, index) => firstMatches[index]);
  const secondOrdered = b.split("").filter((_, index) => secondMatches[index]);
  let transpositions = 0;
  for (let index = 0; index < firstOrdered.length; index += 1) {
    if (firstOrdered[index] !== secondOrdered[index]) transpositions += 1;
  }
  return (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
}

export function jaroWinklerSimilarity(s1: string, s2: string, p = 0.1): number {
  const a = s1.trim().toLowerCase();
  const b = s2.trim().toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;

  const jaro = jaroSimilarity(a, b);
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix += 1;
  return jaro + prefix * p * (1 - jaro);
}

export function isBrandLineExtension(oldName: string, newName: string): boolean {
  return jaroWinklerSimilarity(oldName, newName) >= 0.6;
}
