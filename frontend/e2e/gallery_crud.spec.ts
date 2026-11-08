import { test, expect } from "@playwright/test";

test("Admin can upload, create, and delete a gallery item", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Login
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill("#login-email", "admin@marlowdental.com");
  await page.fill("#login-password", "AdminDemoPass2026!");
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin", { timeout: 15000 });

  // Navigate to Website CMS -> Gallery tab
  await page.goto("http://localhost:3000/admin/website", { waitUntil: "networkidle" });
  const galleryTab = page.locator("button[role='tab']:has-text('Gallery')");
  await expect(galleryTab).toBeVisible({ timeout: 10000 });
  await galleryTab.click();
  await page.waitForTimeout(1000);

  // Check initial count
  const initialCards = page.locator("button:has-text('Delete')");
  const initialCount = await initialCards.count();
  expect(initialCount).toBeGreaterThanOrEqual(1);

  // Upload an image file using file input
  const fileInput = page.locator("input[type='file']");
  await fileInput.setInputFiles("../frontend/public/images/gallery-1.jpg");
  await page.waitForTimeout(1500);

  // Fill caption
  await page.fill("#gallery-caption", "Automated E2E Test Gallery Suite");

  // Submit
  const submitButton = page.locator("button:has-text('Add to Gallery')");
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await page.waitForTimeout(2000);

  // Verify new image card was added
  const newCard = page.locator("text=Automated E2E Test Gallery Suite");
  await expect(newCard).toBeVisible({ timeout: 10000 });

  // Now delete the newly added image card
  // Find card container with "Automated E2E Test Gallery Suite" and click Delete inside it
  const cardContainer = page.locator("div.overflow-hidden", { has: page.locator("text=Automated E2E Test Gallery Suite") });
  const deleteBtn = cardContainer.locator("button:has-text('Delete')");
  await deleteBtn.click();
  await page.waitForTimeout(2000);

  // Verify it disappeared
  await expect(page.locator("text=Automated E2E Test Gallery Suite")).toHaveCount(0);
});
