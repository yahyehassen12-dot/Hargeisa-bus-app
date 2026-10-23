# HargeisaBus

App-ka basaska magaalada Hargeysa oo dib loo dhisay iyadoo la isticmaalayo
**Next.js 15**, **React 19** iyo **TypeScript**. Naqshadda waa dark glassmorphism,
font-ka Plus Jakarta Sans, iyo khariidad Leaflet oo leh basas dhaqaaqa.

## Sida loo kiciyo

```bash
npm install
npm run dev
```

Fur <http://localhost:3000>.

Si loo tijaabiyo product-ka:

```bash
npm run build
npm start
```

## Awoodda qarsoon — “Tijaabi Labadaba”

Shaashadda labada dhinac (rakaab + dareewal + khariidad) waa mid qarsoon oo
kaliya milkiilaha arki karo. Isticmaalayaasha caadiga ah ma arkaan badhanka.

Saddex siyaabood oo loo furo:

1. Riix **logo-ga 5 jeer** isku xigta (2.4 ilbiriqsi gudahood).
2. Riix **Ctrl + Shift + B** (Mac: Cmd + Shift + B).
3. Fur link-ga `/?admin=1`.

Kadib geli koodhka sirta ah:

```
2026
```

ama `hargeisa2026`.

Marka la furo, badhanka **“Tijaabi Labadaba”** wuu soo muuqdaa, shaashadduna
si otomaatig ah ayay u gashaa split view. Awoodda waxay ku kaydsan tahay
`localStorage` (key: `hga_admin_v2`), marka reload ka dib way sii jirtaa.

Si aad mar kale u qariso, riix badhanka **qufulka** ee ku yaal header-ka.
Haddii aad isticmaalayso kombuyuutar la wadaago, had iyo jeer quful markaad
dhamaysato.

### Beddel koodhka sirta ah

Fur `lib/config.ts` oo beddel:

```ts
export const ADMIN_PASSCODES = ["2026", "hargeisa2026"];
```

> Ogeysiis: koodhkani waa demo client-side ah, ma aha ammaan server-side ah.
> Qof yaqaan devtools wuu arki karaa bundle-ka. Wixii ammaan dhab ah, isticmaal
> backend authentication iyo server-side roles.

## Waxa ku jira

- **Rakaabka** — dooro jihada iyo goobta, arag baska ugu dhow (ETA, fogaansho,
  kuraas banaan), signaali dareewalka, oo wac.
- **Dareewalka** — online/offline, jihada, tirada kuraasta, tijaabi socodka,
  iyo liiska rakaabta sugaya oo leh “Qaad”.
- **Tijaabi Labadaba** — labada shaashad iyo khariidad isku mar; desktop 3
  columns, tablet 2 columns, mobile tabs.
- **Auth demo** — magac, shirkad (Telesom/Somtel/Soltelco), 7 lambar, iyo OTP
  demo oo si toos ah loo buuxiyay.
- **Xogta** — dhammaan basaska iyo rakaabta waa demo; wax server ah ma jiro.

## Qaab-dhismeedka

```
app/                Next.js App Router, layout, page, styles
components/         Header, panels, map, modals, toast, icons
lib/                store, demo data, geo/ETA math, config, types
scripts/            Puppeteer smoke-test scripts (dev only)
```

## Tijaabinta otomaatiga ah

Marka server-ku socdo:

```bash
npm run audit     # functional + responsive checks
npm run stress    # rapid remount/resize, reports page errors
```

Haddii server-ku ku socdo port kale, isticmaal `BASE_URL`:

```powershell
$env:BASE_URL="http://localhost:3001"; npm run audit
```

## Deployment

Project-ku wuxuu diyaar u yahay Vercel. Import repo-ga, framework-ka waa
auto-detect (Next.js), mana u baahna environment variables. Wax kale oo
Node.js ah:

```bash
npm run build
npm start
```
