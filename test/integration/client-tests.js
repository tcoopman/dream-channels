const WebSocket = require('ws');

test('joining a chat returns the welcome message', (done) => {
const ws = new WebSocket('ws://localhost:8080/ws');

ws.on('open', function open() {
  ws.send('join|chat:1|hi');
});

ws.on('message', function incoming(data) {
  expect(data).toBe("joined:1|payload:hi");
  ws.terminate();
  done();
});

});
