import sharp from 'sharp';
import { ExifTool } from 'exiftool-vendored';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../fixtures/sample.jpg');
const outNoExif = resolve(__dirname, '../fixtures/sample-noexif.jpg');

async function main() {
  // 4032x3024 solid-color JPEG (mimics a phone photo dimension).
  await sharp({
    create: {
      width: 4032,
      height: 3024,
      channels: 3,
      background: { r: 128, g: 160, b: 200 },
    },
  }).jpeg({ quality: 70 }).toFile(out);

  const exif = new ExifTool({ taskTimeoutMillis: 10_000 });
  try {
    await exif.write(out, {
      DateTimeOriginal: '2025:07:15 14:30:00',
      Orientation: 1,
    }, { writeArgs: ['-overwrite_original', '-n'] });
    // Make a no-EXIF copy.
    copyFileSync(out, outNoExif);
    await exif.write(outNoExif, {}, { writeArgs: ['-all=', '-overwrite_original'] });
  } finally {
    await exif.end();
  }
  console.log(`Wrote ${out} and ${outNoExif}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
