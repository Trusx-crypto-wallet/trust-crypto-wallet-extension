export default function Home() {
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ color: '#0070f3', fontSize: '3rem' }}>
          🌈 Rainbow Wallet
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          Your gateway to Web3 - Browser Extension & Web App
        </p>
      </header>
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Get Started</h2>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center', 
          flexWrap: 'wrap' 
        }}>
          <button 
            onClick={() => alert('Extension download coming soon!')}
            style={{ 
              padding: '1rem 2rem', 
              background: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            📥 Download Extension
          </button>
          
          <button 
            onClick={() => alert('Web wallet coming soon!')}
            style={{ 
              padding: '1rem 2rem', 
              background: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            🌐 Launch Web Wallet
          </button>
        </div>
      </div>

      <div style={{ 
        padding: '2rem', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '12px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h3>About Rainbow Wallet</h3>
        <p>
          Rainbow Wallet is a powerful browser extension for managing 
          your cryptocurrency assets with security and simplicity.
        </p>
        <button 
          onClick={() => window.open('https://github.com/Trusx-crypto-wallet/trust-crypto-wallet-extension', '_blank')}
          style={{ 
            padding: '0.8rem 1.5rem', 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            border: '1px solid rgba(255,255,255,0.3)', 
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          📚 View on GitHub
        </button>
      </div>
    </div>
  )
}
