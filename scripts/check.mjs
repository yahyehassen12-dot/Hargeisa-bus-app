import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = {};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
await wait(2500);

const measure = async (label) =>
  page.evaluate((name) => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      label: name,
      viewport: { w: innerWidth, h: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      splitButton: [...document.querySelectorAll(".role-btn")].some((b) => b.textContent.includes("Tijaabi")),
      bodyText: document.body.innerText.includes("Tijaabi Labadaba"),
      panels: document.querySelectorAll(".panel").length,
      cards: document.querySelectorAll(".card").length,
      map: box(".map-shell"),
      left: box(".split-left"),
      right: box(".split-right"),
      mapWrap: box(".map-wrap"),
      panelCol: box(".panel-col"),
      tiles: document.querySelectorAll(".leaflet-tile-loaded").length,
      markers: document.querySelectorAll(".bus-marker").length,
      stops: document.querySelectorAll(".stop-marker").length,
    };
  }, label);

results.desktopPassenger = await measure("desktop-passenger");

// signal requires auth
await page.click(".signal-btn");
await wait(500);
results.authFromSignal = await page.evaluate(() => ({
  open: !!document.querySelector(".auth-modal"),
  title: document.querySelector(".auth-modal .modal-title")?.textContent,
}));

// fill registration
await page.type(".auth-modal .input", "Yahyaa Test");
await page.type(".phone-digits", "4452134");
await clickText(".auth-modal .btn-primary", "Sii wad");
await wait(500);
results.otpStep = await page.evaluate(() => ({
  step2: !!document.querySelector(".otp-grid"),
  digits: [...document.querySelectorAll(".otp-digit")].map((d) => d.value).join(""),
  smsCode: document.querySelector(".sms-code")?.textContent,
}));
await clickText(".auth-modal .btn-primary", "Xaqiiji");
await wait(800);
await page.click(".signal-btn");
await wait(700);
results.loggedIn = await page.evaluate(() => ({
  profile: document.querySelector(".profile-name")?.textContent ?? null,
  signalActive: !!document.querySelector(".signal-btn.active"),
  callout: !!document.querySelector(".callout"),
  toast: document.querySelector(".toast")?.textContent?.trim() ?? null,
}));

// driver view
await clickText(".role-btn", "Dareewalka");
await wait(900);
results.driver = await page.evaluate(() => ({
  title: document.querySelector(".panel-title")?.textContent,
  queueRows: document.querySelectorAll(".person-row").length,
  queueStops: document.querySelectorAll(".queue-stop").length,
  seats: document.querySelector(".counter-value")?.textContent,
  progress: document.querySelector(".progress-fill")?.style.width,
  online: !!document.querySelector(".switch.is-on"),
}));

// unlock secret feature via logo taps
await page.evaluate(() => {
  const logo = document.querySelector(".brand");
  for (let i = 0; i < 5; i += 1) logo.click();
});
await wait(500);
results.unlockModal = await page.evaluate(() => ({
  open: !!document.querySelector(".unlock-modal"),
  title: document.querySelector(".unlock-modal .modal-title")?.textContent,
}));

await page.type(".unlock-field input", "9999");
await page.click(".unlock-modal .btn-primary");
await wait(400);
results.wrongCode = await page.evaluate(() => ({
  error: document.querySelector(".unlock-modal .form-error")?.textContent?.trim() ?? null,
  stillOpen: !!document.querySelector(".unlock-modal"),
}));

await page.click(".unlock-field input");
await page.keyboard.down("Control");
await page.keyboard.press("KeyA");
await page.keyboard.up("Control");
await page.type(".unlock-field input", "2026");
await page.click(".unlock-modal .btn-primary");
await wait(1500);
results.splitView = await measure("split-1440");
results.splitLayout = await page.evaluate(() => ({
  roleButtons: [...document.querySelectorAll(".role-btn")].map((b) => b.textContent.trim()),
  bothPanels: document.querySelectorAll(".workspace.split .panel").length,
  view: document.querySelector(".workspace")?.className,
  unlockStillOpen: !!document.querySelector(".unlock-modal"),
  error: document.querySelector(".unlock-modal .form-error")?.textContent?.trim() ?? null,
}));

// reload should remember unlock
await page.reload({ waitUntil: "networkidle2" });
await wait(2000);
results.persistedUnlock = await page.evaluate(() => ({
  splitButton: [...document.querySelectorAll(".role-btn")].some((b) => b.textContent.includes("Tijaabi")),
  view: document.querySelector(".workspace")?.className,
}));

// mobile checks with split unlocked
await page.setViewport({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle2" });
await wait(2000);
results.mobilePassengerSingle = await measure("mobile-passenger-single");
await clickText(".role-btn", "Tijaabi Labadaba");
await wait(1200);
results.mobilePassenger = await measure("mobile-split");
results.mobileTabs = await page.evaluate(() => ({
  tabsVisible: !!document.querySelector(".split-tabs") && getComputedStyle(document.querySelector(".split-tabs")).display !== "none",
  leftVisible: !!document.querySelector(".split-left") && getComputedStyle(document.querySelector(".split-left")).display !== "none",
  rightVisible: !!document.querySelector(".split-right") && getComputedStyle(document.querySelector(".split-right")).display !== "none",
}));
await clickText(".split-tabs button", "Dareewalka");
await wait(500);
results.mobileTabSwitch = await page.evaluate(() => ({
  leftVisible: getComputedStyle(document.querySelector(".split-left")).display !== "none",
  rightVisible: getComputedStyle(document.querySelector(".split-right")).display !== "none",
}));

results.mobileDriverSingle = await (async () => {
  await page.evaluate(() => localStorage.removeItem("hga_admin_v2"));
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector(".role-btn");
  await wait(2500);
  await clickText(".role-btn", "Dareewalka");
  await wait(800);
  return measure("mobile-driver");
})();

console.log(JSON.stringify(results, null, 2));
await browser.close();

async function clickText(selector, text) {
  await page.evaluate(
    (sel, label) => {
      const element = [...document.querySelectorAll(sel)].find((node) => node.textContent?.includes(label));
      if (!element) throw new Error(`Not found: ${label}`);
      element.click();
    },
    selector,
    text,
  );
}
