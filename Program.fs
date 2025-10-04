// Importamos las librerías necesarias
open System                              // Funciones básicas de .NET (como consola, fecha, etc.)
open Microsoft.AspNetCore.Builder        // Para construir la app web
open Microsoft.AspNetCore.Hosting        // Para configurar y alojar el servidor web
open Microsoft.Extensions.Hosting        // Para crear el "host" de la app
open Microsoft.Extensions.DependencyInjection // Para registrar servicios necesarios
open Giraffe                             // Giraffe es el framework web funcional para F#
open Api

// Esta es la función principal del programa, la que se ejecuta cuando corres tu app
[<EntryPoint>]
let main args =
    Host.CreateDefaultBuilder(args)
        .ConfigureWebHostDefaults(fun webBuilder ->
            webBuilder
                .UseUrls("http://localhost:5000")
                .Configure(fun app -> 
                    app.UseGiraffe Api.webApp) // ✅ usa el webApp correcto
                .ConfigureServices(fun services ->
                    services.AddGiraffe() |> ignore
                )
            |> ignore)
        .Build()
        .Run()
    0
