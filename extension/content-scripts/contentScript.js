// Trust Crypto Wallet - Content Script for Page Interaction
(function() {
    'use strict';

    console.log('Trust Crypto Wallet content script loaded');

    class TrustWalletContentScript {
        constructor() {
            this.isInjected = false;
            this.dappDetected = false;
            this.connectedOrigin = null;
            
            this.init();
        }

        async init() {
            try {
                // Inject inpage script first
                await this.injectInpageScript();
                
                // Setup message listeners
                this.setupMessageListeners();
                
                // Setup DApp detection
                this.setupDappDetection();
                
                // Check for existing Web3 requests
                this.monitorWeb3Activity();
                
                console.log('Trust Crypto Wallet content script initialized');
            } catch (error) {
                console.error('Trust Crypto Wallet content script initialization failed:', error);
            }
        }

        async injectInpageScript() {
            if (this.isInjected) return;

            try {
                // Create script element
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('content-scripts/inpage.js');
                script.onload = () => {
                    script.remove();
                    this.isInjected = true;
                    console.log('Trust Crypto Wallet inpage script injected successfully');
                };
                script.onerror = (error) => {
                    console.error('Trust Crypto Wallet inpage script injection failed:', error);
                };

                // Inject before any other scripts
                (document.head || document.documentElement).appendChild(script);
            } catch (error) {
                console.error('Failed to inject Trust Crypto Wallet inpage script:', error);
            }
        }

        setupMessageListeners() {
            // Listen for messages from inpage script
            window.addEventListener('message', (event) => {
                // Only accept messages from same origin
                if (event.source !== window) return;

                if (event.data.trustWalletRequest) {
                    this.handleInpageMessage(event.data);
                }
            });

            // Listen for messages from background script
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleBackgroundMessage(message, sender, sendResponse);
                return true; // Keep message channel open
            });
        }

        async handleInpageMessage(data) {
            const { messageId, action, ...payload } = data;

            try {
                // Forward request to background script
                const response = await this.sendToBackground({
                    action,
                    origin: window.location.origin,
                    url: window.location.href,
                    title: document.title,
                    favicon: this.getFavicon(),
                    ...payload
                });

                // Send response back to inpage script
                window.postMessage({
                    trustWalletResponse: true,
                    messageId,
                    success: response.success,
                    data: response.data,
                    error: response.error
                }, '*');

            } catch (error) {
                console.error('Trust Crypto Wallet request failed:', error);
                
                // Send error response back to inpage script
                window.postMessage({
                    trustWalletResponse: true,
                    messageId,
                    success: false,
                    error: error.message || 'Request failed'
                }, '*');
            }
        }

        handleBackgroundMessage(message, sender, sendResponse) {
            const { action, data } = message;

            switch (action) {
                case 'accountsChanged':
                    this.notifyInpage('accountsChanged', { accounts: data.accounts });
                    sendResponse({ success: true });
                    break;

                case 'chainChanged':
                    this.notifyInpage('networkChanged', { 
                        networkId: data.networkId, 
                        chainId: data.chainId 
                    });
                    sendResponse({ success: true });
                    break;

                case 'connect':
                    this.connectedOrigin = window.location.origin;
                    this.notifyInpage('connect', data);
                    sendResponse({ success: true });
                    break;

                case 'disconnect':
                    this.connectedOrigin = null;
                    this.notifyInpage('disconnect', data);
                    sendResponse({ success: true });
                    break;

                case 'getDappInfo':
                    sendResponse({
                        success: true,
                        data: {
                            origin: window.location.origin,
                            url: window.location.href,
                            title: document.title,
                            favicon: this.getFavicon(),
                            isDapp: this.dappDetected,
                            hasWeb3: this.hasWeb3Elements()
                        }
                    });
                    break;

                case 'requestFocus':
                    window.focus();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        }

        notifyInpage(type, data) {
            window.postMessage({
                trustWalletEvent: true,
                type,
                data
            }, '*');
        }

        async sendToBackground(message) {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    
                    if (response && response.success !== undefined) {
                        resolve(response);
                    } else {
                        reject(new Error('Invalid response from background script'));
                    }
                });
            });
        }

        setupDappDetection() {
            // Check for Web3 indicators immediately
            this.detectDapp();

            // Monitor for dynamic content changes
            const observer = new MutationObserver(() => {
                this.detectDapp();
            });

            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'data-*']
            });

            // Check again after page fully loads
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => this.detectDapp(), 1000);
                });
            }

            window.addEventListener('load', () => {
                setTimeout(() => this.detectDapp(), 2000);
            });
        }

        detectDapp() {
            const wasDappDetected = this.dappDetected;
            
            // Check for DApp indicators
            this.dappDetected = this.hasWeb3Elements() || 
                               this.hasWeb3Keywords() || 
                               this.hasBlockchainContent();

            // Notify background if DApp status changed
            if (this.dappDetected !== wasDappDetected) {
                this.sendToBackground({
                    action: 'dappDetected',
                    data: {
                        detected: this.dappDetected,
                        origin: window.location.origin,
                        url: window.location.href,
                        title: document.title,
                        favicon: this.getFavicon()
                    }
                }).catch(error => {
                    console.error('Failed to notify background of DApp detection:', error);
                });

                console.log(`Trust Crypto Wallet: DApp ${this.dappDetected ? 'detected' : 'not detected'} on ${window.location.origin}`);
            }
        }

        hasWeb3Elements() {
            // Check for common Web3 UI elements
            const web3Selectors = [
                '[class*="connect"]',
                '[class*="wallet"]',
                '[class*="metamask"]',
                '[class*="web3"]',
                '[class*="ethereum"]',
                '[class*="crypto"]',
                '[class*="blockchain"]',
                '[id*="connect"]',
                '[id*="wallet"]',
                'button[class*="connect"]',
                'button[id*="connect"]',
                '[data-testid*="connect"]',
                '[data-testid*="wallet"]'
            ];

            return web3Selectors.some(selector => {
                try {
                    return document.querySelector(selector) !== null;
                } catch (e) {
                    return false;
                }
            });
        }

        hasWeb3Keywords() {
            // Check page content for Web3 keywords
            const web3Keywords = [
                'connect wallet',
                'metamask',
                'web3',
                'ethereum',
                'blockchain',
                'defi',
                'nft',
                'smart contract',
                'dapp',
                'decentralized',
                'crypto',
                'uniswap',
                'opensea',
                'polygon',
                'arbitrum',
                'optimism',
                'avalanche'
            ];

            const pageText = document.body ? document.body.innerText.toLowerCase() : '';
            const pageTitle = document.title.toLowerCase();
            const metaDescription = this.getMetaDescription().toLowerCase();

            const allText = `${pageText} ${pageTitle} ${metaDescription}`;

            return web3Keywords.some(keyword => allText.includes(keyword));
        }

        hasBlockchainContent() {
            // Check for blockchain-specific content
            const blockchainIndicators = [
                // Contract addresses (0x followed by 40 hex chars)
                /0x[a-fA-F0-9]{40}/,
                // Transaction hashes (0x followed by 64 hex chars)
                /0x[a-fA-F0-9]{64}/,
                // ENS domains
                /\.eth\b/,
                // Token symbols
                /\b(ETH|BTC|USDC|USDT|DAI|WETH|MATIC|BNB|AVAX|ARB|OP)\b/,
                // Gas-related terms
                /\bgas\s+(price|limit|fee)\b/i,
                // DeFi terms
                /\b(liquidity|yield|farming|staking|governance)\b/i
            ];

            const pageContent = document.body ? document.body.innerHTML : '';
            return blockchainIndicators.some(pattern => pattern.test(pageContent));
        }

        monitorWeb3Activity() {
            // Monitor for Web3 method calls
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const url = args[0];
                if (typeof url === 'string' && this.isWeb3Request(url)) {
                    console.log('Trust Crypto Wallet: Web3 API request detected:', url);
                    this.dappDetected = true;
                }
                return originalFetch.apply(this, args);
            };

            // Monitor for WebSocket connections to blockchain nodes
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(...args) {
                const url = args[0];
                if (typeof url === 'string' && this.isWeb3WebSocket(url)) {
                    console.log('Trust Crypto Wallet: Web3 WebSocket detected:', url);
                    this.dappDetected = true;
                }
                return new originalWebSocket(...args);
            }.bind(this);
        }

        isWeb3Request(url) {
            const web3Patterns = [
                /infura\.io/,
                /alchemy\.com/,
                /moralis\.io/,
                /quicknode\.com/,
                /getblock\.io/,
                /rpc\./,
                /mainnet/,
                /polygon/,
                /arbitrum/,
                /optimism/,
                /avalanche/,
                /eth_/,
                /web3_/
            ];

            return web3Patterns.some(pattern => pattern.test(url));
        }

        isWeb3WebSocket(url) {
            const wsPatterns = [
                /wss?:\/\/.*infura/,
                /wss?:\/\/.*alchemy/,
                /wss?:\/\/.*quicknode/,
                /wss?:\/\/.*moralis/,
                /mainnet.*websocket/,
                /polygon.*websocket/
            ];

            return wsPatterns.some(pattern => pattern.test(url));
        }

        getFavicon() {
            const favicon = document.querySelector('link[rel="icon"]') ||
                          document.querySelector('link[rel="shortcut icon"]') ||
                          document.querySelector('link[rel="apple-touch-icon"]');
            
            if (favicon) {
                return new URL(favicon.href, window.location.href).href;
            }
            
            return `${window.location.protocol}//${window.location.host}/favicon.ico`;
        }

        getMetaDescription() {
            const metaDescription = document.querySelector('meta[name="description"]');
            return metaDescription ? metaDescription.content : '';
        }

        // Cleanup method
        destroy() {
            // Remove any listeners if needed
            console.log('Trust Crypto Wallet content script destroyed');
        }
    }

    // Initialize content script
    const trustWalletContentScript = new TrustWalletContentScript();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        trustWalletContentScript.destroy();
    });

})();
