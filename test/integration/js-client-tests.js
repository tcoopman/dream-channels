import test from "ava";
import { Socket } from "../../client/index.js";

test("Insert to DOM", (t) => {
  const div = document.createElement("div");
  document.body.appendChild(div);

  t.is(document.querySelector("div"), div);
});

test("Testing the Socket connection", async (t) => {
  t.plan(1);
  const socket = new Socket("ws://localhost:8080/ws");

  await socket.connect();

  const channel = socket.channel("channel:1");
  return new Promise((resolve) => {
    channel.join("payload").onOk((msg) => {
      t.is(msg, "reply from channel:1 - your payload was: payload");
      resolve();
    });
  });
});
