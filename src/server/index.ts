import { Router } from 'express';
import { authRouter } from './routes/auth';
import { credentialRouter } from './routes/credentials';
import { issuerRouter } from './routes/issuers';
import { verifyRouter } from './routes/verify';
import { indexerRouter } from './routes/indexer';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/credentials', credentialRouter);
apiRouter.use('/issuers', issuerRouter);
apiRouter.use('/verify', verifyRouter);
apiRouter.use('/indexer', indexerRouter);

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ARC Verify Core Service Layer',
    network: 'Arc Mainnet',
    chainId: 42424,
    timestamp: new Date().toISOString(),
  });
});
