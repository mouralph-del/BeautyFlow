import fs from "fs";
import { expect, test } from "@playwright/test";

const screenshotRoot = "test-results/smoke-screenshots";
const viewports = [
  { label: "desktop-1920x1080", width: 1920, height: 1080 },
  { label: "desktop-1366x768", width: 1366, height: 768 },
  { label: "tablet-768x1024", width: 768, height: 1024 },
  { label: "mobile-390x844", width: 390, height: 844 },
  { label: "mobile-430x932", width: 430, height: 932 },
];

const ensureScreenshots = () => {
  fs.mkdirSync(screenshotRoot, { recursive: true });
};

const clickOpenModal = async (page) => {
  let openButton = page.getByRole("button", { name: /Não encontrei um horário/i }).first();
  if (!(await openButton.count())) {
    openButton = page.locator("button", { hasText: "Solicitar encaixe" }).first();
  }
  await expect(openButton).toBeVisible({ timeout: 10000 });
  await openButton.focus();
  await openButton.click();
  return openButton;
};

const validateFitRequestModal = async (page, label) => {
  const dialog = page.getByRole("dialog", { name: /Solicitação de encaixe/i });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog).toHaveAttribute("aria-labelledby");
  await expect(dialog).toHaveAttribute("aria-describedby");

  await expect.poll(() => page.evaluate(() =>
    document.activeElement?.closest("[role=dialog]") !== null
  )).toBe(true);

  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.activeElement?.closest("[role=dialog]") !== null
    )
  ).toBe(true);

  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  expect(
    await page.evaluate(() =>
      document.activeElement?.closest("[role=dialog]") !== null
    )
  ).toBe(true);

  await page.screenshot({
    path: `${screenshotRoot}/fit-request-modal-${label}.png`,
    fullPage: true,
  });
};

const closeModalByOverlay = async (page) => {
  const overlay = page.locator(".bf-modal-overlay");
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  if (!box) {
    throw new Error("Overlay bounding box not found");
  }
  await page.mouse.click(box.x + 10, box.y + 10);
};

const noHorizontalScroll = async (page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
};

const screenLabel = (projectName, sizeLabel) => `${projectName}-${sizeLabel}`;

test.describe("Smoke test public modals", () => {
  test.beforeAll(() => {
    ensureScreenshots();
  });

  for (const viewport of viewports) {
    test(`Booking page + FitRequestModal ${viewport.label}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/agendamento/1");
      await expect(page.getByRole("heading", { name: /Agendamento/i })).toBeVisible({ timeout: 20000 });

      await noHorizontalScroll(page);
      await page.screenshot({
        path: `${screenshotRoot}/${screenLabel(testInfo.project.name, viewport.label)}-booking-page.png`,
        fullPage: true,
      });

      const dateCell = page.locator(
        ".react-datepicker__day:not(.react-datepicker__day--outside-month):not(.react-datepicker__day--disabled)"
      ).first();
      await expect(dateCell).toBeVisible({ timeout: 15000 });
      await dateCell.click();

      await expect(page.getByRole("button", { name: /Não encontrei um horário/i })).toBeVisible({ timeout: 10000 });
      await page.screenshot({
        path: `${screenshotRoot}/${screenLabel(testInfo.project.name, viewport.label)}-booking-with-date.png`,
        fullPage: true,
      });

      const openButton = await clickOpenModal(page);
      const triggerText = await openButton.textContent();
      await validateFitRequestModal(page, screenLabel(testInfo.project.name, viewport.label));

      await closeModalByOverlay(page);
      await expect(page.getByRole("dialog", { name: /Solicitação de encaixe/i })).toBeHidden();
      await expect(page.evaluate(() => document.activeElement?.textContent)).resolves.toContain(triggerText?.trim() ?? "");

      await openButton.click();
      await expect(page.getByRole("dialog", { name: /Solicitação de encaixe/i })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: /Solicitação de encaixe/i })).toBeHidden();
      await page.screenshot({
        path: `${screenshotRoot}/${screenLabel(testInfo.project.name, viewport.label)}-fit-request-closed.png`,
        fullPage: true,
      });
    });
  }

  test("Cancellation page is reachable without auth if public token exists", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/cancelar-agendamento/1");
    await page.screenshot({
      path: `${screenshotRoot}/desktop-1366x768-cancellation-page.png`,
      fullPage: true,
    });

    const pageHeading = page.getByRole("heading", { name: /Cancelar agendamento/i });
    if (await pageHeading.count()) {
      await expect(pageHeading).toBeVisible();
    }

    const cancelButton = page.getByRole("button", { name: /Cancelar agendamento/i }).first();
    if (await cancelButton.count()) {
      await expect(cancelButton).toBeVisible();
      await cancelButton.click();
      const dialog = page.getByRole("dialog", { name: /Confirmar cancelamento/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await expect(dialog).toHaveAttribute("aria-modal", "true");
      await expect(dialog).toHaveAttribute("aria-labelledby");
      await expect(dialog).toHaveAttribute("aria-describedby");
      await page.screenshot({
        path: `${screenshotRoot}/desktop-1366x768-cancellation-modal.png`,
        fullPage: true,
      });
      await page.locator(".bf-modal-overlay").click({ position: { x: 10, y: 10 } });
      await expect(dialog).toBeHidden();
    }
  });
});
