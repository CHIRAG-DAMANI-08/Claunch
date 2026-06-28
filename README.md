# Claunch 🚀

> **Native Windows CLI tool to orchestrate multiple Claude Code sessions across Git worktrees.**

Claunch simplifies multi-threaded engineering workflows by managing concurrent **Claude Code** sessions inside **Windows Terminal** (`wt.exe`). It discovers your Git worktrees, maps and persists Claude session names, links project memory folders together, and launches them in focused terminal tabs or windows.

---

## 📖 Table of Contents
1. [Why Claunch?](#-why-claunch)
2. [Prerequisites](#-prerequisites)
3. [Quick Start](#-quick-start)
4. [How It Works](#-how-it-works)
    - [Interactive Selector TUI](#1-interactive-selector-tui)
    - [Real-Time Memory Syncing (NTFS Junctions)](#2-real-time-memory-syncing-ntfs-junctions)
    - [Frictionless Tab Spawning](#3-frictionless-tab-spawning)
5. [Daily Workflow Walkthrough](#-daily-workflow-walkthrough)
6. [Command Reference](#-command-reference)
7. [Troubleshooting](#-troubleshooting)

---

## 💡 Why Claunch?

If you are using **Claude Code** (`claude`) on a single Git branch, you have to stash changes or wait for Claude to complete its run before starting another task. 

Using **Git Worktrees** lets you check out multiple branches in different folders simultaneously. However, this creates new problems:
1. You have to open multiple terminals, `cd` into different directories, and run `claude` manually.
2. Claude instances in different directories do not share their `MEMORY.md` context or learnings because they reside in separate project folders under `~/.claude/projects/`.
3. Finding out what Claude did in another worktree branch requires manually switching tabs or reading raw transcripts.

**Claunch solves all of this.**

---

## 🛠 Prerequisites

Ensure the following tools are installed and configured on your Windows machine:
- **Node.js**: `>= 22.0.0`
- **Git CLI**
- **Windows Terminal** (`wt.exe` must be available, either in `PATH` or at default AppData Microsoft Windows Store path)
- **Claude Code CLI** (`claude` installed globally)

---

## ⚡ Quick Start

### 1. Global Installation
Install Claunch globally using npm:
```bash
npm install -g claunch
```

### 2. Run inside your Repository
Open your terminal, navigate to your main Git repository or any of its worktree subfolders, and run:
```bash
claunch
```

---

## ⚙️ How It Works

### 1. Interactive Selector TUI
When you run `claunch`, it scans your current workspace for active Git worktrees. It presents a keyboard-driven terminal interface:
- **`↑` / `↓` or `k` / `j`**: Navigate list
- **`Space`**: Toggle selection checkbox
- **`Enter`**: Launch all selected worktrees at once in a new Windows Terminal window (each running Claude in its own tab)
- **`o` or `L`**: Immediately launch the highlighted worktree in a new tab of your **current window** in the background, keeping your focus on the selection menu
- **`q` or `Esc`**: Quit the TUI selector

### 2. Real-Time Memory Syncing (NTFS Junctions)
Claude Code saves learnings to `~/.claude/projects/<projectName>/memory/MEMORY.md`. 
Since worktrees have different file paths, Claude treats them as completely separate projects and cannot share memories.

Claunch solves this by creating NTFS directory junctions on startup:
```
~/.claude/projects/
├── C--Code-myproject/ (Main Repo Project)
│   └── memory/ (Shared MEMORY.md Folder)
│
├── C--Code-myproject--worktrees-feat-ui/
│   └── memory/ ───[Directory Junction]───► C--Code-myproject/memory
│
└── C--Code-myproject--worktrees-fix-api/
    └── memory/ ───[Directory Junction]───► C--Code-myproject/memory
```
Any `MEMORY.md` updates Claude makes in one worktree are immediately synced and available to Claude sessions running in other worktrees. If pre-existing files exist in the worktree's memory directory, Claunch merges them into the main memory folder before linking so no learnings are lost.

### 3. Frictionless Tab Spawning
When you press `o` / `L` to open a tab, Windows Terminal typically steals focus from your active shell. Claunch chains a `; focus-tab -t 0` call to the launcher command, instantly returning keyboard focus back to your selection menu. This allows you to launch 5+ worktrees in sequence without touching your mouse or switching back tabs.

---

## 🔄 Daily Workflow Walkthrough

Here is how to use Claunch for daily multi-threaded work:

### Step 1: Create your worktrees
From your main repository, spin up feature-specific worktrees:
```bash
# Add worktree for Landing Page work
git worktree add .worktrees/landing-redesign -b feat/landing-redesign

# Add worktree for Backend API fixes
git worktree add .worktrees/api-fix -b fix/api-bugs
```

### Step 2: Open selection menu
Run `claunch` in your terminal:
```bash
claunch
```
You will see your active worktrees list:
```text
Claunch - Interactive Worktree Selector
Controls: ↑/↓ Navigate | Space Select | Enter Launch Selected (New Window) | o/L Launch Tab (Background) | q Quit
─────────────────────────────────────────────────────────────────────────────
 > [ ] main                                C:\Code\myproject                      
   [ ] feat/landing-redesign               C:\Code\myproject\.worktrees\landing   (session: feat/landing-redesign)
   [ ] fix/api-bugs                        C:\Code\myproject\.worktrees\api-fix   (session: fix/api-bugs)
```

### Step 3: Launch in background
Move the cursor to `feat/landing-redesign` and press `o`. A new tab opens in the background. 
Move the cursor to `fix/api-bugs` and press `o`. Another tab opens in the background.
Your terminal focus stays on the selection menu so you can continue navigation!

### Step 4: Check dialogue logs
If Claude is working in another tab and you want to see what changes it has made or what steps it took, run the log command:
```bash
claunch log fix/api-bugs
```
It prints a clean dialogue log of that session directly in your terminal:
```markdown
# Claude Session Log: fix/api-bugs (session-uuid-12345)
Last Active: 6/28/2026, 11:30:15 PM

### **User**:
Fix the RTMP pipeline connection timeout inside server.ts

### **Claude**:
I will look at server.ts to check the RTMP pipeline config. I see the timeout is set to 5000ms. I'll increase it to 15000ms.
...
```

---

## 💻 Command Reference

### Launch TUI Selector (Default)
```bash
claunch
```

### Launch all worktrees directly (Bypass TUI)
```bash
claunch --all
```

### Read Session Transcript
```bash
claunch log <branch-name>
# or
claunch log <session-uuid>
```

---

## 🛠 Troubleshooting

### 1. Windows Terminal fails to open
If you get a `wt is not recognized` error, ensure Windows Terminal is installed. Claunch will automatically look for the App Execution Alias inside:
`%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe`

### 2. NTFS Reparse Point / Symlink Permission errors
Creating directory junctions in Windows requires standard filesystem writes. If your user account is locked down, ensure you have write permissions to your user profile directory (`~/.claude/projects/`). Administrators privileges are **not** required for directory junctions.

### 3. Missing Sessions File
Claunch maintains local branch-to-session mappings under `~/.claunch/sessions.json`. If this file gets corrupt, Claunch will automatically reset it safely to an empty mapping without throwing errors.
