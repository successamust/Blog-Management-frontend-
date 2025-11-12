import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outputDir = path.join(publicDir, 'email-assets');

const tasks = [
  {
    source: 'nexus-logo.svg',
    outputs: [
      { filename: 'nexus-logo-email.png', width: 600 },
      { filename: 'nexus-logo-email@2x.png', width: 1200 },
    ],
  },
  {
    source: 'nexus-logo-icon.svg',
    outputs: [
      { filename: 'nexus-logo-icon.png', width: 128, height: 128 },
      { filename: 'nexus-logo-icon@2x.png', width: 256, height: 256 },
    ],
  },
];

const run = async () => {
  await mkdir(outputDir, { recursive: true });

  for (const task of tasks) {
    const svgPath = path.join(publicDir, task.source);
    for (const output of task.outputs) {
      const destination = path.join(outputDir, output.filename);
      const instance = sharp(svgPath)
        .resize(output.width, output.height, {
          fit: 'contain',
          withoutEnlargement: false,
        })
        .png({ compressionLevel: 9 });

      await instance.toFile(destination);
      console.log(`🟢 Generated ${path.relative(projectRoot, destination)} (${output.width}x${output.height ?? 'auto'})`);
    }
  }

  console.log('✅ Email logo exports created successfully.');
};

run().catch((error) => {
  console.error('❌ Failed to export email logo assets:', error);
  process.exit(1);
});

