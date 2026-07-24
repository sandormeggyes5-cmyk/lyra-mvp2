import 'dotenv/config';
import { app } from './app.js';

const port = process.env.PORT ?? 3001;

app.listen(port, () => {
  console.log(`PhysioPilot API running on http://localhost:${port}`);
});
