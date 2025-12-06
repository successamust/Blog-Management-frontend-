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
  {
    source: 'nexus-og-image.svg',
    outputs: [
      { filename: 'nexus-og-image.png', width: 1200, height: 630 },
    ],
  },
];

// Helper function to add thin black stroke to logo for email visibility
const addStroke = async (svgPath, width, height) => {
  // Calculate stroke width - very thin (0.5px equivalent)
  const strokeWidth = 1;
  
  // Load and resize the original logo
  const logoBuffer = await sharp(svgPath)
    .resize(width, height, {
      fit: 'contain',
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  // Get logo dimensions
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoWidth = logoMeta.width;
  const logoHeight = logoMeta.height;

  // Create black version for stroke
  const blackLogo = await sharp(logoBuffer)
    .greyscale()
    .threshold(1)
    .toBuffer();

  // Create canvas with padding for stroke
  const canvasWidth = logoWidth + strokeWidth * 2;
  const canvasHeight = logoHeight + strokeWidth * 2;

  // Create stroke by compositing offset black versions in 8 directions
  const offsets = [
    { top: strokeWidth, left: strokeWidth + strokeWidth },      // right
    { top: strokeWidth, left: strokeWidth - strokeWidth },      // left
    { top: strokeWidth + strokeWidth, left: strokeWidth },      // bottom
    { top: strokeWidth - strokeWidth, left: strokeWidth },      // top
    { top: strokeWidth - strokeWidth, left: strokeWidth - strokeWidth },  // top-left
    { top: strokeWidth - strokeWidth, left: strokeWidth + strokeWidth },   // top-right
    { top: strokeWidth + strokeWidth, left: strokeWidth - strokeWidth },   // bottom-left
    { top: strokeWidth + strokeWidth, left: strokeWidth + strokeWidth },   // bottom-right
  ];

  // Start with transparent canvas
  const composites = offsets.map((offset) => ({
    input: blackLogo,
    top: offset.top,
    left: offset.left,
    blend: 'over',
  }));

  // Add original logo on top
  composites.push({
    input: logoBuffer,
    top: strokeWidth,
    left: strokeWidth,
    blend: 'over',
  });

  const result = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites);

  return result;
};

const run = async () => {
  await mkdir(outputDir, { recursive: true });

  for (const task of tasks) {
    const svgPath = path.join(publicDir, task.source);
    for (const output of task.outputs) {
      const destination = path.join(outputDir, output.filename);
      
      // For email assets (logo and icon), add stroke for visibility
      // OG image doesn't need stroke as it has its own background
      const isEmailAsset = output.filename.includes('logo-email') || output.filename.includes('logo-icon');
      
      if (isEmailAsset) {
        const result = await addStroke(
          svgPath,
          output.width,
          output.height || output.width
        );
        await result
          .png({ compressionLevel: 9 })
          .toFile(destination);
      } else {
        // OG image - no stroke needed
        const instance = sharp(svgPath)
          .resize(output.width, output.height, {
            fit: 'contain',
            withoutEnlargement: false,
          })
          .png({ compressionLevel: 9 });
        await instance.toFile(destination);
      }
      
      console.log(`🟢 Generated ${path.relative(projectRoot, destination)} (${output.width}x${output.height ?? 'auto'})`);
    }
  }

  console.log('✅ Email logo exports created successfully.');
};

run().catch((error) => {
  console.error('❌ Failed to export email logo assets:', error);
  process.exit(1);
});

