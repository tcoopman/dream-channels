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

// TODO be able to connect to just an endpoint if the location of the frontend is the same as backend
//
class ChannelPush {
  constructor(channel, event, payload) {
    this.channel = channel;
    this.event = event;
    this.payload = payload || "";
    this.receivedResponse = null;
    this.receiveCbs = [];
  }

  send() {
    this.ref = this.channel.socket.makeRef();

    this.channel.onRef(this.ref, (data) => {
      this.receiveCbs.forEach((cb) => cb(data.payload));
    });

    this.channel.socket.push({
      event: this.event,
      topic: this.channel.topic,
      joinRef: this.channel.joinRef,
      ref: this.ref,
      payload: this.payload,
    });
  }

  receive(callback) {
    this.receiveCbs.push(callback);
  }
}
class Channel {
  constructor(socket, topic) {
    this.topic = topic;
    this.socket = socket;
    this.joinRef = socket.makeRef();
    this.bindings = [];
    this.refBindings = {};
    this.isJoined = false;
  }

  join(payload) {
    if (this.isJoined) {
      throw new Error(
        `tried to join multiple times. 'join' can only be called once per channel instance`
      );
    }
    let push = new ChannelPush(this, "join", payload);
    push.send();
    this.isJoined = true;
    return push;
  }

  push(payload) {
    if (!this.isJoined) {
      throw new Error(
        `tried to push to '${this.topic}' before joining. Use channel.join(payload) before pushing events`
      );
    }
    let push = new ChannelPush(this, "push", payload);
    push.send();
    return push;
  }

  /**
    @private
  */
  onRef(ref, cb) {
    this.refBindings[ref] = cb;
  }

  on(cb) {
    this.bindings.push((msg) => cb(msg.payload));
  }

  trigger(data) {
    if (data.ref) {
      if (this.refBindings[data.ref]) {
        this.refBindings[data.ref](data);
        this.refBindings[data.ref] = null;
      }
    } else {
      this.bindings.forEach((cb) => cb(data));
    }
  }
}

export class Socket {
  constructor(socketUrl, params) {
    this.channels = {};
    this.socketUrl = socketUrl;
    this.params = params;
    this.ref = 0;
    this.isConnected = false;
    this.sendBuffer = [];
  }

  connect() {
    this.webSocket = new WebSocket(this.socketUrl);
    this.webSocket.onopen = () => {
      this.isConnected = true;
      this.flushSendBuffer();
    };
    this.webSocket.onmessage = (message) => {
      let data = this.decode(message.data);
      let channel = this.channelForTopic(data.topic);
      if (channel) {
        channel.trigger(data);
      }
    };
  }

  channel(topic) {
    if (this.channelForTopic(topic)) {
      throw new Error(`You've already joined topic ${topic}`);
    }
    const channel = new Channel(this, topic);
    this.channels[topic] = channel;
    return channel;
  }

  makeRef() {
    this.ref++;
    return this.ref.toString();
  }

  push(data) {
    let pushMessage = this.encode(data);
    if (this.isConnected) {
      this.webSocket.send(pushMessage);
    } else {
      this.sendBuffer.push(() => this.webSocket.send(pushMessage));
    }
  }

  encode(data) {
    let { event, topic, joinRef, ref, payload } = data;
    return `${event}|${topic}|${joinRef}|${ref}|${payload}`;
  }

  decode(message) {
    let [topic, joinRef, ref, payload] = message.split("|");
    return {
      topic,
      joinRef,
      ref,
      payload,
    };
  }

  /**
    @private
  */
  flushSendBuffer() {
    if (this.isConnected) {
      this.sendBuffer.forEach((cb) => cb());
      this.sendBuffer = [];
    }
  }

  /**
    @private
  */
  channelForTopic(topic) {
    return this.channels[topic];
  }
}
