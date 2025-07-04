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

    console.log('Using thread:', JSON.stringify(thread, null, 2));

    /* 1️⃣  Create a thread with the user-supplied messages */
    const createdThread = await openai.beta.threads.create({
      messages: thread
    });

    console.log('Created thread:', createdThread.id);

    /* 2️⃣  Run the working assistant (the one that works in platform.openai.com) */
    const run = await openai.beta.threads.runs.create(createdThread.id, {
      assistant_id: 'asst_lZh3NpiqqpIgSHggXYI6IDl5'
    });

    console.log('Started run:', run.id, 'with assistant asst_lZh3NpiqqpIgSHggXYI6IDl5');

    /* 3️⃣  Poll until the run is finished */
    let status;
    let pollCount = 0;
    do {
      await new Promise(r => setTimeout(r, 1000));        // 1-second back-off
      const poll = await openai.beta.threads.runs.retrieve(
        createdThread.id,
        run.id
      );
      status = poll.status;
      pollCount++;
      console.log(`Poll ${pollCount}: Run status: ${status}`);
      
      // Add more detailed status info
      if (poll.last_error) {
        console.log('Run error:', poll.last_error);
      }
      
    } while (status !== 'completed' && status !== 'failed' && pollCount < 60); // Max 60 seconds

    if (status === 'failed') {
      console.log('Run failed');
      return res.status(500).json({ error: 'assistant run failed' });
    }

    if (status !== 'completed') {
      console.log('Run timed out, status:', status);
      return res.status(500).json({ error: 'assistant run timed out' });
    }

    /* 4️⃣  Grab the assistant's final message */
    const messages = await openai.beta.threads.messages.list(createdThread.id);
    console.log('Messages retrieved, count:', messages.data.length);
    
    // Find the most recent assistant message (not user message)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    console.log('Assistant message:', JSON.stringify(assistantMessage, null, 2));
    
    const answer = assistantMessage?.content?.[0]?.text?.value ?? '[no assistant response found]';

    /* 🔍  Log the raw answer so you can inspect citations in Render logs */
    console.log('ASSISTANT ANSWER →', answer);

    res.json({ answer });
  } catch (err) {
    console.error('Full error:', err);
    res.status(500).json({ error: 'server error: ' + err.message });
  }
});

/* 5️⃣  Start the server */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Proxy listening on ${PORT}`));
