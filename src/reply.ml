open Base

type reply =
  { topic : string
  ; join_ref : string
  ; ref : string option
  ; payload : string
  ; event : event
  }
and event = Push | Stop | Error

let encode reply = 
  let ref = Option.value ~default:"" reply.ref in
  let event = match reply.event with
  | Push -> "push"
  | Stop -> "stop"
  | Error -> "error"
  in
  String.concat ~sep:"|" [ event; reply.topic; reply.join_ref; ref; reply.payload ]
