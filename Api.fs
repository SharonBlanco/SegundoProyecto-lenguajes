module Api

open Giraffe
open Microsoft.AspNetCore.Http
open System.Text.Json
open System.Text.Json.Serialization
open ProyectoLenguajes.Logica



type CeldaDto = {
    columna : int
    fila    : int
    letra   : string
}

type BuscarMatrizPeticion = {
    placed  : CeldaDto list
    palabra : string
}

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




// === webApp conecta rutas con handlers
let webApp : HttpHandler =
    choose [
        POST >=> route "/api/matriz" >=> crearMatrizHandler
        POST >=> route "/api/buscar" >=> buscarHandler  // AHORA ES POST, no GET
    ]

