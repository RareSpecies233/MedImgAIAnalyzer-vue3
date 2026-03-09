const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const APP_NAME = 'MedAnalyzer';
const HOST = '127.0.0.1';
const DEFAULT_PORT = 8080;
const MAX_PORT_TRY = 20;
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:18080';

const payloadRoot = path.join(__dirname, 'payload');
const embeddedDistDir = path.join(payloadRoot, 'dist');
const embeddedVersionFile = path.join(payloadRoot, 'version.txt');

const deployRoot = path.join(process.env.LOCALAPPDATA || os.tmpdir(), `${APP_NAME}Deploy`);
const deployedDistDir = path.join(deployRoot, 'dist');
const deployedVersionFile = path.join(deployRoot, '.version');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function normalizeBackendUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl || DEFAULT_BACKEND_URL);
  } catch {
    parsed = new URL(DEFAULT_BACKEND_URL);
  }

  if (parsed.hostname === '0.0.0.0') {
    parsed.hostname = '127.0.0.1';
  }
  return parsed;
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseCliArgs(argv) {
  const options = {
    port: null,
    apiPort: null,
    autoOpen: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--port') {
      options.port = parsePositiveInteger(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current.startsWith('--port=')) {
      options.port = parsePositiveInteger(current.slice('--port='.length));
      continue;
    }

    if (current === '--apiport') {
      options.apiPort = parsePositiveInteger(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current.startsWith('--apiport=')) {
      options.apiPort = parsePositiveInteger(current.slice('--apiport='.length));
      continue;
    }

    if (current === '--autopen') {
      options.autoOpen = true;
      continue;
    }

    if (current === '--help' || current === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  const lines = [
    `${APP_NAME} 启动帮助`,
    '',
    '用法：',
    `  ${path.basename(process.argv[1] || 'MedAnalyzerDeploy')} [--port <port>] [--apiport <port>] [--autopen] [--help]`,
    '',
    '参数：',
    '  --port <port>        指定前端静态服务监听端口，默认 8080',
    '  --apiport <port>     指定 /api 代理转发到的后端端口，默认 18080',
    '  --autopen            启动后自动打开默认浏览器访问程序界面',
    '  --help, -h           显示帮助信息并退出',
    '',
    '环境变量：',
    '  PORT                 与 --port 类似，优先级低于命令行参数',
    '  BACKEND_URL          指定后端完整地址，优先保留协议与主机',
    '  OPEN_BROWSER=true    与 --autopen 类似，优先级低于命令行参数',
  ];

  console.log(lines.join('\n'));
}

function resolveBackendUrl(apiPort) {
  const parsed = normalizeBackendUrl(process.env.BACKEND_URL);
  if (apiPort) {
    parsed.port = String(apiPort);
  }
  return parsed;
}

const cliOptions = parseCliArgs(process.argv.slice(2));
const backendUrl = resolveBackendUrl(cliOptions.apiPort);

function readFileSafe(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return fallback;
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function copyRecursive(sourceDir, targetDir) {
  ensureDirectory(targetDir);

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(sourcePath, targetPath);
      continue;
    }

    ensureDirectory(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function deployAssetsIfNeeded() {
  if (!fs.existsSync(embeddedDistDir)) {
    throw new Error('未找到内嵌 dist 资源。请在开发机执行 build:exe 重新打包。');
  }

  const embeddedVersion = readFileSafe(embeddedVersionFile, 'unknown-version');
  const deployedVersion = readFileSafe(deployedVersionFile, '');
  const needsDeploy = !fs.existsSync(deployedDistDir) || embeddedVersion !== deployedVersion;

  if (!needsDeploy) {
    return;
  }

  ensureDirectory(deployRoot);
  removeDirectory(deployedDistDir);
  copyRecursive(embeddedDistDir, deployedDistDir);
  fs.writeFileSync(deployedVersionFile, embeddedVersion, 'utf8');
}

function openBrowser(url) {
  const envWantsOpen = String(process.env.OPEN_BROWSER || '').toLowerCase() === 'true';
  if (!cliOptions.autoOpen && !envWantsOpen) {
    return;
  }

  const command = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command, () => {});
}

function sendFile(filePath, response) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  response.statusCode = 200;
  response.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(response);
}

function proxyApiRequest(request, response) {
  const originalUrl = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const targetUrl = new URL(originalUrl.pathname + originalUrl.search, backendUrl);

  const client = targetUrl.protocol === 'https:' ? https : http;
  const outgoingHeaders = { ...request.headers };
  delete outgoingHeaders.host;

  const proxyReq = client.request(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      method: request.method,
      path: targetUrl.pathname + targetUrl.search,
      headers: outgoingHeaders,
      timeout: 60000
    },
    (proxyRes) => {
      response.statusCode = proxyRes.statusCode || 502;
      for (const [headerName, headerValue] of Object.entries(proxyRes.headers)) {
        if (typeof headerValue !== 'undefined') {
          response.setHeader(headerName, headerValue);
        }
      }
      proxyRes.pipe(response);
    }
  );

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('代理请求超时'));
  });

  proxyReq.on('error', (error) => {
    response.statusCode = 502;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      message: '后端服务不可达',
      backend: backendUrl.toString(),
      error: error.message
    }));
  });

  request.pipe(proxyReq);
}

function createStaticServer() {
  return http.createServer((request, response) => {
    if (request.url && request.url.startsWith('/api/')) {
      proxyApiRequest(request, response);
      return;
    }

    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const sanitizedPath = requestPath.replace(/^\/+/, '');

    let targetFile = path.resolve(path.join(deployedDistDir, sanitizedPath));
    if (!targetFile.startsWith(path.resolve(deployedDistDir))) {
      response.statusCode = 403;
      response.end('Forbidden');
      return;
    }

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) {
      targetFile = path.join(targetFile, 'index.html');
    }

    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      targetFile = path.join(deployedDistDir, 'index.html');
    }

    if (!fs.existsSync(targetFile)) {
      response.statusCode = 500;
      response.end('index.html 不存在，部署资源损坏。');
      return;
    }

    sendFile(targetFile, response);
  });
}

function startServer(port, retries = MAX_PORT_TRY) {
  return new Promise((resolve, reject) => {
    const server = createStaticServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && retries > 0) {
        resolve(startServer(port + 1, retries - 1));
        return;
      }
      reject(error);
    });

    server.listen(port, HOST, () => {
      resolve({ server, port });
    });
  });
}

async function main() {
  if (cliOptions.help) {
    printHelp();
    return;
  }

  deployAssetsIfNeeded();

  const envPort = Number(process.env.PORT);
  const startPort = cliOptions.port || (Number.isInteger(envPort) && envPort > 0 ? envPort : DEFAULT_PORT);

  const { server, port } = await startServer(startPort);
  const url = `http://${HOST}:${port}`;

  console.log(`${APP_NAME} 已部署并启动: ${url}`);
  console.log(`后端代理目标: ${backendUrl.toString()}`);
  console.log(`启动参数: --port=${startPort} --apiport=${backendUrl.port || (backendUrl.protocol === 'https:' ? '443' : '80')}`);
  console.log(`自动打开浏览器: ${cliOptions.autoOpen || String(process.env.OPEN_BROWSER || '').toLowerCase() === 'true' ? '开启' : '关闭'}`);
  console.log(`部署目录: ${deployRoot}`);
  console.log('按 Ctrl+C 可停止服务。');

  openBrowser(url);

  const closeServer = () => {
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', closeServer);
  process.on('SIGTERM', closeServer);
}

main().catch((error) => {
  console.error('启动失败:', error.message || error);
  process.exit(1);
});
