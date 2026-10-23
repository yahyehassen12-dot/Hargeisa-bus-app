import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

// unlock through the keyboard shortcut
await page.keyboard.down("Control");
await page.keyboard.down("Shift");
await page.keyboard.press("KeyB");
await page.keyboard.up("Shift");
await page.keyboard.up("Control");
await page.waitForSelector(".unlock-field input");
await page.type(".unlock-field input", "2026");
await page.click(".unlock-modal .btn-primary");
await page.waitForFunction(() => document.querySelector(".workspace.split"), { timeout: 5000 });
await wait(500);

const beforeReload = await page.evaluate(() => ({
  admin: localStorage.getItem("hga_admin_v2"),
  view: document.querySelector(".workspace")?.className,
  buttons: [...document.querySelectorAll(".role-btn")].map((b) => b.textContent.trim()),
}));

const t0 = Date.now();
await page.reload({ waitUntil: "networkidle2" });
let hydratedAt = null;
let buttonsAt = null;
let markersAt = null;
for (let i = 0; i < 50; i += 1) {
  const state = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll(".role-btn")].map((b) => b.textContent.trim()),
    markers: document.querySelectorAll(".bus-marker").length,
    admin: localStorage.getItem("hga_admin_v2"),
  }));
  if (!buttonsAt && state.buttons.length === 3) buttonsAt = Date.now() - t0;
  if (!markersAt && state.markers === 3) markersAt = Date.now() - t0;
  if (buttonsAt && markersAt) break;
  await wait(200);
}

const afterReload = await page.evaluate(() => ({
  admin: localStorage.getItem("hga_admin_v2"),
  buttons: [...document.querySelectorAll(".role-btn")].map((b) => b.textContent.trim()),
  markers: document.querySelectorAll(".bus-marker").length,
  tiles: document.querySelectorAll(".leaflet-tile-loaded").length,
  view: document.querySelector(".workspace")?.className,
}));

// lock again and verify it disappears
await page.click(".btn-icon-ghost[title='Qari awoodda tijaabada']");
await wait(400);
const afterLock = await page.evaluate(() => ({
  admin: localStorage.getItem("hga_admin_v2"),
  buttons: [...document.querySelectorAll(".role-btn")].map((b) => b.textContent.trim()),
  view: document.querySelector(".workspace")?.className,
}));

console.log(
  JSON.stringify({ beforeReload, afterReload, afterLock, hydratedAt, buttonsAt, markersAt }, null, 2),
);
await browser.close();
