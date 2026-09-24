export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'd')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'item';
}