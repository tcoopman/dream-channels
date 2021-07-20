module ChannelPush : sig
  type t = private Ojs.t

  val receive : t -> (string -> unit) -> unit [@@js.call]
end
[@@js.scope "Channels"]

module Channel : sig
  type t = private Ojs.t

  val join : t -> string -> ChannelPush.t [@@js.call]

  val on : t -> (string -> unit) -> unit [@@js.call]

  val push : t -> string -> ChannelPush.t [@@js.call]
end
[@@js.scope "Channels"]

module Socket : sig
  type t = private Ojs.t

  val create : string -> t [@@js.new "Socket"]

  val connect : t -> unit [@@js.call]

  val channel : t -> string -> Channel.t [@@js.call]
end
[@@js.scope "Channels"]
