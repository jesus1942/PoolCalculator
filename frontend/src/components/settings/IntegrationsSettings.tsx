import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageLoading } from '@/components/PageLoading';
import { API_BASE_URL } from '@/services/api';
import { integrationSettingsService, type IntegrationConfig, type IntegrationProvider, type IntegrationSettings } from '@/services/integrationSettingsService';

const providerNames: Record<IntegrationProvider, string> = {
  google: 'Google', smtp: 'Correo y recuperación de contraseña', whatsapp: 'WhatsApp', telegram: 'Telegram',
};
const suggestedGoogleCallback = `${API_BASE_URL}/api/auth/google/callback`;

/** Edita integraciones de plataforma; conserva secretos vacíos y detecta edición concurrente. */
export const IntegrationsSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<IntegrationProvider | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await integrationSettingsService.get();
      setSettings(data);
      setConfig(data.config);
      setDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudieron cargar las integraciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.role === 'SUPERADMIN') void load(); }, [user?.role]);

  const update = <G extends keyof IntegrationConfig>(group: G, field: keyof IntegrationConfig[G], value: unknown) => {
    setConfig((current) => current ? { ...current, [group]: { ...current[group], [field]: value } } : current);
    setDirty(true);
    setMessage('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!config || !settings) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await integrationSettingsService.save(config, settings.revision);
      setSettings(data);
      setConfig(data.config);
      setDirty(false);
      setMessage('Configuración guardada. Las credenciales quedan protegidas en el servidor.');
    } catch (err: any) {
      setError(err.response?.status === 409
        ? 'Otra sesión modificó la configuración. Recargá la versión guardada y volvé a aplicar tus cambios.'
        : err.response?.data?.error || 'No se pudo guardar la configuración. Tus cambios siguen en el formulario.');
    } finally {
      setSaving(false);
    }
  };

  const verify = async (provider: Exclude<IntegrationProvider, 'google'>) => {
    setVerifying(provider);
    setError('');
    setMessage('');
    try {
      const result = await integrationSettingsService.verify(provider);
      if (result.ok === false) setError(result.message || 'No se pudo verificar la conexión.');
      else setMessage(result.message || `Conexión con ${providerNames[provider]} verificada. No se enviaron mensajes.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo verificar la conexión. Revisá la configuración guardada.');
    } finally {
      setVerifying(null);
    }
  };

  if (user?.role !== 'SUPERADMIN') return null;
  if (loading) return <PageLoading label="Cargando integraciones…" />;

  const busy = saving || verifying !== null;
  const buttonStyle = { color: 'var(--ink)', borderColor: 'var(--hair-strong)' };

  const secret = <G extends Exclude<keyof IntegrationConfig, 'general'>>(group: G, field: keyof IntegrationConfig[G], label: string) => {
    if (!config) return null;
    const value = config[group][field];
    const stored = settings?.secretsConfigured[`${group}.${String(field)}`];
    return (
      <div className="space-y-2">
        <Input label={label} type="password" autoComplete="new-password" spellCheck={false}
          value={typeof value === 'string' ? value : ''}
          placeholder={stored ? 'Configurado. Dejá vacío para conservarlo.' : 'Sin configurar'}
          onChange={(event) => update(group, field, event.target.value)} />
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={value === null} onChange={(event) => update(group, field, event.target.checked ? null : '')} />
          Borrar esta credencial al guardar
        </label>
      </div>
    );
  };

  const section = (provider: IntegrationProvider, description: string, children: ReactNode) => (
    <section className="rounded-2xl border p-4 sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--hair-strong)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{providerNames[provider]}</h3>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--ink-soft)' }}>{description}</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs" style={buttonStyle}>
          {settings?.readiness[provider] ? 'Configuración completa' : 'Falta configurar'}
        </span>
      </div>
      <label className="mb-5 flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={config?.[provider].enabled || false} onChange={(event) => update(provider, 'enabled', event.target.checked)} />
        Habilitar {provider === 'smtp' ? 'correo electrónico' : providerNames[provider]}
      </label>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
      {provider !== 'google' && !(provider === 'whatsapp' && config?.whatsapp.mode === 'link') && (
        <div className="mt-5">
          <button type="button" onClick={() => verify(provider)} disabled={busy || dirty || !settings?.readiness[provider]} className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50" style={buttonStyle}>
            {verifying === provider ? 'Verificando…' : 'Verificar conexión guardada'}
          </button>
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>Verifica credenciales y conexión sin enviar mensajes. Guardá los cambios antes de verificar.</p>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-5" style={{ color: 'var(--ink)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Integraciones de la plataforma</h2><p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Configuración global disponible únicamente para SUPERADMIN.</p></div>
        <button type="button" onClick={load} disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-50" style={buttonStyle}>Recargar versión guardada</button>
      </div>
      {error && <p role="alert" className="rounded-xl border p-4 text-sm" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>{error}</p>}
      {message && <p role="status" className="rounded-xl border p-4 text-sm" style={{ color: 'var(--good)', borderColor: 'var(--good)' }}>{message}</p>}
      {settings && !settings.storageReady && <p className="rounded-xl border p-4 text-sm" style={buttonStyle}>El servidor todavía no tiene habilitado el almacenamiento seguro de credenciales. Completá esa configuración de despliegue para poder guardar integraciones.</p>}
      {config && settings && (
        <form onSubmit={save} className="space-y-5">
          <fieldset disabled={busy || !settings.storageReady} className="space-y-5 disabled:opacity-70">
            <section className="rounded-2xl border p-4 sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--hair-strong)' }}>
              <h3 className="mb-4 text-lg font-semibold">Dirección pública</h3>
              <Input type="url" label="URL de la aplicación" placeholder="https://tu-dominio.com" value={config.general.frontendUrl} onChange={(event) => update('general', 'frontendUrl', event.target.value)} />
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Se utiliza para volver desde Google y generar enlaces de recuperación de contraseña.</p>
            </section>
            {section('google', 'Conectado al inicio de sesión: el botón de Google aparece al habilitar y completar esta configuración.', <>
              <p className="text-sm md:col-span-2" style={{ color: 'var(--ink-soft)' }}>En Google Cloud, creá un cliente OAuth de tipo aplicación web y copiá su Client ID y Client secret. Agregá la URL de retorno en sus URI de redirección autorizados. <a href="https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred" target="_blank" rel="noreferrer" className="underline">Guía oficial de Google</a>.</p>
              <Input label="Client ID" value={config.google.clientId} onChange={(event) => update('google', 'clientId', event.target.value)} />
              {secret('google', 'clientSecret', 'Client secret')}
              <Input type="url" label="URL de retorno de Google (callback)" value={config.google.callbackUrl} onChange={(event) => update('google', 'callbackUrl', event.target.value)} />
              <div className="self-center space-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}><p>Retorno sugerido según la API conectada:</p><code className="block break-all">{suggestedGoogleCallback}</code><button type="button" onClick={() => update('google', 'callbackUrl', suggestedGoogleCallback)} className="min-h-11 underline">Usar esta dirección</button><p>Usá el dominio público del backend; debe coincidir exactamente con el retorno autorizado en Google Cloud.</p></div>
            </>)}
            {section('smtp', 'Conectado a recuperación de contraseña y correos de la plataforma. Guardá y verificá la cuenta antes de usarla.', <>
              <p className="text-sm md:col-span-2" style={{ color: 'var(--ink-soft)' }}>Copiá servidor, puerto y credenciales desde tu proveedor de correo. El remitente (SMTP_FROM) debe ser una dirección autorizada por ese proveedor; por ejemplo, PoolInstaller &lt;avisos@tu-dominio.com&gt;. Puerto 465 usa TLS desde el inicio; 587 usa STARTTLS con la casilla desmarcada. <a href="https://nodemailer.com/smtp" target="_blank" rel="noreferrer" className="underline">Referencia SMTP</a>.</p>
              <Input label="Servidor SMTP" value={config.smtp.host} onChange={(event) => update('smtp', 'host', event.target.value)} />
              <Input type="number" min={1} max={65535} label="Puerto SMTP" value={config.smtp.port} onChange={(event) => update('smtp', 'port', Number(event.target.value))} />
              <Input label="Usuario SMTP" autoComplete="off" value={config.smtp.user} onChange={(event) => update('smtp', 'user', event.target.value)} />
              {secret('smtp', 'password', 'Contraseña SMTP')}
              <Input label="Remitente autorizado" placeholder="PoolInstaller <avisos@tu-dominio.com>" value={config.smtp.from} onChange={(event) => update('smtp', 'from', event.target.value)} />
              <Input type="email" label="Correo del administrador" value={config.smtp.adminEmail} onChange={(event) => update('smtp', 'adminEmail', event.target.value)} />
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={config.smtp.secure} onChange={(event) => update('smtp', 'secure', event.target.checked)} />TLS desde el inicio (habitual en puerto 465)</label>
            </>)}
            {section('whatsapp', 'El enlace de contacto abre WhatsApp. Cloud API permite guardar y verificar credenciales; los envíos automáticos y la recepción de mensajes todavía no están implementados.', <>
              <Select label="Modalidad" value={config.whatsapp.mode} onChange={(event) => update('whatsapp', 'mode', event.target.value)} options={[{ value: 'link', label: 'Enlace de contacto' }, { value: 'cloud', label: 'WhatsApp Cloud API' }]} />
              <Input type="tel" label="Número con código de país" placeholder="5492801234567" value={config.whatsapp.phoneNumber} onChange={(event) => update('whatsapp', 'phoneNumber', event.target.value)} />
              {config.whatsapp.mode === 'cloud' && <>
                <Input label="Phone Number ID" value={config.whatsapp.phoneNumberId} onChange={(event) => update('whatsapp', 'phoneNumberId', event.target.value)} />
                <Input label="Business Account ID" value={config.whatsapp.businessAccountId} onChange={(event) => update('whatsapp', 'businessAccountId', event.target.value)} />
                <Input label="Versión de Graph API" value={config.whatsapp.apiVersion} onChange={(event) => update('whatsapp', 'apiVersion', event.target.value)} />
                {secret('whatsapp', 'accessToken', 'Access token')}
                <details className="md:col-span-2"><summary className="cursor-pointer text-sm font-semibold">Credenciales reservadas para una futura integración de recepción</summary><p className="my-3 text-sm" style={{ color: 'var(--ink-soft)' }}>Guardar estos valores no habilita un webhook ni una bandeja de mensajes. La recepción todavía requiere implementación.</p><div className="grid gap-5 md:grid-cols-2">{secret('whatsapp', 'verifyToken', 'Token de verificación del webhook (sin uso actual)')}{secret('whatsapp', 'appSecret', 'App secret (reservado)')}</div></details>
              </>}
            </>)}
            {section('telegram', 'Permite guardar y verificar el bot y su acceso al chat. Los avisos automáticos y la recepción por webhook todavía no están implementados.', <>
              <p className="text-sm md:col-span-2" style={{ color: 'var(--ink-soft)' }}>Creá el bot con /newbot en <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline">@BotFather</a> y copiá el token. Abrí el chat con tu bot y presioná Iniciar; obtené el Chat ID del campo message.chat.id de <a href="https://core.telegram.org/bots/api#getupdates" target="_blank" rel="noreferrer" className="underline">getUpdates</a> mediante tu cliente de API. Para grupos, agregá el bot y usá el ID de ese grupo. No pegues el token en servicios de terceros.</p>
              {secret('telegram', 'botToken', 'Token del bot')}
              <Input label="Chat ID" value={config.telegram.chatId} onChange={(event) => update('telegram', 'chatId', event.target.value)} />
              <details className="md:col-span-2"><summary className="cursor-pointer text-sm font-semibold">Secreto reservado para una futura integración de recepción</summary><p className="my-3 text-sm" style={{ color: 'var(--ink-soft)' }}>Este valor se almacena, pero no hay un webhook de Telegram activo en esta versión.</p>{secret('telegram', 'webhookSecret', 'Secreto del webhook (sin uso actual)')}</details>
            </>)}
            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" disabled={!dirty || busy} className="min-h-12 rounded-xl px-5 py-3 font-semibold disabled:opacity-50" style={{ background: '#155e63', color: '#ffffff' }}>{saving ? 'Guardando…' : 'Guardar integraciones'}</button>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{dirty ? 'Tenés cambios sin guardar.' : 'No hay cambios pendientes.'} Los secretos vacíos conservan el valor guardado.</p>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
};
