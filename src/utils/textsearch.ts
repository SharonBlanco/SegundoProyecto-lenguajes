// src/utils.ts
export async function leerPalabrasTxt(): Promise<string[]> {
  try {
    const resp = await fetch("/palabras.txt");
    if (!resp.ok) {
      throw new Error(`Error al cargar palabras.txt: ${resp.status}`);
    }
    const text = await resp.text();
    const palabras = text
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    
    console.log("Palabras cargadas desde palabras.txt:", palabras);
    return palabras;
  } catch (error) {
    console.error("Error cargando palabras.txt:", error);
    // Palabras por defecto si falla la carga
    const palabrasDefecto = ["CASA", "GATO", "PERRO", "MESA", "SILLA"];
    console.log("Usando palabras por defecto:", palabrasDefecto);
    return palabrasDefecto;
  }
}
