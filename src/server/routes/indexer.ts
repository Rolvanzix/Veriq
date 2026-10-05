import { Router } from 'express';
import { arcIndexer } from '../indexing/indexer';
import { getDb } from '../database/client';

export const indexerRouter = Router();

indexerRouter.get('/status', (req, res) => {
  const db = getDb();
  const state = arcIndexer.getState();
  return res.json({
    ...state,
    database: {
      type: db.isPostgresConnected ? 'PostgreSQL / Supabase (Connected)' : 'Transactional Memory Cache (Standalone Dev)',
      connected: db.isPostgresConnected,
    },
  });
});
