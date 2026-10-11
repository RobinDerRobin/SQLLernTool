// `npm run editor`: baut das Spiel und öffnet den Level-Editor in Electron (WENDEHALS_EDITOR=1). Plattformunabhängig (kein `VAR=1 cmd`).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const bau = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (bau.status !== 0) process.exit(bau.status ?? 1);
const electron = (await import('electron')).default; // Pfad zur Electron-Datei
const res = spawnSync(electron, ['.'], { cwd: root, stdio: 'inherit', env: { ...process.env, WENDEHALS_EDITOR: '1' } });
process.exit(res.status ?? 0);
