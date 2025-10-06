module ProyectoLenguajes.Logica
open System                              // importamos System (Random, Char, etc.)
open System.IO                           // importamos IO para leer archivos

// ====== Modelo inmutable
type Coord = int * int                   // alias de tupla: coordenada (fila, col), 0..9
type Dir   = int * int                   // alias de tupla: dirección (dr, dc)
type Placed = (Coord * char) list        // tablero parcial: lista de pares ((fila,col), letra)

type Candidate =                         // record que describe un candidato de colocación
    { start: Coord                       //   coordenada de inicio
      dir: Dir                           //   dirección (dr, dc)
      word: string                       //   palabra (en normal o en reverso)
      reversed: bool }                   //   bandera: true si es el reverso de la original

type Eval =                              // record con métricas de evaluación del candidato
    { conflicts: int                     //   letras distintas chocando (si > 0, es inválido)
      overlaps: int                      //   coincidencias exactas (favorecen el candidato)
      blocked: int }                     //   cuántas celdas caen en prohibidas

let N = 10                               // tamaño fijo del tablero 10×10

// Direcciones: → (0,1), ↓ (1,0), ↘ (1,1), ↗ (-1,1)msodm
let dirs : Dir list = [ (0,1); (1,0); (1,1); (-1,1) ]   // lista inmutable con las 4 direcciones

// Todas las coordenadas del tablero (0..9 × 0..9) generadas funcionalmente
let allCoords : Coord list =
    [0..N-1]                             // lista de filas 0..9
    |> List.collect (fun r ->            // por cada fila, “map y concatena” columnas
        [0..N-1] |> List.map (fun c -> (r,c)))  // genera (r,c) para todas las columnas

// ====== Utilidades puras

let tryLookup (coord: Coord) (placed: Placed) : char option =
    placed                                // buscamos si ya hay letra en esa coord
    |> List.tryFind (fun (c,_) -> c = coord)   // Some((coord, ch)) si existe, None si no
    |> Option.map snd                     // si existe, extrae la letra; queda Some ch | None

let inBounds (r,c) =                      // ¿la coordenada está dentro de 0..9?
    r >= 0 && r < N && c >= 0 && c < N

let toCoords (start: Coord) (dir: Dir) (len: int) : Coord list =
    let rec loop i acc =                  // genera la trayectoria de longitud len
        if i = len then List.rev acc      // cuando juntamos len coords, devolvemos al derecho
        else
            let (sr, sc) = start          // descomponemos inicio (fila, col)
            let (dr, dc) = dir            // descomponemos dirección (dr, dc)
            let coord = (sr + i*dr, sc + i*dc)  // coord i-ésima: start + i*(dir)
            loop (i+1) (coord :: acc)     // acumulamos al revés por eficiencia
    loop 0 []                             // arrancamos con i=0 y acumulador vacío

let cabeTablero (path: Coord list) : bool =
    path |> List.forall inBounds          // todas las coords de la trayectoria deben estar dentro

let containsCoord (coord: Coord) (xs: Coord list) =
    xs |> List.exists ((=) coord)         // ¿la lista xs contiene la coord?

// ====== Evaluación de un candidato

let evalPath (forbidden: Coord list) (placed: Placed) (word: string) (path: Coord list) : Eval =
    let rec loop ws cs (conf, ov, blk) =  // recorre en paralelo letras (ws) y coords (cs)
        match ws, cs with
        | [], [] -> { conflicts = conf; overlaps = ov; blocked = blk } // fin: devuelve métricas
        | w::ws', c::cs' ->               // caso recursivo: letra actual w y coord actual c
            let blk' =                    // si c está prohibida, incrementa blocked
                if containsCoord c forbidden then blk + 1 else blk
            let ov', conf' =              // miramos si ya había letra colocada en c
                match tryLookup c placed with
                | None -> ov, conf        // vacío: ni solapa ni conflicto
                | Some ch when ch = w -> ov + 1, conf   // misma letra: solape compatible
                | Some _ -> ov, conf + 1  // letra distinta: conflicto
            loop ws' cs' (conf', ov', blk') // paso recursivo con las colas de listas
        | _ -> failwith "evalPath: desalineado" // seguridad: listas deben tener igual largo
    loop (word |> Seq.toList) path (0,0,0)      // arrancamos con contadores en cero

// ====== Generación de candidatos para una palabra (ambos sentidos)

let generarCandidatos (word: string) : Candidate list =
    let wrev = new string(Array.rev (word.ToCharArray()))   // reverso de la palabra
    let opciones = [ (word, false); (wrev, true) ]          // probamos normal y reverso
    opciones
    |> List.collect (fun (w, revFlag) ->                    // para cada versión (w)
        dirs
        |> List.collect (fun d ->                           // para cada dirección d
            allCoords
            |> List.choose (fun s ->                        // para cada inicio s
                let path = toCoords s d w.Length            // construimos trayectoria
                if cabeTablero path then                    // si no se sale del tablero
                    Some { start = s; dir = d; word = w; reversed = revFlag } // candidato
                else None)))                                // si no cabe, descartamos

// ====== Selección del mejor candidato

let elegirMejor (forbidden: Coord list) (placed: Placed) (rnd: Random) (cands: Candidate list) : Candidate option =
    let evaluados =
        cands
        |> List.map (fun c ->                                // evalúa cada candidato
            let path = toCoords c.start c.dir c.word.Length  // trayectoria de c
            let ev = evalPath forbidden placed c.word path   // métricas Eval
            c, ev)
        |> List.filter (fun (_, ev) -> ev.conflicts = 0 && ev.blocked = 0) // solo viables
    match evaluados with
    | [] -> None                                             // no hay candidato válido
    | xs ->
        let maxOv = xs                                       // buscamos el mayor overlaps
                     |> List.maxBy (fun (_, ev) -> ev.overlaps)
                     |> (fun (_,ev) -> ev.overlaps)
        let top = xs |> List.filter (fun (_, ev) -> ev.overlaps = maxOv) // empatados
        let idx = rnd.Next(List.length top)                  // desempate aleatorio
        Some (fst top[idx])                                  // devolvemos el candidato elegido

// ====== Colocar palabra

let colocar (placed: Placed) (cand: Candidate) : Placed * (Coord * Coord) =
    let path = toCoords cand.start cand.dir cand.word.Length // trayectoria donde irá
    let letras = cand.word |> Seq.toList                     // letras de la palabra
    let nuevos = List.zip path letras                        // pares (coord, letra)
    let r1,c1 = cand.start                                   // inicio
    let (dr,dc) = cand.dir                                   // dirección
    let r2 = r1 + (cand.word.Length - 1) * dr                // fila final = r1 + (L-1)*dr
    let c2 = c1 + (cand.word.Length - 1) * dc                // col final = c1 + (L-1)*dc
    (placed @ nuevos, ((r1,c1),(r2,c2)))                     // tablero nuevo y segmento solución

// ====== Construir tablero con letras de relleno

let buildBoardWithFill (placed: Placed) (rnd: Random) : char list list =
    let letter () =  char (97 + rnd.Next(26))          // letra aleatoria 'a'..'z'
    let cell r c =                                           // caracter que irá en (r,c)
        match tryLookup (r,c) placed with
        | Some ch -> ch                                      // si ya hay letra, úsala
        | None    -> letter()                                // si no, rellena aleatorio
    [0..N-1]                                                 // filas 0..9
    |> List.map (fun r ->
        [0..N-1] |> List.map (fun c -> cell r c))            // columnas 0..9 → construye fila

// ====== Imprimir tablero

let boardToPlaced (board: char list list) : Placed =
    board
    |> List.mapi (fun r fila ->
        fila |> List.mapi (fun c ch -> ((r, c), ch)))
    |> List.concat

let printBoard (board: char list list) =
    // cabecera con columnas 0..9
    let header =
        let cols = [0..N-1] |> List.map string
        "   | " + (String.concat " " cols)
    printfn "%s" header
    printfn "%s" (String.replicate (4 + 2*N) "-")

    board
    |> List.mapi (fun i row ->
        // filas también con índice 0..9
        let prefix = sprintf "%d |" i
        let line = row |> List.map string |> String.concat " "
        sprintf "%s %s" prefix line)
    |> List.iter (printfn "%s")

    printfn ""
                                             // línea en blanco final

// ====== Organizar matriz con palabras

let organizarSoloPalabras (rnd: Random) (forbidden: Coord list) (palabras: string list) =
    let palabrasOrd = palabras |> List.sortByDescending (fun w -> w.Length) // largas primero
    let rec loop placed skipped rest =               // recursión sobre palabras restantes
        match rest with
        | [] -> placed, List.rev skipped   // fin: devuelve tablero, soluciones, saltadas
        | w::ws ->
            let cands = generarCandidatos w               // todos los candidatos para w
            match elegirMejor forbidden placed rnd cands with
            | None ->                                     // si no hay dónde ponerla:
                loop placed (w::skipped) ws          //   la marcamos como saltada
            | Some cand ->                                // si hay candidato elegido:
                let placed', seg = colocar placed cand    //   actualizamos tablero y solución
                loop placed'  skipped ws   //   seguimos con el resto
    loop [] [] palabrasOrd                             // llamada inicial con acumuladores vacíos
let organizarMatriz (rnd: Random) (forbidden: Coord list) (palabras: string list) : Placed * string list =
    let placed, skipped = organizarSoloPalabras rnd forbidden palabras
    let board = buildBoardWithFill placed rnd
    let fullPlaced = boardToPlaced board
    (fullPlaced, skipped)

// ====== Filtrar palabras desde archivo

let soloLetras (s:string) = s |> Seq.forall Char.IsLetter  // helper: ¿son todas letras?

let guardarPalabras (minLen:int) (maxLen:int) (lineas: string list) : string list =
    lineas
    |> List.map (fun s -> s.Trim())                        // quita espacios
    |> List.filter (fun s ->                               // filtra por longitud y letras
        s.Length >= minLen && s.Length <= maxLen && soloLetras s)
    |> List.map (fun s -> s.ToLowerInvariant())            // normaliza a minúsculas

// ====== Programa principal

let rec imprimirSoluciones sols =
    match sols with
    | [] -> ()   // caso base: lista vacía, no imprime nada
    | (w,((r1,c1),(r2,c2))) :: xs ->
        let toCol c = char (int 'A' + c)                    // índice columna → 'A'..'J'
        let toCell (r,c) = sprintf "%c%d" (toCol c) (r+1)   // (fila,col) → "A1"
        printfn " - %-12s : %s -> %s" w (toCell (r1,c1)) (toCell (r2,c2))
        imprimirSoluciones xs   


let rec imprimirCoord (sols: (int*int) list) =
    match sols with
    | [] -> ()
    | (x, y) :: xs ->
        printfn " - (%d, %d)" x y
        imprimirCoord xs


let vecinos (coord: Coord) (placed: Placed) : (Coord * char) list =
    let (x, y) = coord
    let posibles =
        [ (x+1, y); (x, y+1); (x+1, y+1)
          (x-1, y); (x, y-1); (x-1, y-1); 
          (x+1, y-1); (x-1, y+1)]
        |> List.filter inBounds
    posibles
    |> List.choose (fun c ->
        match tryLookup c placed with
        | Some ch -> Some (c, ch)   // si hay letra, devuelve (Coord, char)
        | None -> None)             // si no, lo descarta

let direccionConstante (ruta: (Coord * char) list) : bool =
    match ruta |> List.map fst |> List.rev with
    | [] | [_] -> true // 0 o 1 coord: siempre válida
    | (r1, c1) :: (r2, c2) :: rest ->
        let dr = r2 - r1
        let dc = c2 - c1
        let rec check prevR prevC rem =
            match rem with
            | [] -> true
            | (r, c) :: tail ->
                if (r - prevR, c - prevC) = (dr, dc)
                then check r c tail
                else false
        check r2 c2 rest

 
let extender (rutas: (Coord * char) list list) (placed: Placed) (word: char list)
  : ((Coord * char) list) list =
  rutas
  |> List.collect (function
       | [] -> []
       | (actual :: _) as ruta ->
           // letras ya consumidas por ESTA ruta
           let consumed = List.length ruta
           // próxima letra esperada para ESTA ruta
           match List.tryItem consumed word with
           | None ->
               // ya no hay más letras por consumir → esta ruta no se extiende
               []
           | Some expected ->
               let coord = fst actual
               vecinos coord placed
               |> List.choose (fun (c, ch) ->
                   if ch = expected && not (List.exists (fun (cRuta,_) -> cRuta = c) ruta) then
                       Some ((c, ch) :: ruta)   // extiende la ruta
                   else
                       None))


let buscarPrimeros (placed: Placed) (word: char list) : ((Coord * char) list) list =
    placed
    |> List.filter (fun (_, ch) -> List.head word = ch)
    |> List.map (fun p -> [p]) 


let solucion (ruta: (Coord * char) list) (word: char list) : bool =
    let letrasRuta = ruta |> List.rev |> List.map snd
    letrasRuta = word
    
let rec profaux (rutas: (Coord * char) list list) (placed: Placed) (word: char list) =
    
    match rutas with
    | [] ->
        printfn "ruta no encontrada"
        None
    | ruta :: rs ->
        //printfn "%A" ruta
        if solucion ruta word && direccionConstante ruta then
            // ruta completa (ya contiene todas las
            printfn "%A " ruta
            Some (List.rev ruta)
        else
            // extender SOLO esta ruta; 'extender' decide la letra que toca según el largo
            let nuevas = extender [ruta] placed word
            // si no se pudo extender, simplemente desaparece; seguimos con el resto
            profaux (nuevas @ rs) placed word

              



//et (define (prof ini fin)
  //(prof-aux (list (list (list ini fin)))))   
let prof (placed: Placed) (word: string) =
    let letras = word |> Seq.toList
    let iniciales = buscarPrimeros placed letras
    profaux iniciales placed letras


                                               // código de salida del programa