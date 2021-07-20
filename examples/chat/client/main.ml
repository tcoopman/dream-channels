open Vdom

let button ?(a = []) txt f = input [] ~a:(onclick (fun _ -> f) :: type_button :: value txt :: a)

module IntMap = Map.Make (struct
  type t = int

  let compare : int -> int -> int = compare
end)

type 'msg Vdom.Cmd.t +=
  | Run of (('msg -> unit) -> unit)

module ChatChannel = struct
  type model = {
    channel: Ws.Channel.t;
    messages: string list;
  }

  let init = 
    let socket = Ws.Socket.create "ws://localhost:8080/ws" in
    let () = Ws.Socket.connect socket in
    let channel = Ws.Socket.channel socket "chat:1" in
    return {channel; messages = []}

  let update model = function
    | `Join -> return model ~c:[Run (fun sender -> 
        let push = Ws.Channel.join model.channel "Thomas" in
        Ws.ChannelPush.receive push (fun msg -> sender (`Joined msg))
        )]
    | `Joined message -> return {model with messages = message :: model.messages}

  let view model =
    div [
      button "Join" `Join;
      div (List.map (fun message -> text message) model.messages)
    ]

  let app = {init; update; view}
end

  let cmd_handler ctx = function
    | Run cb ->
        cb (fun x -> Vdom_blit.Cmd.send_msg ctx x);
        true
    | _ -> false

let () = Vdom_blit.(register (cmd {f = cmd_handler}))

open Js_browser

let run () = Vdom_blit.run (ChatChannel.app) |> Vdom_blit.dom |> Element.append_child (Document.body document)

let () = Window.set_onload window run
