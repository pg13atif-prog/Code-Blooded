<div align="center">

  # 🎬 CineScope

  ### *Search Less. Watch Better.*

  [![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-cinescopeai.vercel.app-E50914?style=for-the-badge&logoColor=white)](https://cinescopeai.vercel.app)
  [![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase_Realtime_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI_Engine-8E44AD?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
  [![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://cinescopeai.vercel.app)

  <br />

  An intelligent, AI-driven cinematic discovery ecosystem built to eliminate choice paralysis.  
  Combining live TMDB content streaming, Google Gemini AI reasoning, and real-time social movie matching into one seamless web application.

  [🌐 **Explore Live Demo**](https://cinescopeai.vercel.app) • [✨ **View AI Tools**](#-cineai-intelligence-suite) • [🤝 **Social Movie Match**](#-social--friend-movie-match)

  <br />

  <img src="screenshots/hero.png" alt="CineScope Hero Banner" width="100%" style="border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.8);" />

</div>

---

## 📌 Table of Contents
- [🌟 Project Overview](#-project-overview)
- [📸 Feature Showcase & Gallery](#-feature-showcase--gallery)
- [⚡ Key Features](#-key-features)
  - [🎬 Content Discovery & Search](#-content-discovery--search)
  - [✨ CineAI Intelligence Suite](#-cineai-intelligence-suite)
  - [🤝 Social & Friend Movie Match](#-social--friend-movie-match)
  - [❤️ Personal Library & Analytics](#-personal-library--analytics)
  - [🏆 Gamified Achievements](#-gamified-achievements)
- [💎 Why CineScope Stands Out](#-why-cinescope-stands-out)
- [🛠 Tech Stack & Architecture](#-tech-stack--architecture)
- [🤖 CineAI Engine Workflows](#-cineai-engine-workflows)
- [🔥 Firebase Infrastructure](#-firebase-infrastructure)
- [🚀 Local Setup & Installation](#-local-setup--installation)
- [🔐 Environment Variables](#-environment-variables)
- [📁 Directory Structure](#-directory-structure)
- [🌐 Deployment](#-deployment)
- [🔮 Future Roadmap](#-future-roadmap)
- [📜 License](#-license)

---

## 🌟 Project Overview

Finding something truly worth watching shouldn't feel like endless scrolling. Modern streaming services present thousands of choices without contextual intelligence, forcing users to bounce between review aggregators, trailer clips, and decision spinners. **CineScope** fundamentally transforms media discovery by unifying real-time TMDB catalog streaming with conversational AI recommendations and social compatibility scoring.

Instead of staring at grid thumbnails, CineScope users can express spontaneous moods, trigger automated AI movie night planners, battle two films in a head-to-head AI debate, or compare taste overlaps with friends to pick the perfect movie for group nights—all while tracking their personal watch lists and earning achievement badges.

> [!TIP]
> **No Registration Required to Test**: CineScope supports instant **Guest Mode** access so judges and users can immediately test AI features, search tools, and movie detail pages without creating an account.

---

## 📸 Feature Showcase & Gallery

<div align="center">

### 🎬 High-Impact Visual Previews

| Discovery & Detail | AI Engine & Social |
| :---: | :---: |
| **Media Browse & Catalog Explorer**<br/><img src="screenshots/browse.png" width="480" alt="Browse Page"/> | **CineAI Natural Discovery Engine**<br/><img src="screenshots/cineai-engine.png" width="480" alt="CineAI Engine"/> |
| **Rich Movie & TV Detail View**<br/><img src="screenshots/movie-detail.png" width="480" alt="Movie Detail"/> | **Friend Movie Match & Overlaps**<br/><img src="screenshots/friend-match.png" width="480" alt="Friend Match"/> |
| **Personal Library Collections**<br/><img src="screenshots/library.png" width="480" alt="Library Page"/> | **AI Compatibility & Group Recommendations**<br/><img src="screenshots/friend-match -recommendation.png" width="480" alt="Group Recs"/> |
| **Gamified Achievements Dashboard**<br/><img src="screenshots/achievements.png" width="480" alt="Achievements"/> | **User Profile & Stats Analytics**<br/><img src="screenshots/profile.png" width="480" alt="Profile Page"/> |

</div>

---

## ⚡ Key Features

### 🎬 Content Discovery & Search
- **Spotlight Search Overlay**: Instant command-style search (`Ctrl+K` / `Cmd+K`) for movies, TV series, actors, directors, and genres with real-time auto-suggest.
- **Dynamic Popular Picks**: Live popular content recommendations populated on-the-fly directly from TMDB API.
- **Comprehensive Media Guides**: Rich detail pages featuring official YouTube trailers, cast biographies, full filmographies, season/episode lists, and image galleries.

### ✨ CineAI Intelligence Suite
- **Conversational Watch Assistant**: Prompt-driven search (*"mind-bending sci-fi thrillers with shocking plot twists"*) that generates custom 1–2 sentence comparative rationales.
- **Movie Night Planner**: Interactive quiz tailored for solo, couples, or group movie nights considering duration, era, and tone.
- **Pick For Me**: Instant decision spinner with mood filters for quick recommendations when stuck.
- **Movie Debate Engine**: AI analysis comparing any two films across acting, plot, visuals, pacing, and score with dynamic point totals.

### 🤝 Social & Friend Movie Match
- **Alphanumeric Friend Codes**: Connect with friends instantly using unique 6-character codes (`CS-XXXXXX`).
- **Taste Compatibility Scoring**: Compare watch histories to generate a percentage compatibility score between two users.
- **Direct Recommendations**: Send inline movie recommendations with custom notes directly to friends via real-time notifications.

### ❤️ Personal Library & Analytics
- **Multi-Tab Collections**: Dedicated sections for *Watchlist*, *Liked*, *Watched*, and *Recently Viewed* titles.
- **Automatic Data Healing**: Syncs missing ratings and details from TMDB in the background so saved library items never show stale metrics.
- **Watch Time Counter**: Live calculation of cumulative minutes spent watching movies and TV shows.

### 🏆 Gamified Achievements
- **Automatic Milestone Unlocking**: 15+ interactive achievements (*First Steps*, *Collector*, *AI Explorer*, *Curious Mind*, *Trailer Seeker*).
- **Framer Motion Animations**: Toast alerts with spring animations and drag-to-dismiss support on mobile devices.

---

## 💎 Why CineScope Stands Out

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   ❌ TRADITIONAL BROWSING                     ✅ CINESCOPE EXPERIENCE                │
│   ----------------------                     -------------------                │
│   • Endless scrolling through cards           • Conversational AI prompt search      │
│   • Decision fatigue & choice paralysis      • Guided Movie Night Planner quiz       │
│   • Checking external review sites           • Head-to-head AI Movie Debates        │
│   • Asking friends "what should we watch?"   • Real-time Social Movie Match         │
│   • Static, unpersonalized catalogs          • Gamified achievements & stats        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack & Architecture

### Core Technologies
- **Frontend Framework**: React 19, Vite 8, JavaScript (ES6+)
- **Styling & Design**: Custom CSS3 System (Liquid Glassmorphism, Responsive Grid), Framer Motion 12
- **Backend & Auth**: Firebase Realtime Database, Firebase Authentication (Email/Password, Google OAuth, Anonymous Guest Access)
- **External Services**: TMDB (The Movie Database) API, Google Gemini API / Groq LLaMA / OpenRouter
- **Deployment Platform**: Vercel (Serverless Edge Rewrites & API Proxying)

---

## 🤖 CineAI Engine Workflows

| AI Workflow | User Action | AI Result & System Behavior |
| :--- | :--- | :--- |
| **Watch Assistant** | Types natural prompt | Returns curated movie suggestions paired with 1–2 sentence contextual justifications |
| **Movie Night Planner** | Completes 3-step quiz | Generates custom recommendations matching group size, vibe, and duration limits |
| **Pick For Me** | Selects mood tag | Instantly highlights a single title with an encouraging rationale |
| **Movie Debate** | Selects two movies | Evaluates acting, direction, pacing, visuals, and score to award dynamic category points |
| **Friend Movie Match** | Chooses a connected friend | Analyzes taste overlap to recommend films both users will love |

---

## 🔥 Firebase Infrastructure

Firebase handles real-time sync, auth state, and user social graphs:

- **Authentication System**: Email & password authentication, Google OAuth 2.0, and instant Guest login with seamless account linking.
- **Realtime Database Nodes**:
  - `users/{userId}/watchlist`: Saved watchlist collection.
  - `users/{userId}/liked`: Liked titles and favorites.
  - `users/{userId}/watched`: Tracked watched history with logged runtimes.
  - `users/{userId}/recentlyViewed`: History of recently visited titles.
  - `users/{userId}/achievements`: Unlocked user achievements and progress state.
  - `friendCodes/{code}`: Global index mapping 6-character codes to user IDs.
  - `users/{userId}/friends` & `requests`: Friend relationships and pending request queues.
  - `users/{userId}/notifications`: Real-time user notifications.

---

## 🚀 Local Setup & Installation

Follow these instructions to run CineScope on your local machine:

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pg13atif-prog/Code-Blooded.git
   cd Code-Blooded
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (refer to the section below).

4. **Launch Development Server**:
   ```bash
   npm run dev
   ```

5. **Open Browser**:
   Navigate to `http://localhost:5173` to access CineScope.

---

## 🔐 Environment Variables

Create a `.env` file in your root workspace:

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

# AI API Providers (Groq / OpenRouter)
VITE_GROQ_API_KEY=your_groq_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

> [!IMPORTANT]
> Keep your `.env` file secret and never commit API keys to public repositories.

---

## 📁 Directory Structure

```text
Code-Blooded/
├── api/                        # Vercel serverless API handlers
│   ├── ratings.js              # Community rating endpoint
│   └── tmdb.js                 # Secure TMDB API proxy
├── public/                     # Static public assets
├── screenshots/                # Application preview screenshots
├── src/
│   ├── assets/                 # SVGs and visual media
│   ├── components/             # Reusable UI components
│   │   ├── AuthModal.jsx       # Login / Sign up modal
│   │   ├── CustomSelect.jsx    # Glass dropdown selector
│   │   ├── Hero.jsx            # Dynamic backdrop slider & trailer player
│   │   ├── MovieCard.jsx       # Movie poster card component
│   │   ├── MovieRow.jsx        # Horizontal media slider
│   │   ├── Navbar.jsx          # Header, navigation & spotlight search
│   │   ├── SkeletonLoader.jsx  # Loading state skeletons
│   │   └── SplashScreen.jsx    # Application splash screen
│   ├── context/                # Global React contexts
│   │   ├── AlertContext.jsx    # Global toasts & achievement alerts
│   │   └── AuthContext.jsx     # Firebase auth state provider
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Top-level page views
│   │   ├── cineai/             # CineAI tools & hub pages
│   │   │   ├── AiDiscoveryPage.jsx # AI watch assistant prompt search
│   │   │   ├── CineAiPage.jsx  # CineAI main hub landing page
│   │   │   ├── MovieDebate.jsx # Head-to-head movie comparison
│   │   │   ├── MoviePlanner.jsx# Movie night planning quiz
│   │   │   └── PickForMe.jsx   # Random mood decision spinner
│   │   ├── AchievementsPage.jsx# Achievements dashboard
│   │   ├── DiscoverPage.jsx    # Media browse & filtering view
│   │   ├── FriendsPage.jsx     # Friends management
│   │   ├── MovieDetail.jsx     # Movie & TV show details
│   │   ├── PersonDetailPage.jsx# Actor & director detail view
│   │   ├── ProfilePage.jsx     # User profile & stats analytics
│   │   ├── SocialPage.jsx      # Friend Movie Match view
│   │   └── UserListPage.jsx    # Personal library collections
│   ├── services/               # API & backend integrations
│   │   ├── achievements.js     # Achievement tracking logic
│   │   ├── firebase.js         # Firebase app setup
│   │   ├── firestore.js        # Realtime DB CRUD methods
│   │   ├── friends.js          # Friend code & relationship APIs
│   │   ├── gemini.js           # AI prompt evaluation & parsing
│   │   └── tmdb.js             # TMDB API client & mapping
│   ├── App.jsx                 # App routing & main layout
│   ├── main.jsx                # Application root entry
│   └── index.css               # Design system & global styles
├── vercel.json                 # Vercel deployment rewrites
├── vite.config.js              # Vite build & server proxy configuration
└── package.json                # Project manifest & dependencies
```

---

## 🌐 Deployment

CineScope is deployed on **Vercel**:

- **Live URL**: [https://cinescopeai.vercel.app](https://cinescopeai.vercel.app)
- **SPA Routing**: Single-page application routes handled through `vercel.json` rewrites (`/((?!api/).*) -> /index.html`).
- **Serverless API Proxy**: Requests to `/api/tmdb/*` pass through Vercel serverless functions (`/api/tmdb.js`) to protect API credentials and resolve CORS requirements.

---

## 🔮 Future Roadmap

- 🎬 **Custom Playlist Curator**: Create shareable themed collections (e.g. *"Spooky October Favorites"*).
- 🍿 **Trailer Theater Mode**: Continuous autoplay queue for upcoming movie trailers.
- 📱 **PWA Offline Support**: Offline watchlist access via Progressive Web App caching.

---

## 📜 License

This project was created as a hackathon entry.

<div align="center">

**[cinescopeai.vercel.app](https://cinescopeai.vercel.app)**  
*Search Less. Watch Better.*

</div>
