import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Save, RefreshCw, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { docsService } from '@/services/docsService';

const DOCS_ADMIN_EMAIL = 'jesusnatec@gmail.com';

export const DocsManager: React.FC = () => {
  const { user } = useAuth();
  const isDocsAdmin = useMemo(() => {
    return (
      !!user &&
      (user.role === 'ADMIN' || user.role === 'SUPERADMIN') &&
      user.email === DOCS_ADMIN_EMAIL
    );
  }, [user]);

  const [docs, setDocs] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = content !== originalContent;

  const loadDocs = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await docsService.listDocs();
      setDocs(list);
      if (!selectedDoc && list.length > 0) {
        setSelectedDoc(list[0]);
      }
    } catch (err) {
      setError('No se pudo cargar la lista de documentos.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadDoc = async (name: string) => {
    setLoadingDoc(true);
    setError(null);
    try {
      const doc = await docsService.getDoc(name);
      setContent(doc.content);
      setOriginalContent(doc.content);
    } catch (err) {
      setError('No se pudo cargar el documento.');
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleSelectDoc = (name: string) => {
    if (name === selectedDoc) return;
    setSelectedDoc(name);
  };

  const handleSave = async () => {
    if (!selectedDoc || !isDirty) return;
    setSaving(true);
    setError(null);
    try {
      await docsService.updateDoc(selectedDoc, content);
      setOriginalContent(content);
    } catch (err) {
      setError('No se pudo guardar el documento.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isDocsAdmin) return;
    loadDocs();
  }, [isDocsAdmin]);

  useEffect(() => {
    if (!isDocsAdmin || !selectedDoc) return;
    loadDoc(selectedDoc);
  }, [isDocsAdmin, selectedDoc]);

  if (!isDocsAdmin) {
    return (
      <div className="min-h-screen px-6 py-10 text-zinc-200">
        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center space-x-3 text-red-300">
            <Lock size={22} />
            <h1 className="text-xl font-semibold">Acceso restringido</h1>
          </div>
          <p className="mt-3 text-zinc-400">
            Esta sección está disponible únicamente para el administrador autorizado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Biblioteca de Documentación</h1>
            <p className="text-sm text-zinc-400">Leer y editar los documentos internos del proyecto.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDocs}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700/70 text-zinc-300 hover:text-white hover:border-zinc-500/70 transition"
              disabled={loadingList}
            >
              <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
              <span>Actualizar lista</span>
            </button>
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                isDirty
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30'
                  : 'border-zinc-700/70 text-zinc-500 cursor-not-allowed'
              }`}
              disabled={!isDirty || saving}
            >
              <Save size={16} className={saving ? 'animate-pulse' : ''} />
              <span>{saving ? 'Guardando...' : 'Guardar cambios'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-4 h-full">
            <div className="flex items-center gap-2 text-zinc-300 mb-3">
              <FileText size={16} />
              <span className="text-sm uppercase tracking-wider">Documentos</span>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {loadingList && docs.length === 0 && (
                <p className="text-sm text-zinc-500">Cargando documentos...</p>
              )}
              {!loadingList && docs.length === 0 && (
                <p className="text-sm text-zinc-500">No se encontraron documentos.</p>
              )}
              {docs.map((doc) => (
                <button
                  key={doc}
                  onClick={() => handleSelectDoc(doc)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    selectedDoc === doc
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-200'
                      : 'border border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  {doc}
                </button>
              ))}
            </div>
          </aside>

          <section className="bg-zinc-900/60 border border-zinc-800/70 rounded-2xl p-5">
            {!selectedDoc && (
              <div className="text-center text-zinc-400 py-16">Seleccioná un documento.</div>
            )}
            {selectedDoc && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedDoc}</h2>
                    <p className="text-xs text-zinc-500">Guardado en /docs</p>
                  </div>
                  {loadingDoc && <span className="text-xs text-zinc-400">Cargando...</span>}
                </div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="w-full h-[60vh] bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  spellCheck={false}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
