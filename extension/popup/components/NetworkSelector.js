// Trust Crypto Wallet - Network Selector Component
const NetworkSelector = {
    networks: [
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
        { id: 'bsc', name: 'BSC', symbol: 'BNB', color: '#f3ba2f' },
        { id: 'polygon', name: 'Polygon', symbol: 'MATIC', color: '#8247e5' },
        { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', color: '#e84142' },
        { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', color: '#28a0f0' },
        { id: 'optimism', name: 'Optimism', symbol: 'OP', color: '#ff0420' }
    ],
    selectedNetwork: 'ethereum',

    render() {
        return `
            <div class="network-selector">
                <div class="network-header">
                    <span class="network-label">Network</span>
                    <button id="network-dropdown-btn" class="network-dropdown">
                        <div id="selected-network" class="selected-network">
                            ${this.renderSelectedNetwork()}
                        </div>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                </div>
                <div id="network-dropdown" class="network-dropdown-menu hidden">
                    ${this.renderNetworkOptions()}
                </div>
            </div>
        `;
    },

    renderSelectedNetwork() {
        const network = this.networks.find(n => n.id === this.selectedNetwork);
        return `
            <div class="network-item">
                <div class="network-icon" style="background-color: ${network.color}"></div>
                <span class="network-name">${network.name}</span>
                <span class="network-symbol">${network.symbol}</span>
            </div>
        `;
    },

    renderNetworkOptions() {
        return this.networks.map(network => `
            <div class="network-option ${network.id === this.selectedNetwork ? 'selected' : ''}" 
                 data-network="${network.id}">
                <div class="network-icon" style="background-color: ${network.color}"></div>
                <span class="network-name">${network.name}</span>
                <span class="network-symbol">${network.symbol}</span>
            </div>
        `).join('');
    },

    setupEvents() {
        const dropdownBtn = document.getElementById('network-dropdown-btn');
        const dropdown = document.getElementById('network-dropdown');

        dropdownBtn?.addEventListener('click', () => {
            dropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.network-selector')) {
                dropdown.classList.add('hidden');
            }
        });

        // Handle network selection
        dropdown?.addEventListener('click', (e) => {
            const networkOption = e.target.closest('.network-option');
            if (networkOption) {
                const networkId = networkOption.dataset.network;
                this.selectNetwork(networkId);
            }
        });
    },

    async selectNetwork(networkId) {
        this.selectedNetwork = networkId;
        
        // Update UI
        const selectedNetworkEl = document.getElementById('selected-network');
        selectedNetworkEl.innerHTML = this.renderSelectedNetwork();
        
        // Update dropdown options
        const dropdown = document.getElementById('network-dropdown');
        dropdown.innerHTML = this.renderNetworkOptions();
        dropdown.classList.add('hidden');
        
        // Save to storage
        await chrome.storage.local.set({ selectedNetwork: networkId });
        
        // Notify background script of network change
        chrome.runtime.sendMessage({ 
            action: 'networkChanged', 
            network: networkId 
        });
        
        // Refresh balance for new network
        chrome.runtime.sendMessage({ action: 'refreshBalance' });
    },

    setSelectedNetwork(networkId) {
        this.selectedNetwork = networkId;
    }
};

export default NetworkSelector;
