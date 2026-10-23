import fs from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const out = {};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
const consoleIssues = [];
const failedRequests = [];
let stage = "boot";

page.on("console", (msg) => {
  const type = msg.type();
  if (type === "error" || type === "warning") {
    consoleIssues.push({ type, stage, text: msg.text() });
  }
});
page.on("pageerror", (error) => {
  consoleIssues.push({
    type: "pageerror",
    stage,
    text: error.message,
    stack: error.stack,
  });
});
page.on("requestfailed", (request) => {
  if (!/cartocdn|tile/i.test(request.url())) {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown",
    });
  }
});

async function clickText(selector, text) {
  await page.evaluate(
    (sel, label) => {
      const element = [...document.querySelectorAll(sel)].find((node) =>
        node.textContent?.includes(label),
      );
      if (!element) throw new Error(`Not found: ${label}`);
      element.click();
    },
    selector,
    text,
  );
}

async function waitForMap() {
  await page
    .waitForFunction(() => document.querySelectorAll(".bus-marker").length === 3, {
      timeout: 15000,
    })
    .catch(() => {});
  await page
    .waitForFunction(() => document.querySelectorAll(".stop-marker").length === 6, {
      timeout: 15000,
    })
    .catch(() => {});
}

const measure = () =>
  page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      };
    };
    const switcher = document.querySelector(".role-switcher");
    const buttons = [...document.querySelectorAll(".role-btn")].map((button) => ({
      text: button.textContent?.trim() ?? "",
      w: Math.round(button.getBoundingClientRect().width),
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
      clipped: button.scrollWidth > button.clientWidth + 1,
    }));
    const tabs = document.querySelector(".split-tabs");
    return {
      viewport: { w: innerWidth, h: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      headerH: Math.round(
        document.querySelector(".app-header")?.getBoundingClientRect().height ?? 0,
      ),
      splitButton: buttons.some((button) => button.text.includes("Tijaabi")),
      bodyHasSplit: document.body.innerText.includes("Tijaabi Labadaba"),
      roleButtons: buttons,
      switcher: switcher
        ? {
            w: Math.round(switcher.getBoundingClientRect().width),
            clientWidth: switcher.clientWidth,
            scrollWidth: switcher.scrollWidth,
            overflow: switcher.scrollWidth > switcher.clientWidth + 1,
          }
        : null,
      workspace: document.querySelector(".workspace")?.className ?? null,
      panels: document.querySelectorAll(".panel").length,
      visiblePanels: [...document.querySelectorAll(".panel")].filter(
        (panel) => getComputedStyle(panel).display !== "none" &&
          panel.getBoundingClientRect().width > 0,
      ).length,
      map: box(".map-shell"),
      mapWrap: box(".map-wrap"),
      tabs: tabs ? getComputedStyle(tabs).display : "none",
      markers: document.querySelectorAll(".bus-marker").length,
      meMarkers: document.querySelectorAll(".bus-marker.is-me").length,
      meTags: document.querySelectorAll(".bus-me-tag").length,
      stops: document.querySelectorAll(".stop-marker").length,
      tiles: document.querySelectorAll(".leaflet-tile-loaded").length,
      cards: document.querySelectorAll(".card").length,
    };
  });

// ---------------------------------------------------------- clean start
stage = "clean-start";
await page.setViewport({ width: 1440, height: 1000 });
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await waitForMap();
await page.evaluate(() => document.fonts.ready);

out.guest = await measure();
out.guest.fontLoaded = await page.evaluate(() =>
  document.fonts.check('16px "Plus Jakarta Sans"'),
);
out.guest.unlockVisible = await page.evaluate(() => ({
  modal: !!document.querySelector(".unlock-modal"),
  adminKey: localStorage.getItem("hga_admin_v2"),
}));

// ---------------------------------------------------- logo-tap unlock
stage = "logo-tap";
await page.evaluate(() => {
  const logo = document.querySelector(".brand");
  for (let i = 0; i < 5; i += 1) logo.click();
});
await page.waitForSelector(".unlock-modal", { timeout: 3000 });
out.logoTap = await page.evaluate(() => ({
  open: !!document.querySelector(".unlock-modal"),
  title: document.querySelector(".unlock-modal .modal-title")?.textContent ?? null,
}));

await page.type(".unlock-field input", "9999");
await page.click(".unlock-modal .btn-primary");
await wait(400);
out.wrongCode = await page.evaluate(() => ({
  error: document.querySelector(".unlock-modal .form-error")?.textContent?.trim() ?? null,
  stillOpen: !!document.querySelector(".unlock-modal"),
}));

await page.click(".unlock-field input");
await page.keyboard.down("Control");
await page.keyboard.press("KeyA");
await page.keyboard.up("Control");
await page.type(".unlock-field input", "2026");
await page.click(".unlock-modal .btn-primary");
await wait(1300);
out.split = await measure();
out.split.detail = await page.evaluate(() => ({
  roleButtons: [...document.querySelectorAll(".role-btn")].map((b) => b.textContent.trim()),
  bothPanels: document.querySelectorAll(".workspace.split .panel").length,
  unlockClosed: !document.querySelector(".unlock-modal"),
  adminKey: localStorage.getItem("hga_admin_v2"),
}));

// --------------------------------------------------- reload persistence
stage = "reload-persistence";
await page.reload({ waitUntil: "networkidle2" });
await waitForMap();
await wait(500);
out.afterReload = await measure();
out.afterReload.adminKey = await page.evaluate(() =>
  localStorage.getItem("hga_admin_v2"),
);

// ------------------------------------------------------- lock and URL
stage = "lock-and-url";
await page.click('[aria-label="Qari awoodda tijaabada"]');
await wait(400);
out.afterLock = await measure();
out.afterLock.adminKey = await page.evaluate(() =>
  localStorage.getItem("hga_admin_v2"),
);

await page.goto(`${BASE}/?admin=1`, { waitUntil: "networkidle2" });
await page.waitForSelector(".unlock-modal", { timeout: 4000 });
out.adminUrl = await page.evaluate(() => ({
  modalOpen: !!document.querySelector(".unlock-modal"),
  search: location.search,
  cleanUrl: !location.search.includes("admin"),
}));
await page.type(".unlock-field input", "2026");
await page.click(".unlock-modal .btn-primary");
await wait(1200);

// ------------------------------------------- driver auth + logout reset
stage = "driver-auth";
await clickText(".role-btn", "Dareewalka");
await wait(500);
await page.click(".driver-card .link-btn");
await page.waitForSelector(".auth-modal", { timeout: 3000 });
out.driverAuthOpen = await page.evaluate(() => ({
  role: document.querySelector(".auth-modal .role-card.active .role-card-title")?.textContent,
  title: document.querySelector(".auth-modal .modal-title")?.textContent,
}));

await page.type(".auth-modal .input", "Tijaabo Driver");
await page.type(".phone-digits", "4452134");
const driverInputs = await page.$$(".driver-extra .input");
if (driverInputs[0]) {
  await driverInputs[0].click({ clickCount: 3 });
  await driverInputs[0].type("HGA-9999");
}
if (driverInputs[1]) {
  await driverInputs[1].click({ clickCount: 3 });
  await driverInputs[1].type("Test Bus 99");
}
await clickText(".auth-modal .btn-primary", "Sii wad");
await page.waitForSelector(".otp-grid", { timeout: 3000 });
out.driverOtp = await page.evaluate(() => ({
  prefilled: [...document.querySelectorAll(".otp-digit")].map((d) => d.value).join(""),
  smsCode: document.querySelector(".sms-code")?.textContent ?? null,
}));
await clickText(".auth-modal .btn-primary", "Xaqiiji");
await wait(800);
out.driverLoggedIn = await page.evaluate(() => ({
  profile: document.querySelector(".profile-name")?.textContent ?? null,
  busName: document.querySelector(".driver-card .bus-name.sm")?.textContent ?? null,
  plate: document.querySelector(".driver-card .plate")?.textContent ?? null,
  driverRow: document.querySelector(".driver-card .driver-row")?.textContent?.trim() ?? null,
}));

await page.click('[aria-label="Ka bax akoonka"]');
await wait(700);
out.driverAfterLogout = await page.evaluate(() => ({
  profile: document.querySelector(".profile-name")?.textContent ?? null,
  busName: document.querySelector(".driver-card .bus-name.sm")?.textContent ?? null,
  plate: document.querySelector(".driver-card .plate")?.textContent ?? null,
  driverRow: document.querySelector(".driver-card .driver-row")?.textContent?.trim() ?? null,
  userKey: localStorage.getItem("hga_bus_user_v2"),
}));

// --------------------------------------------------------- responsive
stage = "responsive-setup";
await clickText(".role-btn", "Tijaabi Labadaba");
await wait(900);
out.responsive = [];
for (const [width, height] of [
  [1440, 1000],
  [1180, 900],
  [1024, 900],
  [901, 900],
  [900, 900],
  [768, 900],
  [390, 844],
  [360, 780],
  [340, 760],
  [320, 740],
]) {
  stage = `responsive-${width}`;
  await page.setViewport({ width, height });
  await wait(900);
  const data = await measure();
  data.width = width;
  out.responsive.push(data);
}

// mobile split tab switching at 390
stage = "mobile-tabs";
await page.setViewport({ width: 390, height: 844 });
await wait(700);
await clickText(".split-tabs button", "Dareewalka");
await wait(400);
out.mobileTabSwitch = await page.evaluate(() => ({
  leftVisible:
    getComputedStyle(document.querySelector(".split-left")).display !== "none",
  rightVisible:
    getComputedStyle(document.querySelector(".split-right")).display !== "none",
}));
await clickText(".split-tabs button", "Rakaabka");
await wait(300);

out.consoleIssues = consoleIssues;
out.failedRequests = failedRequests;

fs.mkdirSync(".screenshots", { recursive: true });
fs.writeFileSync(".screenshots/audit.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
