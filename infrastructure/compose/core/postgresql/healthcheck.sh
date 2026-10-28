#!/bin/bash

docker exec energy-postgres \
pg_isready \
-U energy_app \
-d energy_platform
