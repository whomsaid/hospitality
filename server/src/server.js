import app from './app.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`Smart Hospital API running on http://localhost:${port}`);
});
