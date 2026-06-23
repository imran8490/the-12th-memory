# The 12th Memory

Every fan is the 12th man. Now their football memory has proof.

The 12th Memory is a World Cup 2026 AI fan memory hub. It lets football fans save predictions, track their changing opinions, and interact with an AI-style memory agent that recalls past predictions, checks loyalty, roasts inconsistent takes, and shows a prediction survival status.

This project is built for the Walrus Sessions / World Cup memory hackathon concept, where the main goal is to demonstrate persistent memory that changes an agent’s behavior over time.

---

## Project Overview

Football fans make bold predictions before and during major tournaments, but most of those takes disappear after the match is over.

The 12th Memory turns those predictions into a persistent fan memory timeline. A user can save their favorite team, prediction type, confidence level, and fan mood. Later, the AI agent uses that saved memory to answer questions like:

- Which team am I backing?
- What is my loyalty score?
- Roast my last prediction.
- Is my prediction still alive?
- Show my football memory.
- Show upcoming schedule.
- Compare Argentina vs Brazil.

The project focuses on one simple idea:

> A fan’s football memory should not disappear. It should be remembered, compared, and proven.

---

## Tagline

Every fan is the 12th man. Now their football memory has proof.

---

## Key Features

### 1. AI Chat Agent

The AI-style fan agent responds using saved prediction memory. It can recall previous predictions, compare team changes, generate roast-style replies, and explain the user’s loyalty score.

Example:

User: Which team am I backing?

Agent: You are currently backing England with 35% confidence. Your latest prediction is: "England might surprise everyone but I am not fully confident."

---

### 2. Save Prediction

Users can save a World Cup prediction with:

- Name
- Team
- Prediction type
- Prediction text
- Confidence percentage
- Fan mood

Example:

Team: Argentina  
Prediction Type: Winner  
Prediction: Argentina will win World Cup 2026  
Confidence: 80%  
Mood: Loyal  

---

### 3. Memory Timeline

Every saved prediction appears in the memory timeline with:

- Team
- Prediction type
- Date and time
- Prediction text
- Confidence
- Mood
- Survival status
- Demo memory proof ID

This makes the memory visible and meaningful for users and judges.

---

### 4. Loyalty Score

The project calculates a fan loyalty score based on how consistent the user is with their team selections.

If the user keeps supporting the same team, the loyalty score stays high. If the user keeps switching teams, the score drops.

Example:

Fan Loyalty Score: 33%  
First Team: Argentina  
Latest Team: England  

---

### 5. Prediction Survival Meter

Each prediction gets a survival status based on demo World Cup match context.

Possible statuses:

- Alive ✅
- In Danger ⚠️
- Under VAR Review 👀
- Waiting for Kickoff ⏳

Example:

Argentina prediction: Alive ✅  
Brazil prediction: In Danger ⚠️  
England prediction: Waiting for Kickoff ⏳  

---

### 6. Match Context Board

The MVP includes demo World Cup match context. This avoids relying on paid or restricted live-score APIs while still demonstrating how match context can shape memory-based responses.

Example demo match context:

Argentina 2 - 1 Brazil at 67'  
France 0 - 0 Germany at 31'  

---

### 7. Upcoming Schedule

The app includes a demo World Cup 2026 schedule so the agent can reference upcoming matches and remind users about future prediction opportunities.

Example:

England vs Portugal  
13 Jun 2026 - 00:30  
AT&T Stadium  

---

### 8. Walrus Memory Console

The current MVP shows a Walrus-style memory console with:

- Storage mode
- Saved memories count
- Loyalty score
- Latest team
- Prediction survival
- Memory proof ID

Current version uses local JSON demo storage. The next step is to replace demo storage with Walrus Mainnet memory storage and show real Walrus blob/object proof.

---

## Why This Project Is Different

This is not just a prediction form or a roast app.
The 12th Memory combines:

- Persistent fan memory
- AI-style responses
- Football prediction history
- Loyalty scoring
- Prediction survival status
- Match context
- Public memory timeline
- Walrus-style proof console

The core idea is that the agent’s behavior changes because of what it learned earlier.

Example before/after moment:

Day 1:  
User saves: Argentina will win World Cup 2026 with 80% confidence.

Later:  
User saves: England might surprise everyone with 35% confidence.

Agent:  
You first backed Argentina, but now you are looking at England. Your loyalty score is dropping. The 12th Memory has receipts.

---

## Tech Stack

- Node.js
- Express.js
- HTML
- CSS
- JavaScript
- Local JSON storage for MVP
- Walrus Mainnet integration planned

---

## Project Structure

the-12th-memory/
  index.js
  package.json
  package-lock.json
  public/
    index.html
    style.css
    dashboard.js
  README.md

---

## Installation

Clone the repository:

git clone https://github.com/imran8490/the-12th-memory.git

cd the-12th-memory

Install dependencies:

npm install

Run the app:

npm start

Open in browser:

http://localhost:3000

---

## Usage Flow

1. Open the app.
2. Go to Save Prediction.
3. Enter your name, team, prediction, confidence, and mood.
4. Click Save Memory.
5. Ask the AI agent questions:
   - Which team am I backing?
   - Roast my last prediction.
   - What is my loyalty score?
   - Is my prediction still alive?
   - Show match context.
   - Show upcoming schedule.
6. View the saved prediction in Memory Timeline.
7. Check memory proof and stats in Walrus Console.

---

## Demo Prompts

Try these prompts in the AI Chat Agent:

- Which team am I backing?
- Roast my last prediction
- Show my football memory
- Compare Argentina vs Brazil
- What is my loyalty score?
- Show match context
- Show upcoming schedule
- Is my prediction still alive?

---

## Example Agent Responses

You are currently backing England with 35% confidence. Your latest prediction is: "England might surprise everyone but I am not fully confident."

Roast mode activated 😭 You backed England with 35% confidence. Prediction status: ⏳ Waiting for Kickoff. If you switch teams again, your 12th Memory will bring receipts.

Your fan loyalty score is 33%. Your first recorded team was Argentina. Latest team memory: England.

---

## Current MVP Status

Completed:

- AI Chat Agent
- Save Prediction
- Memory Timeline
- Loyalty Score
- Prediction Survival Meter
- Match Context Board
- Upcoming Schedule
- Walrus-style Memory Console
- GitHub repository setup

Planned:

- Real Walrus Mainnet memory storage
- Real Walrus blob/object proof display
- Public deployment
- Optional real football data API integration
- Better AI model integration
- Multi-user wallet-based memory identity

---

## Walrus Integration Plan

The current MVP stores memory in a local JSON file for fast prototyping.

Next, the memory object will be stored on Walrus Mainnet.

Example memory object:

{
  "name": "Prince",
  "team": "Argentina",
  "predictionType": "Winner",
  "prediction": "Argentina will win World Cup 2026",
  "confidence": 80,
  "mood": "Loyal",
  "createdAt": "2026-06-23T10:00:00.000Z"
}

After storing on Walrus, the app should display:

Storage Mode: Walrus Mainnet  
Memory Proof: Walrus blob ID  

This will prove that the fan memory is persistent and verifiable.

---

## Hackathon Relevance

The project directly supports the requirement for a World Cup 2026 memory-based agent.

It demonstrates:

- Persistent memory across sessions
- A visible memory timeline
- Agent behavior shaped by previous user data
- Before/after changes in fan predictions
- A meaningful public interface for memory
- Walrus-style proof console for stored memory

---

## Demo Video Flow

Suggested 3-minute demo:
1. Open The 12th Memory.
2. Explain the tagline: Every fan is the 12th man. Now their football memory has proof.
3. Save an Argentina winner prediction.
4. Save a Brazil or England prediction.
5. Ask: Which team am I backing?
6. Ask: What is my loyalty score?
7. Ask: Roast my last prediction.
8. Ask: Is my prediction still alive?
9. Show Match Context Board.
10. Show Memory Timeline and Walrus Console.

---

## Disclaimer

This MVP uses demo World Cup match context and local JSON storage. Real Walrus Mainnet storage and live deployment are planned as the next step. The project does not use official FIFA branding, logos, or assets.

---

## Author

Built by Imran for the World Cup 2026 Walrus Memory hackathon concept.
