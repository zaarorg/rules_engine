#!/bin/bash
# Seed the target volume with pre-compiled dependencies if empty
if [ ! -d "/app/target/debug" ]; then
  echo "Seeding target directory with pre-compiled dependencies..."
  cp -a /tmp/target-cache/. /app/target/
  echo "Done seeding $(du -sh /app/target | cut -f1)."
fi
exec "$@"
