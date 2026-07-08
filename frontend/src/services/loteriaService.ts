import api from './api';

export type ModalidadResultado = {
  nombre: string;
  numeros: number[];
};

export type ResultadoJuego = {
  ok: boolean;
  juego: 'QUINI6' | 'LOTO';
  fuente?: string;
  sorteo?: string | null;
  fecha?: string | null;
  modalidades?: ModalidadResultado[];
  error?: string;
};

export type SorteosResponse = {
  quini6: ResultadoJuego;
  loto: ResultadoJuego;
  actualizado: string;
};

export const loteriaService = {
  async ultimos(refresh = false): Promise<SorteosResponse> {
    const response = await api.get<SorteosResponse>('/loterias/ultimos', {
      params: refresh ? { refresh: '1' } : undefined,
    });
    return response.data;
  },
};
