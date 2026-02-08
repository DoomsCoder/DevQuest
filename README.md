# 🚀 DevQuest: Master Git. Gamified.

> **Transform your Git skills from confused to confident.**
> DevQuest is an interactive, cyberpunk-themed learning platform that combines a simulated terminal, real-time visualizations, and an AI tutor to teach Git mastery.

![DevQuest Screenshot](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80) 
*(Note: Replace with actual screenshot)*

## ✨ Key Features

### 🖥️ Interactive Shell Simulation
- **Real Terminal Experience**: Type commands like `git init`, `git add`, `git commit` in a fully functional, simulated shell.
- **File System Visualization**: Watch files change status (untracked, modified, staged) in real-time as you execute commands.
- **Power User Shortcuts**: History navigation (`↑`/`↓`), autocomplete (`Tab`), and quick toggles (`Ctrl+B`, `Ctrl+G`).

### 📊 Visual Learning
- **Git Graph**: See your commit history visualized as a beautiful, interactive graph.
- **Environment Visualizer**: Understand the relationship between Working Directory, Staging Area, and Repository.

### 🤖 AI Tutor Integration
- **Context-Aware Assistance**: Stuck? The integrated AI tutor (powered by Google Gemini) knows exactly what you typed and where you are in the mission.
- **Adaptive Explanations**: Get hints, theory, and error explanations tailored to your current state.

### 🎮 Gamification
- **XP & Levels**: Earn XP for every successful command and mission completion.
- **Badges**: Unlock achievements for specific milestones (e.g., "Commit Master", "Branching Expert").
- **Streaks**: Maintain daily activity to boost your learning momentum.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS (Cyberpunk Theme)
- **Icons**: Lucide React
- **Layout**: `react-resizable-panels` for IDE-like flexibility
- **Auth**: Clerk
- **Backend/DB**: Supabase (PostgreSQL)
- **AI**: Google Gemini API

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/DoomsCoder/DevQuest.git
    cd DevQuest
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add the following keys:
    
    ```env
    # Authentication (Clerk)
    VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

    # AI (Google Gemini)
    VITE_GEMINI_API_KEY=AIzr...

    # Database (Supabase)
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=eyJ...
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) (or the port shown in terminal) to start your quest!

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Help Modal** | `?` (Shift + /) |
| **Focus Terminal** | `Ctrl + K` |
| **Toggle Sidebar** | `Ctrl + B` |
| **Toggle Graph** | `Ctrl + G` |
| **Clear Terminal** | `Ctrl + L` |
| **Cancel Command** | `Ctrl + C` |
| **Autocomplete** | `Tab` |

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any features or bug fixes.

---

<div align="center">
  <sub>Built with ❤️ by the DevQuest Team</sub>
</div>
