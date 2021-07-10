import test from "ava";
import { Socket } from "../../client/index.js";

function end(t, timeout = 100) {
  setTimeout(() => t.end(), timeout);
}

test("Insert to DOM", (t) => {
  const div = document.createElement("div");
  document.body.appendChild(div);

  t.is(document.querySelector("div"), div);
});

test.cb("You don't need to wait for the effective connection", (t) => {
  t.plan(1);
  const socket = new Socket("ws://localhost:8080/ws");

  socket.connect();

  const channel = socket.channel("channel:1");
  channel.join("payload").receive((msg) => {
    t.is(msg, "reply from channel:1 - your payload was: payload");
  });
  end(t);
});

test.cb("you get the reply from the correct channel on join", (t) => {
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

test.cb("you get the reply from the correct channel on send", (t) => {
  t.plan(6);
  const socket = new Socket("ws://localhost:8080/ws");

  socket.connect();

  setTimeout(() => {
    const channel1 = socket.channel("channel:1");
    channel1.join("payload channel 1").receive((msg) => {
      t.is(
        msg,
        "reply from channel:1 - your payload was: payload channel 1"
      );
      channel1.push("push 1").receive((msg) => {
        t.is(
          msg,
          "reply on push from channel:1 - your payload was: push 1"
        );
      });
      channel1.push("push 2").receive((msg) => {
        t.is(
          msg,
          "reply on push from channel:1 - your payload was: push 2"
        );
      });
      channel1.push("push 3").receive((msg) => {
        t.is(
          msg,
          "reply on push from channel:1 - your payload was: push 3"
        );
      });
    });
    const channel2 = socket.channel("channel:2");
    channel2.join("payload channel 2").receive((msg) => {
      t.is(
        msg,
        "reply from channel:2 - your payload was: payload channel 2"
      );
      channel2.push("push from 2").receive((msg) => {
        t.is(
          msg,
          "reply on push from channel:2 - your payload was: push from 2"
        );
      });
    });
  }, 40);
  end(t, 300);
});
