import { VisualExplanation, VisualType } from "../types.js";
import { getGeminiClient } from "./gemini.js";
import { generateAIImage } from "./imageGeneration.js";

export interface VisualExplanationRequest {
  prompt: string;
  visualType?: VisualType;
  visualSubject?: string;
  language?: 'km' | 'en' | 'mixed';
}

/**
 * Built-in High-Fidelity Interactive SVG Visual Diagrams for Core STEM & Tech Topics
 * Rendered with Noto Sans Khmer typography, dark-mode glowing aesthetics, and crisp vector mathematics.
 */

// 1. Pythagorean Theorem Diagram (Right-angled Triangle + Formula + a² + b² = c²)
export function getPythagoreanTheoremSVG(): string {
  return `<svg viewBox="0 0 700 420" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#0D1117;border-radius:16px;font-family:'Noto Sans Khmer',sans-serif;">
  <defs>
    <linearGradient id="gradHyp" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EC4899" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>
    <linearGradient id="gradA" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="gradB" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Title & Formula Box -->
  <rect x="30" y="25" width="640" height="50" rx="12" fill="#161B22" stroke="#30363D" />
  <text x="50" y="56" fill="#F8FAFC" font-size="16" font-weight="700">ទ្រឹស្តីបទពីតាករ (Pythagorean Theorem)</text>
  <rect x="520" y="35" width="130" height="30" rx="8" fill="#8B5CF6" fill-opacity="0.2" stroke="#8B5CF6" />
  <text x="585" y="55" fill="#C4B5FD" font-size="15" font-weight="bold" font-family="'JetBrains Mono',monospace" text-anchor="middle">a² + b² = c²</text>

  <!-- Triangle Body -->
  <!-- Coordinates: A=(160, 310), B=(440, 310), C=(440, 110) -->
  <polygon points="160,310 440,310 440,110" fill="#1F2937" fill-opacity="0.5" stroke="#4B5563" stroke-width="2" />

  <!-- Right Angle Square marker -->
  <rect x="415" y="285" width="25" height="25" fill="none" stroke="#94A3B8" stroke-width="2" />
  <circle cx="427.5" cy="297.5" r="2.5" fill="#94A3B8" />

  <!-- Side a (Bottom Base: length 280) -->
  <line x1="160" y1="310" x2="440" y2="310" stroke="url(#gradA)" stroke-width="5" stroke-linecap="round" filter="url(#glow)" />
  <!-- Side b (Vertical Height: length 200) -->
  <line x1="440" y1="310" x2="440" y2="110" stroke="url(#gradB)" stroke-width="5" stroke-linecap="round" filter="url(#glow)" />
  <!-- Side c (Hypotenuse: length ~344) -->
  <line x1="160" y1="310" x2="440" y2="110" stroke="url(#gradHyp)" stroke-width="6" stroke-linecap="round" filter="url(#glow)" />

  <!-- Side Labels -->
  <!-- Label a -->
  <rect x="280" y="325" width="60" height="28" rx="6" fill="#1E293B" stroke="#3B82F6" stroke-width="1.5" />
  <text x="310" y="344" fill="#60A5FA" font-size="14" font-weight="bold" text-anchor="middle">a (បាត)</text>

  <!-- Label b -->
  <rect x="455" y="195" width="70" height="28" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="1.5" />
  <text x="490" y="214" fill="#34D399" font-size="14" font-weight="bold" text-anchor="middle">b (កម្ពស់)</text>

  <!-- Label c (Hypotenuse) -->
  <rect x="250" y="175" width="115" height="30" rx="6" fill="#1E293B" stroke="#EC4899" stroke-width="1.5" />
  <text x="307" y="195" fill="#F472B6" font-size="14" font-weight="bold" text-anchor="middle">c (អ៊ីប៉ូតេនុស)</text>

  <!-- Right angle 90 degree note -->
  <text x="455" y="302" fill="#94A3B8" font-size="12">មុំកែង = 90°</text>

  <!-- Bottom Legend / Info -->
  <rect x="30" y="365" width="640" height="35" rx="8" fill="#111827" stroke="#1F2937" />
  <text x="45" y="387" fill="#9CA3AF" font-size="12">💡 អ៊ីប៉ូតេនុស (c) គឺជាជ្រុងវែងជាងគេ ឈមនឹងមុំកែង:  <tspan fill="#F472B6" font-weight="bold">c = √(a² + b²)</tspan></text>
</svg>`;
}

// 2. Water Cycle Science Visual Diagram
export function getWaterCycleSVG(): string {
  return `<svg viewBox="0 0 720 440" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#090D16;border-radius:16px;font-family:'Noto Sans Khmer',sans-serif;">
  <defs>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F97316" />
    </linearGradient>
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <filter id="sunGlow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Title Banner -->
  <rect x="25" y="20" width="670" height="42" rx="10" fill="#131B2E" stroke="#1E293B" />
  <text x="45" y="47" fill="#F8FAFC" font-size="15" font-weight="700">វដ្តនៃទឹកក្នុងធម្មជាតិ (The Natural Water Cycle)</text>

  <!-- Mountains -->
  <polygon points="460,340 560,160 670,340" fill="url(#mountainGrad)" stroke="#475569" />
  <polygon points="560,160 520,220 560,200 600,220" fill="#E2E8F0" opacity="0.8" /> <!-- Snow cap -->
  <polygon points="360,340 450,210 540,340" fill="#1E293B" stroke="#334155" />

  <!-- Ocean / Water Body -->
  <rect x="30" y="320" width="660" height="90" rx="12" fill="url(#waterGrad)" />
  <text x="180" y="365" fill="#FFFFFF" font-size="15" font-weight="bold" letter-spacing="1">🌊 ការប្រមូលផ្តុំទឹក (Collection / Ocean)</text>

  <!-- 1. SUN (Top Left) -->
  <circle cx="110" cy="110" r="38" fill="url(#sunGrad)" filter="url(#sunGlow)" />
  <text x="110" y="115" fill="#7C2D12" font-size="12" font-weight="bold" text-anchor="middle">☀️ ព្រះអាទិត្យ</text>
  <text x="110" y="165" fill="#FBBF24" font-size="12" font-weight="bold" text-anchor="middle">ថាមពលកម្ដៅ</text>

  <!-- 2. EVAPORATION (Arrows rising from sea to sky) -->
  <path d="M 170 310 Q 185 240 180 180" fill="none" stroke="#F59E0B" stroke-width="3.5" stroke-dasharray="6,4" />
  <polygon points="180,170 174,185 186,185" fill="#F59E0B" />
  <rect x="130" y="225" width="130" height="26" rx="6" fill="#1E1B4B" stroke="#F59E0B" />
  <text x="195" y="243" fill="#FDE047" font-size="11" font-weight="bold" text-anchor="middle">1. រំហួត (Evaporation)</text>

  <!-- 3. CLOUDS & CONDENSATION (Top Center) -->
  <g transform="translate(320, 85)">
    <path d="M 20 40 A 25 25 0 0 1 65 30 A 35 35 0 0 1 125 35 A 25 25 0 0 1 155 55 A 20 20 0 0 1 145 80 L 25 80 A 20 20 0 0 1 20 40 Z" fill="#475569" stroke="#94A3B8" stroke-width="2" />
    <rect x="25" y="90" width="130" height="26" rx="6" fill="#0F172A" stroke="#38BDF8" />
    <text x="90" y="108" fill="#7DD3FC" font-size="11" font-weight="bold" text-anchor="middle">2. កំណក (Condensation)</text>
  </g>

  <!-- 4. RAIN / PRECIPITATION (Cloud over Mountain) -->
  <g transform="translate(480, 95)">
    <path d="M 20 40 A 22 22 0 0 1 60 30 A 30 30 0 0 1 115 35 A 22 22 0 0 1 140 55 A 18 18 0 0 1 130 75 L 25 75 A 18 18 0 0 1 20 40 Z" fill="#334155" stroke="#64748B" stroke-width="1.5" />
    <!-- Rain drops -->
    <line x1="45" y1="85" x2="40" y2="105" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" />
    <line x1="70" y1="88" x2="65" y2="108" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" />
    <line x1="95" y1="85" x2="90" y2="105" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" />
    <line x1="120" y1="88" x2="115" y2="108" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" />
    <rect x="15" y="125" width="135" height="26" rx="6" fill="#0F172A" stroke="#60A5FA" />
    <text x="82" y="143" fill="#93C5FD" font-size="11" font-weight="bold" text-anchor="middle">3. ទឹកភ្លៀង (Precipitation)</text>
  </g>

  <!-- 5. SURFACE RUNOFF (Water flow down mountain to ocean) -->
  <path d="M 540 290 Q 420 320 330 325" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" />
  <polygon points="320,325 335,318 335,332" fill="#38BDF8" />
  <rect x="375" y="270" width="130" height="26" rx="6" fill="#0F172A" stroke="#0284C7" />
  <text x="440" y="288" fill="#38BDF8" font-size="11" font-weight="bold" text-anchor="middle">4. ទឹកហូរ (Runoff Flow)</text>
</svg>`;
}

// 3. Frontend-to-Backend Web Architecture Visual Diagram
export function getWebArchitectureSVG(): string {
  return `<svg viewBox="0 0 740 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#0B0E14;border-radius:16px;font-family:'Noto Sans Khmer',sans-serif;">
  <defs>
    <linearGradient id="boxUser" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3B82F6"/><stop offset="100%" stop-color="#1D4ED8"/></linearGradient>
    <linearGradient id="boxFront" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#6D28D9"/></linearGradient>
    <linearGradient id="boxBack" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#EC4899"/><stop offset="100%" stop-color="#BE185D"/></linearGradient>
    <linearGradient id="boxDB" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#047857"/></linearGradient>
    <filter id="nodeGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
  </defs>

  <!-- Banner -->
  <rect x="25" y="20" width="690" height="42" rx="10" fill="#151A23" stroke="#242C3D" />
  <text x="45" y="47" fill="#F8FAFC" font-size="15" font-weight="700">ស្ថាបត្យកម្មប្រព័ន្ធ (Fullstack Web & API Architecture)</text>

  <!-- Node 1: USER / CLIENT -->
  <g transform="translate(35, 120)">
    <rect width="135" height="150" rx="14" fill="#111827" stroke="#3B82F6" stroke-width="2" filter="url(#nodeGlow)" />
    <rect x="10" y="12" width="115" height="32" rx="8" fill="url(#boxUser)" />
    <text x="67" y="33" fill="#FFFFFF" font-size="13" font-weight="bold" text-anchor="middle">👤 USER</text>
    <text x="67" y="70" fill="#93C5FD" font-size="11" text-anchor="middle">Browser / Mobile</text>
    <text x="67" y="92" fill="#64748B" font-size="10" text-anchor="middle">• User Clicks</text>
    <text x="67" y="110" fill="#64748B" font-size="10" text-anchor="middle">• Inputs Form</text>
    <text x="67" y="128" fill="#64748B" font-size="10" text-anchor="middle">• Views UI</text>
  </g>

  <!-- Arrow 1: User -> Frontend -->
  <line x1="175" y1="195" x2="205" y2="195" stroke="#3B82F6" stroke-width="3" />
  <polygon points="212,195 202,190 202,200" fill="#3B82F6" />

  <!-- Node 2: FRONTEND -->
  <g transform="translate(215, 120)">
    <rect width="140" height="150" rx="14" fill="#111827" stroke="#8B5CF6" stroke-width="2" filter="url(#nodeGlow)" />
    <rect x="10" y="12" width="120" height="32" rx="8" fill="url(#boxFront)" />
    <text x="70" y="33" fill="#FFFFFF" font-size="13" font-weight="bold" text-anchor="middle">💻 FRONTEND</text>
    <text x="70" y="70" fill="#C4B5FD" font-size="11" text-anchor="middle">React / Vue / HTML</text>
    <text x="70" y="92" fill="#94A3B8" font-size="10" text-anchor="middle">• State Mgmt</text>
    <text x="70" y="110" fill="#94A3B8" font-size="10" text-anchor="middle">• UI Components</text>
    <text x="70" y="128" fill="#94A3B8" font-size="10" text-anchor="middle">• Fetch / Axios</text>
  </g>

  <!-- Arrow 2: HTTP / JSON Request & Response -->
  <g transform="translate(360, 165)">
    <!-- Request Right -->
    <line x1="0" y1="15" x2="35" y2="15" stroke="#EC4899" stroke-width="3" />
    <polygon points="42,15 32,10 32,20" fill="#EC4899" />
    <text x="21" y="8" fill="#F472B6" font-size="9" font-weight="bold" font-family="'JetBrains Mono',monospace" text-anchor="middle">HTTP POST</text>

    <!-- Response Left -->
    <line x1="42" y1="45" x2="7" y2="45" stroke="#10B981" stroke-width="2.5" stroke-dasharray="4,3" />
    <polygon points="0,45 10,40 10,50" fill="#10B981" />
    <text x="21" y="60" fill="#34D399" font-size="9" font-weight="bold" font-family="'JetBrains Mono',monospace" text-anchor="middle">JSON Data</text>
  </g>

  <!-- Node 3: BACKEND API -->
  <g transform="translate(410, 120)">
    <rect width="140" height="150" rx="14" fill="#111827" stroke="#EC4899" stroke-width="2" filter="url(#nodeGlow)" />
    <rect x="10" y="12" width="120" height="32" rx="8" fill="url(#boxBack)" />
    <text x="70" y="33" fill="#FFFFFF" font-size="13" font-weight="bold" text-anchor="middle">⚙️ BACKEND</text>
    <text x="70" y="70" fill="#F472B6" font-size="11" text-anchor="middle">Node / Express / Python</text>
    <text x="70" y="92" fill="#94A3B8" font-size="10" text-anchor="middle">• Business Logic</text>
    <text x="70" y="110" fill="#94A3B8" font-size="10" text-anchor="middle">• Authentication</text>
    <text x="70" y="128" fill="#94A3B8" font-size="10" text-anchor="middle">• Security / Validation</text>
  </g>

  <!-- Arrow 3: SQL Query / Result -->
  <line x1="555" y1="195" x2="585" y2="195" stroke="#10B981" stroke-width="3" />
  <polygon points="592,195 582,190 582,200" fill="#10B981" />

  <!-- Node 4: DATABASE -->
  <g transform="translate(595, 120)">
    <rect width="120" height="150" rx="14" fill="#111827" stroke="#10B981" stroke-width="2" filter="url(#nodeGlow)" />
    <rect x="10" y="12" width="100" height="32" rx="8" fill="url(#boxDB)" />
    <text x="60" y="33" fill="#FFFFFF" font-size="13" font-weight="bold" text-anchor="middle">🗄️ DATABASE</text>
    <text x="60" y="70" fill="#6EE7B7" font-size="11" text-anchor="middle">PostgreSQL / Mongo</text>
    <text x="60" y="92" fill="#94A3B8" font-size="10" text-anchor="middle">• Tables & Rows</text>
    <text x="60" y="110" fill="#94A3B8" font-size="10" text-anchor="middle">• Data Storage</text>
    <text x="60" y="128" fill="#94A3B8" font-size="10" text-anchor="middle">• Indexes / Cache</text>
  </g>

  <!-- Bottom Explanatory Banner -->
  <rect x="25" y="310" width="690" height="65" rx="10" fill="#111827" stroke="#1F2937" />
  <text x="45" y="335" fill="#E2E8F0" font-size="12" font-weight="bold">🔄 ដំណើរការតភ្ជាប់ (Data Flow):</text>
  <text x="45" y="358" fill="#94A3B8" font-size="11">User បញ្ចូលទិន្នន័យលើ Frontend ➔ ផ្ញើ API Request ➔ Backend ផ្ទៀងផ្ទាត់ &amp; ប្រតិបត្តិ ➔ រក្សាទុកក្នុង Database ➔ ត្រឡប់ JSON Response មកបង្ហាញលើ UI</text>
</svg>`;
}

// 4. AI & LLM Workflow Diagram
export function getAIWorkflowSVG(): string {
  return `<svg viewBox="0 0 720 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:#0B0E14;border-radius:16px;font-family:'Noto Sans Khmer',sans-serif;">
  <defs>
    <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#EC4899"/></linearGradient>
    <filter id="aiGlow"><feGaussianBlur stdDeviation="5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
  </defs>

  <rect x="25" y="20" width="670" height="42" rx="10" fill="#151A23" stroke="#242C3D" />
  <text x="45" y="47" fill="#F8FAFC" font-size="15" font-weight="700">របៀបដែល AI / LLM ដំណើរការ (How AI Models Process Information)</text>

  <!-- Step 1 -->
  <g transform="translate(30, 110)">
    <rect width="115" height="130" rx="12" fill="#131B2E" stroke="#3B82F6" stroke-width="1.5" />
    <circle cx="57" cy="40" r="20" fill="#3B82F6" fill-opacity="0.2" />
    <text x="57" y="46" font-size="18" text-anchor="middle">👤</text>
    <text x="57" y="80" fill="#93C5FD" font-size="12" font-weight="bold" text-anchor="middle">1. User Prompt</text>
    <text x="57" y="102" fill="#64748B" font-size="10" text-anchor="middle">សំណួរ ឬបញ្ជា</text>
  </g>

  <line x1="150" y1="175" x2="175" y2="175" stroke="#3B82F6" stroke-width="2.5" />
  <polygon points="182,175 172,170 172,180" fill="#3B82F6" />

  <!-- Step 2 -->
  <g transform="translate(185, 110)">
    <rect width="115" height="130" rx="12" fill="#1E1B4B" stroke="#8B5CF6" stroke-width="1.5" />
    <circle cx="57" cy="40" r="20" fill="#8B5CF6" fill-opacity="0.2" />
    <text x="57" y="46" font-size="18" text-anchor="middle">🔡</text>
    <text x="57" y="80" fill="#C4B5FD" font-size="12" font-weight="bold" text-anchor="middle">2. Tokenizer</text>
    <text x="57" y="102" fill="#94A3B8" font-size="10" text-anchor="middle">បំប្លែងទៅជា Tokens</text>
  </g>

  <line x1="305" y1="175" x2="330" y2="175" stroke="#8B5CF6" stroke-width="2.5" />
  <polygon points="337,175 327,170 327,180" fill="#8B5CF6" />

  <!-- Step 3 (Center Neural Network) -->
  <g transform="translate(340, 95)">
    <rect width="140" height="160" rx="14" fill="#18181B" stroke="#EC4899" stroke-width="2" filter="url(#aiGlow)" />
    <rect x="10" y="10" width="120" height="30" rx="6" fill="url(#aiGrad)" />
    <text x="70" y="30" fill="#FFFFFF" font-size="12" font-weight="bold" text-anchor="middle">🧠 NEURAL NET</text>
    <text x="70" y="65" fill="#F472B6" font-size="11" font-weight="bold" text-anchor="middle">3. Transformer</text>
    <text x="70" y="88" fill="#CBD5E1" font-size="10" text-anchor="middle">• Multi-Head Attn</text>
    <text x="70" y="106" fill="#CBD5E1" font-size="10" text-anchor="middle">• Billions Weights</text>
    <text x="70" y="124" fill="#CBD5E1" font-size="10" text-anchor="middle">• Context Analysis</text>
    <text x="70" y="142" fill="#CBD5E1" font-size="10" text-anchor="middle">• Probability Calc</text>
  </g>

  <line x1="485" y1="175" x2="510" y2="175" stroke="#EC4899" stroke-width="2.5" />
  <polygon points="517,175 507,170 507,180" fill="#EC4899" />

  <!-- Step 4 -->
  <g transform="translate(520, 110)">
    <rect width="170" height="130" rx="12" fill="#064E3B" fill-opacity="0.3" stroke="#10B981" stroke-width="1.5" />
    <circle cx="85" cy="40" r="20" fill="#10B981" fill-opacity="0.2" />
    <text x="85" y="46" font-size="18" text-anchor="middle">✨</text>
    <text x="85" y="80" fill="#6EE7B7" font-size="12" font-weight="bold" text-anchor="middle">4. AI Response</text>
    <text x="85" y="102" fill="#A7F3D0" font-size="10" text-anchor="middle">ចម្លើយច្បាស់លាស់ &amp; រូបភាព</text>
  </g>

  <rect x="25" y="290" width="670" height="60" rx="10" fill="#111827" stroke="#1F2937" />
  <text x="45" y="315" fill="#E2E8F0" font-size="12" font-weight="bold">💡 សេចក្តីសង្ខេប (Key Takeaway):</text>
  <text x="45" y="336" fill="#94A3B8" font-size="11">AI មិនមែនចម្លងតាមអ៊ីនធឺណិតផ្ទាល់ទេ ប៉ុន្តែវាស្វែងយល់ពីបរិបទ និងគណនាទស្សន៍ទាយពាក្យដែលសមស្របបំផុតតាមរយៈបណ្តាញសរសៃប្រសាទសិប្បនិម្មិត។</text>
</svg>`;
}

/**
 * Generate high quality Mermaid diagram definition dynamically based on subject and prompt
 */
export async function generateMermaidDiagram(prompt: string, subject?: string): Promise<string> {
  const lower = prompt.toLowerCase();

  // If specific subject matches
  if (lower.includes("frontend") || lower.includes("backend") || lower.includes("api")) {
    return `flowchart TD
    User["👤 អ្នកប្រើប្រាស់ (User)"] -->|"1. ផ្ញើសំណើ (HTTP Request)"| Frontend["💻 Frontend (React / Vue)"]
    Frontend -->|"2. ហៅ REST / GraphQL API"| APIGateway["🚪 API Gateway / Router"]
    APIGateway -->|"3. ដំណើរការ Business Logic"| Backend["⚙️ Backend Server (Node.js / Express)"]
    Backend -->|"4. សាកសួរទិន្នន័យ (SQL Query)"| DB[("🗄️ Database (PostgreSQL / MongoDB)")]
    DB -->|"5. ត្រឡប់ទិន្នន័យ (Result Rows)"| Backend
    Backend -->|"6. ឆ្លើយតប JSON (HTTP 200 OK)"| Frontend
    Frontend -->|"7. បង្ហាញ UI ដល់អ្នកប្រើ"| User

    classDef user fill:#1E293B,stroke:#3B82F6,stroke-width:2px,color:#fff;
    classDef front fill:#1E1B4B,stroke:#8B5CF6,stroke-width:2px,color:#fff;
    classDef api fill:#311042,stroke:#EC4899,stroke-width:2px,color:#fff;
    classDef back fill:#1E293B,stroke:#EC4899,stroke-width:2px,color:#fff;
    classDef db fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#fff;

    class User user;
    class Frontend front;
    class APIGateway,Backend back;
    class DB db;`;
  }

  if (lower.includes("water cycle") || lower.includes("វដ្តទឹក") || lower.includes("ភ្លៀង") || lower.includes("rain")) {
    return `flowchart TD
    Sun["☀️ ព្រះអាទិត្យ (Solar Heat)"] -->|"កម្ដៅធ្វើឱ្យទឹកឡើងក្ដៅ"| Evap["💨 រំហួត (Evaporation)"]
    Evap -->|"ចំហាយទឹកឡើងលើអាកាស"| Clouds["☁️ កំណកពពក (Condensation)"]
    Clouds -->|"ចំហាយទឹកត្រជាក់ក្លាយជាដំណក់"| Rain["🌧️ ទឹកភ្លៀង / ព្រឹល (Precipitation)"]
    Rain -->|"ហូរចុះតាមភ្នំ & ដី"| Runoff["🏞️ ទឹកហូរ (Surface Runoff)"]
    Runoff -->|"ប្រមូលផ្តុំក្នុងសមុទ្រ & បឹង"| Ocean["🌊 សមុទ្រ & បឹង (Collection)"]
    Ocean -->|"ចាប់ផ្តើមវដ្តជាថ្មី"| Evap

    classDef sun fill:#451A03,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7;
    classDef evap fill:#172554,stroke:#38BDF8,stroke-width:2px,color:#E0F2FE;
    classDef cloud fill:#1E293B,stroke:#94A3B8,stroke-width:2px,color:#F8FAFC;
    classDef rain fill:#0C4A6E,stroke:#0284C7,stroke-width:2px,color:#BAE6FD;
    classDef ocean fill:#083344,stroke:#06B6D4,stroke-width:2px,color:#CFFAFE;

    class Sun sun;
    class Evap evap;
    class Clouds cloud;
    class Rain rain;
    class Runoff,Ocean ocean;`;
  }

  if (lower.includes("ai") || lower.includes("llm") || lower.includes("machine learning")) {
    return `flowchart LR
    User["👤 អ្នកប្រើប្រាស់ (User)"] -->|"បញ្ចូល Prompt"| Prompt["📝 Prompt Input"]
    Prompt -->|"បំប្លែងពាក្យ"| Tokens["🔡 Tokenization"]
    Tokens -->|"ដំណើរការទិន្នន័យ"| Transformer["🧠 Transformer Neural Network"]
    Transformer -->|"គណនាប្រូបាប៊ីលីតេ"| Prediction["📊 Next-Token Prediction"]
    Prediction -->|"បង្កើតចម្លើយពេញលេញ"| Output["✨ AI Response & Visual"]
    Output -->|"បង្ហាញលើអេក្រង់"| User

    classDef step fill:#1E293B,stroke:#6366F1,stroke-width:2px,color:#fff;
    classDef model fill:#311042,stroke:#EC4899,stroke-width:2px,color:#fff;
    class User,Prompt,Tokens,Prediction,Output step;
    class Transformer model;`;
  }

  // Generate dynamic Mermaid diagram using Gemini
  try {
    const ai = getGeminiClient();
    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `You are a world-class educational diagram creator.
Generate a valid, clean Mermaid.js diagram (flowchart TD or flowchart LR) explaining: "${prompt}".
Rules:
1. Output ONLY the raw Mermaid diagram definition code inside no markdown ticks or plain text.
2. Use descriptive node labels in Khmer or English.
3. Keep it clear, elegant, and 4-8 nodes max.
4. Avoid any special characters like quotes or parentheses inside node labels without escaping.`,
    });

    let code = result.text?.trim() || "";
    code = code.replace(/^```(?:mermaid)?\n?/, "").replace(/\n?```$/, "").trim();

    if (code.startsWith("flowchart") || code.startsWith("graph") || code.startsWith("sequenceDiagram")) {
      return code;
    }
  } catch (e) {
    console.warn("[VisualExplanation] Dynamic Mermaid generation failed, using fallback:", e);
  }

  // Generic fallback process flowchart
  return `flowchart TD
    Start["🚀 ចាប់ផ្តើម (Input Concept)"] --> Step1["1. វិភាគ &amp; រៀបចំទិន្នន័យ"]
    Step1 --> Step2["2. ដំណើរការស្នូល (Core Process)"]
    Step2 --> Step3["3. ផ្ទៀងផ្ទាត់ &amp; វាយតម្លៃ"]
    Step3 --> EndNode["✅ លទ្ធផលសម្រេច (Final Output)"]

    classDef default fill:#1E293B,stroke:#6366F1,stroke-width:2px,color:#fff;`;
}

/**
 * Master Visual Explanation Generator
 * Intelligently determines whether SVG, Mermaid, or Generative Image is most appropriate.
 */
export async function generateVisualExplanation(
  request: VisualExplanationRequest
): Promise<VisualExplanation> {
  const { prompt, visualType = "diagram", visualSubject, language = "km" } = request;
  const lower = prompt.toLowerCase();

  const id = `visual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Math / Geometry: Pythagorean Theorem & Triangles
  if (lower.includes("pythagor") || lower.includes("ពីតាករ") || lower.includes("ពីតាហ្គ័រ")) {
    return {
      id,
      type: "svg",
      visualType: "geometry",
      title: "Pythagorean Theorem Geometry",
      titleKm: "គំនូសតាងធរណីមាត្រនៃទ្រឹស្តីបទពីតាករ (a² + b² = c²)",
      data: getPythagoreanTheoremSVG(),
      explanationSteps: [
        language === "km" ? "ត្រីកោណកែងមានមុំមួយស្មើ 90 ដឺក្រេ (មុំកែង)" : "The triangle has one 90-degree right angle",
        language === "km" ? "ជ្រុងបាត (a) និងកម្ពស់ (b) គឺជាជ្រុងជាប់មុំកែង" : "Sides a (base) and b (height) form the perpendicular legs",
        language === "km" ? "ជ្រុងអ៊ីប៉ូតេនុស (c) គឺជាជ្រុងវែងបំផុតដែលឈមនឹងមុំកែង: c² = a² + b²" : "Hypotenuse c is the longest side opposite the right angle: c² = a² + b²",
      ],
      status: "ready",
      createdAt: Date.now(),
    };
  }

  // 2. Science: Water Cycle / Rain Formation
  if (
    lower.includes("water cycle") ||
    lower.includes("វដ្តទឹក") ||
    lower.includes("វដ្តនៃទឹក") ||
    lower.includes("ទឹកហូរ") ||
    lower.includes("របៀបកើតមានភ្លៀង") ||
    lower.includes("rain")
  ) {
    return {
      id,
      type: "svg",
      visualType: "science",
      title: "The Natural Water Cycle",
      titleKm: "គំនូរបង្ហាញវដ្តនៃទឹកក្នុងធម្មជាតិ (Water Cycle)",
      data: getWaterCycleSVG(),
      explanationSteps: [
        language === "km" ? "1. រំហួត (Evaporation): កម្ដៅព្រះអាទិត្យធ្វើឱ្យទឹកសមុទ្រហួតឡើងលើអាកាស" : "1. Evaporation: Solar heat converts surface water into atmospheric vapor",
        language === "km" ? "2. កំណក (Condensation): ចំហាយទឹកត្រជាក់កកក្លាយជាពពក" : "2. Condensation: Vapor cools and aggregates into cloud droplets",
        language === "km" ? "3. ទឹកភ្លៀង (Precipitation): ដំណក់ទឹកធ្ងន់ធ្លាក់ចុះមកដីជាភ្លៀង" : "3. Precipitation: Dense water droplets fall to Earth as rain",
        language === "km" ? "4. ការប្រមូលផ្តុំ (Collection): ទឹកហូរតាមដងអូរ ស្ទឹង ត្រឡប់ទៅកាន់សមុទ្រវិញ" : "4. Collection: Runoff returns through rivers back into oceans",
      ],
      status: "ready",
      createdAt: Date.now(),
    };
  }

  // 3. Programming / Web Architecture
  if (
    lower.includes("frontend") ||
    lower.includes("backend") ||
    lower.includes("fullstack") ||
    lower.includes("client") && lower.includes("server")
  ) {
    return {
      id,
      type: "svg",
      visualType: "architecture",
      title: "Frontend to Backend Architecture",
      titleKm: "គំនូសតាងស្ថាបត្យកម្មតភ្ជាប់រវាង Frontend និង Backend",
      data: getWebArchitectureSVG(),
      explanationSteps: [
        language === "km" ? "1. User & Client: អ្នកប្រើប្រាស់ធ្វើសកម្មភាពលើកម្មវិធីរុករក (UI)" : "1. User/Client: End-user interacts with the browser UI",
        language === "km" ? "2. Frontend: React ទទួលទិន្នន័យ ហើយធ្វើ HTTP Request ទៅកាន់ API" : "2. Frontend: Sends authenticated HTTP requests to the backend API",
        language === "km" ? "3. Backend: Express/Node ផ្ទៀងផ្ទាត់ និងអនុវត្ត Business Logic" : "3. Backend: Validates logic, processes security, and queries the database",
        language === "km" ? "4. Database: រក្សាទុកទិន្នន័យ និងបញ្ជូនលទ្ធផលត្រឡប់មកវិញជា JSON" : "4. Database: Securely stores records and returns JSON payloads to the frontend",
      ],
      status: "ready",
      createdAt: Date.now(),
    };
  }

  // 4. AI Workflow
  if (lower.includes("ai") && (lower.includes("ពន្យល់") || lower.includes("explain") || lower.includes("work") || lower.includes("យល់ងាយ"))) {
    return {
      id,
      type: "svg",
      visualType: "concept_map",
      title: "How AI & LLM Models Work",
      titleKm: "គំនូរបង្ហាញរបៀបដំណើរការរបស់ AI និង Large Language Models",
      data: getAIWorkflowSVG(),
      explanationSteps: [
        language === "km" ? "1. Prompt Input: អ្នកប្រើប្រាស់បញ្ចូលសំណួរ ឬការណែនាំ" : "1. Prompt Input: User supplies the instructional prompt",
        language === "km" ? "2. Tokenization: ពាក្យត្រូវបានបំបែកជាបំណែកលេខ (Tokens)" : "2. Tokenization: Text is converted into discrete numerical tokens",
        language === "km" ? "3. Transformer Network: គណនាទម្ងន់ទិន្នន័យរាប់ពាន់លាន និងស្វែងយល់បរិបទ" : "3. Transformer Neural Network: Multi-head attention computes context vectors",
        language === "km" ? "4. Output Response: បញ្ចេញចម្លើយយ៉ាងលឿន និងច្បាស់លាស់" : "4. Output Generation: Generates coherent structured responses",
      ],
      status: "ready",
      createdAt: Date.now(),
    };
  }

  // 5. Default: Generate clean, structured Mermaid diagram
  const mermaidData = await generateMermaidDiagram(prompt, visualSubject);
  return {
    id,
    type: "mermaid",
    visualType: visualType || "diagram",
    title: visualSubject || "Visual Explanation Diagram",
    titleKm: visualSubject ? `គំនូសតាងពន្យល់អំពី ${visualSubject}` : "គំនូសតាងពន្យល់លម្អិត",
    data: mermaidData,
    explanationSteps: [
      language === "km" ? "ដំណាក់កាលនីមួយៗបង្ហាញពីលំហូរនៃដំណើរការជាលំដាប់លំដោយ" : "Each step displays the sequential flow of the concept",
      language === "km" ? "ព្រួញចង្អុលបង្ហាញពីទំនាក់ទំនង និងការផ្លាស់ប្តូរទិន្នន័យ" : "Connecting arrows highlight interactions and state transitions",
    ],
    status: "ready",
    createdAt: Date.now(),
  };
}
