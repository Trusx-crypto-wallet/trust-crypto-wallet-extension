export default function Home() {
  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'var(--bg-primary)'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '3.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem'
        }}>
          🛡️ Trust Crypto Wallet
        </h1>
        <p style={{ fontSize: '1.3rem', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
          Your secure gateway to DeFi - Multi-chain wallet with swap, bridge, and staking
        </p>
      </header>
      
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 style={{ marginBottom: '2rem', color: 'var(--text-primary)' }}>Get Started with Trust</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem', 
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <button 
            onClick={() => alert('Trust Crypto Wallet Extension - Coming Soon!')}
            style={{ 
              padding: '1.5rem 2rem', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            📥 Download Extension
          </button>
          
          <button 
            onClick={() => alert('Trust Web Wallet - Launch Soon!')}
            style={{ 
              padding: '1.5rem 2rem', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
              transition: 'transform 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            🌐 Launch Web Wallet
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
        marginBottom: '4rem'
      }}>
        <div style={{ 
          padding: '2rem', 
          background: 'white', 
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>🔄 Multi-Chain Swaps</h3>
          <p>Swap tokens across Ethereum, Polygon, BSC, and more with best rates</p>
        </div>
        
        <div style={{ 
          padding: '2rem', 
          background: 'white', 
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>🌉 Cross-Chain Bridge</h3>
          <p>Bridge assets seamlessly between different blockchain networks</p>
        </div>
        
        <div style={{ 
          padding: '2rem', 
          background: 'white', 
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>🛡️ Bank-Grade Security</h3>
          <p>Your keys, your crypto. Advanced encryption and biometric protection</p>
        </div>
      </div>
      
      <div style={{ 
        padding: '3rem', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: '20px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>About Trust Crypto Wallet</h3>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Built on Rainbow's proven foundation, Trust Crypto Wallet delivers enterprise-grade security 
          with consumer-friendly design. Manage multiple chains, DeFi protocols, and NFTs in one place.
        </p>
        <button 
          onClick={() => window.open('https://github.com/Trusx-crypto-wallet/trust-crypto-wallet-extension', '_blank')}
          style={{ 
            padding: '1rem 2rem', 
            background: 'rgba(255,255,255,0.2)', 
            color: 'white', 
            border: '2px solid rgba(255,255,255,0.3)', 
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.3)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          📚 View on GitHub
        </button>
      </div>
    </div>
  )
}
