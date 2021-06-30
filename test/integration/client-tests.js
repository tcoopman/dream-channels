const WebSocket = require('ws');

class TestWs {
  constructor() {
    this.ws = new WebSocket('ws://localhost:8080/ws');
    this.ws.on('open', () => {
      this.ws.send('join|chat:1|hi');
    });
  }
  onMessage(fun) {
    this.ws.on('message', (data) => {
      // console.log("got message", data);
      fun(data)
    })
  }

  send(data) {
    this.ws.send(data);
  }

  terminate() {
    this.ws.terminate();
  }
}


test('joining a chat returns the welcome message', (done) => {
  const ws = new TestWs();
  ws.onMessage((data) => {
    expect(data).toBe("joined:1|payload:hi");
    ws.terminate();
    done();
  });
});

test('chat with multiple', (done) => {
  const ws1 = new TestWs();
  const ws2 = new TestWs();
  const ws3 = new TestWs();

  let counter = 0;
  ws3.onMessage((data) => {
    counter++;
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
      ws3.send('send|chat:1|broadcast');
    }
    if (counter == 2) {
      expect(data).toBe("To everyone in 1");
      done();
    }
  });
});

test('I can join multiple channels', (done) => {
  const ws = new TestWs();

  let counter = 0;
  ws.onMessage((data) => {
    counter++;
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
      ws.send('join|chat:2|hi2');
    }
    if (counter == 2) {
      expect(data).toBe("joined:2|payload:hi2");
      ws.send('send|chat:2|broadcast');
    }
    if (counter == 3) {
      expect(data).toBe("To everyone in 2");
      done();
    }
  });
});

test('I cannot send to channel that I did not join', (done) => {
  const ws = new TestWs();

  let counter = 0;
  ws.onMessage((data) => {
    counter++;
    if (counter == 1) {
      expect(data).toBe("joined:1|payload:hi");
      ws.send('send|chat:2|hi2');
    }
    if (counter == 2) {
      expect(data).toBe("You tried to send to a channel, but you were not joined");
      done();
    }
  });
});
