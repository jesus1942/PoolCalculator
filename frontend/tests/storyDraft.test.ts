import test from 'node:test';
import assert from 'node:assert/strict';
import { appendStoryDraft, createStoryDraft, type StoryCategory } from '../src/utils/storyDraft.ts';

test('un borrador requiere título y una cantidad válida de fotos adjuntas', () => {
  assert.equal(createStoryDraft({ title: '  ', category: 'PROGRESS', imageCount: 2 }), null);
  for (const imageCount of [0, -1, 1.5, NaN, Infinity]) {
    assert.equal(createStoryDraft({ title: 'Mi capítulo', category: 'PROGRESS', imageCount }), null);
  }
});

test('el relato conserva el título como contexto del autor y la cantidad real de fotos', () => {
  const draft = createStoryDraft({ title: '  Una pausa\npara conversar  ', category: 'NOTE', imageCount: 3 });
  assert.ok(draft?.includes('«Una pausa para conversar»'));
  assert.ok(draft.includes('3 fotografías'));
  const singlePhoto = createStoryDraft({ title: 'La primera página', category: 'PROGRESS', imageCount: 1 });
  assert.ok(singlePhoto?.includes('Una fotografía'));
});

test('ninguna categoría atribuye contenido a las fotos ni afirma un resultado de obra', () => {
  const categories: StoryCategory[] = ['PROGRESS', 'MILESTONE', 'ISSUE', 'NOTE', 'INSPECTION', 'DELIVERY', 'OTHER'];
  for (const category of categories) {
    const draft = createStoryDraft({ title: 'Registro del proyecto', category, imageCount: 2 });
    assert.ok(draft);
    assert.doesNotMatch(draft, /se (ve|observa)|podemos ver|completad|finalizad|terminad|aprobado|sin problemas|lista para/i);
  }
});

test('aplicar conserva literalmente la descripción y añade el borrador como otro párrafo', () => {
  const authorText = '  Anotación del equipo.\nDetalles que hay que conservar.  ';
  assert.equal(appendStoryDraft(authorText, '  Un capítulo para recordar.  '), `${authorText}\n\nUn capítulo para recordar.`);
  assert.equal(appendStoryDraft(authorText, '   '), authorText);
  assert.equal(appendStoryDraft('', 'Un capítulo para recordar.'), 'Un capítulo para recordar.');
});

test('aplicar una propuesta repetida no duplica un párrafo que ya existe', () => {
  const draft = createStoryDraft({ title: 'Nuevo registro', category: 'PROGRESS', imageCount: 2 })!;
  const description = appendStoryDraft('Texto escrito por el equipo.', draft);
  assert.equal(appendStoryDraft(description, draft), description);
  const editedDraft = 'Un primer párrafo editado.\n\nUn segundo párrafo editado.';
  const withEditedDraft = appendStoryDraft(description, editedDraft);
  assert.equal(appendStoryDraft(withEditedDraft, editedDraft), withEditedDraft);
});
