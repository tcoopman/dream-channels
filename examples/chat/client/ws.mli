module[@js.scope "Channels"] ChannelPush : sig
  type t = private Ojs.t
  val receive : t -> (string -> unit) -> unit [@@js.call]
end

module[@js.scope "Channels"] Channel : sig
  type t = private Ojs.t

  val join : t -> string -> ChannelPush.t [@@js.call]

end
module[@js.scope "Channels"] Socket : sig
  type t = private Ojs.t

  val create: string -> t [@@js.new "Socket"]

  val connect: t -> unit [@@js.call]

  val channel : t -> string -> Channel.t [@@js.call]
end
