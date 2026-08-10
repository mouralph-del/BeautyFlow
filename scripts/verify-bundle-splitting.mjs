import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const distDirectory = path.resolve("dist");
const htmlPath = path.join(distDirectory, "index.html");

assert.ok(fs.existsSync(htmlPath), "Execute npm run build antes de verificar os chunks.");

const html = fs.readFileSync(htmlPath, "utf8");
const entrySource = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
assert.ok(entrySource, "O entrypoint JavaScript não foi encontrado no index gerado.");

const entryPath = path.join(distDirectory, entrySource.replace(/^\//, ""));
const entry = fs.readFileSync(entryPath, "utf8");
const assetNames = fs.readdirSync(path.join(distDirectory, "assets"));

for (const page of ["AdminDashboard", "AdminFinance", "CustomerSpace"]) {
  const chunk = assetNames.find((name) => name.startsWith(`${page}-`) && name.endsWith(".js"));
  assert.ok(chunk, `${page} deve possuir chunk próprio.`);
  assert.match(entry, new RegExp(`import\\(.[^)]*${page}-`), `${page} deve ser referenciado somente por import dinâmico.`);
  assert.doesNotMatch(entry, new RegExp(`from.[^;]*${page}-`), `${page} não pode ser importado estaticamente pelo entrypoint.`);
}

assert.match(html, /vendor-react-[^"/]+\.js/);
assert.match(html, /vendor-supabase-[^"/]+\.js/);
console.log("Bundle verificado: Admin e Cliente permanecem fora do chunk público inicial.");
