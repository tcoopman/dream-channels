open Channels

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
                    [] |> Lwt.return
                | _ ->
                    [ `Stop "invalid topic" ] |> Lwt.return )
          ; handle_message =
              (fun functions (Payload payload) ->
                match (topic, payload) with
                | WithSubtopic ("chat", chat_id), "broadcast" ->
                    let%lwt () = functions.broadcast ("To everyone in " ^ chat_id) in
                    [] |> Lwt.return
                | WithSubtopic ("chat", chat_id), "broadcast_from" ->
                    let%lwt () = functions.broadcast_from ("To everyone except in " ^ chat_id) in
                    [] |> Lwt.return
                | WithSubtopic ("chat", _chat_id), "transform_out_broadcast" ->
                    let%lwt () = functions.broadcast "transform_out" in
                    [] |> Lwt.return
                | WithSubtopic ("chat", _chat_id), "transform_out_broadcast_from" ->
                    let%lwt () = functions.broadcast_from "transform_out" in
                    [] |> Lwt.return
                | _ ->
                    [] |> Lwt.return )
          ; handle_out = (fun (Payload _) -> Some (Payload "message transformed"))
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
                    [] |> Lwt.return
                | _ ->
                    [ `Stop "invalid topic" ] |> Lwt.return )
          ; handle_message =
              (fun functions (Payload payload) ->
                match (topic, payload) with
                | WithSubtopic ("test", chat_id), "broadcast" ->
                    let%lwt () = functions.broadcast ("broadcast:" ^ chat_id) in
                    [] |> Lwt.return
                | _ ->
                    [] |> Lwt.return )
          ; handle_out = (fun payload -> Some payload)
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
