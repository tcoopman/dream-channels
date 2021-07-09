#! /usr/bin/env bash

pkill -f "ava-tests"
killall integration.exe
esy x dune exec --root . test/integration/integration.exe &
sleep 1
npx ava -v --timeout=1s test/integration/**.js
pkill -f "ava-tests"
killall integration.exe
