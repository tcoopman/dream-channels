# Board Games

## Development

`esy b dune exec --root . web/server.exe`

```bash
curl http://localhost:8080/echo \
          -H "Origin: http://localhost:8080" \
          -H "Host: localhost:8080" \
          -H "Content-Type: application/json" \
          --data '{"message": "foo"}'
```

frontend: `esy bsb -make-world -- --root .`

# Deployment

Is done via docker on a digitial ocean host

# Sharing between backend and frontend

## ATD

got it working with [atd](https://github.com/ahrefs/atd) but it took a while.

`esy run-atd`


## Inspiration

This project pulls together:

- A working setup of the [ReWeb](https://github.com/yawaramin/re-web/)
  Reason/OCaml native web framework
- Started from [fullstack-reason](https://github.com/yawaramin/fullstack-reason/)
- A [ReasonReact](https://reasonml.github.io/reason-react/) frontend app,
  using the [BuckleScript](https://bucklescript.github.io/) OCaml-to-JS
  compiler
