#! /bin/bash

set -uxo pipefail

COMMAND=$1

if [[ "$COMMAND" =~ ^(start|stop|restart)$ ]]; then
    brew services "${COMMAND}" chunkwm
    brew services "${COMMAND}" skhd
else
    echo "${COMMAND} is not a valid option"
fi
