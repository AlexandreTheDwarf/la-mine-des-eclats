import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
const manifest = JSON.parse(await readFile("dist/manifest.webmanifest", "utf8"));
const worker = await readFile("dist/sw.js", "utf8");
const html = await readFile("dist/index.html", "utf8");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.equal(manifest.id, "./");
assert.equal(manifest.display, "standalone");
assert.ok(html.includes('rel="manifest"'));
for (const icon of manifest.icons) {
  const png = await readFile(`dist/${icon.src}`);
  const [width, height] = icon.sizes.split("x").map(Number);
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
  assert.ok(worker.includes(icon.src), `Missing icon cache: ${icon.src}`);
}
const zones = (await readdir("public/assets")).filter((name) => name.endsWith(".png"));
for (const zone of zones) {
  assert.ok(worker.includes(`assets/${zone}`), `Uncached zone: ${zone}`);
  assert.ok((await stat(`dist/assets/${zone}`)).size < 4 * 1024 * 1024);
}
assert.ok(worker.includes("SKIP_WAITING"), "Expected prompted update handler");
console.log(`OK: relative manifest, ${manifest.icons.length} valid icons, ${zones.length} offline zones and prompted updates.`);
