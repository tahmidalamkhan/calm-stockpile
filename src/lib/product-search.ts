/** Match every search term anywhere in a product's combined name and SKU. */
export function matchesProductSearch(
  product: { name: string; sku: string },
  query: string,
): boolean {
  return matchesSearchText(`${product.name} ${product.sku}`, query);
}

export function matchesSearchText(text: string, query: string): boolean {
  const searchable = text.toLowerCase();
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return terms.every((term) => searchable.includes(term));
}