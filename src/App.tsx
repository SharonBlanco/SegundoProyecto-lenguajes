import { useState } from "react";
import { crearMatriz, buscarPalabra, iniciarAhorcado } from "./utils/api";
import { leerPalabrasTxt } from "./utils/textsearch";
import WordSearchGame from "./wordSearchGame";
import MainMenu from "./MainMenu";
import HangmanGame from "./HangmanGame";

export default function App() {
  const [currentGame, setCurrentGame] = useState<'menu' | 'wordsearch' | 'hangman'>('menu');
  const [input, setInput] = useState("");
  const [placed, setPlaced] = useState<any[]>([]);
  const [resultado, setResultado] = useState("");
  const [palabras, setPalabras] = useState<string[]>([]);
  const [rutas, setRutas] = useState<Record<string, any[]>>({});
  const [palabrasEncontradas, setPalabrasEncontradas] = useState<any[]>([]);
  
  // Estados para el ahorcado
  const [hangmanEstado, setHangmanEstado] = useState<any>(null);
  const [maxIntentos, setMaxIntentos] = useState<number>(7);
  const [hangmanInput, setHangmanInput] = useState("");

  async function generar() {
    try {
      let palabrasList: string[];
      if (input.trim() !== "") {
        palabrasList = input.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
        console.log("Palabras desde input:", palabrasList);
      } else {
        console.log("Cargando palabras desde palabras.txt...");
        palabrasList = await leerPalabrasTxt();
      }

      if (palabrasList.length === 0) {
        setResultado("❌ No se encontraron palabras válidas");
        return;
      }

      console.log("Generando sopa con palabras:", palabrasList);
      const place = await crearMatriz(palabrasList);
      
      const palabrasFiltradas = place.palabrasFiltradas || palabrasList;
      console.log("Palabras filtradas por la API:", palabrasFiltradas);
      
      // Si no hay palabras válidas del input del usuario, usar respaldo del txt
      if (palabrasFiltradas.length === 0 && input.trim() !== "") {
        console.log("Todas las palabras del usuario fueron filtradas, usando respaldo del txt...");
        const palabrasRespaldo = await leerPalabrasTxt();
        if (palabrasRespaldo.length > 0) {
          const placeRespaldo = await crearMatriz(palabrasRespaldo);
          const palabrasFiltradasRespaldo = placeRespaldo.palabrasFiltradas || palabrasRespaldo;
          
          if (palabrasFiltradasRespaldo.length > 0) {
            setPlaced(placeRespaldo.placed);
            setPalabras(palabrasFiltradasRespaldo.map((w: string) => w.toUpperCase()));
            setResultado(`⚠️ Todas tus palabras fueron filtradas, usando palabras de respaldo ✅ (${palabrasFiltradasRespaldo.length} palabras válidas)`);
            setRutas({});
            setPalabrasEncontradas([]);
            return;
          }
        }
      }
      
      const palabrasOriginales = palabrasList.length;
      const palabrasValidas = palabrasFiltradas.length;
      const palabrasFiltradasCount = palabrasOriginales - palabrasValidas;
      
      let mensaje = `Sopa de letras generada ✅ (${palabrasValidas} palabras válidas)`;
      if (palabrasFiltradasCount > 0) {
        mensaje += ` - ${palabrasFiltradasCount} palabras filtradas (3-10 caracteres, máx 12 palabras)`;
      }
      
      setPlaced(place.placed);
      setPalabras(palabrasFiltradas.map((w: string) => w.toUpperCase()));
      setResultado(mensaje);
      setRutas({});
      setPalabrasEncontradas([]);
    } catch (error) {
      console.error("Error generando sopa:", error);
      setResultado("❌ Error al generar la sopa de letras");
    }
  }

  function parsearRuta(respuesta: string): any[] {
    try {
      const contenido = respuesta.replace("Ruta: ", "");
      const coordenadas = contenido.split(';').map(coord => {
        const match = coord.trim().match(/([A-Z])\((\d+),(\d+)\)/);
        if (match) {
          return {
            letra: match[1],
            fila: parseInt(match[2]),
            columna: parseInt(match[3])
          };
        }
        return null;
      }).filter(coord => coord !== null);
      
      return coordenadas;
    } catch (error) {
      console.error("Error parseando ruta:", error);
      return [];
    }
  }

  async function soluciones() {
    if (placed.length === 0) {
      setResultado("Primero genera una sopa 😅");
      return;
    }

    try {
      let nuevasRutas: Record<string, any[]> = {};
      
      for (const palabra of palabras) {
        try {
          const respuesta = await buscarPalabra(placed, palabra);
          console.log(`Respuesta para ${palabra}:`, respuesta);
          
          if (respuesta && respuesta.startsWith("Ruta:")) {
            const coordenadas = parsearRuta(respuesta);
            if (coordenadas.length > 0) {
              nuevasRutas[palabra] = coordenadas;
              console.log(`Palabra ${palabra} encontrada:`, coordenadas);
            }
          }
        } catch (error) {
          console.log(`Palabra ${palabra} no encontrada:`, error);
        }
      }

      setRutas(nuevasRutas);
      const totalPalabras = palabras.length;
      const palabrasEncontradas = Object.keys(nuevasRutas).length;
      setResultado(`Soluciones mostradas 🔍 (${palabrasEncontradas}/${totalPalabras} palabras encontradas)`);
    } catch (error) {
      setResultado("Error al buscar soluciones 😅");
      console.error("Error:", error);
    }
  }

  function handleGameSelection(game: 'wordsearch' | 'hangman') {
    setCurrentGame(game);
  }

  async function generarAhorcado() {
    try {
      let palabrasList: string[];
      if (hangmanInput.trim() !== "") {
        palabrasList = hangmanInput.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
        console.log("Palabras desde input (ahorcado):", palabrasList);
      } else {
        console.log("Cargando palabras desde palabras.txt... (ahorcado)");
        palabrasList = await leerPalabrasTxt();
      }

      if (palabrasList.length === 0) {
        setResultado("❌ No se encontraron palabras válidas para el ahorcado");
        return;
      }

      console.log("Generando juego de ahorcado con palabras:", palabrasList);
      const opciones: { palabras?: string[]; maxIntentos?: number } = { maxIntentos };
      if (palabrasList.length > 0) {
        opciones.palabras = palabrasList;
      }
      
      const respuesta = await iniciarAhorcado(opciones);
      setHangmanEstado(respuesta);
      setResultado(respuesta.mensaje ?? "Juego de ahorcado generado. ¡Adivina antes de que los intentos se acaben!");
    } catch (error) {
      console.error("Error generando ahorcado:", error);
      setResultado("❌ Error al generar el juego de ahorcado");
    }
  }

  function backToMenu() {
    setCurrentGame('menu');
    setPlaced([]);
    setResultado("");
    setPalabras([]);
    setRutas({});
    setPalabrasEncontradas([]);
    setHangmanEstado(null);
    setHangmanInput("");
  }

  if (currentGame === 'menu') {
    return <MainMenu onSelectGame={handleGameSelection} />;
  }

  if (currentGame === 'hangman') {
    return (
      <div className="app-container">
        <div className="app-content">
          {/* Header */}
          <div className="app-header">
            <button onClick={backToMenu} className="back-button">
              ← Volver al Menú
            </button>
            <h1 className="app-title">🎯 Ahorcado</h1>
            <p className="app-subtitle">Adivina la palabra secreta antes de quedarte sin intentos</p>
          </div>

          {/* Panel de control */}
          <div className="control-panel">
            <h2 className="control-title">Configuración del Ahorcado</h2>
            
            <div className="control-content">
              <div className="input-group">
                <label className="input-label">
                  Palabras (separadas por comas, punto y coma o saltos de línea):
                </label>
                <textarea
                  placeholder="Escribe palabras aquí o deja vacío para usar palabras.txt"
                  className="words-input"
                  rows={4}
                  value={hangmanInput}
                  onChange={e => setHangmanInput(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Intentos máximos</label>
                <input
                  className="words-input"
                  type="number"
                  min={3}
                  max={12}
                  value={maxIntentos}
                  onChange={event => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      setMaxIntentos(Math.min(12, Math.max(3, value)));
                    }
                  }}
                  style={{ maxWidth: '120px' }}
                />
              </div>

              <div className="button-group">
                <button onClick={generarAhorcado} className="generate-button">
                  🎲 Generar Juego
                </button>
              </div>
            </div>
          </div>

          {/* Mensaje de resultado */}
          {resultado && (
            <div className="result-message">
              <p className={`result-text ${
                resultado.includes('🎉') ? 'celebration' : 
                resultado.includes('⚠️') ? 'backup' : 'info'
              }`}>
                {resultado}
              </p>
            </div>
          )}

          {/* Componente del juego */}
          {hangmanEstado && (
            <div className="game-container">
              <HangmanGame 
                onBack={backToMenu} 
                initialState={hangmanEstado}
                onEstadoChange={setHangmanEstado}
                onMensaje={setResultado}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-content">
        {/* Header */}
        <div className="app-header">
          <button onClick={backToMenu} className="back-button">
            ← Volver al Menú
          </button>
          <h1 className="app-title">🧩 Sopa de Letras</h1>
          <p className="app-subtitle">Crea y juega con tu propia sopa de letras</p>
        </div>

        {/* Panel de control */}
        <div className="control-panel">
          <h2 className="control-title">Configuración</h2>
          
          <div className="control-content">
            <div className="input-group">
              <label className="input-label">
                Palabras (separadas por comas, punto y coma o saltos de línea):
              </label>
              <textarea
                placeholder="Escribe palabras aquí o deja vacío para usar palabras.txt"
                className="words-input"
                rows={4}
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            </div>

            <div className="button-group">
              <button onClick={generar} className="generate-button">
                🎲 Generar Sopa
              </button>
              <button onClick={soluciones} className="solutions-button">
                🔍 Mostrar Soluciones
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de resultado */}
        {resultado && (
          <div className="result-message">
            <p className={`result-text ${
              resultado.includes('🎉') ? 'celebration' : 
              resultado.includes('⚠️') ? 'backup' : ''
            }`}>
              {resultado}
            </p>
          </div>
        )}

        {/* Componente del juego */}
        {placed.length > 0 && (
          <div className="game-container">
            <WordSearchGame
              placed={placed}
              palabras={palabras}
              onMensaje={setResultado}
              rutas={rutas}
              palabrasEncontradas={palabrasEncontradas}
              onPalabrasEncontradas={setPalabrasEncontradas}
            />
          </div>
        )}
      </div>
    </div>
  );
}
