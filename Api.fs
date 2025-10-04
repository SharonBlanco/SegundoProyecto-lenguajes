module Api

open Giraffe
open Microsoft.AspNetCore.Http
open System.Text.Json
open System.Text.Json.Serialization
open ProyectoLenguajes.Logica

// Convertimos el tablero (char list list) a JSON-friendly formato: list<list<string>>
let boardToJson (board: char list list) : string =
    board
    |> List.map (List.map string) // convierte cada letra a string
    |> JsonSerializer.Serialize

// ==== Handler para POST /api/matriz con lista de palabras JSON en el body
let crearMatrizHandler : HttpHandler =
    fun next ctx ->
        task {
            // Intenta leer lista de palabras del cuerpo de la solicitud (JSON array)
            let! palabras = ctx.BindJsonAsync<string list>()

            let forbidden : Coord list = []
            let rnd = System.Random()

            // Usamos organizarMatriz para generar el tablero
            let placed, _ = organizarMatriz rnd forbidden palabras
            let board = buildBoardWithFill placed rnd
            
            return! ctx.WriteJsonAsync(board |> List.map (List.map string))

        }

// ==== Handler para GET /api/buscar?palabra=loquesea
let buscarHandler : HttpHandler =
    fun next ctx ->
        task {
            match ctx.TryGetQueryStringValue "palabra" with
            | Some palabra ->
                // Simulación: usás un placed vacío, pero lo podés cambiar si querés cachearlo
                let placed : Placed = [] // <- cambiá esto si querés usar el placed real
                let resultado = prof placed palabra

                match resultado with
                | Some ruta ->
                    let texto =
                        ruta
                        |> List.map (fun ((x, y), ch) -> $"{ch}({x},{y})")
                        |> String.concat " → "
                    return! ctx.WriteTextAsync($"Ruta: {texto}")
                | None ->
                    return! ctx.WriteTextAsync("Palabra no encontrada")
            | None ->
                return! ctx.WriteTextAsync("Falta el parámetro 'palabra'")
        }

// === webApp conecta rutas con handlers
let webApp : HttpHandler =
    choose [
        POST >=> route "/api/matriz" >=> crearMatrizHandler
        GET  >=> route "/api/buscar" >=> buscarHandler
    ]
