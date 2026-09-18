import { Component, type ErrorInfo, type ReactNode } from 'react';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

/** Permite recuperar la app si falla una pantalla o un archivo de una actualización. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('No se pudo mostrar la aplicación:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-stone-900">
        <div className="max-w-md text-center" role="alert">
          <h1 className="text-2xl font-semibold">No pudimos cargar esta pantalla</h1>
          <p className="mt-3 text-stone-600">Recargá para intentarlo otra vez. Si estabas editando, revisá los últimos cambios guardados al volver.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">Recargar aplicación</button>
          <a href={publicAssetUrl('')} className="mt-4 block text-teal-800 underline">Volver al inicio</a>
        </div>
      </main>
    );
  }
}
