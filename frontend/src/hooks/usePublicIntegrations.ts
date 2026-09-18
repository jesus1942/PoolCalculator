import { useEffect, useState } from 'react';
import api from '@/services/api';

interface PublicIntegrations {
  googleEnabled: boolean;
  whatsappUrl: string | null;
}

/** Publica sólo opciones habilitadas; nunca solicita credenciales de configuración. */
export const usePublicIntegrations = (): PublicIntegrations => {
  const [integrations, setIntegrations] = useState<PublicIntegrations>({ googleEnabled: false, whatsappUrl: null });
  useEffect(() => {
    let active = true;
    api.get<PublicIntegrations>('/public/integrations')
      .then(({ data }) => {
        if (!active) return;
        setIntegrations({
          googleEnabled: data.googleEnabled === true,
          whatsappUrl: typeof data.whatsappUrl === 'string' && /^https:\/\/wa\.me\/\d+(?:\?|$)/.test(data.whatsappUrl) ? data.whatsappUrl : null,
        });
      })
      .catch(() => { /* El acceso por contraseña y el formulario de contacto siguen disponibles. */ });
    return () => { active = false; };
  }, []);
  return integrations;
};
