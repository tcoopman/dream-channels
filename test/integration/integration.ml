open Channels

let ok () = Lwt.return `Ok

let stop reason = Lwt.return (`Stop reason)

let chat_channel =
  Socket.
    { topic = "chat:*"
    ; intercept = (function Payload "transform_out" -> true | _ -> false)
    ; create_callbacks =
        (fun topic ->
          { join =
              (fun functions (Payload payload) ->
                match topic with
                | WithSubtopic ("chat", chat_id) ->
                    let%lwt () = functions.push @@ "joined:" ^ chat_id ^ "|payload:" ^ payload in
                    ok ()
                | _ ->
                    stop "invalid topic" )
          ; handle_message =
              (fun functions (Payload payload) ->
                match (topic, payload) with
                | WithSubtopic ("chat", chat_id), "broadcast" ->
                    let%lwt () = functions.broadcast ("To everyone in " ^ chat_id) in
                    ok ()
                | WithSubtopic ("chat", chat_id), "broadcast_from" ->
                    let%lwt () = functions.broadcast_from ("To everyone except in " ^ chat_id) in
                    ok ()
                | WithSubtopic ("chat", _chat_id), "transform_out_broadcast" ->
                    let%lwt () = functions.broadcast "transform_out" in
                    ok ()
                | WithSubtopic ("chat", _chat_id), "transform_out_broadcast_from" ->
                    let%lwt () = functions.broadcast_from "transform_out" in
                    ok ()
                | _ ->
                    ok () )
          ; handle_out = (fun (Payload _) -> Some (Payload "message transformed"))
          ; terminate = (fun () -> ())
          } )
    }


let test_channel =
  Socket.
    { topic = "test:*"
    ; intercept = (fun _ -> false)
    ; create_callbacks =
        (fun topic ->
          { join =
              (fun functions (Payload payload) ->
                match topic with
                | WithSubtopic ("test", chat_id) ->
                    let%lwt () =
                      functions.push @@ "joined-test:" ^ chat_id ^ "|payload:" ^ payload
                    in
                    ok ()
                | _ ->
                    stop "invalid topic")
          ; handle_message =
              (fun functions (Payload payload) ->
                match (topic, payload) with
                | WithSubtopic ("test", chat_id), "broadcast" ->
                    let%lwt () = functions.broadcast ("broadcast:" ^ chat_id) in
                    ok ()
                | _ ->
                    ok () )
          ; handle_out = (fun payload -> Some payload)
          ; terminate = (fun () -> ())
          } )
    }


let () =
  Dream.initialize_log ~level:`Debug () ;
  Dream.run ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router
       [ Dream.get "/ws" (fun _ -> Dream.websocket @@ Socket.channels [ chat_channel ])
       ; Dream.get "/ws2" (fun _ -> Dream.websocket @@ Socket.channels [ test_channel ])
       ]
  @@ Dream.not_found
