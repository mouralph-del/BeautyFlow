import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const source = walk("src").filter((file) => /\.(jsx|js)$/.test(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n");

test("interface não usa alert ou confirm nativos", () => {
  assert.doesNotMatch(source, /\bwindow\.(?:alert|confirm)\s*\(/);
  assert.doesNotMatch(source, /(?<![\w.])(?:alert|confirm)\s*\(/);
});

test("dialogs centrais usam o Modal compartilhado", () => {
  const dialogFiles = walk("src").filter((file) => /\.(jsx|js)$/.test(file) && /role=["{]dialog/.test(fs.readFileSync(file, "utf8")));
  const allowed = ["Modal.jsx", "AdminRequests.jsx", "AdminCustomers.jsx", "AdminFinance.jsx", "AdminPromotions.jsx", "AdminAgenda.jsx", "AdminSidebar.jsx", "AdminHeader.jsx", "CustomerAccountDrawer.jsx"];
  assert.deepEqual(dialogFiles.filter((file) => !allowed.includes(path.basename(file))), []);
  assert.match(fs.readFileSync("src/components/Modal/Modal.jsx", "utf8"), /aria-modal="true"/);
});

test("drawers administrativos usam o contrato acessível", () => {
  const hook = fs.readFileSync("src/hooks/useAccessibleDrawer.js", "utf8");
  assert.match(hook, /event\.key === "Escape"/);
  assert.match(hook, /event\.key !== "Tab"/);
  assert.match(hook, /previousFocusRef\.current\?\.focus/);
  assert.match(hook, /document\.body\.style\.overflow = "hidden"/);
  for (const file of ["AdminCustomers.jsx", "AdminFinance.jsx", "AdminPromotions.jsx", "AdminAgenda.jsx"]) assert.match(fs.readFileSync(`src/pages/${file}`, "utf8"), /useAccessibleDrawer/);
});
