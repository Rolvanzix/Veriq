import { Router } from 'express';
import { verifyArcCredential } from '../../verification/verifier';
import type { ArcVerifiableCredential } from '../../verification/types';

export const verifyRouter = Router();

// Independent verification endpoint
verifyRouter.post('/', async (req, res) => {
  try {
    const raw = req.body;
    const credential = (raw?.credential || raw) as ArcVerifiableCredential;
    if (!credential || !credential.proof) {
      return res.status(400).json({ error: 'Valid Verifiable Credential object required' });
    }

    const verificationResult = await verifyArcCredential(credential);
    return res.json(verificationResult);
  } catch (err: any) {
    console.error('Verification error:', err);
    return res.status(500).json({ error: err.message || 'Verification execution failed' });
  }
});
