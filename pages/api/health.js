export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Rainbow Wallet API is running',
    timestamp: new Date().toISOString(),
    version: '1.5.108'
  })
}
