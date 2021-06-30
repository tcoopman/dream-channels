const WebSocket = require('ws');

class TestWs {
  constructor() {
    this.ws = new WebSocket('ws://localhost:8080/ws');
    this.ws.on('open', () => {
      this.ws.send('join|chat:1|hi');
    });
  }
  onMessage(fun) {
    this.ws.on('message', fun)
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
      expect(data).toBe("To everyone");
      done();
    }
  });
});
