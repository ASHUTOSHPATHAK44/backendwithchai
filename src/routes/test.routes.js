// test.routes.js

import { Router } from 'express';

const router = Router();

router.post('/test', (req, res) => {
    console.log('ok')
  res.status(200).json({ message: 'POST request received at /test' });
});

export default router;
