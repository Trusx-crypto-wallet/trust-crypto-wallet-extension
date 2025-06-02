export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Trust Crypto Wallet API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    wallet: 'Trust Crypto Wallet',
    features: ['send', 'receive', 'swap', 'bridge', 'multi-chain']
  })
}
