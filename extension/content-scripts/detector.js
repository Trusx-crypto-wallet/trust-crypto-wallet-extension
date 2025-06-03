// Trust Crypto Wallet - Advanced DApp Detection System
(function() {
    'use strict';

    console.log('Trust Crypto Wallet DApp detector loaded');

    class TrustWalletDappDetector {
        constructor() {
            this.detectionScore = 0;
            this.detectedFeatures = new Set();
            this.dappCategories = new Set();
            this.isMonitoring = false;
            
            this.init();
        }

        async init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.startDetection());
            } else {
                this.startDetection();
            }

            // Additional detection after full page load
            window.addEventListener('load', () => {
                setTimeout(() => this.performDeepScan(), 2000);
            });
        }

        startDetection() {
            this.performInitialScan();
            this.setupContinuousMonitoring();
            this.monitorScriptTags();
            this.monitorNetworkRequests();
            
            console.log('Trust Crypto Wallet: DApp detection started');
        }

        performInitialScan() {
            this.scanForWeb3Libraries();
            this.scanForWalletConnectors();
            this.scanForBlockchainContent();
            this.scanForDeFiElements();
            this.scanForNFTContent();
            this.scanForDAOElements();
            this.scanForGameFiContent();
            this.scanMetadata();
            
            this.calculateDappScore();
            this.reportDetection();
        }

        performDeepScan() {
            // Deeper analysis after page is fully loaded
            this.scanDynamicContent();
            this.analyzeScriptContent();
            this.checkForHiddenElements();
            this.validateDetection();
            
            this.calculateDappScore();
            this.reportDetection();
        }

        scanForWeb3Libraries() {
            const web3Libraries = {
                'web3.js': ['Web3', 'web3'],
                'ethers.js': ['ethers', 'Ethers'],
                'wagmi': ['wagmi', 'useAccount', 'useConnect'],
                'rainbow-kit': ['RainbowKit', 'ConnectButton'],
                'web3modal': ['Web3Modal', 'WalletConnect'],
                'metamask': ['ethereum', 'window.ethereum'],
                'walletconnect': ['WalletConnect', 'walletconnect'],
                'coinbase-wallet': ['CoinbaseWallet', 'coinbaseWallet']
            };

            Object.entries(web3Libraries).forEach(([library, identifiers]) => {
                identifiers.forEach(identifier => {
                    if (this.checkGlobalVariable(identifier) || this.checkInPageContent(identifier)) {
                        this.addDetection('web3-library', library, 15);
                    }
                });
            });
        }

        scanForWalletConnectors() {
            const walletConnectors = [
                // Button text patterns
                'connect wallet',
                'connect metamask',
                'connect coinbase',
                'connect to wallet',
                'link wallet',
                'sign in with wallet',
                'authenticate with wallet',
                
                // CSS class patterns
                'wallet-connect',
                'connect-button',
                'metamask-connect',
                'web3-connect',
                'login-wallet'
            ];

            walletConnectors.forEach(pattern => {
                if (this.findElementsByTextOrClass(pattern)) {
                    this.addDetection('wallet-connector', pattern, 10);
                }
            });
        }

        scanForBlockchainContent() {
            const blockchainPatterns = {
                'ethereum-addresses': /0x[a-fA-F0-9]{40}/g,
                'transaction-hashes': /0x[a-fA-F0-9]{64}/g,
                'ens-domains': /\w+\.eth\b/g,
                'token-symbols': /\b(ETH|WETH|USDC|USDT|DAI|MATIC|BNB|AVAX|ARB|OP|SOL|ADA|DOT)\b/g,
                'gas-references': /\b(gas|gwei|wei)\b/gi,
                'block-numbers': /block\s*#?\s*\d{7,}/gi
            };

            const pageContent = document.body ? document.body.innerText : '';
            
            Object.entries(blockchainPatterns).forEach(([type, pattern]) => {
                const matches = pageContent.match(pattern);
                if (matches && matches.length > 0) {
                    this.addDetection('blockchain-content', type, Math.min(matches.length * 2, 20));
                }
            });
        }

        scanForDeFiElements() {
            const defiKeywords = [
                'liquidity', 'yield farming', 'staking', 'governance',
                'swap', 'exchange', 'pool', 'apy', 'apr',
                'lending', 'borrowing', 'collateral', 'flash loan',
                'uniswap', 'sushiswap', 'compound', 'aave',
                'pancakeswap', 'curve', 'balancer', 'yearn'
            ];

            const defiSelectors = [
                '[class*="swap"]', '[class*="pool"]', '[class*="stake"]',
                '[class*="farm"]', '[class*="yield"]', '[class*="liquidity"]',
                '[id*="swap"]', '[id*="stake"]', '[id*="farm"]'
            ];

            // Check keywords
            defiKeywords.forEach(keyword => {
                if (this.checkInPageContent(keyword)) {
                    this.addDetection('defi-content', keyword, 8);
                    this.dappCategories.add('defi');
                }
            });

            // Check UI elements
            defiSelectors.forEach(selector => {
                if (document.querySelector(selector)) {
                    this.addDetection('defi-ui', selector, 10);
                    this.dappCategories.add('defi');
                }
            });
        }

        scanForNFTContent() {
            const nftKeywords = [
                'nft', 'non-fungible', 'collectible', 'digital art',
                'opensea', 'rarible', 'foundation', 'superrare',
                'erc-721', 'erc-1155', 'metadata', 'mint',
                'collection', 'floor price', 'rarity'
            ];

            const nftSelectors = [
                '[class*="nft"]', '[class*="collectible"]', '[class*="mint"]',
                '[class*="collection"]', '[class*="token-id"]'
            ];

            nftKeywords.forEach(keyword => {
                if (this.checkInPageContent(keyword)) {
                    this.addDetection('nft-content', keyword, 8);
                    this.dappCategories.add('nft');
                }
            });

            nftSelectors.forEach(selector => {
                if (document.querySelector(selector)) {
                    this.addDetection('nft-ui', selector, 10);
                    this.dappCategories.add('nft');
                }
            });
        }

        scanForDAOElements() {
            const daoKeywords = [
                'dao', 'governance', 'proposal', 'voting',
                'snapshot', 'aragon', 'colony', 'moloch',
                'token holder', 'governance token', 'quorum'
            ];

            daoKeywords.forEach(keyword => {
                if (this.checkInPageContent(keyword)) {
                    this.addDetection('dao-content', keyword, 8);
                    this.dappCategories.add('dao');
                }
            });
        }

        scanForGameFiContent() {
            const gamefiKeywords = [
                'play to earn', 'p2e', 'gamefi', 'metaverse',
                'axie infinity', 'sandbox', 'decentraland',
                'crypto game', 'blockchain game', 'nft game'
            ];

            gamefiKeywords.forEach(keyword => {
                if (this.checkInPageContent(keyword)) {
                    this.addDetection('gamefi-content', keyword, 8);
                    this.dappCategories.add('gamefi');
                }
            });
        }

        scanMetadata() {
            // Check page metadata for Web3 indicators
            const title = document.title.toLowerCase();
            const metaDescription = this.getMetaDescription().toLowerCase();
            const metaKeywords = this.getMetaKeywords().toLowerCase();
            
            const web3MetaTerms = [
                'dapp', 'defi', 'web3', 'ethereum', 'blockchain',
                'crypto', 'nft', 'dao', 'metaverse', 'gamefi'
            ];

            const allMeta = `${title} ${metaDescription} ${metaKeywords}`;
            
            web3MetaTerms.forEach(term => {
                if (allMeta.includes(term)) {
                    this.addDetection('metadata', term, 5);
                }
            });
        }

        scanDynamicContent() {
            // Look for dynamically loaded content
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                this.scanNewElement(node);
                            }
                        });
                    }
                });
            });

            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });

            // Disconnect after 30 seconds to avoid performance issues
            setTimeout(() => observer.disconnect(), 30000);
        }

        scanNewElement(element) {
            // Quick scan of newly added elements
            const text = element.textContent || '';
            const className = element.className || '';
            const id = element.id || '';
            
            const checkString = `${text} ${className} ${id}`.toLowerCase();
            
            if (checkString.includes('connect') && checkString.includes('wallet')) {
                this.addDetection('dynamic-wallet-ui', 'connect-wallet', 5);
            }
            
            if (/0x[a-fA-F0-9]{40}/.test(checkString)) {
                this.addDetection('dynamic-address', 'ethereum-address', 3);
            }
        }

        analyzeScriptContent() {
            // Analyze inline scripts for Web3 patterns
            const scripts = document.querySelectorAll('script');
            scripts.forEach((script, index) => {
                if (script.textContent) {
                    this.analyzeScriptText(script.textContent, index);
                }
            });
        }

        analyzeScriptText(scriptContent, index) {
            const web3Patterns = [
                /web3\.eth/g,
                /ethereum\.request/g,
                /window\.ethereum/g,
                /connectWallet/g,
                /eth_requestAccounts/g,
                /eth_sendTransaction/g,
                /personal_sign/g,
                /walletconnect/gi,
                /metamask/gi
            ];

            web3Patterns.forEach((pattern, patternIndex) => {
                const matches = scriptContent.match(pattern);
                if (matches) {
                    this.addDetection('script-analysis', `pattern-${patternIndex}`, matches.length);
                }
            });
        }

        checkForHiddenElements() {
            // Check for hidden Web3 elements that might appear later
            const hiddenSelectors = [
                '[style*="display: none"]',
                '[style*="visibility: hidden"]',
                '.hidden',
                '.invisible'
            ];

            hiddenSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const text = element.textContent || '';
                    if (text.toLowerCase().includes('wallet') || text.toLowerCase().includes('web3')) {
                        this.addDetection('hidden-web3', 'hidden-wallet-element', 3);
                    }
                });
            });
        }

        setupContinuousMonitoring() {
            if (this.isMonitoring) return;
            this.isMonitoring = true;

            // Monitor for new script tags
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.tagName === 'SCRIPT' && node.src) {
                            this.analyzeScriptSrc(node.src);
                        }
                    });
                });
            });

            observer.observe(document.head || document.documentElement, {
                childList: true,
                subtree: true
            });
        }

        monitorScriptTags() {
            // Check existing script sources
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                this.analyzeScriptSrc(script.src);
            });
        }

        analyzeScriptSrc(src) {
            const web3ScriptPatterns = [
                /web3\.min\.js/,
                /ethers\.js/,
                /metamask/,
                /walletconnect/,
                /rainbow.*kit/,
                /web3modal/,
                /coinbase.*wallet/,
                /infura/,
                /alchemy/,
                /moralis/
            ];

            web3ScriptPatterns.forEach((pattern, index) => {
                if (pattern.test(src)) {
                    this.addDetection('external-script', `web3-script-${index}`, 12);
                }
            });
        }

        monitorNetworkRequests() {
            // Override fetch to monitor API calls
            const originalFetch = window.fetch;
            window.fetch = (...args) => {
                const url = args[0];
                if (typeof url === 'string') {
                    this.analyzeNetworkRequest(url);
                }
                return originalFetch.apply(this, args);
            };
        }

        analyzeNetworkRequest(url) {
            const web3ApiPatterns = [
                /infura\.io/,
                /alchemy\.com/,
                /moralis\.io/,
                /quicknode\.com/,
                /getblock\.io/,
                /ankr\.com/,
                /chainstack\.com/,
                /rpc\./,
                /api\.ethereum/,
                /api\.polygon/
            ];

            web3ApiPatterns.forEach((pattern, index) => {
                if (pattern.test(url)) {
                    this.addDetection('api-call', `web3-api-${index}`, 8);
                }
            });
        }

        calculateDappScore() {
            // Reset score
            this.detectionScore = 0;
            
            // Calculate total score from all detections
            this.detectedFeatures.forEach(feature => {
                this.detectionScore += feature.score;
            });

            // Apply category bonuses
            if (this.dappCategories.size > 1) {
                this.detectionScore += this.dappCategories.size * 5;
            }
        }

        validateDetection() {
            // Validate detection results to reduce false positives
            const hasWalletUI = Array.from(this.detectedFeatures).some(f => 
                f.category === 'wallet-connector'
            );
            
            const hasBlockchainContent = Array.from(this.detectedFeatures).some(f => 
                f.category === 'blockchain-content'
            );
            
            const hasWeb3Library = Array.from(this.detectedFeatures).some(f => 
                f.category === 'web3-library'
            );

            // Require at least 2 of these indicators for high confidence
            const confidenceIndicators = [hasWalletUI, hasBlockchainContent, hasWeb3Library];
            const confidenceScore = confidenceIndicators.filter(Boolean).length;
            
            if (confidenceScore >= 2) {
                this.detectionScore += 20; // Confidence bonus
            }
        }

        addDetection(category, feature, score) {
            const detection = { category, feature, score, timestamp: Date.now() };
            this.detectedFeatures.add(detection);
            
            console.log(`Trust Crypto Wallet: Detected ${category}:${feature} (+${score})`);
        }

        async reportDetection() {
            const isDapp = this.detectionScore >= 25; // Threshold for DApp classification
            const confidence = Math.min(this.detectionScore / 50, 1); // Confidence 0-1
            
            const report = {
                isDapp,
                confidence,
                score: this.detectionScore,
                categories: Array.from(this.dappCategories),
                features: Array.from(this.detectedFeatures),
                url: window.location.href,
                origin: window.location.origin,
                title: document.title,
                timestamp: Date.now()
            };

            try {
                // Send detection report to background script
                await this.sendToBackground({
                    action: 'dappDetectionReport',
                    data: report
                });

                console.log(`Trust Crypto Wallet: DApp detection complete - Score: ${this.detectionScore}, DApp: ${isDapp}`);
            } catch (error) {
                console.error('Failed to send DApp detection report:', error);
            }
        }

        // Helper methods
        checkGlobalVariable(varName) {
            try {
                return window[varName] !== undefined;
            } catch (e) {
                return false;
            }
        }

        checkInPageContent(text) {
            const pageContent = document.body ? document.body.innerText.toLowerCase() : '';
            return pageContent.includes(text.toLowerCase());
        }

        findElementsByTextOrClass(pattern) {
            // Check by text content
            const textElements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.toLowerCase().includes(pattern.toLowerCase())
            );

            // Check by class name
            const classElements = document.querySelectorAll(`[class*="${pattern}"]`);
            
            // Check by ID
