(* TODO have tests before further adding functionality - see: https://github.com/aantron/dream/issues/83 *)
type topic =
  | Topic of string
  | WithSubtopic of (string * string)

type payload = Payload of string

type answers = answer list Lwt.t

and answer =
  [ `Reply of string
  | `Broadcast of string
  | `Stop of string
  ]

type functions =
  { push : string -> unit Lwt.t
  ; broadcast : string -> unit Lwt.t
  ; broadcast_from : string -> unit Lwt.t
  }

type channel = functions -> topic -> callbacks

and callbacks =
  { join : payload -> answers
  ; handle_message : payload -> answers
  }

open Base

module Clients = struct
  let clients = Hashtbl.create (module Int)

  let clients_per_topic = Hashtbl.create (module String)

  let connect =
    let last_client_id = ref 0 in
    fun client ->
      let client_id = !last_client_id in
      Hashtbl.set clients ~key:client_id ~data:([], client) ;
      last_client_id := client_id + 1 ;
      client_id


  let join topic client_id callbacks =
    Hashtbl.change clients client_id ~f:(function
        | None ->
            None
        | Some (topics, client) ->
            Hashtbl.add_multi clients_per_topic ~key:topic ~data:(client_id, client, callbacks) ;
            Some (topic :: topics, client) )


  let disconnect client_id =
    match Hashtbl.find_and_remove clients client_id with
    | None ->
        ()
    | Some (topics, _client) ->
        List.iter
          ~f:(fun topic ->
            Hashtbl.change clients_per_topic topic ~f:(function
                | None ->
                    None
                | Some clients ->
                    Some
                      (List.filter clients ~f:(fun (c_id, _c, _callbacks) ->
                           not (Int.equal client_id c_id) ) ) ) )
          topics


  let iter_p ~topic ~f = Hashtbl.find_multi clients_per_topic topic |> Lwt_list.iter_p f

  let callbacks client_id topic =
    Hashtbl.find_multi clients_per_topic topic
    |> List.find_map ~f:(fun (c_id, _client, callbacks) ->
           if Int.equal client_id c_id then Some callbacks else None )
end

(* module ClientTests = struct *)
(*   let%expect_test "addition" = *)
(*     let id = Clients.connect "(Dream.websocket)" in *)
(*     let () = Clients.join "topic" id "callbacks" in *)
(*     [%expect {| TODO |}] *)
(* end *)

let log = Dream.sub_log "dream.channels"

(* join|topic|payload *)
(* send|topic|payload *)

type msg_type =
  | Join
  | Send

let parse_topic topic =
  match String.split topic ~on:':' with
  | [ topic ] ->
      Topic topic |> Result.return
  | [ topic; subtopic ] ->
      WithSubtopic (topic, subtopic) |> Result.return
  | _ ->
      Error ("incorrect topic: " ^ topic)


let parse_message message =
  let splitted = Stdlib.String.trim message |> String.split ~on:'|' in
  let splitted =
    match splitted with
    | [ msg_type; topic; payload ] ->
        Ok (msg_type, topic, payload)
    | [ msg_type; topic ] ->
        Ok (msg_type, topic, "")
    | _ ->
        Error ("incorrect message: " ^ message)
  in
  Result.bind
    ~f:(function
      | "join", topic, payload ->
          Ok (Join, topic, Payload payload)
      | "send", topic, payload ->
          Ok (Send, topic, Payload payload)
      | _ ->
          Error "Incorrect message type - expecting join or send" )
    splitted


let send client client_id payload =
  try%lwt Dream.send client payload with
  | _ ->
      log.error (fun log -> log "failed to send to client: %i" client_id) ;
      Lwt.return_unit


let channels topics client =
  let find_channel topic =
    let expected_topic =
      match topic with Topic topic -> topic | WithSubtopic (topic, _subtopic) -> topic ^ ":*"
    in
    List.find_map
      ~f:(fun (expected_route, channel) ->
        if String.equal expected_route expected_topic then Some channel else None )
      topics
  in
  let client_id = Clients.connect client in
  let receive_and_parse () =
    match%lwt Dream.receive client with
    | Some message ->
        log.info (fun log -> log "Message received: %s" message) ;
        parse_message message |> Lwt.return
    | None ->
        Lwt_result.fail "No message received"
  in
  let process_answers answers =
    match answers with
    | [] ->
        Lwt.return_unit
    | [ `Reply rep ] ->
        send client client_id rep
    | [ `Stop message ] ->
        (* TODO test *)
        log.info (fun log -> log "Stopping %s" message) ;
        Clients.disconnect client_id ;
        Dream.close_websocket client
    | _ ->
        Lwt.return_unit
  in
  let rec loop () =
    match%lwt receive_and_parse () with
    | Error e ->
        log.debug (fun log -> log "Closing %i - error %s" client_id e);
        Clients.disconnect client_id ;
        Dream.close_websocket client
    | Ok (Send, topic, payload) ->
        let callbacks = Clients.callbacks client_id topic in
        ( match callbacks with
        | Some callbacks ->
            let%lwt answers = callbacks.handle_message payload in
            let%lwt () = process_answers answers in
            loop ()
        | None ->
            let%lwt () =
              send client client_id "You tried to send to a channel, but you were not joined"
            in
            log.error (fun log -> log "tried to send but not joined") ;
            loop () )
    | Ok (Join, topic, payload) ->
        let topic_and_channel =
          parse_topic topic
          |> Result.bind ~f:(fun parsed_topic ->
                 find_channel parsed_topic
                 |> Result.of_option ~error:"Could not find a channel"
                 |> Result.bind ~f:(fun channel -> Ok (parsed_topic, channel)) )
        in
        ( match topic_and_channel with
        | Ok (parsed_topic, channel) ->
            let functions =
              { push = send client client_id
              ; broadcast =
                  (fun payload ->
                    let string_topic = topic in
                    Clients.iter_p ~topic:string_topic ~f:(fun (c_id, c, _callbacks) ->
                        send c c_id payload ) )
              ; broadcast_from =
                  (fun payload ->
                    let string_topic = topic in
                    Clients.iter_p ~topic:string_topic ~f:(fun (c_id, c, _callbacks) ->
                        if not (Int.equal client_id c_id)
                        then send c c_id payload
                        else Lwt.return_unit ) )
              }
            in
            let callbacks = channel functions parsed_topic in
            Clients.join topic client_id callbacks ;
            let%lwt answers = callbacks.join payload in
            let%lwt () = process_answers answers in
            loop ()
        | Error _error ->
            Lwt.return_unit )
  in

  log.info (fun log -> log "Listening") ;
  loop ()
