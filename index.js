import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(express.json());

app.post('/run_fbi_assistant', async (req, res) => {
  try {
    const { thread } = req.body;
    if (!Array.isArray(thread) || thread.length === 0) {
      return res.status(400).json({ error: 'thread array is required' });
    }

    /* 1️⃣ create a Thread */
    const createdThread = await openai.beta.threads.create({
      messages: thread
    });

    /* 2️⃣ run the Assistant */
    const run = await openai.beta.threads.runs.create(createdThread.id, {
      assistant_id: 'asst_lZh3NpiqqpIgSHggXYI6IDl5'
    });

    /* 3️⃣ poll until completed (simple long-poll loop) */
    let status;
    do {
      await new Promise(r => setTimeout(r, 1000));
      const poll = await openai.beta.threads.runs.retrieve(
        createdThread.id,
        run.id
      );
      status = poll.status;
    } while (status !== 'completed' && status !== 'failed');

    if (status === 'failed') {
      return res.status(500).json({ error: 'assistant run failed' });
    }

    /* 4️⃣ grab the final assistant message */
    const messages = await openai.beta.threads.messages.list(createdThread.id);
    const answer =
      messages.data.at(-1)?.content?.[0]?.text?.value ?? '[no content]';

    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Proxy listening on ${PORT}`));
