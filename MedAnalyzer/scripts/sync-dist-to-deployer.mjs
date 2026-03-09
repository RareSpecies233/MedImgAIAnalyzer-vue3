import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceDistDir = path.join(projectRoot, 'dist');
const payloadRoot = path.join(projectRoot, 'deploy-exe', 'payload');
const targetDistDir = path.join(payloadRoot, 'dist');
const versionFile = path.join(payloadRoot, 'version.txt');
const packageJsonPath = path.join(projectRoot, 'package.json');

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function copyDirectory(sourceDir, targetDir) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  ensureDirectory(targetDir);

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    ensureDirectory(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function buildVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version || '0.0.0';
  return `${version}-${Date.now()}`;
}

if (!fs.existsSync(sourceDistDir)) {
  throw new Error(`dist directory not found: ${sourceDistDir}`);
}

ensureDirectory(payloadRoot);
removeDirectory(targetDistDir);
copyDirectory(sourceDistDir, targetDistDir);
fs.writeFileSync(versionFile, `${buildVersion()}\n`, 'utf8');

console.log(`Synced ${sourceDistDir} -> ${targetDistDir}`);
console.log(`Updated ${versionFile}`);