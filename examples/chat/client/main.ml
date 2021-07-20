open Vdom

let button ?(a = []) txt f = input [] ~a:(onclick (fun _ -> f) :: type_button :: value txt :: a)

(* let span = elt "span" *)

module IntMap = Map.Make (struct
  type t = int

  let compare : int -> int -> int = compare
end)

type 'msg Vdom.Cmd.t += Run of (('msg -> unit) -> unit)

module ChatChannel = struct
  type model =
    { joined : bool
    ; channel : Ws.Channel.t
    ; messages : string list
    ; text : string
    }

  let init =
    let socket = Ws.Socket.create "ws://localhost:8080/ws" in
    let () = Ws.Socket.connect socket in
    let channel = Ws.Socket.channel socket "chat:1" in
    return { joined = false; channel; messages = []; text = "" }


  let update model = function
    | `Join ->
        return
          model
          ~c:
            [ Run
                (fun send ->
                  let channel = model.channel in
                  let joinReceive = Ws.Channel.join channel "Thomas" in
                  Ws.Channel.on channel (fun msg -> send (`Received msg)) ;
                  Ws.ChannelPush.receive joinReceive (fun msg -> send (`Joined msg)) )
            ]
    | `Joined message ->
        return { model with joined = true; messages = message :: model.messages }
    | `Received message ->
        return { model with messages = message :: model.messages }
    | `Text text ->
        return { model with text }
    | `Send ->
        let () = ignore (Ws.Channel.push model.channel model.text) in
        return { model with text = "" }


  let view model =
    if not model.joined
    then button "Join" `Join
    else
      div
        [ div (List.map (fun message -> div [ text message ]) model.messages)
        ; input [] ~a:[ oninput (fun s -> `Text s); value model.text ]
        ; button "Send" `Send
        ]


  let app = { init; update; view }
end

let cmd_handler ctx = function
  | Run cb ->
      cb (fun x -> Vdom_blit.Cmd.send_msg ctx x) ;
      true
  | _ ->
      false


let () = Vdom_blit.(register (cmd { f = cmd_handler }))

open Js_browser

let run () =
  Vdom_blit.run ChatChannel.app |> Vdom_blit.dom |> Element.append_child (Document.body document)


let () = Window.set_onload window run
