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

val channels : (string * channel) list -> Dream.websocket -> unit Lwt.t

(* A channel should have the following:

  * it's for 1 connection based on a topic
  * it can keep state for 1 connection, for example session data
  * you have 2 type of messages that need to handled, `join` and `handle_message`, and you can reply
  * someone should be able to 


 *)
