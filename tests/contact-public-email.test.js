import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("contato usa somente o e-mail da configuração pública", () => {
  const contact = read("src/pages/Contact.jsx");
  const settings = read("src/services/settings.js");

  assert.match(contact, /studio\.contact_email/);
  assert.match(contact, /mailto:\$\{contactEmail\}/);
  assert.match(contact, /navigator\.clipboard\.writeText\(contactEmail\)/);
  assert.doesNotMatch(contact, /THAIS_ADMIN_EMAIL|auth\.users|supabase\.auth/);
  assert.match(settings, /contact_email: "Thaisfonsecadossantos18@gmail\.com"/);
  assert.match(settings, /get_public_settings/);
});
