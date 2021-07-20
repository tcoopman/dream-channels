open Dream_channels

let ok () = Lwt.return `Ok

let reply answer = Lwt.return (`Reply answer)

let stop reason = Lwt.return (`Stop reason)

let chat_channel =
  Socket.
    { topic = "chat:*"
    ; intercept = (function _ -> false)
    ; create_callbacks =
        (fun topic ->
          { join =
              (fun _functions (Payload payload) ->
                match (topic, payload) with
                | WithSubtopic (_, _chat_id), _ ->
                    reply "welcome"
                | _ ->
                    stop "invalid topic" )
          ; handle_message =
              (fun _functions (Payload payload) ->
                match (topic, payload) with
                | WithSubtopic (_, _chat_id), _ ->
                    ok ()
                | _ ->
                    stop "invalid topic" )
          ; handle_out = (fun (Payload _) -> None)
          ; terminate = (fun () -> ())
          } )
    }

let home =
  <html>
    <body id="body">
      <script src="/static/main.js"></script>
    </body>
  </html>

let () =
  Dream.initialize_log ~level:`Debug () ;
  Dream.run ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router [

    Dream.get "/"
      (fun _ -> Dream.html home);

    Dream.get "/ws" (fun _ ->
      Dream.websocket @@ Socket.channels [ chat_channel ] );

    Dream.get "/static/**"
      (Dream.static "./static");

  ]
  @@ Dream.not_found
