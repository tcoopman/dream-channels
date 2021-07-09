// https://hexdocs.pm/phoenix/js/

// connecting to a socket with a payload
// create : url -> payload -> Socket
// Socket.connect : unit -> unit
// Socket.channel : topic -> Channel
// Channel.on : (payload -> unit) -> unit
// Channel.push : payload -> ChannelReply
// Channel.join : payload -> ChannelReply
// ChannelReply.onOk
// ChannelReply.onError
// ChannelReply.onTimeout
//
// serializer/deserializer

// let socket = new Socket("/socket", {params: {userToken: "123"}})
// socket.connect()

// let channel = socket.channel("room:123", {token: roomToken})
// channel.on("new_msg", msg => console.log("Got message", msg) )
// $input.onEnter( e => {
//   channel.push("new_msg", {body: e.target.val}, 10000)
//     .receive("ok", (msg) => console.log("created message", msg) )
//     .receive("error", (reasons) => console.log("create failed", reasons) )
//     .receive("timeout", () => console.log("Networking issue...") )
// })

// channel.join()
//   .receive("ok", ({messages}) => console.log("catching up", messages) )
//   .receive("error", ({reason}) => console.log("failed join", reason) )
//   .receive("timeout", () => console.log("Networking issue. Still waiting..."))
