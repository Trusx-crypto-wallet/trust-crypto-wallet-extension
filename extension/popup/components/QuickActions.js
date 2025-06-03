// Trust Crypto Wallet - Quick Actions Component
const QuickActions = {
    render() {
        return `
            <div class="quick-actions">
                <div class="actions-grid">
                    <button id="send-btn" class="action-button">
                        <img src="../../public/images/ui-icons/send-24.png" alt="Send">
                        <span>Send</span>
                    </button>
                    <button id="receive-btn" class="action-button">
                        <img src="../../public/images/ui-icons/receive-24.png" alt="Receive">
                        <span>Receive</span>
                    </button>
                    <button id="swap-btn" class="action-button">
                        <img src="../../public/images/ui-icons/swap-24.png" alt="Swap">
                        <span>Swap</span>
                    </button>
                    <button id="bridge-btn" class="action-button">
                        <img src="../../public/images/ui-icons/bridge-24.png" alt="Bridge">
                        <span>Bridge</span>
                    </button>
                    <button id="history-btn" class="action-button">
                        <img src="../../public/images/ui-icons/history-24.png" alt="History">
                        <span>History</span>
                    </button>
                    <button id="scan-btn" class="action-button">
                        <img src="../../public/images/ui-icons/scan-24.png" alt="Scan">
                        <span>Scan</span>
                    </button>
                </div>
            </div>
        `;
    },

    setupEvents() {
        const sendBtn = document.getElementById('send-btn');
        const receiveBtn = document.getElementById('receive-btn');
        const swapBtn = document.getElementById('swap-btn');
        const bridgeBtn = document.getElementById('bridge-btn');
        const historyBtn = document.getElementById('history-btn');
        const scanBtn = document.getElementById('scan-btn');

        sendBtn?.addEventListener('click', () => this.openSendPage());
        receiveBtn?.addEventListener('click', () => this.openReceivePage());
        swapBtn?.addEventListener('click', () => this.openSwapPage());
        bridgeBtn?.addEventListener('click', () => this.openBridgePage());
        historyBtn?.addEventListener('click', () => this.openHistoryPage());
        scanBtn?.addEventListener('click', () => this.openScanPage());
    },

    openSendPage() {
        chrome.tabs.create({ url: chrome.runtime.getURL('send.html') });
        window.close();
    },

    openReceivePage() {
        chrome.tabs.create({ url: chrome.runtime.getURL('receive.html') });
        window.close();
    },

    openSwapPage() {
        chrome.tabs.create({ url: chrome.runtime.getURL('swap.html') });
        window.close();
    },

    openBridgePage() {
        chrome.tabs.create({ url: chrome.runtime.getURL('bridge.html') });
        window.close();
    },

    openHistoryPage() {
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
        window.close();
    },

    openScanPage() {
        // Open camera for QR code scanning
        chrome.tabs.create({ url: chrome.runtime.getURL('scan.html') });
        window.close();
    }
};

export default QuickActions;
