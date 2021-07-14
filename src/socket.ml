type channel =
  { topic : string
  ; intercept : intercept
  ; create_callbacks : topic -> callbacks
  }

and intercept = payload -> bool

and payload = Payload of string

and topic =
  | Topic of string
  | WithSubtopic of (string * string)

and callbacks =
  { join : functions -> payload -> answer Lwt.t
  ; handle_message : functions -> payload -> answer Lwt.t
  ; handle_out : payload -> payload option
  ; terminate : unit -> unit
  }

and answer =
  [ `Ok
  | `Reply of string
  | `Stop of string
  ]

and functions =
  { push : string -> unit Lwt.t
  ; broadcast : string -> unit Lwt.t
  ; broadcast_from : string -> unit Lwt.t
  }

open Base

let log = Dream.sub_log "dream.channels"

let send client client_id payload =
  try%lwt Dream.send client payload |> Lwt_result.ok with
  | error ->
      let error = Exn.to_string error in
      Stdlib.print_endline error ;
      log.error (fun log -> log "failed to send to client: %i - error: %s" client_id error) ;
      Lwt_result.fail (Printf.sprintf "failed to send to client: %i" client_id)


module Clients = struct
  let clients = Hashtbl.create (module Int)

  let clients_per_topic = Hashtbl.create (module String)

  let connect =
    let last_client_id = ref 0 in
    fun client ->
      let client_id = !last_client_id in
      log.debug (fun log -> log "new client connected: %i" client_id) ;
      Hashtbl.set clients ~key:client_id ~data:([], client) ;
      last_client_id := client_id + 1 ;
      client_id


  let join topic client_id data =
    Hashtbl.change clients client_id ~f:(function
        | None ->
            None
        | Some (topics, client) ->
            Hashtbl.add_multi clients_per_topic ~key:topic ~data:(client_id, client, data) ;
            Some (topic :: topics, client) )


  let close_channel client_id topic =
    Hashtbl.change clients_per_topic topic ~f:(function
        | None ->
            None
        | Some clients ->
            let removed, keeping =
              List.partition_tf clients ~f:(fun (c_id, _c, _data) -> Int.equal client_id c_id)
            in
            List.hd removed
            |> Option.iter ~f:(fun (_c_id, _c, (callbacks, _functions)) -> callbacks.terminate ()) ;
            Some keeping )


  let disconnect client_id =
    log.debug (fun log -> log "disconnecting %i" client_id) ;
    match Hashtbl.find_and_remove clients client_id with
    | None ->
        ()
    | Some (topics, _client) ->
        List.iter ~f:(close_channel client_id) topics


  let iter_p ~topic ~f = Hashtbl.find_multi clients_per_topic topic |> Lwt_list.iter_p f

  let callbacks_and_functions client_id topic =
    Hashtbl.find_multi clients_per_topic topic
    |> List.find_map ~f:(fun (c_id, _client, callbacks_and_functions) ->
           if Int.equal client_id c_id then Some callbacks_and_functions else None )
end

(* module ClientTests = struct *)
(*   let%expect_test "addition" = *)
(*     let id = Clients.connect "(Dream.websocket)" in *)
(*     let () = Clients.join "topic" id "callbacks" in *)
(*     [%expect {| TODO |}] *)
(* end *)

(* join|topic|payload *)
(* send|topic|payload *)

let parse_topic topic =
  match String.split topic ~on:':' with
  | [ topic ] ->
      Topic topic |> Result.return
  | [ topic; subtopic ] ->
      WithSubtopic (topic, subtopic) |> Result.return
  | _ ->
      Error ("incorrect topic: " ^ topic)


let disconnect client_id client =
  log.debug (fun log -> log "Disconnecting client %i" client_id) ;
  Clients.disconnect client_id ;
  Dream.close_websocket client


let send_or_disconnect client client_id payload =
  let payload = Reply.encode payload in
  match%lwt send client client_id payload with
  | Ok () ->
      Lwt.return_unit
  | Error _error ->
      disconnect client_id client


let channels channels client =
  let find_channel topic =
    let expected_topic =
      match topic with Topic topic -> topic | WithSubtopic (topic, _subtopic) -> topic ^ ":*"
    in
    List.find_map
      ~f:(fun ({ topic; _ } as channel) ->
        if String.equal topic expected_topic then Some channel else None )
      channels
  in
  let client_id = Clients.connect client in
  let receive_and_parse () =
    (* TODO incorrect message is not the same as disconnecting *)
    match%lwt Dream.receive client with
    | Some message ->
        log.info (fun log -> log "Message received: %s" message) ;
        Message.parse message |> Lwt.return
    | None ->
        Lwt_result.fail "No message received"
  in
  let process_answer topic join_ref ref = function
    (* TODO: this should have a noreply probably *)
    | `Ok ->
        Lwt.return_unit
    | `Reply message ->
        let reply = Reply.{ event = Reply.Push; topic; join_ref; ref; payload = message } in
        send_or_disconnect client client_id reply
    | `Stop message ->
        (* TODO: is this the best place to close the channel? *)
        let () = Clients.close_channel client_id topic in
        let reply = Reply.{ event = Reply.Stop; topic; join_ref; ref; payload = message } in
        send_or_disconnect client client_id reply
    | _ ->
        Lwt.return_unit
  in
  let rec loop () =
    match%lwt receive_and_parse () with
    | Error error ->
        log.debug (fun log -> log "Error in received message: %s" error) ;
        disconnect client_id client
    | Ok ({ message_type = Push; _ } as message) ->
        log.debug (fun log ->
            log "received push with topic %s and payload %s" message.topic message.payload ) ;
        let callbacks_and_functions = Clients.callbacks_and_functions client_id message.topic in
        let%lwt () =
          match callbacks_and_functions with
          | Some (callbacks, functions) ->
              log.debug (fun log -> log "client: %i is handling the message" client_id) ;
              let%lwt answer = callbacks.handle_message functions (Payload message.payload) in
              process_answer message.topic message.join_ref (Some message.ref) answer
          | None ->
              log.debug (fun log ->
                  log
                    "received a message (%s), but this client (%i) is not joined"
                    message.payload
                    client_id ) ;
              send_or_disconnect
                client
                client_id
                Reply.
                  { event = Reply.Push
                  ; topic = message.topic
                  ; join_ref = message.join_ref
                  ; ref = None
                  ; payload = "You tried to send to a channel, but you were not joined"
                  }
        in

        loop ()
    | Ok ({ message_type = Join; _ } as message) ->
        let topic_and_channel =
          parse_topic message.topic
          |> Result.bind ~f:(fun parsed_topic ->
                 find_channel parsed_topic
                 |> Result.of_option ~error:"Could not find a channel"
                 |> Result.bind ~f:(fun channel -> Ok (parsed_topic, channel)) )
        in
        ( match topic_and_channel with
        | Ok (parsed_topic, channel) ->
            let callbacks = channel.create_callbacks parsed_topic in
            let functions =
              log.debug (fun log -> log "creating functions for %s" message.topic) ;
              let send_with_handle_out client client_id payload =
                match callbacks.handle_out (Payload payload) with
                | Some (Payload payload) ->
                    let reply =
                      Reply.
                        { event = Reply.Push
                        ; topic = message.topic
                        ; join_ref = message.join_ref
                        ; ref = None
                        ; payload
                        }
                    in
                    send_or_disconnect client client_id reply
                | None ->
                    Lwt.return_unit
              in
              { push =
                  (fun payload ->
                    let reply =
                      Reply.
                        { event = Reply.Push
                        ; topic = message.topic
                        ; join_ref = message.join_ref
                        ; ref = Some message.ref
                        ; payload
                        }
                    in
                    send_or_disconnect client client_id reply )
              ; broadcast =
                  (fun payload ->
                    let send =
                      if channel.intercept (Payload payload)
                      then send_with_handle_out
                      else
                        fun client client_id payload ->
                        let reply =
                          Reply.
                            { event = Reply.Push
                            ; topic = message.topic
                            ; join_ref = message.join_ref
                            ; ref = None
                            ; payload
                            }
                        in

                        send_or_disconnect client client_id reply
                    in
                    Clients.iter_p ~topic:message.topic ~f:(fun (c_id, c, _callbacks) ->
                        log.debug (fun log -> log "sending broadcast with topic %s" message.topic) ;
                        send c c_id payload ) )
              ; broadcast_from =
                  (fun payload ->
                    let send =
                      if channel.intercept (Payload payload)
                      then send_with_handle_out
                      else
                        fun client client_id payload ->
                        let reply =
                          Reply.
                            { event = Reply.Push
                            ; topic = message.topic
                            ; join_ref = message.join_ref
                            ; ref = None
                            ; payload
                            }
                        in

                        send_or_disconnect client client_id reply
                    in
                    Clients.iter_p ~topic:message.topic ~f:(fun (c_id, c, _callbacks) ->
                        if not (Int.equal client_id c_id)
                        then
                          let () =
                            log.debug (fun log ->
                                log "broadcast_from the message %s %i" payload c_id )
                          in
                          send c c_id payload
                        else Lwt.return_unit ) )
              }
            in
            Clients.join message.topic client_id (callbacks, functions) ;
            let%lwt answer = callbacks.join functions (Payload message.payload) in
            let%lwt () = process_answer message.topic message.join_ref (Some message.ref) answer in
            loop ()
        | Error error ->
            log.error (fun log -> log "Could not handle message: %s" error) ;
            Dream.send client "error" )
  in

  log.info (fun log -> log "Listening") ;
  loop ()
