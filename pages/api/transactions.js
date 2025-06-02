export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Trust Crypto Wallet Transaction API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {
      transactions: [
        {
          id: 'tx_001',
          type: 'send',
          token: 'ETH',
          amount: '0.5',
          from: '0x1234...5678',
          to: '0x8765...4321',
          hash: '0xabcd...efgh',
          status: 'confirmed',
          chain: 'ethereum',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'tx_002',
          type: 'receive',
          token: 'USDC',
          amount: '100.0',
          from: '0x9876...5432',
          to: '0x1234...5678',
          hash: '0xijkl...mnop',
          status: 'confirmed',
          chain: 'ethereum',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'tx_003',
          type: 'swap',
          token: 'BNB',
          amount: '2.0',
          from: '0x1234...5678',
          to: '0xPancakeSwap',
          hash: '0xqrst...uvwx',
          status: 'confirmed',
          chain: 'bsc',
          timestamp: new Date(Date.now() - 14400000).toISOString()
        },
        {
          id: 'tx_004',
          type: 'bridge',
          token: 'MATIC',
          amount: '50.0',
          from: '0x1234...5678',
          to: '0x1234...5678',
          hash: '0xyzab...cdef',
          status: 'pending',
          chain: 'polygon',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: 'tx_005',
          type: 'send',
          token: 'AVAX',
          amount: '1.25',
          from: '0x1234...5678',
          to: '0x4321...8765',
          hash: '0xghij...klmn',
          status: 'confirmed',
          chain: 'avalanche',
          timestamp: new Date(Date.now() - 21600000).toISOString()
        },
        {
          id: 'tx_006',
          type: 'receive',
          token: 'ARB',
          amount: '15.0',
          from: '0x5432...1876',
          to: '0x1234...5678',
          hash: '0xopqr...stuv',
          status: 'confirmed',
          chain: 'arbitrum',
          timestamp: new Date(Date.now() - 28800000).toISOString()
        }
      ],
      totalTransactions: 6,
      page: 1,
      limit: 10,
      hasMore: false
    }
  })
}
