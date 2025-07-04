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

    /* 1️⃣  Create a temporary assistant with the specific vector store */
    const tempAssistant = await openai.beta.assistants.create({
      name: "FBI Document Search Assistant",
      instructions: "You are an FBI document analyst. Search through the attached FBI documents to answer questions with specific quotes and document references. Provide detailed, factual responses based only on the document content.",
      model: "gpt-4-turbo-preview",
      tools: [{ "type": "file_search" }],
      tool_resources: {
        "file_search": {
          "vector_store_ids": ["vs_68666bdc4aa08191a99e514a4b89dbfd"]
        }
      }
    });

    console.log('Created temporary assistant:', tempAssistant.id);

    /* 2️⃣  Create a thread with the user messages */
    const createdThread = await openai.beta.threads.create({
      messages: thread
    });

    /* 3️⃣  Run the temporary assistant */
    const run = await openai.beta.threads.runs.create(createdThread.id, {
      assistant_id: tempAssistant.id
    });

    /* 4️⃣  Poll until the run is finished */
    let status;
    do {
      await new Promise(r => setTimeout(r, 1000));
      const poll = await openai.beta.threads.runs.retrieve(
        createdThread.id,
        run.id
      );
      status = poll.status;
      console.log('Run status:', status);
    } while (status !== 'completed' && status !== 'failed');

    if (status === 'failed') {
      // Clean up the temporary assistant
      await openai.beta.assistants.del(tempAssistant.id);
      return res.status(500).json({ error: 'assistant run failed' });
    }

    /* 5️⃣  Get the assistant's response */
    const messages = await openai.beta.threads.messages.list(createdThread.id);
    const answer = messages.data.at(-1)?.content?.[0]?.text?.value ?? '[no content]';

    /* 6️⃣  Clean up the temporary assistant */
    await openai.beta.assistants.del(tempAssistant.id);
    
    console.log('Generated answer:', answer);

    res.json({ answer });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'server error: ' + err.message });
  }
});

/* 5️⃣  Start the server */
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Proxy listening on ${PORT}`));
