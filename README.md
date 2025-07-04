# FBI Assistant Proxy

Tiny Node + Express service that forwards chat messages to an
OpenAI **Assistant** (ID `asst_lZh3NpiqqpIgSHggXYI6IDl5`) which is linked to
a 37 k-page FBI document vector store.  
The proxy exposes **one** HTTPS endpoint:


It returns the assistant’s final answer in plain text—perfect for use as a
Custom GPT **Action**.

---

## ✨ Features

* Minimal code (≈40 LOC)
* Long-polling until the assistant run finishes
* Works out of the box on **Render**, Heroku, Railway, Vercel, etc.
* Written in modern ESM JavaScript

---

## 📋 Prerequisites

* **Node 20+** and npm
* An **OpenAI API key** with Assistants scope
* Git (for deployment to Render)

---

## 🚀 Quick-start (local)

```bash
git clone https://github.com/your-username/fbi-assistant-proxy.git
cd fbi-assistant-proxy
npm install

# put your key in a .env file
echo "OPENAI_API_KEY=sk-..." > .env

npm start
# ➜ Proxy listening on 8000

curl -XPOST http://localhost:8000/run_fbi_assistant \
  -H "Content-Type: application/json" \
  -d '{ "thread": [ { "role": "user", "content": "Who are the co-conspirators?" } ] }'
