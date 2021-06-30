open Channels

let chat_channel functions topic = Socket.{
  join = (fun (Payload payload) ->
    match topic with
    | WithSubtopic ("chat", chat_id) ->
        let%lwt () = functions.push @@ "joined:" ^ chat_id ^ "|payload:" ^ payload in
        [] |> Lwt.return
    | _ -> [`Stop "invalid topic"] |> Lwt.return);
  handle_message= (fun (Payload payload) -> 
    let%lwt () = functions.broadcast_from "To all others" in
    let%lwt () = functions.broadcast "To everyone" in
    [`Reply payload] |> Lwt.return);
}

let () =
  Dream.initialize_log ~level:`Debug ();
  Dream.run ~interface:"0.0.0.0"
  @@ Dream.logger
  @@ Dream.router [

    Dream.get "/ws"
      (fun _ ->
        Dream.websocket @@ Socket.channels [
          ("chat:*", chat_channel);
          ]);

  ]
  @@ Dream.not_found
