# 📋 AutoBrief – Your AI Copilot for Meeting Intelligence 🚀

AutoBrief is an end-to-end intelligent assistant that listens, understands, summarizes, and takes action — **so your meetings never get forgotten again**.

This AI agent automates everything from **meeting prep** to **follow-up execution**, using cutting-edge tools like Gemini, AssemblyAI (STT), Google Calendar, and your favorite productivity apps (Slack, Jira, etc.).

---

## 🧠 Core Problem

> Professionals spend too much time preparing for meetings, digging up relevant context, and even more time doing follow-ups — often missing critical action items. Meeting recordings are often ignored and never converted into insights or outcomes.

---

## 💡 Solution: AutoBrief Workflow

AutoBrief follows a 3-phase pipeline inspired by how high-performing teams actually work.
<img width="1520" height="887" alt="image" src="https://github.com/user-attachments/assets/10481205-39cf-4e76-8469-f773508e6a28" />


---

### 🔷 1. PRE-MEETING PREPARATION

🗓 **Meeting scheduled in Google Calendar**  
→ 📄 Fetch metadata: attendees, time, agenda, etc.  
→ 🔌 Connect to Slack + Jira to pull recent updates  
→ ✍️ Summarize data with **Gemini 2.5 flash (LLM)**  
→ 👀 Display a **concise briefing** to the user before the meeting

> 📘 Think of it as your AI-generated “Pre-read” before every call.

---

### 🟠 2. POST-MEETING PROCESSING

✅ Detect if a meeting has ended  
→ 🎥 **Obtain the meeting recording**  
→ 🧠 Use **AssemblyAI** to transcribe audio to text  
→ ✍️ This transcript becomes the basis for action intelligence

> 🎙️ “Don’t write notes. Just talk. AutoBrief’s listening.”

---

### 🟩 3. ACTION EXTRACTION & FOLLOW-UP

🧠 Extract **action items** from the transcript with Gemini  
→ ✅ Convert them into interactive checkboxes  
→ 👆 User confirms with one click  
→ ⚡ AutoBrief triggers downstream agents:
- 📅 Creates follow-up meetings in **Google Calendar**
- 🔁 Pushes updates to **Jira**, **Calendar**, etc.

> ✅ “AutoBrief doesn’t just listen — it acts.”

---

## 🛠️ Tech Stack

| Layer           | Tech / Tools                            |
|----------------|------------------------------------------|
| Frontend       | Next.js, Tailwind CSS                    |
| OAuth/Auth     | Google OAuth 2.0                         |
| Calendar       | Google Calendar API                      |
| STT            | AssemblyAI                               |
| LLM            | Gemini 2.5 flash                         |
| Integrations   | Slack API, Jira API (optional scope)     |

---

## ⚙️ How to Run Locally

```bash
git clone https://github.com/nachi-333/autobrief.git
cd autobrief
npm install
cp .env.example .env.local
# Add your GOOGLE_CLIENT_ID, ASSEMBLY_API_KEY, GEMINI_API_KEY, etc.
npm run dev
