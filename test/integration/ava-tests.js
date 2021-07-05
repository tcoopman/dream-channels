const test = require("ava");
const WebSocket = require("ws");

class TestRoom {
  constructor(room) {
    if (room === undefined) {
      throw "room is required";
    }
    this.room = room;
    this.messageCounter = 0;
    this.ws = new WebSocket(`ws://localhost:8080/ws2`);
    this.ws.on("open", () => {
      this.ws.send(`join|test:${room}|hi`);
    });
  }
  onMessage(fun) {
    this.ws.on("message", (data) => {
      this.messageCounter++;
      fun(data, this.messageCounter);
    });
  }

  sendFullMessage(data) {
    this.ws.send(data);
  }
}

class ChatRoom {
  constructor(chatRoom, endpoint = "ws") {
    if (chatRoom === undefined) {
      throw "chatRoom number is required";
    }
    this.chatRoom = chatRoom;
    this.messageCounter = 0;
    this.ws = new WebSocket(`ws://localhost:8080/${endpoint}`);
    this.ws.on("open", () => {
      this.ws.send(`join|chat:${chatRoom}|hi`);
    });
  }
  onMessage(fun) {
    this.ws.on("message", (data) => {
      this.messageCounter++;
      fun(data, this.messageCounter);
    });
  }

  sendFullMessage(data) {
    this.ws.send(data);
  }

  send(data) {
    this.ws.send(`send|chat:${this.chatRoom}|${data}`);
  }

  terminate() {
    this.ws.terminate();
  }

  close() {
    this.ws.close();
  }
}

let testCounter = 0;

function endIn(t) {
  setTimeout(() => t.end(), 100)
}

test.beforeEach((t) => {
  t.context.counter = testCounter;
  testCounter++;
});

test.cb("joining a chat returns the welcome message", (t) => {
  const ws = new ChatRoom(t.context.counter);
  t.plan(1);
  ws.onMessage((data) => {
    t.is(data, `joined:${t.context.counter}|payload:hi`);
    t.end();
  });
});

test.cb("chat with multiple", (t) => {
  const ws1 = new ChatRoom(t.context.counter);
  const ws2 = new ChatRoom(t.context.counter);
  const ws3 = new ChatRoom(t.context.counter);

  t.plan(2);

  ws3.onMessage((data, counter) => {
    if (counter == 1) {
      t.is(data, `joined:${t.context.counter}|payload:hi`);
      ws3.send("broadcast");
    }
    if (counter == 2) {
      t.is(data, `To everyone in ${t.context.counter}`);
      t.end();
    }
  });
});

test.cb("I can join multiple channels", (t) => {
  const ws = new ChatRoom(t.context.counter);
  t.plan(3);

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      t.is(data, `joined:${t.context.counter}|payload:hi`);
      ws.sendFullMessage("join|chat:custom|hi2");
    }
    if (counter == 2) {
      t.is(data, "joined:custom|payload:hi2");
      ws.sendFullMessage("send|chat:custom|broadcast");
    }
    if (counter == 3) {
      t.is(data, "To everyone in custom");
      t.end();
    }
  });
});

test.cb("I cannot send to channel that I did not join", (t) => {
  const ws = new ChatRoom(t.context.counter);
  t.plan(1);

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      ws.sendFullMessage("send|chat:not_joined|hi2");
    }
    if (counter == 2) {
      t.is(data, "You tried to send to a channel, but you were not joined");
      t.end();
    }
  });
});

test.cb("works with multiple sockets", (t) => {
  const ws = new ChatRoom(t.context.counter);
  const ws2 = new TestRoom(t.context.counter);

  t.plan(2)

  ws.onMessage((data) => {
    t.is(data, `joined:${t.context.counter}|payload:hi`);
  });

  ws2.onMessage((data) => {
    t.is(data, `joined-test:${t.context.counter}|payload:hi`);
  });

  endIn(t);
});

test.cb("keeps working when clients terminate", (t) => {
  const ws = new ChatRoom(t.context.counter);
  const ws2 = new ChatRoom(t.context.counter);
  const ws3 = new ChatRoom(t.context.counter);

  t.plan(2);

  ws.onMessage((data, counter) => {
    if (counter == 2) {
      t.is(data, `To everyone in ${t.context.counter}`);
    }
  });

  ws2.onMessage((data) => {
    ws2.terminate();
    ws3.send("broadcast");
  });

  ws3.onMessage((data, counter) => {
    if (counter == 2) {
      t.is(data, `To everyone in ${t.context.counter}`);
    }
  });

  endIn(t);
});

test.cb("test broadcast_from", (t) => {
  const ws = new ChatRoom(t.context.counter);
  const ws2 = new ChatRoom(t.context.counter);
  const ws3 = new ChatRoom(t.context.counter);

  t.plan(2);

  ws.onMessage((data, counter) => {
    if (counter == 2) {
      t.is(data, `To everyone except in ${t.context.counter}`);
    }
  });

  ws2.onMessage((data) => {
    ws2.send("broadcast_from");
  });

  ws3.onMessage((data, counter) => {
    if (counter == 2) {
      t.is(data, `To everyone except in ${t.context.counter}`);
    }
  });

  endIn(t);
});

test.cb("test handle_out broadcast", (t) => {
  const ws = new ChatRoom(t.context.counter);

  t.plan(1);

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      ws.send("transform_out_broadcast");
    }
    if (counter == 2) {
      t.is(data, "message transformed");
    }
  });

  endIn(t);
});

test.cb("test handle_out broadcast_from", (t) => {
  const ws = new ChatRoom(t.context.counter);
  const ws2 = new ChatRoom(t.context.counter);

  t.plan(1);

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      ws.send("transform_out_broadcast_from");
    }
  });
  ws2.onMessage((data, counter) => {
    if (counter == 2) {
      t.is(data, "message transformed");
    }
  });
  endIn(t);
});

test.todo("remove handle_out for push?? - phoenix does not have it");
test.todo("handle_out on broadcast");
test.todo("handle_out on broadcast_from");
test.todo("multiple channels on one connection");
test.todo("clean stopping of a channel");
test.todo("add authentication on a socket");
test.todo("heartbeat");
test.todo("reconnecting");
test.todo("more advanced example");
