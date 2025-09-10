import express from 'express';

const router = express.Router();

router.get('/callback', (req, res) => {
  const { code, state, error, error_description } = req.query;
  console.log('query:', req.query);

  if (error) {
    return res.status(400).send(`OAuth error: ${error} - ${error_description}`);
  }

  res.send(`OK! code=${code}, state=${state}`);
});

export default router;