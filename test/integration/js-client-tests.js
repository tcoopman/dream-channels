import test from "ava";
import { Socket } from "../../client/index.js";

function end(t, timeout = 100) {
  setTimeout(() => t.end(), timeout);
}

let ref = 0;

function newChannel() {
  ref++;
  return `channel:${ref}`;
}

test.cb(
  "Connect a channel on a socket - you don't need to wait for the effective connection",
  (t) => {
    t.plan(1);
    const socket = new Socket("ws://localhost:8080/ws");
    const channelName = newChannel();

    socket.connect();

    const channel = socket.channel(channelName);
    channel.join("payload").receive((msg) => {
      t.is(msg, `reply from ${channelName} - your payload was: payload`);
    });
    end(t);
  }
);

test.cb("Setup everything before connecting", (t) => {
  t.plan(1);
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName = newChannel();

  const channel = socket.channel(channelName);
  channel.join("payload").receive((msg) => {
    t.is(msg, `reply from ${channelName} - your payload was: payload`);
  });
  socket.connect();
  end(t);
});

test.cb(
  "Connect a channel on a socket - you can wait for the effective connection",
  (t) => {
    t.plan(1);
    const socket = new Socket("ws://localhost:8080/ws");
    const channelName = newChannel();

    socket.connect();

    setTimeout(() => {
      const channel = socket.channel(channelName);
      channel.join("payload").receive((msg) => {
        t.is(msg, `reply from ${channelName} - your payload was: payload`);
      });
      end(t);
    }, 100);
  }
);

test.cb("get the reply from the correct channel on join", (t) => {
  t.plan(2);
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName1 = newChannel();
  const channelName2 = newChannel();

  socket.connect();

  const channel1 = socket.channel(channelName1);
  channel1.join("A").receive((msg) => {
    t.is(msg, `reply from ${channelName1} - your payload was: A`);
  });
  const channel2 = socket.channel(channelName2);
  channel2.join("B").receive((msg) => {
    t.is(msg, `reply from ${channelName2} - your payload was: B`);
  });
  end(t);
});

test.cb("get the reply from the correct channel on send", (t) => {
  t.plan(6);
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName1 = newChannel();
  const channelName2 = newChannel();

  socket.connect();

  const channel1 = socket.channel(channelName1);
  channel1.join("payload channel 1").receive((msg) => {
    t.is(
      msg,
      `reply from ${channelName1} - your payload was: payload channel 1`
    );
    channel1.push("push 1").receive((msg) => {
      t.is(
        msg,
        `reply on push from ${channelName1} - your payload was: push 1`
      );
    });
    channel1.push("push 2").receive((msg) => {
      t.is(
        msg,
        `reply on push from ${channelName1} - your payload was: push 2`
      );
    });
    channel1.push("push 3").receive((msg) => {
      t.is(
        msg,
        `reply on push from ${channelName1} - your payload was: push 3`
      );
    });
  });
  const channel2 = socket.channel(channelName2);
  channel2.join("payload channel 2").receive((msg) => {
    t.is(
      msg,
      `reply from ${channelName2} - your payload was: payload channel 2`
    );
    channel2.push("push from 2").receive((msg) => {
      t.is(
        msg,
        `reply on push from ${channelName2} - your payload was: push from 2`
      );
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
    const channelName1 = newChannel();

    socket1.connect();
    socket2.connect();

    const channel1_1 = socket1.channel(channelName1);
    const channel1_2 = socket2.channel(channelName1);
    channel1_1.on((msg) => {
      t.is(msg, `broadcast from ${channelName1}`);
    });
    channel1_2.on((msg) => {
      t.is(msg, `broadcast from ${channelName1}`);
    });
    channel1_1.join("payload channel 1").receive(() => {
      channel1_2.join("payload channel 2").receive(() => {
        channel1_2.push("broadcast");
      });
    });
    end(t);
  }
);

test.cb("only the joined channel receives the broadcast", (t) => {
  t.plan(1);
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName1 = newChannel();
  const channelName2 = newChannel();

  socket.connect();

  const channel1 = socket.channel(channelName1);
  const channel2 = socket.channel(channelName2);
  channel1.on((msg) => {
    t.is(msg, `broadcast from ${channelName1}`);
  });
  channel2.on((msg) => {
    t.fail(`${msg}`);
  });
  channel1.join("payload channel 1").receive(() => {
    channel2.join("payload channel 2").receive(() => {
      channel1.push("broadcast");
    });
  });
  end(t);
});

test("cannot join the same channel twice - in phoenix they close the old channel and start the new one", (t) => {
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName1 = newChannel();

  const channel1 = socket.channel(channelName1);
  t.throws(
    () => {
      socket.channel(channelName1);
    },
    { instanceOf: Error }
  );
});

test("cannot join the same channel twice", (t) => {
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName1 = newChannel();

  const channel1 = socket.channel(channelName1);
  channel1.join("ok");
  t.throws(
    () => {
      channel1.join("will fail");
    },
    { instanceOf: Error }
  );
});

test("cannot send to a channel that wasn't joined", (t) => {
  const socket = new Socket("ws://localhost:8080/ws");
  const channelName1 = newChannel();

  const channel1 = socket.channel(channelName1);
  t.throws(
    () => {
      channel1.push("will fail");
    },
    { instanceOf: Error }
  );
});

test.todo("keeps working when clients terminate")
test.todo("test broadcast_from")
test.todo("test handle_out broadcast")
test.todo("test handle_out broadcast_from")
test.todo("stop on join")
test.todo("stop on push")
test.todo("add authentication on a socket");
test.todo("heartbeat");
test.todo("reconnecting");
