/** Estado de espera compartido por la sesión y las páginas cargadas bajo demanda. */
export const PageLoading = ({ label = 'Cargando…' }: { label?: string }) => (
  <div className="flex min-h-[50vh] items-center justify-center px-6" role="status" aria-live="polite">
    <div className="text-center" style={{ color: 'var(--ink-soft)' }}>
      <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
      <p>{label}</p>
    </div>
  </div>
);
