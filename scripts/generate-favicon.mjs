import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function generateFavicon() {
  const logoPath = path.join(root, 'src/assets/spearlance-logo.png');

  // Get image metadata to find the icon portion
  const metadata = await sharp(logoPath).metadata();
  console.log(`Logo dimensions: ${metadata.width}x${metadata.height}`);

  // The logo is already the gem icon — use it directly
  const extracted = sharp(logoPath);

  // Generate multiple sizes for favicon
  const sizes = [16, 32, 48, 64, 128, 180, 192, 512];

  for (const size of sizes) {
    const outputPath = path.join(root, 'public', `favicon-${size}x${size}.png`);
    await extracted
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: favicon-${size}x${size}.png`);
  }

  // Generate the main favicon.ico (32x32 PNG saved as .ico workaround)
  // For proper ICO, we'll use the 32x32 PNG
  await extracted
    .clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, 'public', 'favicon.png'));

  // Generate apple-touch-icon
  await extracted
    .clone()
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, 'public', 'apple-touch-icon.png'));

  // For the actual .ico file, create a multi-size ICO
  // sharp can output to ICO format (16x16 and 32x32)
  const ico16 = await extracted.clone()
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ico32 = await extracted.clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ico48 = await extracted.clone()
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Build ICO file manually (ICO format: header + directory entries + image data)
  const images = [
    { size: 16, buffer: ico16 },
    { size: 32, buffer: ico32 },
    { size: 48, buffer: ico48 }
  ];

  const headerSize = 6;
  const dirEntrySize = 16;
  const headerAndDir = headerSize + (dirEntrySize * images.length);

  // ICO header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Number of images

  // Directory entries and image data
  const dirEntries = Buffer.alloc(dirEntrySize * images.length);
  let dataOffset = headerAndDir;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const offset = i * dirEntrySize;
    dirEntries.writeUInt8(img.size === 256 ? 0 : img.size, offset);      // Width
    dirEntries.writeUInt8(img.size === 256 ? 0 : img.size, offset + 1);  // Height
    dirEntries.writeUInt8(0, offset + 2);   // Color palette
    dirEntries.writeUInt8(0, offset + 3);   // Reserved
    dirEntries.writeUInt16LE(1, offset + 4); // Color planes
    dirEntries.writeUInt16LE(32, offset + 6); // Bits per pixel
    dirEntries.writeUInt32LE(img.buffer.length, offset + 8); // Image size
    dirEntries.writeUInt32LE(dataOffset, offset + 12);       // Image offset
    dataOffset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, dirEntries, ...images.map(i => i.buffer)]);
  const fs = await import('fs');
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), icoBuffer);
  console.log('Generated: favicon.ico (multi-size)');

  console.log('\nDone! Favicon files generated in public/');
}

generateFavicon().catch(console.error);
