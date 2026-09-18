type PublicUpdateSource = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  images: unknown;
  isPublic: boolean;
  createdAt: Date | string;
};

type PublicProjectSource = {
  name: string;
  clientName: string;
  status: string;
  createdAt: Date | string;
  totalCost: number;
  materialCost: number;
  laborCost: number;
};

/** Sólo admite los formatos raster del editor y las rutas públicas de imágenes existentes. */
export function normalizePublicImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.filter((image): image is string => {
    if (typeof image !== 'string' || !image || /[\u0000-\u0020\u007f\\]/.test(image)) return false;
    if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(image)) return true;

    if (/^https?:\/\//i.test(image)) {
      try {
        const url = new URL(image);
        return Boolean(url.hostname) && !url.username && !url.password;
      } catch {
        return false;
      }
    }

    // No permite URLs relativas a otro host, rutas de API ni recorridos fuera del directorio.
    if (!/^\/?(?:uploads|pool-images)\//.test(image)) return false;
    try {
      const pathname = decodeURIComponent(image.split(/[?#]/, 1)[0]);
      return !/[\u0000-\u001f\u007f\\%]/.test(pathname)
        && !pathname.split('/').some((part) => part === '.' || part === '..' || part.toLowerCase() === 'project-packages');
    } catch {
      return false;
    }
  }))];
}

/**
 * Lista blanca compartida por JSON y CSV. «Mostrar detalles» habilita las descripciones
 * y fotografías; al desactivarlo sólo quedan título, categoría y fecha. La metadata
 * técnica nunca es pública, aunque ese permiso esté habilitado.
 */
export function buildPublicTimeline(updates: PublicUpdateSource[], showDetails: boolean) {
  return updates
    .filter((update) => update.isPublic === true)
    .map((update) => ({
      id: update.id,
      type: 'PROJECT_UPDATE' as const,
      createdAt: update.createdAt,
      title: update.title,
      category: update.category,
      ...(showDetails === true ? { description: update.description ?? null } : {}),
      images: showDetails === true ? normalizePublicImages(update.images) : [],
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** No propaga configuraciones, credenciales, contactos privados ni costos anidados. */
export function buildPublicProject(project: PublicProjectSource, showCosts: boolean) {
  return {
    name: project.name,
    clientName: project.clientName,
    status: project.status,
    createdAt: project.createdAt,
    ...(showCosts === true ? {
      totalCost: project.totalCost,
      materialCost: project.materialCost,
      laborCost: project.laborCost,
    } : {}),
  };
}
