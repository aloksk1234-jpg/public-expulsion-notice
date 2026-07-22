# The Public Expulsion Notice

A viral, high-precision static single-page web application (SPA) that empowers Indian citizens to generate, stamp, download, and share an official-style **"Public Expulsion Notice / Report Card"** for Union Education Minister Shri Dharmendra Pradhan following systemic examination issues.

Built using a **Zero-Server Edge Stack** for ultra-fast static deployment with zero infrastructure costs.

---

## ⚡ Tech Stack & Architecture

- **Build System:** [Vite](https://vitejs.dev/) (fast scaffolding & bundling)
- **Framework:** Vanilla JavaScript (ES Module)
- **Animation Engine:** [Anime.js](https://animejs.com/) (physics-based rubber stamp slam effect)
- **Snapshot Generator:** [html-to-image](https://github.com/bubkoo/html-to-image) & [html2canvas](https://html2canvas.hertzen.com/) (client-side DOM snapshot generation)
- **Typography:** Google Fonts (`Inter` & `JetBrains Mono`)
- **Hosting Target:** [Cloudflare Pages](https://pages.cloudflare.com/) (Static deployment edge network)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/public-expulsion-notice.git
cd public-expulsion-notice
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## ☁️ Deployment to Cloudflare Pages

### Option A: Via Cloudflare Dashboard (Recommended)
1. Push this repository to **GitHub** or **GitLab**.
2. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
3. Click **Create Application** > **Pages** > **Connect to Git**.
4. Select your repository and set the following build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**.

### Option B: Via Direct Upload (Wrangler CLI)
```bash
npm run build
npx wrangler pages deploy dist --project-name=public-expulsion-notice
```

---

## 📄 License
MIT License. Built for public accountability and citizen expression.
