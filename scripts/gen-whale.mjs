// 生成「鲸鱼游过贡献格」SVG（自包含、无外部依赖）
// 用法：
//   本地预览：node gen-whale.mjs            -> 读 ../contribs.json
//   Action： GH_TOKEN=... GITHUB_LOGIN=... node gen-whale.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "assets", "whale-contrib.svg");

async function loadDays() {
  const token = process.env.GH_TOKEN;
  const login = process.env.GITHUB_LOGIN;
  if (token && login) {
    const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
    const r = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "user-agent": "whale-contrib" },
      body: JSON.stringify({ query, variables: { login } }),
    });
    const j = await r.json();
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
    return j.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  }
  const local = JSON.parse(fs.readFileSync(path.join(HERE, "..", "contribs.json"), "utf8"));
  return local.days;
}

const CELL = 16;
const GAP = 4;
const STEP = CELL + GAP;
const PAD_X = 24;
const PAD_Y = 16;

const days = (await loadDays()).slice(-7 * 53);
// 按周分列：GitHub 日历从周日开始
const cells = days.map((d) => d.contributionCount);
const weeks = Math.ceil(days.length / 7);
const W = PAD_X * 2 + weeks * STEP;
const H = PAD_Y * 2 + 7 * STEP;

const LEVEL_COLOR = ["#132030", "#1b4a66", "#256f92", "#38a3c9", "#7be0f4"];
function level(n) {
  if (n === 0) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

let rects = "";
for (let i = 0; i < days.length; i++) {
  const week = Math.floor(i / 7);
  const dow = i % 7;
  const n = cells[i];
  const lv = level(n);
  const x = PAD_X + week * STEP;
  const y = PAD_Y + dow * STEP;
  const fill = LEVEL_COLOR[lv];
  const twinkle =
    n > 0
      ? `<animate attributeName="opacity" values="1;0.55;1" dur="${3 + (i % 4)}s" begin="${(i % 9) * 0.22}s" repeatCount="indefinite"/>`
      : "";
  rects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${fill}" stroke="#22303c" stroke-width="1">${twinkle}</rect>`;
}

// 鲸鱼沿一条平缓曲线从左游到右，时长 11s（纵向摆幅收小，放大后不出画）
const midY = PAD_Y + 3 * STEP + CELL / 2;
const pathD = `M -70 ${midY} C ${W * 0.2} ${midY - 26}, ${W * 0.35} ${midY + 24}, ${W * 0.52} ${midY - 4} S ${W * 0.8} ${midY + 18}, ${W + 70} ${midY - 10}`;

const whale = `
<g id="whale" filter="url(#glow)">
 <g transform="scale(1.75)">
  <path d="M0 0 C 10 -14, 34 -16, 46 -4 C 52 2, 52 12, 44 16 C 34 21, 12 20, 0 12 Z" fill="#8fd8ee"/>
  <path d="M0 0 C 10 -14, 34 -16, 46 -4 C 52 2, 52 12, 44 16 C 34 21, 12 20, 0 12 Z" fill="none" stroke="#c8f2ff" stroke-width="1.2" opacity="0.9"/>
  <path d="M4 10 C 16 20, 34 20, 44 12 C 36 22, 16 23, 4 10 Z" fill="#e9fbff" opacity="0.85"/>
  <circle cx="36" cy="2" r="1.8" fill="#0b1a24"/>
  <path d="M-2 2 C -12 -2, -16 6, -8 9 C -4 7, -2 4, -2 2 Z" fill="#8fd8ee"/>
  <path d="M10 5 C 6 12, 12 15, 17 11 Z" fill="#6fc7e2" opacity="0.85"/>
  <path d="M40 -12 C 38 -19, 44 -22, 46 -15" stroke="#bdeeff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
 </g>
 <animateMotion dur="11s" repeatCount="indefinite" rotate="auto" path="${pathD}"/>
</g>`;

// 气泡
let bubbles = "";
for (let i = 0; i < 7; i++) {
  const bx = PAD_X + 40 + i * (W - 120) / 6;
  const by = midY - 34 - (i % 3) * 10;
  bubbles += `<circle cx="${bx}" cy="${by}" r="${2 + (i % 3)}" fill="#9fe6f7" opacity="0.5">
    <animate attributeName="cy" values="${by};${by - 16};${by}" dur="${4 + (i % 3)}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.15;0.6;0.15" dur="${4 + (i % 3)}s" repeatCount="indefinite"/>
  </circle>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="whale swimming across contribution days">
  <defs>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="none"/>
  ${rects}
  ${bubbles}
  ${whale}
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log("wrote", OUT, svg.length, "bytes; grid", weeks, "x 7");