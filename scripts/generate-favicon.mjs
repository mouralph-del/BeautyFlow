import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDirectory = path.resolve("public");
const source = path.join(publicDirectory, "favicon-source.svg");
const sizes = [16, 32, 48, 192];

for (const size of sizes) {
  await sharp(source)
    .resize(size, size, { fit: "fill" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(publicDirectory, `favicon-${size}x${size}.png`));
}

const png = await fs.readFile(path.join(publicDirectory, "favicon-48x48.png"));
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(48, 6);
header.writeUInt8(48, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await fs.writeFile(path.join(publicDirectory, "favicon.ico"), Buffer.concat([header, png]));
