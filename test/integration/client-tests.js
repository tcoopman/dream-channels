const WebSocket = require("ws");

class TestWs {
  constructor(endpoint = "ws") {
    this.messageCounter = 0;
    this.ws = new WebSocket(`ws://localhost:8080/${endpoint}`);
    this.ws.on("open", () => {
      this.ws.send("join|chat:1|hi");
    });
  }
  onMessage(fun) {
    this.ws.on("message", (data) => {
      // console.log("got message", data);
      this.messageCounter++;
      fun(data, this.messageCounter);
    });
  }

  send(data) {
    this.ws.send(data);
  }

  terminate() {
    this.ws.terminate();
  }
}

test("joining a chat returns the welcome message", (done) => {
  const ws = new TestWs();
  ws.onMessage((data) => {
    expect(data).toBe("joined:1|payload:hi");
    ws.terminate();
    done();
  });
});

test("chat with multiple", (done) => {
  const ws1 = new TestWs();
  const ws2 = new TestWs();
  const ws3 = new TestWs();

  ws3.onMessage((data, counter) => {
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
      ws3.send("send|chat:1|broadcast");
    }
    if (counter == 2) {
      expect(data).toBe("To everyone in 1");
      done();
    }
  });
});

test("I can join multiple channels", (done) => {
  const ws = new TestWs();

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
      ws.send("join|chat:2|hi2");
    }
    if (counter == 2) {
      expect(data).toBe("joined:2|payload:hi2");
      ws.send("send|chat:2|broadcast");
    }
    if (counter == 3) {
      expect(data).toBe("To everyone in 2");
      done();
    }
  });
});

test("I cannot send to channel that I did not join", (done) => {
  const ws = new TestWs();

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
      ws.send("send|chat:2|hi2");
    }
    if (counter == 2) {
      expect(data).toBe(
        "You tried to send to a channel, but you were not joined"
      );
      done();
    }
  });
});

test("works with multiple sockets", (done) => {
  const ws = new TestWs();
  const ws2 = new TestWs("ws2");

  ws.onMessage((data) => {
    expect(data).toBe("joined:1|payload:hi");
    ws.terminate();
    done();
  });

  ws2.onMessage((data) => {
    expect(data).toBe("joined-test:1|payload:hi");
    ws.terminate();
    done();
  });
});

test("keeps working when clients terminate", (done) => {
  const ws = new TestWs();
  const ws2 = new TestWs();
  const ws3 = new TestWs();

  expect.assertions(5);

  ws.onMessage((data, counter) => {
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
    }
    if (counter == 2) {
      expect(data).toBe("To everyone in 1");
      done();
    }
  });

  ws2.onMessage((data) => {
    expect(data).toBe("joined:1|payload:hi");
    ws2.terminate();
    ws3.send("send|chat:1|broadcast");
  });

  ws3.onMessage((data, counter) => {
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
    }
    if (counter == 2) {
      expect(data).toBe("To everyone in 1");
    }
  });
});

test.todo("test broadcast_from");
test.todo("test handle_out");
test.todo("clean stopping of a channel");
test.todo("add authentication on a socket");
test.todo("heartbeat");
test.todo("reconnecting");
test.todo("more advanced example");
