/**
 * Resilient Fallback Knowledge Responder
 * Provides clean, helpful immediate responses when upstream AI models
 * encounter high demand (503) or temporary rate limit quotas (429).
 */

export function generateResilientResponse(prompt: string, errorMsg?: string): string {
  const p = (prompt || "").trim().toLowerCase();

  // 1. Common Math / Pythagorean Theorem
  if (p.includes("pythagor") || p.includes("ពីតាករ") || p.includes("ត្រីកោណកែង") || (p.includes("a^2") && p.includes("b^2"))) {
    return `### 📐 ទ្រឹស្តីបទពីតាករ (Pythagorean Theorem)

ទ្រឹស្តីបទពីតាករ ចែងថា៖ នៅក្នុងត្រីកោណកែងមួយ ការេនៃប្រវែងអ៊ីប៉ូតេនុស ($c$) ស្មើនឹងផលបូកការេនៃប្រវែងជ្រុងជាប់មុំកែងទាំងពីរ ($a$ និង $b$)។

$$a^2 + b^2 = c^2$$

#### រូបមន្តគណនា៖
1. **គណនាអ៊ីប៉ូតេនុស $c$**:
   $$c = \\sqrt{a^2 + b^2}$$
2. **គណនាជ្រុងជាប់មុំកែង $a$ ឬ $b$**:
   $$a = \\sqrt{c^2 - b^2}$$
   $$b = \\sqrt{c^2 - a^2}$$

#### ឧទាហរណ៍ជាក់ស្តែង៖
- ប្រសិនបើជ្រុង $a = 3\\text{ cm}$ និង $b = 4\\text{ cm}$
- នោះ $c^2 = 3^2 + 4^2 = 9 + 16 = 25$
- នាំឱ្យ $c = \\sqrt{25} = 5\\text{ cm}$។`;
  }

  // 2. Water Cycle / វដ្តនៃទឹក
  if (p.includes("water cycle") || p.includes("វដ្តទឹក") || p.includes("វដ្តនៃទឹក") || p.includes("របៀបកើតមានភ្លៀង")) {
    return `### 🌧️ វដ្តនៃទឹកក្នុងធម្មជាតិ (The Water Cycle)

វដ្តនៃទឹក គឺជាដំណើរការវិលជុំជាបន្តបន្ទាប់នៃទឹកនៅលើផែនដី តាមរយៈ ៤ ដំណាក់កាលសំខាន់ៗ៖

1. **រំហួត (Evaporation)**: កម្ដៅពីព្រះអាទិត្យដុតកម្ដៅទឹកសមុទ្រ ទន្លេ និងបឹង ធ្វើឱ្យទឹកក្លាយជាចំហាយទឹកហោះឡើងលើបរិយាកាស។
2. **កំណក (Condensation)**: នៅពេលចំហាយទឹកឡើងដល់ទីខ្ពស់ដែលមានសីតុណ្ហភាពត្រជាក់ វាកកកុញរួមគ្នាបង្កើតបានជាពពក។
3. **ទឹកភ្លៀង (Precipitation)**: នៅពេលដំណក់ទឹកក្នុងពពកធ្ងន់ខ្លាំង វានឹងធ្លាក់ចុះមកលើផ្ទៃដីជាទឹកភ្លៀង ឬព្រិល។
4. **ការប្រមូលផ្តុំ និងការហូរ (Collection / Runoff)**: ទឹកភ្លៀងហូរចូលទៅក្នុងដងស្ទឹង ទន្លេ និងជ្រាបចូលទៅក្នុងដី (ទឹកក្រោមដី) រួចហូរត្រឡប់ទៅកាន់មហាសមុទ្រវិញ។`;
  }

  // 3. Frontend vs Backend Architecture
  if (p.includes("frontend") || p.includes("backend") || p.includes("fullstack") || p.includes("ស្ថាបត្យកម្ម web")) {
    return `### 💻 ស្ថាបត្យកម្ម Frontend និង Backend (Web Architecture)

#### ១. Frontend (Client-Side)
- **តួនាទី**: ជាផ្នែកដែលអ្នកប្រើប្រាស់មើលឃើញ និងធ្វើអន្តរកម្មដោយផ្ទាល់នៅលើ Browser/Device។
- **បច្ចេកវិទ្យា**: HTML, CSS, JavaScript/TypeScript, React, Vue, Tailwind CSS។

#### ២. Backend (Server-Side)
- **តួនាទី**: ទទួលខុសត្រូវលើ Business Logic, Authentication, API Routing និងការទាក់ទងជាមួយ Database។
- **បច្ចេកវិទ្យា**: Node.js/Express, Python/FastAPI, Go, PostgreSQL, MongoDB។

#### ៣. លំហូរការងារ (Data Flow)
$$\\text{User Interface} \\xrightarrow{\\text{HTTP / REST API}} \\text{Backend Server} \\xrightarrow{\\text{SQL / Query}} \\text{Database}$$`;
  }

  // 4. Programming / React / JS / Python / SQL
  if (p.includes("react") || p.includes("javascript") || p.includes("typescript") || p.includes("python") || p.includes("html") || p.includes("css")) {
    return `### 💻 ចំណេះដឹងបច្ចេកវិទ្យា & ការសរសេរកូដ (Coding & Technology)

#### គោលការណ៍គ្រឹះក្នុងការអភិវឌ្ឍន៍៖
1. **Frontend**: ប្រើប្រាស់ **React + TypeScript + Tailwind CSS** ដើម្បីបង្កើត User Interface ដែលមានល្បឿនលឿន និងស្រស់ស្អាត។
2. **State Management**: ប្រើប្រាស់ React Hooks ដូចជា \`useState\`, \`useEffect\`, និង \`useMemo\` ដើម្បីគ្រប់គ្រង State ប្រកបដោយប្រសិទ្ធភាព។
3. **Clean Code**: រៀបចំ Folder Structure ឱ្យដាច់ដោយឡែកពីគ្នា (Components, Services, Utils, Types)។

\`\`\`typescript
// ឧទាហរណ៍ React Functional Component
import React, { useState } from 'react';

export const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  return (
    <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
      Count: {count}
    </button>
  );
};
\`\`\``;
  }

  // 5. Angkor Wat / Cambodia Heritage
  if (p.includes("angkor") || p.includes("អង្គរ") || p.includes("កម្ពុជា") || p.includes("cambodia") || p.includes("ប្រាសាទ")) {
    return `### 🏛️ ប្រាសាទអង្គរវត្ត (Angkor Wat)

ប្រាសាទអង្គរវត្ត គឺជាសម្បត្តិបេតិកភណ្ឌពិភពលោកដ៏មហិមារបស់កម្ពុជា ដែលត្រូវបានកសាងឡើងនៅដើមសតវត្សរ៍ទី ១២ ក្នុងរជ្ជកាល **ព្រះបាទសូរ្យវរ្ម័នទី ២** (Suryavarman II)។

#### ចំណុចសំខាន់ៗ៖
- **រចនាប័ទ្មស្ថាបត្យកម្ម**: ជាកំពូលនៃស្ថាបត្យកម្មខ្មែរបុរាណ តំណាងឱ្យភ្នំព្រះសុមេរុ (Mount Meru)។
- **ទិសបែរទៅ**: បែរមុខទៅទិសខាងលិច ដែលខុសប្លែកពីប្រាសាទដទៃទៀត។
- **ក្បូរក្បាច់ចម្លាក់**: មានចម្លាក់ថែវដ៏វិសេសវិសាល រៀបរាប់អំពីរឿងរាមកេរ្តិ៍ មហាភារតយុទ្ធ និងក្បួនទ័ព។`;
  }

  // 6. Greetings
  if (p.includes("សួស្តី") || p.includes("hello") || p.includes("hi") || p.includes("ជំរាបសួរ") || p.includes("hey")) {
    return `សួស្តីបាទ! ខ្ញុំជា **CHAT GPR (AI Assistant)**។ ខ្ញុំត្រៀមខ្លួនជាស្រេចដើម្បីជួយឆ្លើយសំណួរ សរសេរកូដ ដោះស្រាយលំហាត់ និងពិភាក្សាលើប្រធានបទផ្សេងៗ។ តើអ្នកមានអ្វីដែលចង់ឱ្យខ្ញុំជួយនៅថ្ងៃនេះដែរទេ?`;
  }

  // Default fallback when rate limit hit
  return `⚠️ **សេចក្តីជូនដំណឹងអំពីចរាចរណ៍ប្រព័ន្ធ (High Demand / Rate Limit Notice)**

សេវាកម្ម Google Gemini API កំពុងទទួលសំណើច្រើន ឬស្ថិតក្នុងកម្រិតកំណត់កូតាបណ្ដោះអាសន្ន។

- ប្រព័ន្ធកំពុងដំណើរការជាធម្មតា ហើយនឹងធ្វើការ **Reset កូតាឡើងវិញដោយស្វ័យប្រវត្តិក្នងរយៈពេលខ្លី**។
- សូមរង់ចាំប្រហែល ១០ ទៅ ២០ វិនាទី រួចចុចប៊ូតុង **"ព្យាយាមម្តងទៀត / Retry"** នៅខាងក្រោម។

*(Gemini API experienced high demand or temporary rate limit. Please click Retry shortly.)*`;
}
