# 🎬 CineScope

### *Discover your next favourite*

CineScope is an intelligent media discovery platform that combines TMDB content browsing, AI reasoning (Groq / OpenRouter), and real-time social movie matching to eliminate choice paralysis.

**[🚀 Live Demo](https://cinescopeai.vercel.app)**

<br/>

<img src="screenshots/hero.png" alt="CineScope Hero" width="100%" style="border-radius: 10px;" />

---

## ✨ Why CineScope?

Finding something great to watch shouldn't feel like endless scrolling. CineScope solves decision fatigue through active, AI-assisted discovery:

| ❌ Traditional Browsing | ✅ The CineScope Experience |
| :--- | :--- |
| **Endless Card Scrolling**: Spending 30+ minutes looking for a title | **Conversational AI Assistant**: Describe your vibe & get rationalized picks |
| **Choice Paralysis**: Overwhelmed by thousands of uncontextualized titles | **Guided Decision Tools**: Interactive Movie Night Planner & Pick For Me |
| **Tabs Overload**: Bouncing between trailers and review sites | **Integrated Media Hub**: Trailers, cast filmographies, and AI Movie Debates |
| **Asking Friends "What to Watch?"**: Unstructured verbal recommendations | **Social Movie Match**: Instant compatibility scoring & taste overlaps |

---

## ✨ CineAI Engine — Core USP

CineAI is CineScope's central intelligence engine, leveraging large language models (Groq LLaMA / OpenRouter) to transform natural human intent into actionable viewing decisions:

| CineAI Tool | User Input | AI Result & Intelligence |
| :--- | :--- | :--- |
| 💬 **What Should I Watch?** | Natural prompt (*"dark sci-fi with mind-bending twists"*) | Returns hyper-tailored recommendations paired with 1–2 sentence contextual rationales |
| 🍿 **Movie Night Planner** | Vibe, group size, and era selections | Multi-step quiz generating tailored picks for solo, date, or group movie nights |
| 🎲 **Pick For Me** | Selected mood filter | Instant decision spinner highlighting a single title with an encouraging rationale |
| ⚔️ **Movie Debate Engine** | Any two competing movie titles | Head-to-head comparison evaluating acting, plot, pacing, visuals, and score with point totals |
| 🤝 **Friend Movie Match AI** | Selected friend profile | Analyzes taste overlap & watch histories to calculate compatibility score and joint recommendations |

---

## 🎬 Core Features

### 🎬 Content Discovery & Search
* **Spotlight Search Overlay**: Instant command-style search (`Ctrl+K` / `Cmd+K`) for titles.
* **Catalog Explorer**: Browse trending movies, TV series, season/episode guides, and official YouTube trailers.
* **Direct OTT Platform Deep-Linking**: Dual Search Engine Rotation (Serper Google Search API & Tavily Search API) + AI RAG resolution automatically finds and opens the exact official movie/show landing page on Netflix, Prime Video, Apple TV, Disney+, etc., with zero search result pages and zero redirect notices.
* **Person Profiles**: Complete filmographies, biographies, and media breakdowns for directors and actors.

### 🤝 Friends & Social Network
* **Alphanumeric Friend Codes**: Connect with friends using unique 6-character codes (`CS-XXXXXX`).
* **Friend Recommendations**: Send inline movie recommendations directly to friends with custom notes via real-time notifications.
* **Pending Requests Manager**: Accept or reject incoming friend requests with live database updates.

### ❤️ Library & Watchlist
* **Personal Media Collections**: Separate tabs for *Watchlist*, *Liked*, and *Watched* titles.
* **Watch Time Analytics**: Live calculation of total hours and minutes watched across your saved library.

### 🏆 Gamified Achievements
* **Milestone Unlocking**: Automatic tracking and unlocking of 15+ achievement badges (*First Steps*, *Collector*, *AI Explorer*, *Curious Mind*, *Trailer Seeker*).
* **Framer Motion Animations**: Toast alerts with spring animations and drag-to-dismiss support on mobile viewports.

---

## 📸 Screenshots

<table width="100%">
<tr>
  <td width="50%">
    <h4 align="center">🍿 Media Browse & Discovery</h4>
    <img src="screenshots/browse.png" alt="CineScope Browse" width="100%" />
  </td>
  <td width="50%">
    <h4 align="center">✨ CineAI Discovery Engine</h4>
    <img src="screenshots/cineai-engine.png" alt="CineAI Engine" width="100%" />
  </td>
</tr>
<tr>
  <td width="50%">
    <h4 align="center">🎬 Movie & TV Details</h4>
    <img src="screenshots/movie-detail.png" alt="Movie Details" width="100%" />
  </td>
  <td width="50%">
    <h4 align="center">🤝 Friend Movie Match</h4>
    <img src="screenshots/friendmatch.png" alt="Movie Match" width="100%" />
  </td>
</tr>
<tr>
  <td width="50%">
    <h4 align="center">👤 Profile & Taste Analytics</h4>
    <img src="screenshots/profile.png" alt="User Profile" width="100%" />
  </td>
  <td width="50%">
    <h4 align="center">🏆 Gamified Achievements</h4>
    <img src="screenshots/achievements.png" alt="Achievements" width="100%" />
  </td>
</tr>
</table>

---

## 🔥 Firebase Infrastructure

Firebase Realtime Database and Authentication power CineScope's backend state and social features:

* **Authentication**: Supports Email/Password login, Google OAuth 2.0, and instant Guest Access with account linking.
* **Persistent Library**: Syncs Watchlist, Liked titles, and Watched history in real time.
* **Social Graph & Friend Codes**: Manages 6-character friend codes (`CS-XXXXXX`), friend requests, relationships, and in-app notifications.
* **Gamification & Progress**: Tracks unlocked achievement milestones and progress counters per account.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Framer Motion 12, Vanilla CSS3 (Liquid Glassmorphism) |
| **Backend & Data** | Firebase Realtime Database, Firebase Authentication |
| **APIs & AI Search** | TMDB API, Serper Google Search API, Tavily Search API, Groq LLaMA / OpenRouter AI |
| **Deployment** | Vercel (Single Page App rewrites & serverless API proxy) |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pg13atif-prog/Code-Blooded.git
   cd Code-Blooded
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory (see section below).

4. **Start the local development server**:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:5173`.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# TMDB API Key
VITE_TMDB_API_KEY=your_tmdb_api_key

# Firebase Credentials
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AI API Keys
VITE_GROQ_API_KEY=your_groq_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key

# OTT Search API Keys (Alternating Serper & Tavily Rotation)
VITE_SERPER_API_KEY=your_serper_api_key
VITE_TAVILY_API_KEY=your_tavily_api_key
```

> ⚠️ **Security Note**: Never commit your `.env` file or secret keys to the repository. Frontend `VITE_*` variables are bundled into the client build.

---

## 📁 Project Structure

```text
Code-Blooded/
├── api/              # Vercel serverless API handlers
├── public/           # Static public assets
├── screenshots/      # Product preview screenshots
├── src/
│   ├── assets/       # Media assets and icons
│   ├── components/   # Reusable UI components
│   ├── context/      # React state providers (Auth, Alerts)
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Application views (Discover, Profile, MovieDetail, CineAI)
│   │   └── cineai/   # CineAI suite pages (Planner, PickForMe, Debate)
│   ├── services/     # API & Firebase integration modules
│   ├── App.jsx       # Main application layout & router
│   ├── main.jsx      # Entry point
│   └── index.css     # Global CSS design system
├── vercel.json       # Deployment rewrites
├── vite.config.js    # Vite configuration & proxy
└── package.json      # Dependencies and scripts
```

---

## 🔮 Future Improvements

* **Custom Playlist Collections**: Create and share custom themed movie lists.
* **Autoplay Trailer Theater**: Continuous video queue mode for trending trailers.

---

## 👥 Team & Credits

* **Built for**: VibeForge 1.0
* **Repository**: [Code-Blooded](https://github.com/pg13atif-prog/Code-Blooded.git)

### 🏆 Team Code-Blooded & Contributions

* 🧑‍💻 **Atif** — Integration & Version Control
* 🛠️ **Asif** — Backend & Database Management
* 🎨 **Swastik** — UI/UX Design & Layout

---

## 📄 License

This project was created as a hackathon project.
