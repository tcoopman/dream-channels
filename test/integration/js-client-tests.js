import test from "ava";
import { Socket } from "../../client/index.js";

function end(t, timeout = 100) {
  setTimeout(() => t.end(), timeout);
}

test.cb(
  "Connect a channel on a socket - you don't need to wait for the effective connection",
  (t) => {
    t.plan(1);
    const socket = new Socket("ws://localhost:8080/ws");

    socket.connect();

    const channel = socket.channel("channel:1");
    channel.join("payload").receive((msg) => {
      t.is(msg, "reply from channel:1 - your payload was: payload");
    });
    end(t);
  }
);

test.cb(
  "Connect a channel on a socket - you can wait for the effective connection",
  (t) => {
    t.plan(1);
    const socket = new Socket("ws://localhost:8080/ws");

    socket.connect();

    setTimeout(() => {
      const channel = socket.channel("channel:1");
      channel.join("payload").receive((msg) => {
        t.is(msg, "reply from channel:1 - your payload was: payload");
      });
      end(t);
    }, 100);
  }
);

test.cb("get the reply from the correct channel on join", (t) => {
  t.plan(2);
  const socket = new Socket("ws://localhost:8080/ws");

  socket.connect();

  const channel1 = socket.channel("channel:1");
  channel1.join("payload channel 1").receive((msg) => {
    t.is(msg, "reply from channel:1 - your payload was: payload channel 1");
  });
  const channel2 = socket.channel("channel:2");
  channel2.join("payload channel 2").receive((msg) => {
    t.is(msg, "reply from channel:2 - your payload was: payload channel 2");
  });
  end(t);
});

test.cb("get the reply from the correct channel on send", (t) => {
  t.plan(6);
  const socket = new Socket("ws://localhost:8080/ws");

  socket.connect();

  const channel1 = socket.channel("channel:1");
  channel1.join("payload channel 1").receive((msg) => {
    t.is(msg, "reply from channel:1 - your payload was: payload channel 1");
    channel1.push("push 1").receive((msg) => {
      t.is(msg, "reply on push from channel:1 - your payload was: push 1");
    });
    channel1.push("push 2").receive((msg) => {
      t.is(msg, "reply on push from channel:1 - your payload was: push 2");
    });
    channel1.push("push 3").receive((msg) => {
      t.is(msg, "reply on push from channel:1 - your payload was: push 3");
    });
  });
  const channel2 = socket.channel("channel:2");
  channel2.join("payload channel 2").receive((msg) => {
    t.is(msg, "reply from channel:2 - your payload was: payload channel 2");
    channel2.push("push from 2").receive((msg) => {
      t.is(msg, "reply on push from channel:2 - your payload was: push from 2");
    });
  });

  end(t);
});

test.cb(
  "join the same channel multiple times over 2 sockets and receive a broadcast",
  (t) => {
    t.plan(2);
    const socket1 = new Socket("ws://localhost:8080/ws");
    const socket2 = new Socket("ws://localhost:8080/ws");

    socket1.connect();
    socket2.connect();

    const channel1_1 = socket1.channel("channel:1");
    const channel1_2 = socket2.channel("channel:1");
    channel1_1.on((msg) => {
      t.is(msg, "broadcast from channel:1");
    });
    channel1_2.on((msg) => {
      t.is(msg, "broadcast from channel:1");
    });
    channel1_1.join("payload channel 1").receive(() => {
      channel1_2.join("payload channel 2").receive(() => {
        channel1_2.push("broadcast");
      });
    });
    end(t, 200);
  }
);

test(
  "cannot join the same channel twice - in phoenix they close the old channel and start the new one",
  (t) => {
    const socket = new Socket("ws://localhost:8080/ws");

    const channel1 = socket.channel("channel:1");
    t.throws(() => {
      socket.channel("channel:1");
    }, {instanceOf: Error});
  }
);
