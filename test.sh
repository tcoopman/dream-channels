#! /usr/bin/env bash

pkill -f "jest"
killall integration.exe
esy x dune exec --root . test/integration/integration.exe &
sleep 1
node_modules/.bin/jest --forceExit
