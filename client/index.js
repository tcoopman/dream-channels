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
//
// Is the reply important? Or can we just do onMessage?
class ChannelReply {
  constructor() {}
  onOk(cb) {
    this.cb = cb;
  }

  receive(message) {
    console.log("received message");
    this.cb(message);
  }
}
class Channel {
  constructor(webSocket, topic) {
    this.topic = topic;
    this.webSocket = webSocket;
  }

  join(payload) {
    const joinMsg = `join|${this.topic}|${payload}`;
    console.log("trying to join", joinMsg);
    this.webSocket.send(joinMsg);
    this.joinReply = new ChannelReply();
    return this.joinReply;
  }

  receive(message) {
    console.log("received message");
    this.joinReply.receive(message);
  }
}

export class Socket {
  constructor(socketUrl, params) {
    this.channels = {};
    this.socketUrl = socketUrl;
    this.params = params;
  }

  connect() {
    this.webSocket = new WebSocket(this.socketUrl);
    return new Promise((resolve) => {
      this.webSocket.onopen = () => {
        console.log("WebSocket is open");
        resolve();
      };
      this.webSocket.onmessage = (message) => {
        console.log("Message:", message.data);
        Object.keys(this.channels).forEach((topic) => {
          this.channels[topic].receive(message.data);
        });
      };
    });
  }

  channel(topic) {
    const channel = new Channel(this.webSocket, topic);
    this.channels[topic] = channel;
    return channel;
  }
}
