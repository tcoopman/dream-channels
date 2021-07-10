open Base

type message =
  { message_type : message_type
  ; topic : string
  ; join_ref : string
  ; ref : string
  ; payload : string
  }

and message_type =
  | Join
  | Push

let parse message =
  let splitted = Stdlib.String.trim message |> String.split ~on:'|' in
  let message_type = function
    | "join" ->
        Ok Join
    | "push" ->
        Ok Push
    | _ ->
        Error "The message_type should be either join or push"
  in
  match splitted with
  | [ msg_type; topic; join_ref; ref; payload ] ->
      message_type msg_type
      |> Result.bind ~f:(function message_type ->
             Ok { message_type; topic; join_ref; ref; payload } )
  | _ ->
      Error
        ( "message is not in the form of `message_type|topic|join_ref|ref|payload` - instead it looks like:"
        ^ message )
