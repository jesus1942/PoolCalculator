import { publicAssetUrl } from '@/utils/publicAssetUrl';

// Muestra editorial aislada: no consulta ni copia proyectos o fotografías de clientes.
export const clientStoryDemoImage = publicAssetUrl('story-demo/garden-pool.webp');

export const clientStoryDemoProject = {
  name: 'Un verano en casa',
  clientName: 'Familia de ejemplo',
  status: 'COMPLETED',
  createdAt: '2026-08-03T12:00:00Z',
};

export const clientStoryDemoEntries = [
  {
    id: 'demo-idea', type: 'PROJECT_UPDATE' as const, category: 'NOTE',
    createdAt: '2026-08-03T12:00:00Z', title: 'Antes del agua, una idea.',
    description: 'Al principio, todo cabía en una conversación. Miramos el patio de otra manera y apareció la idea de un lugar para quedarse un rato más. El jardín seguía siendo el mismo; lo que había cambiado era la forma de imaginarlo.\n\nAlgunas referencias, preguntas y ganas de pensar los días de verano. El primer registro del diario guarda ese punto de partida: todavía no estaba la piscina, pero ya había una historia por contar.',
    images: [],
  },
  {
    id: 'demo-patio', type: 'PROJECT_UPDATE' as const, category: 'PROGRESS',
    createdAt: '2026-08-10T15:30:00Z', title: 'El patio empieza a cambiar.',
    description: 'El patio dejó de verse como siempre. La idea que habíamos conversado empezó a ocupar un lugar, y con ella llegaron preguntas nuevas. Algunas se resolvieron junto al jardín; otras quedaron anotadas para volver a mirarlas con calma.\n\nEste capítulo guarda esa parte del recorrido que después cuesta recordar: la expectativa, las primeras decisiones y el momento en que una idea empieza a sentirse cercana.',
    images: [],
  },
  {
    id: 'demo-detalles', type: 'PROJECT_UPDATE' as const, category: 'MILESTONE',
    createdAt: '2026-08-20T14:00:00Z', title: 'Los detalles también cuentan.',
    description: 'Hubo un momento en que empezamos a mirar los detalles. El color junto al jardín, la sombra de los árboles y ese rincón donde ya imaginábamos dejar un libro. Las decisiones pequeñas le fueron dando carácter al conjunto.\n\nUn diario conserva algo que una lista de tareas no alcanza a contar: cómo un espacio empieza a sentirse propio. También por eso vale la pena detenerse en esta página.',
    images: [],
  },
  {
    id: 'demo-jardin', type: 'PROJECT_UPDATE' as const, category: 'DELIVERY',
    createdAt: '2026-08-27T17:00:00Z', title: 'Y ahora, los recuerdos.',
    description: 'La tarde cae despacio y el agua recoge las sombras del jardín. El patio ya no es solamente algo que se mira desde adentro: invita a salir, sentarse un rato y dejar que el día dure un poco más.\n\nHasta acá, el diario cuenta cómo llegamos. Lo que sigue tendrá otras escenas: conversaciones largas, libros a medio leer y veranos que todavía no tienen fecha. La obra termina; el lugar empieza a vivirse.',
    images: [clientStoryDemoImage],
  },
];

export const clientStoryDemoComments = [
  {
    id: 'demo-comment', authorName: 'Familia de ejemplo', kind: 'COMMENT' as const,
    body: 'Qué lindo poder volver al principio y ver cómo fue cambiando el patio.',
    reply: 'Este diario queda como recuerdo del recorrido. Gracias por acompañar cada capítulo.',
    createdAt: '2026-08-27T18:00:00Z', repliedAt: '2026-08-27T18:30:00Z',
  },
];
