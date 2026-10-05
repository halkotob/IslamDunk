// `npm run electron:dev`: Vite dev server (Electron renderer mode, live reload) + the Electron app pointed at it.
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electronPath from 'electron';

const server = await createServer({ mode: 'electron', server: { port: 5174, strictPort: true } });
await server.listen();
const url = 'http://localhost:5174/';
console.log('[islamdunk] renderer dev server at ' + url);
const app = spawn(electronPath, ['.'], { stdio: 'inherit', env: { ...process.env, ISLAMDUNK_DEV_URL: url } });
app.on('exit', code => { server.close(); process.exit(code ?? 0); });
