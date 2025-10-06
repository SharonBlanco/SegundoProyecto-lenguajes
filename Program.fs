module Program

open System
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Hosting
open Microsoft.Extensions.Hosting
open Microsoft.Extensions.DependencyInjection
open Microsoft.AspNetCore.Cors.Infrastructure
open Api
open Giraffe

[<EntryPoint>]
let main args =
    Host.CreateDefaultBuilder(args)
        .ConfigureWebHostDefaults(fun webBuilder ->
            webBuilder
                .UseUrls("http://localhost:5000")
                .Configure(fun app ->
                    // habilitamos CORS antes de Giraffe
                    app.UseCors("AllowFrontend") |> ignore
                    app.UseGiraffe(Api.webApp)
                )
                .ConfigureServices(fun services ->
                    // registramos Giraffe y la política CORS
                    services.AddGiraffe() |> ignore
                    services.AddCors(fun options ->
                        options.AddPolicy("AllowFrontend", fun policy ->
                            policy
                                .WithOrigins("http://localhost:5173") // tu frontend
                                .AllowAnyHeader()
                                .AllowAnyMethod()
                                |> ignore
                        )
                    ) |> ignore
                )
            |> ignore)
        .Build()
        .Run()
    0
