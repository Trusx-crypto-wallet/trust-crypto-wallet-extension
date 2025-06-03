// Trust Crypto Wallet - Web3 Provider Injection Script
(function () {
    'use strict';

    console.log('Trust Crypto Wallet inpage script loaded');

    // Prevent multiple injections
    if (window.trustWallet) {
        return;
    }

    // Supported chains configuration
    const SUPPORTED_CHAINS = {
        '0x1': { 
            name: 'Ethereum Mainnet', 
            networkVersion: '1',
            rpc: 'https://mainnet.infura.io/v3/...',
            blockExplorer: 'https://etherscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
        },
        '0x89': { 
            name: 'Polygon', 
            networkVersion: '137',
            rpc: 'https://polygon-rpc.com/',
            blockExplorer: 'https://polygonscan.com',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
        },
        '0x38': { 
            name: 'BSC', 
            networkVersion: '56',
            rpc: 'https://bsc-dataseed.binance.org/',
            blockExplorer: 'https://bscscan.com',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
        },
        '0xa4b1': { 
            name: 'Arbitrum One', 
            networkVersion: '42161',
            rpc: 'https://arb1.arbitrum.io/rpc',
            blockExplorer: 'https://arbiscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
        },
        '0xa': { 
            name: 'Optimism', 
            networkVersion: '10',
            rpc: 'https://mainnet.optimism.io/',
            blockExplorer: 'https://optimistic.etherscan.io',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
        },
        '0xa86a': { 
            name: 'Avalanche C-Chain', 
            networkVersion: '43114',
            rpc: 'https://api.avax.network/ext/bc/C/rpc',
            blockExplorer: 'https://snowtrace.io',
            nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
        }
    };

    class TrustWalletProvider {
        constructor() {
            this.isMetaMask = false; // Do not impersonate MetaMask
            this.isTrustWallet = true;
            this.selectedAddress = null;
            this.chainId = '0x1'; // Ethereum mainnet by default
            this.networkVersion = '1';
            this.isConnected = false;
            this.permissions = new Set();

            this.setupEventEmitter();
            this.setupMethods();
            this.checkExistingConnection();

            console.log('Trust Crypto Wallet provider initialized');
        }

        setupEventEmitter() {
            this.events = {};

            this.on = (event, callback) => {
                if (!this.events[event]) {
                    this.events[event] = [];
                }
                this.events[event].push(callback);
            };

            this.removeListener = (event, callback) => {
                if (this.events[event]) {
                    this.events[event] = this.events[event].filter(cb => cb !== callback);
                }
            };

            this.emit = (event, ...args) => {
                if (this.events[event]) {
                    this.events[event].forEach(callback => {
                        try {
                            callback(...args);
                        } catch (error) {
                            console.error('Trust Crypto Wallet event callback error:', error);
                        }
                    });
                }
            };
        }

        setupMethods() {
            // EIP-1193 standard request method with all Web3 methods
            this.request = async (args) => {
                const { method, params = [] } = args;

                console.log('Trust Crypto Wallet request:', method, params);

                try {
                    // Handle standard methods locally
                    switch (method) {
                        case 'eth_chainId':
                            return this.chainId;

                        case 'net_version':
                            return this.networkVersion;

                        case 'eth_accounts':
                            return this.selectedAddress ? [this.selectedAddress] : [];

                        case 'eth_requestAccounts':
                            return this.requestAccounts();

                        case 'wallet_switchEthereumChain':
                            return this.switchChain(params[0]);

                        case 'wallet_addEthereumChain':
                            return this.addChain(params[0]);

                        case 'wallet_getPermissions':
                            return this.getPermissions();

                        case 'wallet_requestPermissions':
                            return this.requestPermissions(params[0]);

                        case 'personal_sign':
                            return this.personalSign(params[0], params[1]);

                        case 'eth_signTypedData_v4':
                            return this.signTypedData(params[0], params[1]);

                        case 'eth_sendTransaction':
                            return this.sendTransaction(params[0]);

                        case 'eth_getBalance':
                            return this.getBalance(params[0], params[1]);

                        default:
                            // Send to background for other methods
                            const response = await this.sendMessage({
                                action: 'dappRequest',
                                data: { method, params }
                            });
                            return response.data;
                    }
                } catch (error) {
                    throw this.createProviderError(error);
                }
            };

            // Legacy Web3 compatibility methods
            this.send = (methodOrPayload, callbackOrParams) => {
                if (typeof methodOrPayload === 'string') {
                    return this.request({
                        method: methodOrPayload,
                        params: callbackOrParams || []
                    });
                } else if (typeof callbackOrParams === 'function') {
                    this.sendAsync(methodOrPayload, callbackOrParams);
                } else {
                    return this.request(methodOrPayload);
                }
            };

            this.sendAsync = (payload, callback) => {
                this.request(payload)
                    .then(result => callback(null, { id: payload.id, result }))
                    .catch(error => callback(error, null));
            };

            // Connection method
            this.enable = async () => {
                return this.request({ method: 'eth_requestAccounts' });
            };

            // Connection status check
            this.isConnected = () => {
                return this.selectedAddress !== null && this.isConnected;
            };
        }

        async checkExistingConnection() {
            try {
                const response = await this.sendMessage({ 
                    action: 'getConnectionStatus',
                    origin: window.location.origin 
                });
                
                if (response.success && response.data.connected) {
                    this.selectedAddress = response.data.account;
                    this.isConnected = true;
                    this.chainId = response.data.chainId || '0x1';
                    this.networkVersion = SUPPORTED_CHAINS[this.chainId]?.networkVersion || '1';
                    console.log('Trust Crypto Wallet: Existing connection restored');
                }
            } catch (error) {
                console.log('Trust Crypto Wallet: No existing connection found');
            }
        }

        async requestAccounts() {
            // Check if already connected
            if (this.selectedAddress && this.isConnected) {
                return [this.selectedAddress];
            }

            try {
                const response = await this.sendMessage({
                    action: 'requestAccounts',
                    origin: window.location.origin
                });

                if (response.success) {
                    this.selectedAddress = response.data.accounts[0];
                    this.isConnected = true;
                    this.permissions.add('eth_accounts');
                    this.emit('accountsChanged', response.data.accounts);
                    this.emit('connect', { chainId: this.chainId });
                    return response.data.accounts;
                }

                throw new Error('User rejected request');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async switchChain(chainParam) {
            const { chainId } = chainParam;
            
            if (!SUPPORTED_CHAINS[chainId]) {
                throw this.createProviderError({
                    code: 4902,
                    message: `Unrecognized chain ID "${chainId}". Try adding the chain using wallet_addEthereumChain first.`
                });
            }

            try {
                const response = await this.sendMessage({
                    action: 'switchChain',
                    data: { chainId }
                });

                if (response.success) {
                    this.chainId = chainId;
                    this.networkVersion = SUPPORTED_CHAINS[chainId].networkVersion;
                    this.emit('chainChanged', chainId);
                    this.emit('networkChanged', this.networkVersion);
                    return null;
                }

                throw new Error(response.error || 'Chain switch failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async addChain(chainParam) {
            try {
                const response = await this.sendMessage({
                    action: 'addChain',
                    data: chainParam
                });

                if (response.success) {
                    return null;
                }

                throw new Error(response.error || 'Chain addition failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async getPermissions() {
            return Array.from(this.permissions).map(permission => ({
                parentCapability: permission,
                date: Date.now()
            }));
        }

        async requestPermissions(permissions) {
            try {
                const response = await this.sendMessage({
                    action: 'requestPermissions',
                    data: permissions
                });

                if (response.success) {
                    response.data.forEach(permission => {
                        this.permissions.add(permission.parentCapability);
                    });
                    return response.data;
                }

                throw new Error(response.error || 'Permission request failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async personalSign(message, address) {
            try {
                const response = await this.sendMessage({
                    action: 'personalSign',
                    data: { message, address }
                });

                if (response.success) {
                    return response.data.signature;
                }

                throw new Error(response.error || 'Signing failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async signTypedData(address, typedData) {
            try {
                const response = await this.sendMessage({
                    action: 'signTypedData',
                    data: { address, typedData }
                });

                if (response.success) {
                    return response.data.signature;
                }

                throw new Error(response.error || 'Typed data signing failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async sendTransaction(txParams) {
            try {
                const response = await this.sendMessage({
                    action: 'sendTransaction',
                    data: txParams
                });

                if (response.success) {
                    return response.data.hash;
                }

                throw new Error(response.error || 'Transaction failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async getBalance(address, blockTag = 'latest') {
            try {
                const response = await this.sendMessage({
                    action: 'getBalance',
                    data: { address, blockTag }
                });

                if (response.success) {
                    return response.data.balance;
                }

                throw new Error(response.error || 'Balance request failed');
            } catch (error) {
                throw this.createProviderError(error);
            }
        }

        async sendMessage(message) {
            return new Promise((resolve, reject) => {
                const messageId = Date.now() + Math.random();

                const handleResponse = (event) => {
                    if (event.data.trustWalletResponse && event.data.messageId === messageId) {
                        window.removeEventListener('message', handleResponse);

                        if (event.data.success) {
                            resolve(event.data);
                        } else {
                            reject(new Error(event.data.error));
                        }
                    }
                };

                window.addEventListener('message', handleResponse);

                window.postMessage({
                    trustWalletRequest: true,
                    messageId,
                    ...message
                }, '*');

                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('message', handleResponse);
                    reject(new Error('Request timeout'));
                }, 30000);
            });
        }

        createProviderError(error) {
            return {
                code: error.code || -32603,
                message: error.message || 'Internal error',
                data: error.data
            };
        }

        // Network change handler
        handleNetworkChange(networkId, chainId) {
            this.networkVersion = networkId;
            this.chainId = chainId;

            this.emit('networkChanged', networkId);
            this.emit('chainChanged', chainId);
        }

        // Account change handler
        handleAccountsChange(accounts) {
            this.selectedAddress = accounts[0] || null;
            this.isConnected = accounts.length > 0;

            this.emit('accountsChanged', accounts);
        }

        // Connection status handlers
        handleConnect(connectInfo) {
            this.isConnected = true;
            this.emit('connect', connectInfo);
        }

        handleDisconnect(error) {
            this.selectedAddress = null;
            this.isConnected = false;
            this.permissions.clear();
            this.emit('disconnect', error);
        }
    }

    // Create and inject provider
    const trustWalletProvider = new TrustWalletProvider();
    window.trustWallet = trustWalletProvider;
    window.ethereum = trustWalletProvider; // Standard Web3 interface

    // Listen for events from content script
    window.addEventListener('message', (event) => {
        if (event.data.trustWalletEvent) {
            const { type, data } = event.data;

            switch (type) {
                case 'networkChanged':
                    trustWalletProvider.handleNetworkChange(data.networkId, data.chainId);
                    break;
                case 'accountsChanged':
                    trustWalletProvider.handleAccountsChange(data.accounts);
                    break;
                case 'connect':
                    trustWalletProvider.handleConnect(data);
                    break;
                case 'disconnect':
                    trustWalletProvider.handleDisconnect(data);
                    break;
            }
        }
    });

    // Announce Ethereum provider
    window.dispatchEvent(new Event('ethereum#initialized'));

    // EIP-6963: Provider Discovery with both PNG and SVG support
    const providerInfo = {
        uuid: 'trust-crypto-wallet-uuid',
        name: 'Trust Crypto Wallet',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAKUlEQVRYhe3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAODVAK8AAQ==',
        rdns: 'com.trustwallet.crypto'
    };

    // Also provide SVG version for systems that prefer it
    const providerInfoSVG = {
        uuid: 'trust-crypto-wallet-uuid-svg',
        name: 'Trust Crypto Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48L3N2Zz4=',
        rdns: 'com.trustwallet.crypto'
    };

    // Announce both PNG and SVG providers
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({
            info: providerInfo,
            provider: trustWalletProvider
        })
    }));

    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({
            info: providerInfoSVG,
            provider: trustWalletProvider
        })
    }));

    console.log('Trust Crypto Wallet Web3 multi-chain provider injected successfully');
})();
