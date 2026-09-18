import { useLayoutEffect, type RefObject } from 'react';

/** Las páginas lazy restauran su ancla cuando el contenido ya existe. */
export function useInitialPagePosition(pageRef?: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    let anchor = '';
    try { anchor = decodeURIComponent(window.location.hash.slice(1)); } catch { /* Fragmento inválido: portada. */ }
    const target = anchor ? document.getElementById(anchor) : null;
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    if (target && (!pageRef || pageRef.current?.contains(target))) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = previous;
  }, [pageRef]);
}
