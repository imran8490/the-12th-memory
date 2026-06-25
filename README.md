# The 12th Memory

**Every fan is the 12th man. Now their football memory has proof.**

The 12th Memory is a World Cup 2026 AI fan memory app powered by **Walrus Mainnet** and **MemWal SDK**.

Fans can save football predictions, store them through Walrus Memory, receive a real Blob ID proof, and interact with an AI-style fan memory agent that remembers team history, checks loyalty, compares predictions, and roasts memories marked as **Roast Ready**.

---

## Live Demo

https://the-12th-memory.onrender.com/

---

## Project Overview

Football fans make bold predictions before and during major tournaments, but most of those takes disappear after the match is over.

The 12th Memory turns those predictions into persistent fan memories.

A user can save:

- Name
- Team
- Prediction type
- Prediction text
- Confidence score
- Fan mood

Each prediction is stored through **MemWal SDK** on **Walrus Mainnet**, and the app returns a visible Blob ID proof.

The AI Fan Memory Agent then uses saved memory history to answer:

- Which team am I backing?
- Show my football memory
- Roast my last prediction
- Compare Argentina vs Brazil
- What is my loyalty score?
- Is my prediction still alive?
- Show match context
- Show upcoming schedule

---

## Core Idea

> A fan’s football memory should not disappear.  
> It should be remembered, compared, roasted, and proven.

---

## Key Features

### 1. AI Fan Memory Agent

The AI-style fan agent responds using saved football memory.

Example prompts:

- Which team am I backing?
- Roast my last prediction
- Show my football memory
- Compare Argentina vs Brazil
- What is my loyalty score?
- Is my prediction still alive?

---

### 2. Save World Cup Prediction

Users can save a prediction with:

- Name
- Team
- Prediction type
- Prediction text
- Confidence percentage
- Fan mood

Example:

```txt
Team: England
Prediction Type: Dark Horse
Prediction: England can surprise everyone in World Cup 2026
Confidence: 75%
Mood: Roast Ready
````

---

### 3. Walrus Mainnet Storage

Each saved memory is uploaded through **MemWal SDK** and stored on **Walrus Mainnet**.

After saving, the app returns:

* Blob ID
* Walrus proof link
* Storage status
* Memory timeline record

Example:

```txt
Storage: Walrus Mainnet
Blob ID: abc123...
Proof: https://aggregator.walrus-mainnet.walrus.space/v1/blobs/abc123...
```

The raw Walrus blob acts as public proof, while the app shows the readable fan memory in the UI.

---

### 4. Memory Timeline

The Memory Timeline displays saved predictions with:

* Team
* Prediction
* Confidence
* Mood
* Blob ID
* Walrus proof link

The app also keeps a local memory index so the frontend can reload readable memory history after refresh.

---

### 5. Quick Loyalty Check

Loyalty score is calculated based on real saved memory count.

Example:

If the user has 6 saved memories:

```txt
England: 2/6 = 33%
Argentina: 1/6 = 17%
Brazil: 1/6 = 17%
Uruguay: 1/6 = 17%
Portugal: 1/6 = 17%
```

This avoids fake fixed scores and makes loyalty based on actual prediction history.

---

### 6. Roast Ready Memory

If a saved prediction has Fan Mood set to **Roast Ready**, the agent searches the memory timeline and roasts that memory.

Example flow:

```txt
Portugal → Emotional
England → Roast Ready
Uruguay → Overconfident
```

When the user clicks:

```txt
Roast my last prediction
```

The agent finds the **England Roast Ready** memory and roasts it.

Roasts are saved locally so the same memory can return the same saved roast again.

---

### 7. Prediction Survival Status

The agent can check whether the latest saved prediction is still active inside the app.

Example:

```txt
Your Uruguay prediction is still active in the app.
Confidence: 46%
Mood: Overconfident
MemWal proof: abc123...
```

---

### 8. Walrus Memory Console

The Walrus Memory Console shows:

* Storage mode
* Saved memories count
* Loyalty score
* Latest team
* Prediction survival
* Latest memory proof

---

## Tech Stack

* Node.js
* Express.js
* HTML
* CSS
* JavaScript
* MemWal SDK
* Walrus Mainnet
* Local JSON index for readable timeline and roast history

---

## Project Structure

```txt
the-12th-memory/
├── index.js
├── package.json
├── package-lock.json
├── public/
│   ├── index.html
│   ├── dashboard.js
│   └── style.css
├── memory-index.json
├── roast-index.json
├── README.md
└── .env
```

---

## Environment Variables

Create a `.env` file:

```env
PORT=10000

MEMWAL_PRIVATE_KEY=your_memwal_registered_private_key
MEMWAL_ACCOUNT_ID=your_memwal_account_id
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
MEMWAL_NAMESPACE=the-12th-memory

WALRUS_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space/v1/blobs
```

Important:

```txt
Do not upload .env to GitHub.
```

---

## Installation

```bash
git clone https://github.com/imran8490/the-12th-memory.git
cd the-12th-memory
npm install
```

---

## Run Locally

```bash
node index.js
```

Open:

```txt
http://localhost:10000
```

---

## API Routes

### Save Memory

```txt
POST /api/save-memory
```

Stores a fan prediction through MemWal SDK and returns Walrus proof data.

### Get Memories

```txt
GET /api/memories
```

Returns saved memory records for the timeline.

### Chat Agent

```txt
POST /api/chat
```

Used by the AI Fan Memory Agent.

### Get Roasts

```txt
GET /api/roasts
```

Returns saved roast records.

---

## How It Works

1. User enters a World Cup prediction.
2. App sends the memory to the backend.
3. Backend stores the memory through MemWal SDK.
4. Walrus returns a Blob ID.
5. App saves the readable memory and proof in the timeline index.
6. User can ask the AI agent to remember, compare, roast, or check loyalty.

---

## Demo Flow

Suggested demo:

1. Save Portugal prediction with Emotional mood.
2. Save England prediction with Roast Ready mood.
3. Save Uruguay prediction with Overconfident mood.
4. Click “Roast my last prediction.”
5. Agent finds the Roast Ready memory and roasts England.
6. Click “What is my loyalty score?”
7. App calculates score based on real saved memory count.
8. Click “Show my football memory.”
9. App shows saved team history.
10. Show Blob ID and Walrus proof link in the timeline.

---

## Hackathon Relevance

The project demonstrates:

* Persistent AI memory
* Fan prediction history
* Agent behavior shaped by saved memory
* Walrus Mainnet proof
* Memory-based loyalty scoring
* Roast Ready memory recall
* Readable timeline with Blob ID proof

---

## Disclaimer

This is a hackathon/demo project. It is not financial advice, betting advice, or an official FIFA product. The app uses football prediction data only to demonstrate persistent AI memory using Walrus Mainnet and MemWal SDK.

---

## Author

Built by Imran.

````

Update panna:

```bash
nano README.md
````

Paste pannitu save:

```txt
Ctrl + O
Enter
Ctrl + X
```

GitHub push:

```bash
git add README.md
git commit -m "Update final README"
git push origin main
```

