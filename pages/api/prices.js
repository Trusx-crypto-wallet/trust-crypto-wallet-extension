export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Trust Crypto Wallet Price API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {
      prices: [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: 2845.67,
          change24h: 2.34,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 67432.18,
          change24h: -0.89,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'MATIC',
          name: 'Polygon',
          price: 0.8934,
          change24h: 5.67,
          lastUpdated: new Date().toISOString()
        }
      ],
      totalTokens: 3,
      source: 'Trust Crypto Wallet Price Feed'
    }
  })
}
