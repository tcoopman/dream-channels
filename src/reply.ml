open Base

type reply =
  { topic : string
  ; join_ref : string
  ; ref : string option
  ; payload : string
  }

let encode reply = 
  let ref = Option.value ~default:"" reply.ref in
  String.concat ~sep:"|" [ reply.topic; reply.join_ref; ref; reply.payload ]
