import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const CSHARP_ENGINE_PUBLISH_DIR = fileURLToPath(
  new URL('csharp-engine/bin/Release/net8.0/publish/wwwroot', import.meta.url),
);
const CSHARP_ENGINE_DEV_PATH = '/csharp-engine/';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.dll': 'application/octet-stream',
  '.pdb': 'application/octet-stream',
  '.css': 'text/css',
  '.png': 'image/png',
  '.gz': 'application/octet-stream',
  '.br': 'application/octet-stream',
  '.blat': 'application/octet-stream',
  '.dat': 'application/octet-stream',
};

/**
 * Dev-server-only: serves the published C# engine
 * (csharp-engine/bin/Release/net8.0/publish/wwwroot — gitignored, build it yourself with
 * `dotnet publish -c Release` inside csharp-engine/, see csharp-engine/README.md) under
 * /csharp-engine/, and sends the COOP/COEP headers the whole app needs to become
 * cross-origin-isolated for Blazor's multithreaded WASM boot. Uses `credentialless`, not
 * `require-corp` — see docs/csharp-engine-poc.md's hosting-decision writeup for why: verified
 * live that `credentialless` grants isolation without requiring SQL/Python's CDN-hosted engines
 * (or this project's own Playwright-route-served local copies) to send a
 * Cross-Origin-Resource-Policy header, which they don't and can't be made to.
 *
 * No-ops (skips only the static-file middleware, still sets the headers) if the publish output
 * doesn't exist locally — a fresh clone without the .NET SDK still runs `npm run dev` fine, it
 * just can't serve /csharp-engine/ yet. Production builds are untouched (`apply: 'serve'`); the
 * GitHub Pages equivalent (coi-serviceworker) is a separate, still-open increment.
 */
function csharpEngineDevServer(): Plugin {
  return {
    name: 'csharp-engine-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        next();
      });

      if (!existsSync(CSHARP_ENGINE_PUBLISH_DIR)) {
        console.log(
          '[csharp-engine] Kein Publish-Output unter csharp-engine/bin/Release/net8.0/publish/wwwroot ' +
            'gefunden — /csharp-engine/ wird nicht ausgeliefert. Siehe csharp-engine/README.md ' +
            '("dotnet publish -c Release" im csharp-engine/-Verzeichnis).',
        );
        return;
      }

      server.middlewares.use(CSHARP_ENGINE_DEV_PATH, (req, res, next) => {
        const urlPath = (req.url ?? '/').split('?')[0]!;
        const filePath = join(CSHARP_ENGINE_PUBLISH_DIR, urlPath === '/' ? 'index.html' : urlPath);
        if (!filePath.startsWith(CSHARP_ENGINE_PUBLISH_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          next();
          return;
        }
        res.setHeader('Content-Type', MIME_TYPES[extname(filePath)] ?? 'application/octet-stream');
        if (extname(filePath) === '.html') {
          // The checked-in index.html hardcodes <base href="/" /> for the case where this
          // project is hosted at its own origin root (`dotnet run`'s own dev server). Nested
          // under /csharp-engine/ here, that base href would resolve every relative asset
          // (_framework/*, refs/*.dll) against site root instead — WebAssemblyHostBuilder reads
          // this same <base href> at boot to set CSharpEngine.BaseAddress (see Program.cs), so a
          // wrong base href 404s the whole boot, not just page navigation. Rewritten to match
          // this mount path; nothing else about the file changes.
          const html = readFileSync(filePath, 'utf8').replace('<base href="/" />', `<base href="${CSHARP_ENGINE_DEV_PATH}" />`);
          res.end(html);
          return;
        }
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [viteSingleFile(), csharpEngineDevServer()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
