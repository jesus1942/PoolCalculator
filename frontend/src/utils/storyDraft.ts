export type StoryCategory = 'PROGRESS' | 'MILESTONE' | 'ISSUE' | 'NOTE' | 'INSPECTION' | 'DELIVERY' | 'OTHER';

interface StoryDraftContext {
  title: string;
  category: StoryCategory;
  imageCount: number;
}

const OPENINGS: Record<StoryCategory, string> = {
  PROGRESS: 'La historia de tu piscina se escribe capítulo a capítulo.',
  MILESTONE: 'Algunos momentos merecen una página propia en la historia de tu piscina.',
  ISSUE: 'Esta historia también deja espacio para registrar lo que necesita atención.',
  NOTE: 'Los pequeños detalles también tienen un lugar en la historia de tu piscina.',
  INSPECTION: 'Mirar el proceso con atención también forma parte de esta historia.',
  DELIVERY: 'Cada registro suma una nueva página al recorrido de tu piscina.',
  OTHER: 'Tu piscina tiene una historia que vale la pena conservar.',
};

// El contexto es editorial: no recibe ni analiza imágenes, fechas o datos del cliente.
export function createStoryDraft({ title, category, imageCount }: StoryDraftContext): string | null {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  if (!cleanTitle || !Number.isInteger(imageCount) || imageCount < 1) return null;

  const photos = imageCount === 1
    ? 'Una fotografía acompaña este registro'
    : `${imageCount} fotografías acompañan este registro`;

  return `${OPENINGS[category] || OPENINGS.OTHER} Este capítulo lleva por título «${cleanTitle}». ${photos}, para que puedas volver a este momento del proyecto cuando quieras.`;
}

// Añadir un borrador conserva el texto del autor. La misma propuesta no se añade dos veces.
export function appendStoryDraft(description: string, draft: string): string {
  const cleanDraft = draft.trim();
  if (!cleanDraft) return description;

  const existingParagraphs = description.split(/\n\s*\n/).map(paragraph => paragraph.trim());
  const draftParagraphs = cleanDraft.split(/\n\s*\n/).map(paragraph => paragraph.trim());
  const alreadyIncluded = existingParagraphs.some((_, start) =>
    draftParagraphs.every((paragraph, offset) => paragraph === existingParagraphs[start + offset])
  );
  if (alreadyIncluded) {
    return description;
  }
  return description.trim() ? `${description}\n\n${cleanDraft}` : cleanDraft;
}
