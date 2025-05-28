// pages/bridge.js
import Head from 'next/head'
import { useState } from 'react'

export default function BridgePage() {
  const [from, setFrom] = useState('ethereum')
  const [to, setTo] = useState('polygon')
  const [amount, setAmount] = useState('')
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [bridging, setBridging] = useState(false)

  // Available chains
  const chains = [
    { value: 'ethereum', label: 'Ethereum', logo: '🔷' },
    { value: 'bsc', label: 'Binance Smart Chain', logo: '🟡' },
    { value: 'polygon', label: 'Polygon', logo: '🟣' },
    { value: 'arbitrum', label: 'Arbitrum', logo: '🔵' },
    { value: 'optimism', label: 'Optimism', logo: '🔴' },
    { value: 'avalanche', label: 'Avalanche', logo: '⚪' },
  ]

  const handleSubmit = async e => {
    e.preventDefault()
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    if (from === to) {
      setError('Please select different chains')
      return
    }
    
    setLoading(true)
    setError('')
    setRoutes([])
    
    try {
      const res = await fetch('/api/bridge-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, amount })
      })
      
      if (!res.ok) {
        throw new Error('Failed to fetch bridge routes')
      }
      
      const data = await res.json()
      setRoutes(data.routes || [])
      
      if (!data.routes || data.routes.length === 0) {
        setError('No bridge routes available for this pair')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch routes')
      console.error('Bridge routes error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBridge = async (route) => {
    setBridging(true)
    setError('')
    
    try {
      const res = await fetch('/api/execute-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: route.id,
          from,
          to,
          amount,
          userAddress: '0x...' // This should come from wallet connection
        })
      })
      
      if (!res.ok) {
        throw new Error('Bridge transaction failed')
      }
      
      const result = await res.json()
      console.log('Bridge successful:', result)
      
      // Reset form or show success message
      setRoutes([])
      setAmount('')
      alert('Bridge transaction initiated successfully!')
      
    } catch (err) {
      setError(err.message || 'Bridge transaction failed')
      console.error('Bridge execution error:', err)
    } finally {
      setBridging(false)
    }
  }

  const getChainLabel = (chainValue) => {
    return chains.find(chain => chain.value === chainValue)?.label || chainValue
  }

  const getChainLogo = (chainValue) => {
    return chains.find(chain => chain.value === chainValue)?.logo || '⚫'
  }

  return (
    <>
      <Head>
        <title>Bridge — Trust Crypto Wallet</title>
        <meta name="description" content="Cross-chain bridge for seamless crypto transfers" />
      </Head>
      
      <main className="container mx-auto p-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
            Cross-Chain Bridge
          </h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* From Chain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                From Chain
              </label>
              <div className="relative">
                <select 
                  value={from} 
                  onChange={e => setFrom(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  {chains.map(chain => (
                    <option key={chain.value} value={chain.value}>
                      {chain.logo} {chain.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const temp = from
                  setFrom(to)
                  setTo(temp)
                }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                🔄
              </button>
            </div>

            {/* To Chain */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                To Chain
              </label>
              <div className="relative">
                <select 
                  value={to} 
                  onChange={e => setTo(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  {chains.map(chain => (
                    <option key={chain.value} value={chain.value}>
                      {chain.logo} {chain.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute right-3 top-3 text-gray-500 text-sm">
                  ETH
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !amount}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Finding Routes...
                </div>
              ) : (
                'Find Bridge Routes'
              )}
            </button>
          </form>

          {/* Routes Display */}
          {routes.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Available Routes
              </h2>
              
              {routes.map((route, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {route.protocol || `Route ${index + 1}`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getChainLogo(from)} {getChainLabel(from)} → {getChainLogo(to)} {getChainLabel(to)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-800">
                        {route.outputAmount || amount} ETH
                      </div>
                      <div className="text-sm text-gray-500">
                        Fee: {route.fee || '0.1%'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                    <span>Time: {route.estimatedTime || '5-10 minutes'}</span>
                    <span>Gas: ~${route.gasCost || '15'}</span>
                  </div>
                  
                  <button
                    onClick={() => handleBridge(route)}
                    disabled={bridging}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {bridging ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Bridging...
                      </div>
                    ) : (
                      'Use This Route'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bridge Status */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>🔒 Secure cross-chain bridging powered by Trust Wallet</p>
            <p>Always verify transaction details before confirming</p>
          </div>
        </div>
      </main>
    </>
  )
}
