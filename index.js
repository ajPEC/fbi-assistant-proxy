import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(express.json());

/* 👀  Log every incoming request so Render always shows something */
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* Tiny health-check */
app.get('/ping', (_req, res) => res.send('pong'));

app.post('/run_fbi_assistant', async (req, res) => {

  try {
    const { thread } = req.body;
    if (!Array.isArray(thread) || thread.length === 0) {
      return res.status(400).json({ error: 'thread array is required' });
    }

    /* 1️⃣  Create a thread with the user-supplied messages */
    const createdThread = await openai.beta.threads.create({
      messages: thread
    });

    /* 2️⃣  Run the Sheng-Thao assistant (retrieval is enabled on that assistant) */
    const run = await openai.beta.threads.runs.create(createdThread.id, {
      assistant_id: 'asst_lZh3NpiqqpIgSHggXYI6IDl5'
    });

    /* 3️⃣  Poll until the run is finished */
    let status;
    do {
      await new Promise(r => setTimeout(r, 1000));        // 1-second back-off
      const poll = await openai.beta.threads.runs.retrieve(
        createdThread.id,
        run.id
      );
      status = poll.status;
    } while (status !== 'completed' && status !== 'failed');

    if (status === 'failed') {
      return res.status(500).json({ error: 'assistant run failed' });
    }

    /* 4️⃣  Grab the assistant’s final message */
    const messages = await openai.beta.threads.messages.list(createdThread.id);
    const answer =
      messages.data.at(-1)?.content?.[0]?.text?.value ?? '[no content]';

    /* 🔍  Log the raw answer so you can inspect citations in Render logs */
    console.log('ASSISTANT ANSWER →', answer);

    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

/* 5️⃣  Start the server */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Proxy listening on ${PORT}`));
