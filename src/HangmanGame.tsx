import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { HangmanStateResponse } from "./utils/api";
import {
  adivinarPalabraAhorcado,
  intentarLetraAhorcado,
} from "./utils/api";

interface HangmanGameProps {
  onBack?: () => void;
  initialState?: any;
  onEstadoChange?: (estado: any) => void;
  onMensaje?: (mensaje: string) => void;
}


export default function HangmanGame({ onBack, initialState, onEstadoChange, onMensaje }: HangmanGameProps) {
  const [estado, setEstado] = useState<HangmanStateResponse | null>(initialState || null);
  const [mensaje, setMensaje] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [palabraPropuesta, setPalabraPropuesta] = useState<string>("");
  const [cargando, setCargando] = useState<boolean>(false);

  const letras = useMemo(
    () => [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "Ñ",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ],
    []
  );

  const juegoTerminado = estado?.estado === "ganado" || estado?.estado === "perdido";
  const letrasUsadas = useMemo(() => new Set(estado?.letrasUsadas ?? []), [estado?.letrasUsadas]);
  const letrasIncorrectas = useMemo(() => new Set(estado?.letrasIncorrectas ?? []), [estado?.letrasIncorrectas]);

  const palabraVisible = estado?.palabraOculta
    ? estado.palabraOculta.split("").join(" ")
    : "";

  const progreso = estado
    ? Math.round(((estado.intentosMaximos - estado.intentosRestantes) / estado.intentosMaximos) * 100)
    : 0;


  // Removemos el useEffect que inicia automáticamente el juego

  async function manejarIntentoLetra(letra: string) {
    if (!estado || juegoTerminado || !letra) return;
    setCargando(true);
    setError("");
    try {
      const respuesta = await intentarLetraAhorcado(estado.juegoId, letra);
      setEstado(respuesta);
      onEstadoChange?.(respuesta);
      setMensaje(respuesta.mensaje ?? "");
      onMensaje?.(respuesta.mensaje ?? "");
    } catch (err) {
      console.error("Error al intentar letra", err);
      setError(err instanceof Error ? err.message : "No se pudo procesar la letra.");
    } finally {
      setCargando(false);
    }
  }

  async function manejarIntentoPalabra(palabra: string) {
    if (!estado || juegoTerminado || !palabra) return;
    setCargando(true);
    setError("");
    try {
      const respuesta = await adivinarPalabraAhorcado(estado.juegoId, palabra);
      setEstado(respuesta);
      onEstadoChange?.(respuesta);
      setMensaje(respuesta.mensaje ?? "");
      onMensaje?.(respuesta.mensaje ?? "");
    } catch (err) {
      console.error("Error al intentar palabra", err);
      setError(err instanceof Error ? err.message : "No se pudo procesar la palabra.");
    } finally {
      setCargando(false);
      setPalabraPropuesta("");
    }
  }


  function onSubmitPalabra(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!palabraPropuesta.trim()) return;
    void manejarIntentoPalabra(palabraPropuesta.trim());
  }

  const aviso = error || estado?.mensaje || mensaje;

  return (
    <div className="wordsearch-container">
      {/* Título */}



        

        {estado && (
          <div className="game-container">
            {/* Palabra a adivinar */}
            <div className="wordsearch-grid-container">
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: '12px',
                padding: '20px',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                {palabraVisible.split(' ').map((letra, index) => (
                  <div
                    key={index}
                    className={`wordsearch-cell ${juegoTerminado ? "found" : ""}`}
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      fontSize: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {letra}
                  </div>
                ))}
              </div>
            </div>

            {/* Barra de progreso */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                height: '12px', 
                backgroundColor: '#e2e8f0', 
                borderRadius: '999px', 
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #34d399, #60a5fa)',
                  width: `${Math.min(100, Math.max(0, progreso))}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap',
                gap: '0.5rem',
                color: '#475569',
                fontWeight: '500'
              }}>
                <span>
                  Intentos restantes: <strong>{estado.intentosRestantes}</strong> / {estado.intentosMaximos}
                </span>
                <span>
                  Letras incorrectas:{" "}
                  {estado.letrasIncorrectas.length > 0 ? estado.letrasIncorrectas.join(", ") : "ninguna"}
                </span>
              </div>
            </div>


            {/* Grid de letras horizontal */}
            <div className="wordsearch-words-container">
              <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#2d5a87' }}>Alfabeto</h3>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: '8px',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                {letras.map(letra => {
                  const usada = letrasUsadas.has(letra);
                  const incorrecta = letrasIncorrectas.has(letra);
                  return (
                    <button
                      key={letra}
                      type="button"
                      className={`wordsearch-word ${usada ? "found" : ""} ${incorrecta ? "solution" : ""}`}
                      onClick={() => manejarIntentoLetra(letra)}
                      disabled={usada || juegoTerminado || cargando}
                      aria-label={`Letra ${letra}${usada ? " ya utilizada" : ""}`}
                      style={{ 
                        padding: '0.75rem 0.5rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: usada || juegoTerminado || cargando ? 'not-allowed' : 'pointer',
                        opacity: usada || juegoTerminado || cargando ? 0.6 : 1,
                        minWidth: '45px',
                        height: '45px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulario para palabra completa */}
            <div className="control-panel">
              <h3 className="control-title">¿Sabes la palabra completa?</h3>
              <form onSubmit={onSubmitPalabra}>
                <div className="control-content">
                  <div className="input-group">
                    <label className="input-label" htmlFor="palabra">Ingresa la palabra completa</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input
                        id="palabra"
                        className="words-input"
                        type="text"
                        value={palabraPropuesta}
                        onChange={event => setPalabraPropuesta(event.target.value.toUpperCase())}
                        disabled={cargando || juegoTerminado}
                        placeholder="Introduce tu respuesta"
                        style={{ flex: '1' }}
                      />
                      <button type="submit" className="solutions-button" disabled={cargando || juegoTerminado}>
                        Adivinar palabra
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Información del juego */}
            <div className="control-panel">
              <h3 className="control-title">Información del Juego</h3>
              <div className="control-content">
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Letras usadas:</strong> {estado.letrasUsadas.length > 0 ? estado.letrasUsadas.join(", ") : "ninguna"}
                </div>
                {estado.tiempoFinal != null && estado.estado === "ganado" && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Tiempo total:</strong> {estado.tiempoFinal.toFixed(2)} segundos
                  </div>
                )}
                {estado.palabraCompleta && juegoTerminado && (
                  <div>
                    <strong>Palabra:</strong> <span style={{ color: '#667eea', fontWeight: 'bold' }}>{estado.palabraCompleta}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados */}
            {estado.estado === "ganado" && (
              <div className="result-message">
                <div className="result-text celebration">
                  🎉 ¡Felicitaciones! Has salvado al personaje.
                </div>
              </div>
            )}
            {estado.estado === "perdido" && (
              <div className="result-message">
                <div className="result-text backup">
                  💀 Se acabaron los intentos. Intenta una nueva partida.
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
