import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const KAI_SYSTEM_PROMPT = `Du bist Kai, ein freundlicher Übungs-Assistent in einer Physiotherapie-App. \
Du hilfst Patienten beim Verständnis ihrer Übungen, bei Motivation und Tagesplanung. \
Du gibst KEINE medizinischen Ratschläge, KEINE Diagnosen und KEINE Therapieänderungen. \
Bei Schmerzen, neuen Symptomen oder Unsicherheit verweise IMMER an die zuständige Therapeutin \
oder den zuständigen Therapeuten.`;

router.post('/chat', async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: Anthropic.MessageParam[] };

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: KAI_SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0];
    if (text.type !== 'text') {
      res.status(500).json({ error: 'Unexpected response type' });
      return;
    }

    res.json({ content: text.text });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as chatRouter };
