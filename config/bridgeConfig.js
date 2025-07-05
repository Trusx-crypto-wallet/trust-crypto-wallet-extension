// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// LayerZero Interfaces
interface IOFTV2 {
    struct LzCallParams {
        address payable refundAddress;
        address zroPaymentAddress;
        bytes adapterParams;
    }

    function sendFrom(
        address _from,
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint _amount,
        LzCallParams calldata _callParams
    ) external payable;

    function sendAndCall(
        address _from,
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint _amount,
        bytes calldata _payload,
        uint64 _dstGasForCall,
        LzCallParams calldata _callParams
    ) external payable;

    function circulatingSupply() external view returns (uint);
    function token() external view returns (address);
    function estimateSendFee(
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint _amount,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee);
    
    function estimateSendAndCallFee(
        uint16 _dstChainId,
        bytes32 _toAddress,
        uint _amount,
        bytes calldata _payload,
        uint64 _dstGasForCall,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee);
}

interface ILayerZeroReceiver {
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

interface ILayerZeroEndpoint {
    function send(
        uint16 _dstChainId,
        bytes memory _destination,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes memory _adapterParams
    ) external payable;

    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes memory _payload,
        bool _payInZRO,
        bytes memory _adapterParam
    ) external view returns (uint nativeFee, uint zroFee);
}

// Chainlink Price Feed Interface
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CrossChainUSDT is ERC20, AccessControl, Pausable, ReentrancyGuard, ILayerZeroReceiver {
    uint256 private constant INITIAL_SUPPLY = 1_000_000_00 * 10**6;
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address public immutable lzEndpoint;
    AggregatorV3Interface public priceFeed;
    mapping(uint16 => bytes) public trustedRemoteLookup;

    uint256 private _circulatingSupply;
    string private _tokenMetadata;
    string private _tokenListData;
    string private _tokenURI;
    
    // Public constants for URLs
    string public constant LOGO_URI = "https://raw.githubusercontent.com/massco12/crosschain-usdt-tokenlist/main/logos/usdt-logo.png";
    string public constant TOKEN_LIST_URL = "https://raw.githubusercontent.com/massco12/crosschain-usdt-tokenlist/main/tokenlist.json";

    // Events
    event ReceiveFromChain(uint16 indexed srcChainId, bytes srcAddress, address toAddress, uint amount);
    event SendToChain(uint16 indexed dstChainId, address from, bytes32 toAddress, uint amount);
    event SetTrustedRemote(uint16 indexed chainId, bytes path);
    event PriceFeedUpdated(address oldPriceFeed, address newPriceFeed);

    constructor(address _lzEndpoint, address _priceFeed) ERC20("Tether USD", "USDT") {
        require(_lzEndpoint != address(0), "CrossChainUSDT: zero endpoint address");
        require(_priceFeed != address(0), "CrossChainUSDT: zero price feed address");
        
        lzEndpoint = _lzEndpoint;
        priceFeed = AggregatorV3Interface(_priceFeed);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _mint(msg.sender, INITIAL_SUPPLY);
        _circulatingSupply = INITIAL_SUPPLY;
        
        // Initialize tokenURI and tokenListJSON on deployment
        _setTokenURI();
        _setTokenListJSON();
        setTokenMetadata();
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function circulatingSupply() public view returns (uint256) {
        return _circulatingSupply;
    }

    function token() public view returns (address) {
        return address(this);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _debitFrom(address _from, uint256 _amount) internal returns (uint256) {
        require(_from != address(0), "CrossChainUSDT: cannot debit from zero address");
        if (_from != msg.sender) {
            uint256 allowanceAmount = allowance(_from, msg.sender);
            require(allowanceAmount >= _amount, "CrossChainUSDT: insufficient allowance");
            _approve(_from, msg.sender, allowanceAmount - _amount);
        }
        _burn(_from, _amount);
        _circulatingSupply -= _amount;
        return _amount;
    }

    function _creditTo(address _toAddress, uint256 _amount) internal whenNotPaused nonReentrant returns (uint256) {
        _mint(_toAddress, _amount);
        _circulatingSupply += _amount;
        return _amount;
    }

    // Implemented lzReceive function to handle cross-chain transfers
    function lzReceive(
        uint16 _srcChainId, 
        bytes calldata _srcAddress, 
        uint64, 
        bytes calldata _payload
    ) external override {
        require(msg.sender == lzEndpoint, "CrossChainUSDT: only endpoint");
        
        // Optimized trusted remote validation using keccak256
        bytes memory trustedRemote = trustedRemoteLookup[_srcChainId];
        require(keccak256(trustedRemote) == keccak256(_srcAddress), "CrossChainUSDT: invalid source");

        (bytes32 toAddressBytes, uint256 amount) = abi.decode(_payload, (bytes32, uint256));
        address toAddress;
        assembly {
            toAddress := and(toAddressBytes, 0xffffffffffffffffffffffffffffffffffffffff)
        }

        _creditTo(toAddress, amount);
        emit ReceiveFromChain(_srcChainId, _srcAddress, toAddress, amount);
    }

    // Implementation of cross-chain transfer functionality
    function sendTokens(
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable whenNotPaused nonReentrant {
        require(trustedRemoteLookup[_dstChainId].length > 0, "CrossChainUSDT: destination chain not configured");
        
        // Create payload first to reduce stack depth
        bytes memory payload = _createPayload(_toAddress, _amount);
        
        // Get destination path
        bytes memory trustedPath = trustedRemoteLookup[_dstChainId];
        
        // Debit from sender
        _debitFrom(msg.sender, _amount);
        
        // Send the message
        _sendLayerZeroMessage(
            _dstChainId,
            trustedPath,
            payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
        
        // Emit event
        emit SendToChain(_dstChainId, msg.sender, _toBytes32(_toAddress), _amount);
    }
    
    // Helper function to create the payload
    function _createPayload(bytes calldata _toAddress, uint256 _amount) internal pure returns (bytes memory) {
        bytes32 toAddress = _toBytes32(_toAddress);
        return abi.encode(toAddress, _amount);
    }
    
    // Helper function to send LayerZero message
    function _sendLayerZeroMessage(
        uint16 _dstChainId,
        bytes memory _destination,
        bytes memory _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) internal {
        ILayerZeroEndpoint(lzEndpoint).send{value: msg.value}(
            _dstChainId,
            _destination,
            _payload,
            _refundAddress,
            _zroPaymentAddress,
            _adapterParams
        );
    }

    // Allow users to estimate cross-chain transfer fees
    function estimateSendFee(
        uint16 _dstChainId,
        bytes calldata _toAddress,
        uint256 _amount,
        bool _useZro,
        bytes calldata _adapterParams
    ) external view returns (uint nativeFee, uint zroFee) {
        require(trustedRemoteLookup[_dstChainId].length > 0, "CrossChainUSDT: destination chain not configured");

        bytes32 toAddress = _toBytes32(_toAddress);
        bytes memory lzPayload = abi.encode(toAddress, _amount);

        return ILayerZeroEndpoint(lzEndpoint).estimateFees(
            _dstChainId,
            address(this),
            lzPayload,
            _useZro,
            _adapterParams
        );
    }

    function setTrustedRemote(uint16 _remoteChainId, bytes calldata _path) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedRemoteLookup[_remoteChainId] = _path;
        emit SetTrustedRemote(_remoteChainId, _path);
    }

    function _toBytes32(bytes memory _bytes) internal pure returns (bytes32 result) {
        if (_bytes.length == 0) return 0x0;
        assembly {
            result := mload(add(_bytes, 32))
        }
    }

    function getLatestPrice() public view returns (int256) {
        (, int256 price, , ,) = priceFeed.latestRoundData();
        return price;
    }

    function getMarketCap() public view returns (uint256) {
        (, int256 price, , ,) = priceFeed.latestRoundData();
        return (circulatingSupply() * uint256(price)) / 1e8;
    }

    // EIP-1046 implementation: Returns metadata URI with embedded data
    function tokenURI() public view returns (string memory) {
        return _tokenURI;
    }
    
    // Direct logoURI accessor for wallets that look for this
    function logoURI() public pure returns (string memory) {
        return LOGO_URI;
    }
    
    // Returns token list JSON for compatible wallets
    function getTokenList() public view returns (string memory) {
        return _tokenListData;
    }
    
    // Returns URL to hosted token list
    function getTokenListURL() public pure returns (string memory) {
        return TOKEN_LIST_URL;
    }
    
    // On-chain embedded Base64 logo for some wallets
    function getLogoBase64() public pure returns (string memory) {
        return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzI2QTE3QiIvPjxwYXRoIGQ9Ik0xNy45MjIgMTcuMzgzdi0uMDAyYy0uMTEuMDA4LS42NzcuMDQyLTEuOTQyLjA0Mi0xLjAxIDAtMS43MjEtLjAzLTEuOTcxLS4wNDJ2LjAwM2MtMy44ODgtLjE3MS02Ljc5LS44NDgtNi43OS0xLjY1OCAwLS44MDkgMi45MDItMS40ODYgNi43OS0xLjY2djIuNjQ0Yy4yNTQuMDE4Ljk4Mi4wNDUgMS45ODguMDQ1IDEuMjA3IDAgMS44MTItLjA0IDEuOTI1LS4wNDV2LTIuNjQzYzMuODguMTczIDYuNzc1Ljg1IDYuNzc1IDEuNjU4IDAgLjgxLTIuODk1IDEuNDg1LTYuNzc1IDEuNjU4bTAtMy41OXYtMi4zNjZoNS40MTRWOC44MTlIOC41OTV2My42MDhoNS40MTR2Mi4zNjVjLTQuNC4yMDItNy43MDkgMS4wNzQtNy43MDkgMi4xMTggMCAxLjA0NCAzLjMwOSAxLjkxNiA3LjcwOSAyLjExOHY3LjU4MmgzLjkxM3YtNy41ODRjNC4zOTMtLjIwMiA3LjY5NC0xLjA3MyA3LjY5NC0yLjExNiAwLTEuMDQzLTMuMzAxLTEuOTE0LTcuNjk0LTIuMTE3IiBmaWxsPSIjRkZGRkZGIi8+PC9zdmc+";
    }
    
    // Implementation of missing functions
    function _setTokenURI() internal {
        _tokenURI = string(
            abi.encodePacked(
                'data:application/json;base64,',
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name":"Tether USD","description":"Cross-chain capable USDT token","decimals":6,"symbol":"USDT",',
                            '"image":"', getLogoBase64(), '",',
                            '"properties":{"tokenContract":"', Strings.toHexString(uint256(uint160(address(this))), 20), '"}}' 
                        )
                    )
                )
            )
        );
    }
    
    function _setTokenListJSON() internal {
        _tokenListData = string(
            abi.encodePacked(
                '{"name":"CrossChain USDT","logoURI":"', LOGO_URI, '",',
                '"keywords":["stablecoin","cross-chain","usdt"],"timestamp":"', 
                Strings.toString(block.timestamp),
                '","tokens":[{"chainId":', 
                Strings.toString(block.chainid),
                ',"address":"', 
                Strings.toHexString(uint256(uint160(address(this))), 20),
                '","symbol":"USDT","name":"Tether USD","decimals":6,"logoURI":"', 
                LOGO_URI,
                '"}],"version":{"major":1,"minor":0,"patch":0}}'
            )
        );
    }
    
    function setTokenMetadata() internal {
        _tokenMetadata = string(
            abi.encodePacked(
                '{"name":"Tether USD","symbol":"USDT","decimals":6,"address":"',
                Strings.toHexString(uint256(uint160(address(this))), 20),
                '","logoURI":"', LOGO_URI, '","chainId":',
                Strings.toString(block.chainid), '}'
            )
        );
    }
    
    // ===== NEW USD PRICE DISPLAY FUNCTIONS =====
    
    // Get the latest USD price from Chainlink with proper validation
    function getUsdPrice() public view returns (int256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        // Validate the price data
        require(price > 0, "Invalid price");
        require(updatedAt > block.timestamp - 24 hours, "Price is stale");
        require(answeredInRound >= roundId, "Price round not complete");
        
        return price;
    }

    // Get price feed decimals
    function getPriceFeedDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }

    // Calculate USD value of token amount
    function getUsdValueOf(uint256 tokenAmount) public view returns (uint256) {
        int256 usdPrice = getUsdPrice();
        uint8 priceDecimals = getPriceFeedDecimals();
        
        // Calculate USD value based on price feed decimals
        return (tokenAmount * uint256(usdPrice)) / (10**priceDecimals);
    }

    // Get user's balance in USD
    function getBalanceInUsd(address user) public view returns (uint256) {
        uint256 tokenBalance = balanceOf(user);
        return getUsdValueOf(tokenBalance);
    }

    // Format USD value for display
    function formatUsdDisplay(uint256 tokenAmount) public view returns (string memory) {
        uint256 usdValue = getUsdValueOf(tokenAmount);
        uint8 priceDecimals = getPriceFeedDecimals();
        
        // Most price feeds use 8 decimals, so we convert to dollars and cents
        uint256 dollars = usdValue / (10**(priceDecimals-2)); // Convert to dollars with 2 decimal places
        
        // Format with $ sign and 2 decimal places
        string memory dollarStr = Strings.toString(dollars / 100); // Integer part
        
        // Get cents (last 2 digits)
        uint256 cents = dollars % 100;
        string memory centsStr;
        
        // Format cents with leading zero if needed
        if (cents < 10) {
            centsStr = string(abi.encodePacked("0", Strings.toString(cents)));
        } else {
            centsStr = Strings.toString(cents);
        }
        
        return string(abi.encodePacked("$", dollarStr, ".", centsStr));
    }

    // Simplified version that returns the USD value in raw form (with 2 decimal precision)
    function getUsdValueRaw(uint256 tokenAmount) public view returns (uint256) {
        int256 usdPrice = getLatestPrice(); // Using the existing function
        
        // Assuming Chainlink price feed uses 8 decimals
        // We want 2 decimal places for USD display
        // 2.45 USDT * price / 10^8 * 10^2 (for 2 decimal places)
        return (tokenAmount * uint256(usdPrice) * 100) / 1e8 / 1e6;
    }

    // Function to update price feed address if needed
    function updatePriceFeed(address _newPriceFeed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newPriceFeed != address(0), "CrossChainUSDT: zero price feed address");
        address oldPriceFeed = address(priceFeed);
        priceFeed = AggregatorV3Interface(_newPriceFeed);
        emit PriceFeedUpdated(oldPriceFeed, _newPriceFeed);
    }
}
