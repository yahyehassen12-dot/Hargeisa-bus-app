import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A point right on the 150-ka stop.
const FIX = { latitude: 9.5786, longitude: 44.0626, accuracy: 12 };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const context = browser.defaultBrowserContext();
await context.overridePermissions(BASE, ["geolocation"]);

const page = await browser.newPage();
const issues = [];
let stage = "boot";

page.on("console", (msg) => {
  if (msg.type() === "error") issues.push({ stage, text: msg.text() });
});
page.on("pageerror", (error) => {
  issues.push({ stage, type: "pageerror", text: error.message });
});

await page.setViewport({ width: 1440, height: 1000 });
await page.setGeolocation(FIX);
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });

stage = "passenger-gps";
await page.waitForSelector(".gps-card .gps-pill.is-live", { timeout: 15000 });
await wait(1400);

const passenger = await page.evaluate(() => ({
  livePill: document.querySelector(".gps-card .gps-pill")?.textContent?.trim(),
  headline: document.querySelector(".gps-card .gps-copy b")?.textContent?.trim(),
  metrics: [...document.querySelectorAll(".gps-card .gps-metrics > div")].map((node) =>
    node.textContent?.replace(/\s+/g, " ").trim(),
  ),
  selectedStop: document.querySelector(".select")?.value,
  autoButton: document.querySelector(".gps-card .gps-btn")?.textContent?.trim(),
  autoDisabled: document.querySelector(".gps-card .gps-btn")?.disabled,
  userMarkers: document.querySelectorAll(".user-marker").length,
  userTag: document.querySelector(".user-tag")?.textContent,
  gpsChip: document.querySelector(".gps-chip")?.textContent?.trim(),
  mapToolOn: document.querySelectorAll(".map-tool.is-on").length,
  busLabels: document.querySelectorAll(".bus-label").length,
}));

stage = "manual-stop";
await page.select(".select", "jigjiga-yar");
await wait(400);
const manual = await page.evaluate(() => ({
  selectedStop: document.querySelector(".select")?.value,
  autoButton: document.querySelector(".gps-card .gps-btn")?.textContent?.trim(),
  autoDisabled: document.querySelector(".gps-card .gps-btn")?.disabled,
}));

stage = "reuse-gps-stop";
await page.click(".gps-card .gps-btn");
await wait(500);
const reused = await page.evaluate(() => ({
  selectedStop: document.querySelector(".select")?.value,
  autoButton: document.querySelector(".gps-card .gps-btn")?.textContent?.trim(),
}));

stage = "driver-auth";
await page.evaluate(() => {
  const button = [...document.querySelectorAll(".role-btn")].find((node) =>
    node.textContent?.includes("Dareewalka"),
  );
  button?.click();
});
await wait(600);
await page.click(".driver-card .link-btn");
await page.waitForSelector(".auth-modal", { timeout: 3000 });
await page.type(".auth-modal .input", "GPS Driver");
await page.type(".phone-digits", "4452134");
const extras = await page.$$(".driver-extra .input");
if (extras[0]) {
  await extras[0].click({ clickCount: 3 });
  await extras[0].type("HGA-7777");
}
if (extras[1]) {
  await extras[1].click({ clickCount: 3 });
  await extras[1].type("GPS Bus 77");
}
await page.evaluate(() => {
  const button = [...document.querySelectorAll(".auth-modal .btn-primary")].find((node) =>
    node.textContent?.includes("Sii wad"),
  );
  button?.click();
});
await page.waitForSelector(".otp-grid", { timeout: 3000 });
await page.evaluate(() => {
  const button = [...document.querySelectorAll(".auth-modal .btn-primary")].find((node) =>
    node.textContent?.includes("Xaqiiji"),
  );
  button?.click();
});
await wait(1200);

stage = "driver-gps";
await page.waitForSelector(".driver-gps.is-live", { timeout: 8000 });
await wait(1000);
const driver = await page.evaluate(() => ({
  headline: document.querySelector(".driver-gps .gps-copy b")?.textContent?.trim(),
  live: !!document.querySelector(".driver-gps.is-live"),
  metrics: [...document.querySelectorAll(".driver-gps .gps-metrics > div")].map((node) =>
    node.textContent?.replace(/\s+/g, " ").trim(),
  ),
  liveLine: document.querySelector(".driver-gps .gps-live-line")?.textContent?.replace(/\s+/g, " ").trim(),
  busProgress: document.querySelector(".progress-meta b")?.textContent,
  simDisabled: document.querySelector(".sim-btn")?.disabled,
  meMarkers: document.querySelectorAll(".bus-marker.is-me").length,
  meTag: document.querySelector(".bus-me-tag")?.textContent,
}));

stage = "driver-gps-off";
await page.click(".driver-gps .switch");
await wait(700);
const driverOff = await page.evaluate(() => ({
  live: !!document.querySelector(".driver-gps.is-live"),
  simDisabled: document.querySelector(".sim-btn")?.disabled,
  headline: document.querySelector(".driver-gps .gps-copy b")?.textContent?.trim(),
}));

await page.screenshot({ path: ".screenshots/06-gps-map.png" });

const result = { passenger, manual, reused, driver, driverOff, issues };
console.log(JSON.stringify(result, null, 2));

await browser.close();
process.exit(issues.length > 0 ? 1 : 0);
