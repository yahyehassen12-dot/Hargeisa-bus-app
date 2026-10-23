import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];
let stage = "boot";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
page.on("pageerror", (error) => {
  errors.push({ stage, text: error.message, stack: error.stack?.split("\n").slice(0, 6) });
});
page.on("console", (msg) => {
  if (msg.type() === "error" && !msg.text().includes("favicon")) {
    errors.push({ stage, console: msg.text() });
  }
});

async function clickText(selector, text) {
  await page.evaluate(
    (sel, label) => {
      const element = [...document.querySelectorAll(sel)].find((node) =>
        node.textContent?.includes(label),
      );
      if (element) element.click();
    },
    selector,
    text,
  );
}

stage = "boot";
await page.setViewport({ width: 1440, height: 1000 });
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.setItem("hga_admin_v2", "1"));
await page.reload({ waitUntil: "networkidle2" });
await wait(2500);

const views = ["Rakaabka", "Dareewalka", "Tijaabi Labadaba"];
const widths = [1440, 1024, 900, 390, 320, 768, 1180];

for (let i = 0; i < 24; i += 1) {
  stage = `switch-${i}`;
  await clickText(".role-btn", views[i % views.length]);
  await wait(120 + (i % 5) * 80);
  const [width, height] = i % 3 === 0 ? [390, 844] : [widths[i % widths.length], 900];
  stage = `resize-${i}-${width}`;
  await page.setViewport({ width, height });
  await wait(100 + (i % 4) * 80);
}

stage = "map-click-loop";
for (let i = 0; i < 10; i += 1) {
  const stops = await page.$$(".stop-marker");
  if (stops[i % stops.length]) await stops[i % stops.length].click();
  await wait(120);
}

stage = "rapid-remount";
for (let i = 0; i < 8; i += 1) {
  await clickText(".role-btn", "Tijaabi Labadaba");
  await wait(60);
  await clickText(".role-btn", "Rakaabka");
  await wait(60);
}

stage = "reload-loop";
for (let i = 0; i < 5; i += 1) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await wait(400);
}

stage = "split-resize-loop";
await wait(800);
await clickText(".role-btn", "Tijaabi Labadaba");
await wait(800);
for (let i = 0; i < 10; i += 1) {
  stage = `split-resize-${i}`;
  await page.setViewport({ width: i % 2 === 0 ? 1440 : 390, height: 900 });
  await wait(250);
}

await wait(1500);
console.log(JSON.stringify({ errorCount: errors.length, errors }, null, 2));
await browser.close();
