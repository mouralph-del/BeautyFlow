import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("todas as páginas de rota são carregadas por React.lazy", () => {
  const app = read("src/App.jsx");
  for (const page of ["Home", "Services", "Gallery", "Contact", "Auth", "CustomerSpace", "CustomerAppointments", "AdminDashboard", "AdminFinance", "NotFound"]) {
    assert.match(app, new RegExp(`const ${page}=lazy\\(\\(\\)=>import`));
  }
  assert.match(app, /<ProtectedRoute>/);
  assert.match(app, /<AdminRoute>/);
});

test("fallback de rota usa skeleton e oferece recuperação amigável", () => {
  const boundary = read("src/components/RouteLoadingBoundary/RouteLoadingBoundary.jsx");
  assert.match(boundary, /Suspense/);
  assert.match(boundary, /SkeletonList/);
  assert.match(boundary, /Não foi possível carregar esta página\./);
  assert.match(boundary, /Tentar novamente/);
  assert.match(boundary, /Voltar ao início/);
  assert.doesNotMatch(boundary, /error\.message|error\.stack/);
});

test("mídia secundária evita download e decodificação bloqueantes", () => {
  assert.match(read("src/components/Image/ImageWithFallback.jsx"), /loading\s*=\s*["']lazy["']/);
  assert.match(read("src/components/Image/ImageWithFallback.jsx"), /decoding\s*=\s*["']async["']/);
  assert.match(read("src/components/Certificates/CertificateGallery.jsx"), /loading="lazy" decoding="async"/);
  assert.match(read("src/components/GalleryCarousel/GalleryCarousel.jsx"), /preload="metadata"/);
  assert.match(read("src/components/GalleryCarousel/GalleryCarousel.jsx"), /loading=\{loadingForSlide\(index\)\}/);
  assert.doesNotMatch(read("src/components/Image/ImageWithFallback.jsx"), /display:\s*status\s*===\s*["']loaded/);
  assert.match(read("src/components/Image/ImageWithFallback.jsx"), /image\?\.complete/);
  assert.match(read("src/components/GalleryCarousel/GalleryCarousel.jsx"), /className="gallery-details-modal__media"[\s\S]*loading="eager"/);
  assert.match(read("src/pages/Contact.jsx"), /loading="lazy"/);
});
