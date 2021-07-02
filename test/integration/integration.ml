open Channels

let chat_channel functions topic =
  Socket.
    { join =
        (fun (Payload payload) ->
          match topic with
          | WithSubtopic ("chat", chat_id) ->
              let%lwt () = functions.push @@ "joined:" ^ chat_id ^ "|payload:" ^ payload in
              [] |> Lwt.return
          | _ ->
              [ `Stop "invalid topic" ] |> Lwt.return )
    ; handle_message =
        (fun (Payload payload) ->
          match (topic, payload) with
          | WithSubtopic ("chat", chat_id), "broadcast" ->
              let%lwt () = functions.broadcast ("To everyone in " ^ chat_id) in
              [] |> Lwt.return
          | _ ->
              [] |> Lwt.return )
    }

let test_channel functions topic =
  Socket.
    { join =
        (fun (Payload payload) ->
          match topic with
          | WithSubtopic ("test", chat_id) ->
              let%lwt () = functions.push @@ "joined-test:" ^ chat_id ^ "|payload:" ^ payload in
              [] |> Lwt.return
          | _ ->
              [ `Stop "invalid topic" ] |> Lwt.return )
    ; handle_message =
        (fun (Payload payload) ->
          match (topic, payload) with
          | WithSubtopic ("test", chat_id), "broadcast" ->
              let%lwt () = functions.broadcast ("broadcast:" ^ chat_id) in
              [] |> Lwt.return
          | _ ->
              [] |> Lwt.return )
    }


let () =
  Dream.initialize_log ~level:`Debug () ;
  Dream.run ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router
       [ 
         Dream.get "/ws" (fun _ -> Dream.websocket @@ Socket.channels [ ("chat:*", chat_channel) ]);
         Dream.get "/ws2" (fun _ -> Dream.websocket @@ Socket.channels [ ("test:*", test_channel) ])
       ]
  @@ Dream.not_found
