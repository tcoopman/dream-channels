module Console = [%js:
  val log: string -> unit [@@js.global "console.log"]
]

let () =
  let _ = 1 + 2 in
  let () = Stdlib.print_endline "test" in
  Console.log "foobar";
  ()
