import { Logger } from '@nestjs/common';
import * as fs from 'fs';

export async function freePort(port: number): Promise<void> {
  const logger = new Logger('freePort');
  const hex = port.toString(16).toUpperCase().padStart(4, '0');
  const inodes = new Set<string>();

  const readInodes = () => {
    inodes.clear();
    for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
      try {
        for (const line of fs.readFileSync(f, 'utf8').split('\n').slice(1)) {
          const p = line.trim().split(/\s+/);
          if (
            p.length >= 10 &&
            p[3] === '0A' &&
            p[1].split(':').pop()?.toUpperCase() === hex
          )
            inodes.add(p[9]);
        }
      } catch (_e) {
        /* skip unreadable /proc entries */
      }
    }
  };

  readInodes();
  if (inodes.size === 0) {
    logger.log(`Port ${port} is free.`);
    return;
  }

  for (const pid of fs.readdirSync('/proc').filter(d => /^\d+$/.test(d))) {
    try {
      for (const fd of fs.readdirSync(`/proc/${pid}/fd`)) {
        const m = fs
          .readlinkSync(`/proc/${pid}/fd/${fd}`)
          .match(/socket:\[(\d+)\]/);
        if (m && inodes.has(m[1]) && Number(pid) !== process.pid) {
          logger.warn(
            `Port ${port} held by PID ${pid} — killing, waiting for release…`,
          );
          process.kill(Number(pid), 'SIGKILL');
          const deadline = Date.now() + 2000;
          while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 50));
            readInodes();
            if (inodes.size === 0) {
              logger.log(`Port ${port} released.`);
              return;
            }
          }
          return;
        }
      }
    } catch (_e) {
      /* skip unreadable /proc entries */
    }
  }
}
