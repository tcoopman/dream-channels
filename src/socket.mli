type topic =
  | Topic of string
  | WithSubtopic of (string * string)

type payload = Payload of string

type answer =
  [ `Ok
  | `Reply of string
  | `Stop of string
  ]

type functions =
  { push : string -> unit Lwt.t
  ; broadcast : string -> unit Lwt.t
  ; broadcast_from : string -> unit Lwt.t
  }

type intercept = payload -> bool

and callbacks =
  { join : functions -> payload -> answer Lwt.t
  ; handle_message : functions -> payload -> answer Lwt.t
  ; handle_out : payload -> payload option
  ; terminate : unit -> unit
  }

(** A channel

    - topic: the exact topic for this channel, for example: chat:public_room
    - intercept: messages that you send to `broadcast` or `broadcast_from` will be checked if they
      need to be intercepted. When intercept returns true, every broadcasted message will be send to
      `handle_out`. Giving it an opportunity to transform the message if wanted.
    - create_callbacks: creates the callbacks for the given topic *)
type channel =
  { topic : string
  ; intercept : intercept
  ; create_callbacks : topic -> callbacks
  }

val channels : channel list -> Dream.websocket -> unit Lwt.t
