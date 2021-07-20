module[@js.scope "Channels"] Socket : sig
  type t = private Ojs.t

  val create: string -> t [@@js.new "Socket"]

  val connect: t -> unit [@@js.call]
end
