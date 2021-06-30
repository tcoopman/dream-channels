#! /usr/bin/env bash

esy x dune exec --root . test/integration/integration.exe &
sleep 1
node_modules/.bin/jest --forceExit
killall integration.exe
