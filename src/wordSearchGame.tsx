import { useState, useEffect } from "react";

interface Celda {
  fila: number;
  columna: number;
  letra: string;
}

interface Props {
  placed: Celda[];
  palabras: string[];
  onMensaje?: (texto: string) => void;
  rutas?: Record<string, any[]>;
  palabrasEncontradas?: any[];
  onPalabrasEncontradas?: (palabras: any[]) => void;
}

export default function WordSearchGame({ placed, palabras, onMensaje, rutas = {}, palabrasEncontradas = [], onPalabrasEncontradas }: Props) {
  const size = 10;
  const [seleccion, setSeleccion] = useState<Celda[]>([]);
  const [encontradas, setEncontradas] = useState<Celda[]>(palabrasEncontradas);
  const [palabrasEncontradasLista, setPalabrasEncontradasLista] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [inicio, setInicio] = useState<Celda | null>(null);

  // Sincronizar palabras encontradas cuando cambian desde el padre
  useEffect(() => {
    setEncontradas(palabrasEncontradas);
  }, [palabrasEncontradas]);

  // Limpiar palabras encontradas cuando cambian las palabras (nueva sopa)
  useEffect(() => {
    setPalabrasEncontradasLista([]);
    setEncontradas([]);
    setSeleccion([]);
    setIsDragging(false);
    setInicio(null);
  }, [palabras]);

  // Construye la matriz base
  const board: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );
  placed.forEach(c => (board[c.fila][c.columna] = c.letra.toUpperCase()));
  const filled = board.map(row =>
    row.map(cell =>
      cell === "" ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) : cell
    )
  );

  // Función para obtener línea recta entre dos puntos
  function getLinea(inicio: Celda, fin: Celda): Celda[] {
    const dr = Math.sign(fin.fila - inicio.fila);
    const dc = Math.sign(fin.columna - inicio.columna);

    // Solo permite líneas rectas (horizontal, vertical, diagonal)
    if (!(dr === 0 || dc === 0 || Math.abs(fin.fila - inicio.fila) === Math.abs(fin.columna - inicio.columna))) {
      return [];
    }

    const path: Celda[] = [];
    let r = inicio.fila;
    let c = inicio.columna;
    
    while (true) {
      path.push({ fila: r, columna: c, letra: filled[r][c] });
      if (r === fin.fila && c === fin.columna) break;
      r += dr;
      c += dc;
    }
    return path;
  }

  // Manejo de clic inicial
  function handleMouseDown(f: number, c: number) {
    console.log('Mouse down en:', f, c); // Debug
    const celda = { fila: f, columna: c, letra: filled[f][c] };
    setInicio(celda);
    setSeleccion([celda]);
    setIsDragging(true);
  }

  // Manejo de arrastre
  function handleMouseEnter(f: number, c: number) {
    if (isDragging && inicio) {
      console.log('Mouse enter en:', f, c); // Debug
      const fin = { fila: f, columna: c, letra: filled[f][c] };
      const linea = getLinea(inicio, fin);
      setSeleccion(linea);
    }
  }

  // Manejo de soltar
  function handleMouseUp() {
    console.log('Mouse up, seleccion:', seleccion); // Debug
    if (!isDragging || seleccion.length === 0) return;

    setIsDragging(false);
    const palabra = seleccion.map(c => c.letra).join("");
    const invertida = [...seleccion].reverse().map(c => c.letra).join("");
    
    console.log('Palabra formada:', palabra); // Debug
    
    const correcta = palabras.some(
      p => p.toUpperCase() === palabra || p.toUpperCase() === invertida
    );

    if (correcta) {
      const nuevasEncontradas = [...encontradas, ...seleccion];
      setEncontradas(nuevasEncontradas);
      onPalabrasEncontradas?.(nuevasEncontradas);
      
      // Agregar la palabra encontrada a la lista
      const palabraEncontrada = palabras.find(p => 
        p.toUpperCase() === palabra || p.toUpperCase() === invertida
      );
      if (palabraEncontrada && !palabrasEncontradasLista.includes(palabraEncontrada.toUpperCase())) {
        const nuevasPalabrasEncontradas = [...palabrasEncontradasLista, palabraEncontrada.toUpperCase()];
        setPalabrasEncontradasLista(nuevasPalabrasEncontradas);
        
        // Verificar si se encontraron todas las palabras
        if (nuevasPalabrasEncontradas.length === palabras.length) {
          onMensaje?.(`🎉 ¡FELICITACIONES! 🎉\n¡Has encontrado todas las palabras!\n¡Eres un genio de las sopas de letras! 🧩✨`);
        } else {
          onMensaje?.(`✅ "${palabra}" encontrada! (${nuevasPalabrasEncontradas.length}/${palabras.length})`);
        }
      } else {
        onMensaje?.(`✅ "${palabra}" encontrada!`);
      }
    } else {
      onMensaje?.(`❌ "${palabra}" no está en la lista`);
    }

    // Limpia si es incorrecta
    if (!correcta) {
      setSeleccion([]);
    }
    setInicio(null);
  }

  // Helpers para pintar celdas
  function esSeleccionada(f: number, c: number) {
    return seleccion.some(x => x.fila === f && x.columna === c);
  }

  function esEncontrada(f: number, c: number) {
    return encontradas.some(x => x.fila === f && x.columna === c);
  }

  function esSolucion(f: number, c: number) {
    // Verifica si la celda está en alguna de las rutas de solución
    return Object.values(rutas).some(ruta => 
      ruta.some(celda => celda.fila === f && celda.columna === c)
    );
  }

  return (
    <div className="wordsearch-container">
      {/* Título */}
      <div className="wordsearch-title-section">
        <h2 className="wordsearch-title">SOPA DE LETRAS</h2>
        <p className="wordsearch-subtitle">Encuentra las siguientes palabras en la sopa</p>
      </div>

      {/* Grid de letras */}
      <div className="wordsearch-grid-container">
        <div 
          className="wordsearch-grid"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {filled.map((row, r) =>
            row.map((ch, c) => {
              const seleccionada = esSeleccionada(r, c);
              const encontrada = esEncontrada(r, c);
              const esSolucionCelda = esSolucion(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  className={`wordsearch-cell ${
                    encontrada
                      ? "found"
                      : seleccionada
                      ? "selected"
                      : esSolucionCelda
                      ? "solution"
                      : ""
                  }`}
                >
                  {ch}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lista de palabras centrada */}
      <div className="wordsearch-words-container">
        <div className="wordsearch-words-grid">
          {palabras.map((palabra, index) => {
            // Verificar si esta palabra específica ha sido encontrada
            const palabraEncontrada = palabrasEncontradasLista.includes(palabra.toUpperCase());
            const enSoluciones = rutas[palabra.toUpperCase()] !== undefined;
            return (
              <div
                key={index}
                className={`wordsearch-word ${
                  palabraEncontrada 
                    ? "found" 
                    : enSoluciones
                    ? "solution"
                    : ""
                }`}
              >
                {palabra}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}