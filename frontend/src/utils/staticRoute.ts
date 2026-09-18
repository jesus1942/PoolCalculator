/** Recupera la ruta que el 404 estático de Pages transporta en el fragmento.
 * Sólo actúa en la raíz de esta app; los anchors normales quedan intactos.
 */
export function restoreStaticRoute(location: { pathname: string; hash: string }, baseUrl: string): string | null {
  const base = `/${baseUrl.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
  if (location.pathname !== `${base}/` && location.pathname !== base) return null;
  const route = location.hash.slice(1);
  if (!route.startsWith('/') || route.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(route)) return null;
  try {
    decodeURI(route); // Un fragmento mal codificado no debe romper el arranque.
    const target = new URL(`${base}${route}`, 'https://route.invalid');
    if (target.origin !== 'https://route.invalid' || !target.pathname.startsWith(`${base}/`)) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
