#!/usr/bin/env bash
set -euo pipefail

# Installs Oracle Instant Client 12.1 (basic, x86_64) from the bundled zip.
# Expects `unzip`, `libaio1`, and `libnsl2` to be present in the image.

ORACLE_HOME=/usr/lib/oracle/12.1/client64
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ZIP="${SCRIPT_DIR}/instantclient-basic-linux.x64-12.1.0.2.0.zip"

mkdir -p "${ORACLE_HOME}"
unzip -q "${ZIP}" -d "${ORACLE_HOME}"
mv "${ORACLE_HOME}/instantclient_12_1" "${ORACLE_HOME}/lib"
ln -sfn "${ORACLE_HOME}/lib/libclntsh.so.12.1" "${ORACLE_HOME}/lib/libclntsh.so"
echo "${ORACLE_HOME}/lib" > /etc/ld.so.conf.d/oracle-instantclient.conf
ldconfig
