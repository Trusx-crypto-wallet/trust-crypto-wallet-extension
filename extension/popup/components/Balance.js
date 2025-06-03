// Trust Crypto Wallet - Balance Component
const Balance = {
    currentBalance: '0.00',
    currentToken: 'ETH',

    render() {
        return `
            <div class="balance-section">
                <div class="total-balance">
                    <span class="balance-label">Total Balance</span>
                    <div class="balance-amount">
                        <span id="balance-value">${this.currentBalance}</span>
                        <span id="balance-currency">${this.currentToken}</span>
                    </div>
                    <div class="balance-usd">
                        <span id="balance-usd-value">$0.00 USD</span>
                    </div>
                </div>
                <div class="balance-actions">
                    <button id="copy-address-btn" class="action-btn">
                        <img src="../../public/images/ui-icons/copy-24.png" alt="Copy">
                        Copy Address
                    </button>
                </div>
            </div>
        `;
    },

    setupEvents() {
        const copyBtn = document.getElementById('copy-address-btn');
        
        copyBtn?.addEventListener('click', async () => {
            await this.copyAddress();
        });
    },

    async copyAddress() {
        try {
            const walletData = await chrome.storage.local.get(['walletAddress']);
            if (walletData.walletAddress) {
                await navigator.clipboard.writeText(walletData.walletAddress);
                this.showCopySuccess();
            }
        } catch (error) {
            console.error('Failed to copy address:', error);
        }
    },

    showCopySuccess() {
        const copyBtn = document.getElementById('copy-address-btn');
        const originalText = copyBtn.innerHTML;
        
        copyBtn.innerHTML = `
            <img src="../../public/images/ui-icons/copy-24.png" alt="Copied">
            Copied!
        `;
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    },

    updateBalance(balance, currency = 'ETH') {
        const balanceValue = document.getElementById('balance-value');
        const balanceCurrency = document.getElementById('balance-currency');
        
        if (balanceValue) balanceValue.textContent = balance;
        if (balanceCurrency) balanceCurrency.textContent = currency;
        
        this.currentBalance = balance;
        this.currentToken = currency;
    }
};

export default Balance;
