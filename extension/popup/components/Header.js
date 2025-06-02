// Trust Crypto Wallet - Header Component
const Header = {
    render() {
        return `
            <div class="trust-header">
                <div class="header-logo">
                    <img src="../../public/icons/icon-32.png" alt="Trust Wallet">
                    <span class="wallet-title">Trust Crypto Wallet</span>
                </div>
                <div class="header-actions">
                    <button id="settings-btn" class="icon-btn" title="Settings">
                        <img src="../../public/images/ui-icons/settings-24.png" alt="Settings">
                    </button>
                    <button id="refresh-btn" class="icon-btn" title="Refresh">
                        <img src="../../public/images/ui-icons/refresh-24.png" alt="Refresh">
                    </button>
                </div>
            </div>
        `;
    },

    setupEvents() {
        const settingsBtn = document.getElementById('settings-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        settingsBtn?.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
        });

        refreshBtn?.addEventListener('click', () => {
            this.refreshWallet();
        });
    },

    async refreshWallet() {
        // Refresh wallet data
        const refreshIcon = document.getElementById('refresh-btn');
        refreshIcon.style.transform = 'rotate(360deg)';
        
        // Trigger wallet data refresh
        chrome.runtime.sendMessage({ action: 'refreshWallet' });
        
        setTimeout(() => {
            refreshIcon.style.transform = 'rotate(0deg)';
        }, 500);
    }
};

export default Header;
