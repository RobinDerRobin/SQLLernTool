/** Ported from the prototype's `stripHtml`: a tag-stripper, not a full HTML parser. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}
