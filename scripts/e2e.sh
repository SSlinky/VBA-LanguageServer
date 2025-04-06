#!/usr/bin/env bash

export CODE_TESTS_PATH="$(pwd)/dist/client/out/test"
export CODE_TESTS_WORKSPACE="$(pwd)/test/fixtures"

node "$(pwd)/dist/client/out/test/runTest"