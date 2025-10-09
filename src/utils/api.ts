// src/api.ts

export interface HangmanStateResponse {
  juegoId: string;
  palabraOculta: string;
  longitud: number;
  intentosRestantes: number;
  intentosMaximos: number;
  letrasUsadas: string[];
  letrasIncorrectas: string[];
  estado: 'en_curso' | 'ganado' | 'perdido';
  tiempoFinal?: number | null;
  palabraCompleta?: string | null;
  mensaje?: string | null;
}

function buildJsonRequest(options: RequestInit = {}, payload?: Record<string, unknown>): RequestInit {
  if (payload && Object.keys(payload).length > 0) {
    return {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(payload),
    };
  }
  return options;
}

async function readJsonOrThrow<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    try {
      const data = await resp.json();
      if (data && typeof data.error === 'string') {
        throw new Error(data.error);
      }
    } catch (error) {
      if (error instanceof Error && error.message && error.message !== '[object Object]') {
        throw error;
      }
    }
    throw new Error(`Error ${resp.status}`);
  }
  return resp.json();
}

export async function crearMatriz(palabras: string[]): Promise<any> {
  const resp = await fetch("http://localhost:5000/api/matriz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(palabras),
  });

  if (!resp.ok) throw new Error("Error al crear matriz");
  return await resp.json(); // ← esto es tu 'placed'
}

export async function buscarPalabra(placed: any, palabra: string): Promise<string> {
  const body = { palabra, placed };
  const resp = await fetch("http://localhost:5000/api/buscar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error("Error al buscar palabra");
  return await resp.text(); // ← texto que devuelve tu API (Ruta: ...)
}

export async function iniciarAhorcado(options?: { palabras?: string[]; maxIntentos?: number }): Promise<HangmanStateResponse> {
  const payload: Record<string, unknown> = {};
  if (options?.palabras && options.palabras.length > 0) {
    payload.palabras = options.palabras;
  }
  if (typeof options?.maxIntentos === 'number') {
    payload.maxIntentos = options.maxIntentos;
  }

  const requestInit = buildJsonRequest({ method: 'POST' }, Object.keys(payload).length > 0 ? payload : undefined);
  const resp = await fetch('http://localhost:5000/api/ahorcado/nuevo', requestInit);
  return readJsonOrThrow<HangmanStateResponse>(resp);
}

export async function intentarLetraAhorcado(juegoId: string, letra: string): Promise<HangmanStateResponse> {
  const resp = await fetch('http://localhost:5000/api/ahorcado/letra', buildJsonRequest({ method: 'POST' }, { juegoId, letra }));
  return readJsonOrThrow<HangmanStateResponse>(resp);
}

export async function adivinarPalabraAhorcado(juegoId: string, palabra: string): Promise<HangmanStateResponse> {
  const resp = await fetch('http://localhost:5000/api/ahorcado/palabra', buildJsonRequest({ method: 'POST' }, { juegoId, palabra }));
  return readJsonOrThrow<HangmanStateResponse>(resp);
}

export async function obtenerEstadoAhorcado(juegoId: string): Promise<HangmanStateResponse> {
  const resp = await fetch(`http://localhost:5000/api/ahorcado/${juegoId}`);
  return readJsonOrThrow<HangmanStateResponse>(resp);
}
