module Api

open System
open System.Collections.Concurrent
open Giraffe
open Microsoft.AspNetCore.Http
open System.Text.Json
open System.Text.Json.Serialization
open ProyectoLenguajes.Logica
open ProyectoLenguajes.Logica.Hangman



type CeldaDto = {
    columna : int
    fila    : int
    letra   : string
}

type BuscarMatrizPeticion = {
    placed  : CeldaDto list
    palabra : string
}

type NuevoJuegoAhorcadoRequest = {
    palabras   : string list option
    maxIntentos : int option
}

type IntentoLetraRequest = {
    juegoId : string
    letra   : string
}

type IntentoPalabraRequest = {
    juegoId : string
    palabra : string
}

let private hangmanPartidas = ConcurrentDictionary<Guid, HangmanState>()
let private hangmanRandom = Random()
let private hangmanRandomLock = obj()

let private clampIntentos valor =
    let minimo = 3
    let maximo = 12
    valor
    |> max minimo
    |> min maximo

let private snapshotAhorcado id estado mensaje =
    Hangman.crearSnapshot id estado DateTime.UtcNow mensaje

let private seleccionarPalabraDisponible palabrasUsuario =
    let preparadas = prepararPalabras palabrasUsuario
    if List.isEmpty preparadas then
        Hangman.cargarPalabrasDesdeArchivo()
    else
        preparadas

// Convertimos el tablero (char list list) a JSON-friendly formato: list<list<string>>
let boardToJson (board: char list list) : string =
    board
    |> List.map (List.map string) // convierte cada letra a string
    |> JsonSerializer.Serialize

// ==== Handler para POST /api/matriz con lista de palabras JSON en el body
// ==== Handler para POST /api/matriz con lista de palabras JSON en el body
let crearMatrizHandler : HttpHandler =
    fun next ctx ->
        task {
            //  Leer las palabras desde el cuerpo de la solicitud (JSON)
            let! palabras = ctx.BindJsonAsync<string list>()
            let palabrasFiltradas =
                guardarPalabras 3 10 palabras
                |> List.truncate 10

            let forbidden : Coord list = []
            let rnd = System.Random()

            //  Generar placed con tus palabras
            let placed, _ = organizarMatriz rnd forbidden palabrasFiltradas


            //  Transformar placed a formato JSON-friendly (lista de objetos con fila, columna y letra)
            let placedJson =
                placed
                |> List.map (fun ((x, y), ch) ->
                    {| fila = x; columna = y; letra = string ch |})

            //  Empaquetar todo en un solo objeto JSON
            let response =
                 {| palabrasFiltradas = palabrasFiltradas; placed = placedJson |}

            //  Enviar al cliente
            return! ctx.WriteJsonAsync(response)
        }



// ==== Handler para GET /api/buscar?palabra=loquesea
// === Tipo esperado en el JSON

// ==== Nuevo handler para POST /api/buscar
let buscarHandler : HttpHandler =
    fun next ctx ->
        task {
            let! body = ctx.BindJsonAsync<BuscarMatrizPeticion>()

            // Convertimos la matriz completa a Placed ((Coord * char) list)
            let placed : Placed =
                body.placed
                |> List.choose (fun c ->
                    c.letra
                    |> Seq.tryHead
                    |> Option.map (fun ch -> ((c.fila, c.columna), System.Char.ToUpper ch))
                )

            // Normaliza la palabra a la misma convención
            let palabra = body.palabra.ToUpperInvariant()

            let resultado = prof placed palabra

            match resultado with
            | Some ruta ->
                let texto =
                    ruta
                    |> List.map (fun ((x, y), ch) -> $"{ch}({x},{y})")
                    |> String.concat "; "

                return! ctx.WriteTextAsync($"Ruta: {texto}")
            | None ->
                return! ctx.WriteTextAsync("Palabra no encontrada")

        }


let iniciarAhorcadoHandler : HttpHandler =
    fun next ctx ->
        task {
            let baseRequest = { palabras = None; maxIntentos = None }
            let! peticion =
                task {
                    if ctx.Request.ContentLength.HasValue && ctx.Request.ContentLength.Value > 0L then
                        try
                            let! datos = ctx.BindJsonAsync<NuevoJuegoAhorcadoRequest>()
                            return datos
                        with _ ->
                            return baseRequest
                    else
                        return baseRequest
                }

            let palabrasUsuario = peticion.palabras |> Option.defaultValue []
            let palabrasDisponibles = seleccionarPalabraDisponible palabrasUsuario

            if List.isEmpty palabrasDisponibles then
                ctx.SetStatusCode(StatusCodes.Status400BadRequest)
                return! ctx.WriteJsonAsync({| error = "No hay palabras válidas disponibles para iniciar el ahorcado." |})
            else
                let maxIntentos = peticion.maxIntentos |> Option.defaultValue 7 |> clampIntentos
                let palabraElegida =
                    lock hangmanRandomLock (fun () -> elegirPalabra hangmanRandom palabrasDisponibles)
                let ahora = DateTime.UtcNow
                let estadoInicial = crearEstado palabraElegida maxIntentos ahora
                let juegoId = Guid.NewGuid()
                hangmanPartidas[juegoId] <- estadoInicial

                let mensaje =
                    if not (List.isEmpty palabrasUsuario) then
                        "Juego iniciado con tus palabras personalizadas. ¡Éxitos!"
                    else
                        "Juego iniciado. ¡Buena suerte!"

                let respuesta = snapshotAhorcado juegoId estadoInicial (Some mensaje)
                return! ctx.WriteJsonAsync(respuesta)
        }

let intentarLetraHandler : HttpHandler =
    fun next ctx ->
        task {
            let! body = ctx.BindJsonAsync<IntentoLetraRequest>()

            match Guid.TryParse body.juegoId with
            | false, _ ->
                ctx.SetStatusCode(StatusCodes.Status400BadRequest)
                return! ctx.WriteJsonAsync({| error = "Identificador de juego inválido." |})
            | true, juegoId ->
                match hangmanPartidas.TryGetValue juegoId with
                | false, _ ->
                    ctx.SetStatusCode(StatusCodes.Status404NotFound)
                    return! ctx.WriteJsonAsync({| error = "Partida no encontrada." |})
                | true, estadoActual ->
                    let ahora = DateTime.UtcNow
                    let estadoPrevio = snapshotAhorcado juegoId estadoActual None
                    if estadoPrevio.estado <> "en_curso" then
                        let respuesta = { estadoPrevio with mensaje = Some "La partida ya finalizó. Inicia una nueva para continuar jugando." }
                        return! ctx.WriteJsonAsync(respuesta)
                    else
                        let letraTexto = body.letra.Trim().ToUpperInvariant()
                        if String.IsNullOrWhiteSpace letraTexto then
                            ctx.SetStatusCode(StatusCodes.Status400BadRequest)
                            return! ctx.WriteJsonAsync({| error = "Debes enviar una letra válida." |})
                        else
                            let letra = letraTexto[0]
                            let repetida = letraYaUsada estadoActual letra
                            let esCorrecta = contieneLetra estadoActual letra
                            let nuevoEstado = aplicarLetra estadoActual letra ahora
                            hangmanPartidas[juegoId] <- nuevoEstado

                            let snapshot = snapshotAhorcado juegoId nuevoEstado None
                            let mensaje =
                                if repetida then
                                    sprintf "La letra '%c' ya fue utilizada." letra
                                elif snapshot.estado = "ganado" then
                                    let palabra = snapshot.palabraCompleta |> Option.defaultValue ""
                                    match snapshot.tiempoFinal with
                                    | Some segundos -> sprintf "🎉 ¡Adivinaste la palabra %s en %.2f segundos!" palabra segundos
                                    | None -> sprintf "🎉 ¡Adivinaste la palabra %s!" palabra
                                elif snapshot.estado = "perdido" then
                                    let palabra = snapshot.palabraCompleta |> Option.defaultValue ""
                                    sprintf "💀 Sin intentos restantes. La palabra era %s." palabra
                                elif esCorrecta then
                                    sprintf "✅ La letra '%c' está en la palabra." letra
                                else
                                    sprintf "❌ La letra '%c' no está en la palabra. Intentos restantes: %d." letra snapshot.intentosRestantes

                            let respuesta = { snapshot with mensaje = Some mensaje }
                            return! ctx.WriteJsonAsync(respuesta)
        }

let intentarPalabraHandler : HttpHandler =
    fun next ctx ->
        task {
            let! body = ctx.BindJsonAsync<IntentoPalabraRequest>()

            match Guid.TryParse body.juegoId with
            | false, _ ->
                ctx.SetStatusCode(StatusCodes.Status400BadRequest)
                return! ctx.WriteJsonAsync({| error = "Identificador de juego inválido." |})
            | true, juegoId ->
                match hangmanPartidas.TryGetValue juegoId with
                | false, _ ->
                    ctx.SetStatusCode(StatusCodes.Status404NotFound)
                    return! ctx.WriteJsonAsync({| error = "Partida no encontrada." |})
                | true, estadoActual ->
                    let ahora = DateTime.UtcNow
                    let estadoPrevio = snapshotAhorcado juegoId estadoActual None
                    if estadoPrevio.estado <> "en_curso" then
                        let respuesta = { estadoPrevio with mensaje = Some "La partida ya finalizó. Inicia una nueva para continuar jugando." }
                        return! ctx.WriteJsonAsync(respuesta)
                    else
                        let intento = body.palabra.Trim()
                        if String.IsNullOrWhiteSpace intento then
                            ctx.SetStatusCode(StatusCodes.Status400BadRequest)
                            return! ctx.WriteJsonAsync({| error = "Debes enviar una palabra válida." |})
                        else
                            let nuevoEstado = intentarPalabra estadoActual intento ahora
                            hangmanPartidas[juegoId] <- nuevoEstado
                            let snapshot = snapshotAhorcado juegoId nuevoEstado None
                            let intentoMayus = intento.ToUpperInvariant()

                            let mensaje =
                                match snapshot.estado with
                                | "ganado" ->
                                    let palabra = snapshot.palabraCompleta |> Option.defaultValue intentoMayus
                                    match snapshot.tiempoFinal with
                                    | Some segundos -> sprintf "🎉 ¡Correcto! La palabra era %s. Tiempo total: %.2f segundos." palabra segundos
                                    | None -> sprintf "🎉 ¡Correcto! La palabra era %s." palabra
                                | "perdido" ->
                                    let palabra = snapshot.palabraCompleta |> Option.defaultValue intentoMayus
                                    sprintf "💀 Intento incorrecto. La palabra era %s." palabra
                                | _ ->
                                    sprintf "❌ %s no es la palabra. Intentos restantes: %d." intentoMayus snapshot.intentosRestantes

                            let respuesta = { snapshot with mensaje = Some mensaje }
                            return! ctx.WriteJsonAsync(respuesta)
        }

let obtenerAhorcadoHandler (id: string) : HttpHandler =
    fun next ctx ->
        task {
            match Guid.TryParse id with
            | false, _ ->
                ctx.SetStatusCode(StatusCodes.Status400BadRequest)
                return! ctx.WriteJsonAsync({| error = "Identificador de juego inválido." |})
            | true, juegoId ->
                match hangmanPartidas.TryGetValue juegoId with
                | false, _ ->
                    ctx.SetStatusCode(StatusCodes.Status404NotFound)
                    return! ctx.WriteJsonAsync({| error = "Partida no encontrada." |})
                | true, estado ->
                    let respuesta = snapshotAhorcado juegoId estado None
                    return! ctx.WriteJsonAsync(respuesta)
        }




// === webApp conecta rutas con handlers
let webApp : HttpHandler =
    choose [
        POST >=> route "/api/matriz" >=> crearMatrizHandler
        POST >=> route "/api/buscar" >=> buscarHandler  // AHORA ES POST, no GET
        POST >=> route "/api/ahorcado/nuevo" >=> iniciarAhorcadoHandler
        POST >=> route "/api/ahorcado/letra" >=> intentarLetraHandler
        POST >=> route "/api/ahorcado/palabra" >=> intentarPalabraHandler
        GET  >=> routef "/api/ahorcado/%s" obtenerAhorcadoHandler
    ]

