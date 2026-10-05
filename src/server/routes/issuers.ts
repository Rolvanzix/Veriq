import { Router } from 'express';
import { isAddress } from 'viem';
import { issuerRepository, type IssuerRecord } from '../database/issuer.repo';
import { arcIndexer } from '../indexing/indexer';

export const issuerRouter = Router();

// List all registered issuers
issuerRouter.get('/', async (req, res) => {
  try {
    const issuers = await issuerRepository.getAll();
    return res.json(issuers);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get issuer by address
issuerRouter.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const issuer = await issuerRepository.getByAddress(address);
    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not found' });
    }
    return res.json(issuer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Register new issuer profile
issuerRouter.post('/register', async (req, res) => {
  try {
    const {
      address,
      organizationName,
      didUri,
      metadataHash,
      contactEmail,
      website,
      description,
    } = req.body;

    if (!address || !isAddress(address)) {
      return res.status(400).json({ error: 'Valid EVM address required' });
    }
    if (!organizationName || organizationName.trim().length === 0) {
      return res.status(400).json({ error: 'organizationName required' });
    }

    const newIssuer: IssuerRecord = {
      address,
      organizationName: organizationName.trim(),
      didUri: didUri || `did:arc:${address}`,
      metadataHash: metadataHash || '0x0000000000000000000000000000000000000000000000000000000000000000',
      status: 'VERIFIED', // Set verified for accredited onboarding
      contactEmail,
      website,
      description,
      registeredAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      credentialCount: 0,
    };

    const saved = await issuerRepository.upsert(newIssuer);

    arcIndexer.recordIndexedEvent({
      eventName: 'IssuerRegistered',
      txHash: `0xreg_${Date.now()}`,
      blockNumber: 1245894,
      summary: `Registered issuer ${organizationName} (${address.slice(0, 8)}...)`,
    });

    return res.status(201).json(saved);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
