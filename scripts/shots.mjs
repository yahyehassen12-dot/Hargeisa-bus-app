import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const OUT = ".screenshots";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickByText(page, selector, text) {
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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1.4 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
  await wait(3500);

  await page.screenshot({ path: `${OUT}/01-passenger.png` });

  await clickByText(page, ".role-btn", "Dareewalka");
  await wait(1500);
  await page.screenshot({ path: `${OUT}/02-driver.png` });

  // unlock the hidden split-test feature
  await page.evaluate(() => {
    const logo = document.querySelector(".brand");
    for (let i = 0; i < 5; i += 1) logo?.click();
  });
  await wait(600);
  await page.type(".unlock-field input", "2026");
  await page.click(".unlock-modal .btn-primary");
  await wait(1800);
  await page.screenshot({ path: `${OUT}/03-split.png` });

  // mobile passenger
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluate(() => localStorage.removeItem("hga_admin_v2"));
  await page.reload({ waitUntil: "networkidle2" });
  await wait(3000);
  await page.screenshot({ path: `${OUT}/04-mobile-passenger.png`, fullPage: true });

  // mobile driver
  await clickByText(page, ".role-btn", "Dareewalka");
  await wait(1200);
  await page.screenshot({ path: `${OUT}/05-mobile-driver.png`, fullPage: true });

  console.log("Screenshots written to", OUT);
} finally {
  await browser.close();
}
