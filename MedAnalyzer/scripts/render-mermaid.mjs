import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const allowedInputTypes = new Set(['auto', 'markdown', 'mermaid']);
const allowedFormats = new Set(['png', 'svg', 'pdf']);
const allowedThemes = new Set(['default', 'neutral', 'dark', 'forest', 'base']);
const defaultInput = path.join(workspaceRoot, 'Web网站页面结构设计.md');

const helpText = [
  'Mermaid 图片生成脚本',
  '',
  '默认行为：',
  `  - 输入文件: ${defaultInput}`,
  '  - 输出格式: png',
  '  - 主题: default',
  '  - 背景色: white',
  '  - 宽度: 2400',
  '  - 缩放: 2',
  '  - Mermaid 块序号: 0',
  '',
  '用法：',
  '  npm run render:mermaid -- [选项]',
  '  node ./scripts/render-mermaid.mjs [选项]',
  '',
  '常用选项：',
  '  --input, -i             输入文件路径，支持 .md / .markdown / .mmd / .mermaid',
  '  --output, -o            输出图片路径，不传时按输入文件名自动生成',
  '  --format, -f            输出格式：png | svg | pdf',
  '  --theme, -t             Mermaid 主题：default | neutral | dark | forest | base',
  '  --backgroundColor, -b   背景色，默认 white，可传 transparent 或十六进制颜色',
  '  --width, -w             输出宽度，默认 2400',
  '  --height, -H            输出高度，可选',
  '  --scale, -s             缩放倍数，默认 2',
  '  --block                 当输入为 Markdown 时，选择第几个 mermaid 代码块，默认 0',
  '  --inputType             输入类型：auto | markdown | mermaid，默认 auto',
  '  --mmdc                  指定 mmdc 可执行文件路径',
  '  --dryRun                仅解析参数和输入，不真正生成图片',
  '  --help, -h              显示帮助',
  '',
  '示例：',
  '  npm run render:mermaid --',
  '  npm run render:mermaid -- --output ../temp/ui-structure.png --theme neutral',
  '  npm run render:mermaid -- --input ../docs/demo.mmd --format svg --backgroundColor transparent',
  '  npm run render:mermaid -- --block 1 --width 3200 --scale 3',
].join('\n');

function parseInteger(value, name) {
  if (typeof value === 'undefined') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须是大于 0 的整数`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, name) {
  if (typeof value === 'undefined') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} 必须是大于等于 0 的整数`);
  }
  return parsed;
}

function parseFloatNumber(value, name) {
  if (typeof value === 'undefined') return undefined;
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须是大于 0 的数字`);
  }
  return parsed;
}

function resolveInputType(inputPath, inputType) {
  if (inputType !== 'auto') return inputType;
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  return 'mermaid';
}

function resolveOutputPath(inputPath, outputPath, format) {
  const target = outputPath || path.join(path.dirname(inputPath), `${path.parse(inputPath).name}.${format}`);
  const parsed = path.parse(target);
  if (parsed.ext.toLowerCase() === `.${format}`) return target;
  if (!parsed.ext) return `${target}.${format}`;
  return path.join(parsed.dir, `${parsed.name}.${format}`);
}

function extractMermaidBlock(markdown, blockIndex) {
  const matches = [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
  if (matches.length === 0) {
    throw new Error('Markdown 中未找到 mermaid 代码块');
  }
  if (blockIndex < 0 || blockIndex >= matches.length) {
    throw new Error(`Markdown 中共有 ${matches.length} 个 mermaid 代码块，block=${blockIndex} 超出范围`);
  }
  return matches[blockIndex]?.[1]?.trim() || '';
}

function resolveMmdcCommand(customCommand) {
  if (customCommand) {
    return {
      command: path.resolve(process.cwd(), customCommand),
      prefixArgs: [],
    };
  }

  const localBinary = path.join(
    projectRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc',
  );

  if (fs.existsSync(localBinary)) {
    return {
      command: localBinary,
      prefixArgs: [],
    };
  }

  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    prefixArgs: ['-y', '@mermaid-js/mermaid-cli'],
  };
}

function ensureDirectoryForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function render(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`mmdc 执行失败，退出码 ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      theme: { type: 'string', short: 't' },
      backgroundColor: { type: 'string', short: 'b' },
      'background-color': { type: 'string' },
      width: { type: 'string', short: 'w' },
      height: { type: 'string', short: 'H' },
      scale: { type: 'string', short: 's' },
      block: { type: 'string' },
      inputType: { type: 'string' },
      'input-type': { type: 'string' },
      mmdc: { type: 'string' },
      dryRun: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(helpText);
    return;
  }

  const inputPath = path.resolve(process.cwd(), values.input || defaultInput);
  const inputType = values.inputType || values['input-type'] || 'auto';
  const format = values.format || 'png';
  const theme = values.theme || 'default';
  const backgroundColor = values.backgroundColor || values['background-color'] || 'white';
  const width = parseInteger(values.width, 'width') ?? 2400;
  const height = parseInteger(values.height, 'height');
  const scale = parseFloatNumber(values.scale, 'scale') ?? 2;
  const block = parseNonNegativeInteger(values.block, 'block') ?? 0;
  const dryRun = Boolean(values.dryRun || values['dry-run']);

  if (!allowedInputTypes.has(inputType)) {
    throw new Error(`inputType 仅支持：${[...allowedInputTypes].join(', ')}`);
  }

  if (!allowedFormats.has(format)) {
    throw new Error(`format 仅支持：${[...allowedFormats].join(', ')}`);
  }

  if (!allowedThemes.has(theme)) {
    throw new Error(`theme 仅支持：${[...allowedThemes].join(', ')}`);
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入文件不存在：${inputPath}`);
  }

  const resolvedInputType = resolveInputType(inputPath, inputType);
  const outputPath = path.resolve(process.cwd(), resolveOutputPath(inputPath, values.output, format));
  let tempDir = null;
  let sourcePath = inputPath;

  if (resolvedInputType === 'markdown') {
    const markdown = fs.readFileSync(inputPath, 'utf8');
    const mermaidSource = extractMermaidBlock(markdown, block);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-render-'));
    sourcePath = path.join(tempDir, 'diagram.mmd');
    fs.writeFileSync(sourcePath, `${mermaidSource}\n`, 'utf8');
  }

  ensureDirectoryForFile(outputPath);

  console.log('Mermaid 渲染配置：');
  console.log(`  input: ${inputPath}`);
  console.log(`  inputType: ${resolvedInputType}`);
  console.log(`  source: ${sourcePath}`);
  console.log(`  output: ${outputPath}`);
  console.log(`  format: ${format}`);
  console.log(`  theme: ${theme}`);
  console.log(`  backgroundColor: ${backgroundColor}`);
  console.log(`  width: ${width}`);
  console.log(`  height: ${height ?? 'auto'}`);
  console.log(`  scale: ${scale}`);
  console.log(`  block: ${block}`);
  console.log(`  mode: ${dryRun ? 'dry-run' : 'render'}`);

  if (dryRun) {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    return;
  }

  const { command, prefixArgs } = resolveMmdcCommand(values.mmdc);
  const args = [
    ...prefixArgs,
    '-i',
    sourcePath,
    '-o',
    outputPath,
    '-e',
    format,
    '-t',
    theme,
    '-b',
    backgroundColor,
    '-w',
    String(width),
    '-s',
    String(scale),
  ];

  if (height) {
    args.push('-H', String(height));
  }

  try {
    await render(command, args);
    console.log(`渲染完成：${outputPath}`);
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Mermaid 图片生成失败：${error.message}`);
  process.exitCode = 1;
});