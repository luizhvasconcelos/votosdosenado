export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function matchesSearch(query: string, ...values: Array<string | null | undefined>) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeSearch(values.filter(Boolean).join(" "));
  return terms.every(term => haystack.includes(term));
}
