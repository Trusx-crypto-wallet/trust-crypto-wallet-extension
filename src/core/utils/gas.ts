import {
  Block,
  Provider,
  TransactionRequest,
} from '@ethersproject/abstract-provider';
import { getAddress } from '@ethersproject/address';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract, ContractInterface } from '@ethersproject/contracts';
import { serialize } from '@ethersproject/transactions';
import BigNumber from 'bignumber.js';

import { useNetworkStore } from '~/core/state/networks/networks';
import { globalColors } from '~/design-system/styles/designTokens';
import { RainbowError, logger } from '~/logger';

import { i18n } from '../languages';
import {
  OVM_GAS_PRICE_ORACLE,
  SupportedCurrencyKey,
  supportedCurrencies,
} from '../references';
import {
  MeteorologyLegacyResponse,
  MeteorologyResponse,
} from '../resources/gas/meteorology';
import { ParsedAsset } from '../types/assets';
import { ChainId } from '../types/chains';
import {
  BlocksToConfirmation,
  GasFeeLegacyParams,
  GasFeeParam,
  GasFeeParams,
  GasSpeed,
} from '../types/gas';

import { gweiToWei, weiToGwei } from './ethereum';
import { formatNumber } from './formatNumber';
import { addHexPrefix, convertStringToHex, toHex } from './hex';
import { fetchJsonLocally } from './localJson';
import {
  add,
  addBuffer,
  convertAmountAndPriceToNativeDisplayWithThreshold,
  convertRawAmountToBalance,
  divide,
  fraction,
  greaterThan,
  lessThan,
  multiply,
} from './numbers';
import { getMinimalTimeUnitStringForMs } from './time';

const formatDisplayNumber = (number: number | string) => {
  const n = Number(number);
  if (n === 0) {
    return '0';
  } else if (n < 1) {
    return n.toFixed(3);
  } else if (n < 2) {
    return n.toFixed(2);
  } else {
    return n.toFixed(0);
  }
};

export const parseGasDataConfirmationTime = ({
  maxBaseFee,
  maxPriorityFee,
  blocksToConfirmation,
  additionalTime = 0,
  secondsPerNewBlock,
}: {
  maxBaseFee: string;
  maxPriorityFee: string;
  blocksToConfirmation: BlocksToConfirmation;
  additionalTime?: number;
  secondsPerNewBlock: number;
}) => {
  let blocksToWaitForPriorityFee = 0;
  let blocksToWaitForBaseFee = 0;
  const { byPriorityFee, byBaseFee } = blocksToConfirmation;

  if (lessThan(maxPriorityFee, divide(byPriorityFee[4], 2))) {
    blocksToWaitForPriorityFee += 240;
  } else if (lessThan(maxPriorityFee, byPriorityFee[4])) {
    blocksToWaitForPriorityFee += 4;
  } else if (lessThan(maxPriorityFee, byPriorityFee[3])) {
    blocksToWaitForPriorityFee += 3;
  } else if (lessThan(maxPriorityFee, byPriorityFee[2])) {
    blocksToWaitForPriorityFee += 2;
  } else if (lessThan(maxPriorityFee, byPriorityFee[1])) {
    blocksToWaitForPriorityFee += 1;
  }

  if (lessThan(byBaseFee[4], maxBaseFee)) {
    blocksToWaitForBaseFee += 1;
  } else if (lessThan(byBaseFee[8], maxBaseFee)) {
    blocksToWaitForBaseFee += 4;
  } else if (lessThan(byBaseFee[40], maxBaseFee)) {
    blocksToWaitForBaseFee += 8;
  } else if (lessThan(byBaseFee[120], maxBaseFee)) {
    blocksToWaitForBaseFee += 40;
  } else if (lessThan(byBaseFee[240], maxBaseFee)) {
    blocksToWaitForBaseFee += 120;
  } else {
    blocksToWaitForBaseFee += 240;
  }

  // 1 hour as max estimate, 240 blocks
  const totalBlocksToWait =
    blocksToWaitForBaseFee +
    (blocksToWaitForBaseFee < 240 ? blocksToWaitForPriorityFee : 0);
  const timeAmount = secondsPerNewBlock * totalBlocksToWait + additionalTime;
  return {
    amount: timeAmount,
    display: `${timeAmount >= 3600 ? '>' : '~'} ${getMinimalTimeUnitStringForMs(
      Number(multiply(timeAmount, 1000)),
    )}`,
  };
};

export const parseGasFeeParam = ({ wei }: { wei: string }): GasFeeParam => {
  const _wei = new BigNumber(wei).toFixed(0); // wei is the smallest unit, shouldn't have decimals
  const gwei = _wei ? weiToGwei(_wei) : '';
  return {
    amount: _wei,
    display: `${formatNumber(gwei)} Gwei`,
    gwei,
  };
};

export const parseCustomGasFeeParams = ({
  baseFeeWei,
  currentBaseFee,
  speed,
  maxPriorityFeeWei,
  blocksToConfirmation,
  gasLimit,
  nativeAsset,
  currency,
  additionalTime,
  secondsPerNewBlock,
}: {
  baseFeeWei: string;
  speed: GasSpeed;
  maxPriorityFeeWei: string;
  currentBaseFee: string;
  gasLimit: string;
  nativeAsset?: ParsedAsset;
  blocksToConfirmation: BlocksToConfirmation;
  currency: SupportedCurrencyKey;
  additionalTime?: number;
  secondsPerNewBlock: number;
}): GasFeeParams => {
  const maxBaseFee = parseGasFeeParam({
    wei: baseFeeWei || '0',
  });
  const maxPriorityFeePerGas = parseGasFeeParam({
    wei: maxPriorityFeeWei || '0',
  });

  const baseFee = lessThan(currentBaseFee, maxBaseFee.amount)
    ? currentBaseFee
    : maxBaseFee.amount;

  const display = `${formatDisplayNumber(
    new BigNumber(
      weiToGwei(add(baseFee, maxPriorityFeePerGas.amount)),
    ).toNumber(),
  )} - ${formatDisplayNumber(
    new BigNumber(
      weiToGwei(add(baseFeeWei, maxPriorityFeePerGas.amount)),
    ).toNumber(),
  )} Gwei`;

  const estimatedTime = parseGasDataConfirmationTime({
    maxBaseFee: maxBaseFee.amount,
    maxPriorityFee: maxPriorityFeePerGas.amount,
    blocksToConfirmation,
    additionalTime,
    secondsPerNewBlock,
  });

  const transactionGasParams = {
    maxPriorityFeePerGas: addHexPrefix(
      convertStringToHex(maxPriorityFeePerGas.amount),
    ),
    maxFeePerGas: addHexPrefix(
      convertStringToHex(add(maxPriorityFeePerGas.amount, maxBaseFee.amount)),
    ),
  };

  const feeAmount = add(maxBaseFee.amount, maxPriorityFeePerGas.amount);
  const totalWei = multiply(gasLimit, feeAmount);
  const nativeTotalWei = convertRawAmountToBalance(
    totalWei,
    supportedCurrencies[nativeAsset?.symbol as SupportedCurrencyKey],
  ).amount;
  const nativeDisplay = convertAmountAndPriceToNativeDisplayWithThreshold(
    nativeTotalWei || 0,
    nativeAsset?.price?.value || 0,
    currency,
  );
  const gasFee = { amount: totalWei, display: nativeDisplay.display };

  return {
    display,
    estimatedTime,
    gasFee,
    maxBaseFee,
    maxPriorityFeePerGas,
    option: speed,
    transactionGasParams,
  };
};

export const parseCustomGasFeeLegacyParams = ({
  speed,
  gasPriceWei,
  gasLimit,
  nativeAsset,
  currency,
  waitTime,
}: {
  speed: GasSpeed;
  gasPriceWei: string;
  gasLimit: string;
  nativeAsset?: ParsedAsset;
  currency: SupportedCurrencyKey;
  waitTime: number | null;
}): GasFeeLegacyParams => {
  const gasPrice = parseGasFeeParam({
    wei: gasPriceWei || '0',
  });
  const display = `${formatDisplayNumber(gasPrice.gwei)} Gwei`;

  const estimatedTime = {
    amount: waitTime || 0,
    display: waitTime
      ? `${waitTime >= 3600 ? '>' : '~'} ${getMinimalTimeUnitStringForMs(
          Number(multiply(waitTime, 1000)),
        )}`
      : '',
  };
  const transactionGasParams = {
    gasPrice: toHex(gasPrice.amount),
  };

  const amount = gasPrice.amount;
  const totalWei = multiply(gasLimit, amount);

  const nativeTotalWei = convertRawAmountToBalance(
    totalWei,
    supportedCurrencies[nativeAsset?.symbol as SupportedCurrencyKey],
  ).amount;

  const nativeDisplay = nativeAsset?.price?.value
    ? convertAmountAndPriceToNativeDisplayWithThreshold(
        nativeTotalWei,
        nativeAsset?.price?.value,
        currency,
      )
    : convertRawAmountToBalance(totalWei, {
        decimals: nativeAsset?.decimals || 18,
        symbol: nativeAsset?.symbol,
      });

  const gasFee = { amount: totalWei, display: nativeDisplay.display };

  return {
    display,
    estimatedTime,
    gasFee,
    gasPrice,
    option: speed,
    transactionGasParams,
  };
};

export const parseGasFeeParams = ({
  wei,
  currentBaseFee,
  speed,
  maxPriorityFeeSuggestions,
  blocksToConfirmation,
  gasLimit,
  nativeAsset,
  currency,
  additionalTime,
  secondsPerNewBlock,
  optimismL1SecurityFee,
}: {
  wei: string;
  speed: GasSpeed;
  maxPriorityFeeSuggestions: {
    fast: string;
    urgent: string;
    normal: string;
  };
  currentBaseFee: string;
  gasLimit: string;
  nativeAsset?: ParsedAsset;
  blocksToConfirmation: BlocksToConfirmation;
  currency: SupportedCurrencyKey;
  additionalTime?: number;
  secondsPerNewBlock: number;
  optimismL1SecurityFee?: string | null;
}): GasFeeParams => {
  const maxBaseFee = parseGasFeeParam({
    wei: new BigNumber(multiply(wei, getBaseFeeMultiplier(speed))).toFixed(0),
  });
  const maxPriorityFeePerGas = parseGasFeeParam({
    wei: maxPriorityFeeSuggestions[speed === 'custom' ? 'urgent' : speed],
  });

  const baseFee = lessThan(currentBaseFee, maxBaseFee.amount)
    ? currentBaseFee
    : maxBaseFee.amount;

  const display = `${formatDisplayNumber(
    new BigNumber(
      weiToGwei(add(baseFee, maxPriorityFeePerGas.amount)),
    ).toNumber(),
  )} - ${formatDisplayNumber(
    new BigNumber(
      weiToGwei(add(maxBaseFee.amount, maxPriorityFeePerGas.amount)),
    ).toNumber(),
  )} Gwei`;

  const estimatedTime = parseGasDataConfirmationTime({
    maxBaseFee: maxBaseFee.amount,
    maxPriorityFee: maxPriorityFeePerGas.amount,
    blocksToConfirmation,
    additionalTime,
    secondsPerNewBlock,
  });

  const transactionGasParams = {
    maxPriorityFeePerGas: addHexPrefix(
      convertStringToHex(maxPriorityFeePerGas.amount),
    ),
    maxFeePerGas: addHexPrefix(
      convertStringToHex(add(maxPriorityFeePerGas.amount, maxBaseFee.amount)),
    ),
  };

  const feeAmount = add(maxBaseFee.amount, maxPriorityFeePerGas.amount);
  const totalWei = add(
    multiply(gasLimit, feeAmount),
    optimismL1SecurityFee || 0,
  );
  const nativeTotalWei = convertRawAmountToBalance(
    totalWei,
    supportedCurrencies[nativeAsset?.symbol as SupportedCurrencyKey],
  ).amount;
  const nativeDisplay = nativeAsset?.price?.value
    ? convertAmountAndPriceToNativeDisplayWithThreshold(
        nativeTotalWei,
        nativeAsset?.price?.value,
        currency,
      )
    : convertRawAmountToBalance(totalWei, {
        decimals: nativeAsset?.decimals || 18,
        symbol: nativeAsset?.symbol,
      });
  const gasFee = { amount: totalWei, display: nativeDisplay.display };

  return {
    display,
    estimatedTime,
    gasFee,
    maxBaseFee,
    maxPriorityFeePerGas,
    option: speed,
    transactionGasParams,
  };
};

export const parseGasFeeLegacyParams = ({
  gwei,
  speed,
  waitTime,
  gasLimit,
  nativeAsset,
  currency,
  optimismL1SecurityFee,
}: {
  gwei: string;
  speed: GasSpeed;
  waitTime: number | null;
  gasLimit: string;
  nativeAsset?: ParsedAsset;
  currency: SupportedCurrencyKey;
  optimismL1SecurityFee?: string | null;
}): GasFeeLegacyParams => {
  const wei = gweiToWei(gwei);
  const gasPrice = parseGasFeeParam({
    wei: new BigNumber(multiply(wei, getBaseFeeMultiplier(speed))).toFixed(0),
  });
  const display = `${formatDisplayNumber(gasPrice.gwei)} Gwei`;

  const estimatedTime = {
    amount: waitTime || 0,
    display: waitTime
      ? `${waitTime >= 3600 ? '>' : '~'} ${getMinimalTimeUnitStringForMs(
          Number(multiply(waitTime, 1000)),
        )}`
      : '',
  };
  const transactionGasParams = {
    gasPrice: toHex(gasPrice.amount),
  };

  const amount = gasPrice.amount;
  const totalWei = add(multiply(gasLimit, amount), optimismL1SecurityFee || 0);

  const nativeTotalWei = convertRawAmountToBalance(
    totalWei,
    supportedCurrencies[nativeAsset?.symbol as SupportedCurrencyKey],
  ).amount;

  const nativeDisplay = nativeAsset?.price?.value
    ? convertAmountAndPriceToNativeDisplayWithThreshold(
        nativeTotalWei,
        nativeAsset?.price?.value,
        currency,
      )
    : convertRawAmountToBalance(totalWei, {
        decimals: nativeAsset?.decimals || 18,
        symbol: nativeAsset?.symbol,
      });

  const gasFee = { amount: totalWei, display: nativeDisplay.display };

  return {
    display,
    estimatedTime,
    gasFee,
    gasPrice,
    option: speed,
    transactionGasParams,
  };
};

export const getBaseFeeMultiplier = (speed: GasSpeed) => {
  switch (speed) {
    case 'urgent':
    case 'custom':
      return 1.2;
    case 'fast':
      return 1.15;
    case 'normal':
    default:
      return 1.1;
  }
};

export const getChainWaitTime = (chainId: ChainId) => {
  switch (chainId) {
    case ChainId.bsc:
    case ChainId.polygon:
    case ChainId.avalanche:
      return { safeWait: 6, proposedWait: 3, fastWait: 3 };
    case ChainId.optimism:
    case ChainId.ink:
      return { safeWait: 20, proposedWait: 20, fastWait: 20 };
    case ChainId.base:
      return { safeWait: 20, proposedWait: 20, fastWait: 20 };
    case ChainId.zora:
      return { safeWait: 20, proposedWait: 20, fastWait: 20 };
    case ChainId.arbitrum:
      return { safeWait: 8, proposedWait: 8, fastWait: 8 };
    default:
      return null;
  }
};

export const estimateGas = async ({
  transactionRequest,
  provider,
}: {
  transactionRequest: TransactionRequest;
  provider: Provider;
}) => {
  try {
    const gasLimit = await provider?.estimateGas(transactionRequest);
    return gasLimit?.toString() ?? null;
  } catch (error) {
    return null;
  }
};

export const estimateGasWithPadding = async ({
  transactionRequest,
  contractCallEstimateGas = null,
  callArguments = null,
  provider,
  paddingFactor = 1.1,
}: {
  transactionRequest: TransactionRequest;
  contractCallEstimateGas?: Contract['estimateGas'][string] | null;
  callArguments?: unknown[] | null;
  provider: Provider;
  paddingFactor?: number;
}): Promise<string | null> => {
  try {
    const txPayloadToEstimate: TransactionRequest & { gas?: string } = {
      ...transactionRequest,
    };

    // `getBlock`'s typing requires a parameter, but passing no parameter
    // works as intended and returns the gas limit.
    const { gasLimit } = await (provider.getBlock as () => Promise<Block>)();

    const { to, data } = txPayloadToEstimate;

    // 1 - Check if the receiver is a contract
    const code = to ? await provider.getCode(to) : undefined;
    // 2 - if it's not a contract AND it doesn't have any data use the default gas limit
    if (
      (!contractCallEstimateGas && !to && !data) ||
      (to && !data && (!code || code === '0x'))
    ) {
      const chainGasUnits = useNetworkStore
        .getState()
        .getChainGasUnits(transactionRequest.chainId);
      return chainGasUnits.basic.eoaTransfer;
    }
    const saferGasLimit = fraction(gasLimit.toString(), 19, 20);

    txPayloadToEstimate[contractCallEstimateGas ? 'gasLimit' : 'gas'] =
      toHex(saferGasLimit);

    const estimatedGas = await (contractCallEstimateGas
      ? contractCallEstimateGas(...(callArguments ?? []), txPayloadToEstimate)
      : provider.estimateGas(txPayloadToEstimate));

    const lastBlockGasLimit = addBuffer(gasLimit.toString(), 0.9);
    const paddedGas = addBuffer(
      estimatedGas.toString(),
      paddingFactor.toString(),
    );

    // If the safe estimation is above the last block gas limit, use it
    if (greaterThan(estimatedGas.toString(), lastBlockGasLimit)) {
      return estimatedGas.toString();
    }
    // If the estimation is below the last block gas limit, use the padded estimate
    if (greaterThan(lastBlockGasLimit, paddedGas)) {
      return paddedGas;
    }
    // otherwise default to the last block gas limit
    return lastBlockGasLimit;
  } catch (error) {
    logger.error(new RainbowError(`estimateGasWithPadding error: ${error}`));
    return null;
  }
};

export const calculateL1FeeOptimism = async ({
  transactionRequest: txRequest,
  currentGasPrice,
  provider,
}: {
  currentGasPrice: string;
  transactionRequest: TransactionRequest & { gas?: string };
  provider: Provider;
}): Promise<BigNumberish | undefined> => {
  const transactionRequest = { ...txRequest };
  try {
    if (transactionRequest?.value) {
      transactionRequest.value = toHex(transactionRequest.value.toString());
    }

    if (transactionRequest?.from) {
      const nonce = await provider.getTransactionCount(transactionRequest.from);
      // eslint-disable-next-line require-atomic-updates
      transactionRequest.nonce = Number(nonce);
      delete transactionRequest.from;
    }

    if (transactionRequest.gas) {
      delete transactionRequest.gas;
    }

    if (transactionRequest.to) {
      transactionRequest.to = getAddress(transactionRequest.to);
    }
    if (!transactionRequest.gasLimit) {
      const chainGasUnits = useNetworkStore
        .getState()
        .getChainGasUnits(txRequest.chainId);
      transactionRequest.gasLimit = toHex(
        `${
          transactionRequest.data === '0x'
            ? chainGasUnits.basic.eoaTransfer
            : chainGasUnits.basic.tokenTransfer
        }`,
      );
    }

    if (currentGasPrice) transactionRequest.gasPrice = toHex(currentGasPrice);

    const serializedTx = serialize({
      ...transactionRequest,
      nonce: transactionRequest.nonce as number,
    });

    const optimismGasOracleAbi = (await fetchJsonLocally(
      'abis/optimism-gas-oracle-abi.json',
    )) as ContractInterface;

    const OVM_GasPriceOracle = new Contract(
      OVM_GAS_PRICE_ORACLE,
      optimismGasOracleAbi,
      provider,
    );
    const l1FeeInWei = await OVM_GasPriceOracle.getL1Fee(serializedTx);
    return l1FeeInWei;
  } catch (e) {
    //
  }
};

export const parseGasFeeParamsBySpeed = ({
  chainId,
  data,
  gasLimit,
  nativeAsset,
  currency,
  optimismL1SecurityFee,
  additionalTime = 0,
}: {
  chainId: ChainId;
  data: MeteorologyResponse | MeteorologyLegacyResponse;
  gasLimit: string;
  nativeAsset?: ParsedAsset;
  currency: SupportedCurrencyKey;
  optimismL1SecurityFee?: string | null;
  additionalTime?: number;
}) => {
  if ((data as MeteorologyResponse)?.data?.currentBaseFee) {
    const response = data as MeteorologyResponse;
    const {
      data: {
        currentBaseFee,
        maxPriorityFeeSuggestions,
        baseFeeSuggestion,
        secondsPerNewBlock,
      },
    } = response;

    const blocksToConfirmation = {
      byBaseFee: response.data.blocksToConfirmationByBaseFee,
      byPriorityFee: response.data.blocksToConfirmationByPriorityFee,
    };

    const parseGasFeeParamsSpeed = ({ speed }: { speed: GasSpeed }) =>
      parseGasFeeParams({
        currentBaseFee,
        maxPriorityFeeSuggestions,
        speed,
        wei: baseFeeSuggestion,
        blocksToConfirmation,
        gasLimit,
        nativeAsset,
        currency,
        additionalTime,
        secondsPerNewBlock,
        optimismL1SecurityFee,
      });

    return {
      custom: parseGasFeeParamsSpeed({
        speed: GasSpeed.CUSTOM,
      }),
      urgent: parseGasFeeParamsSpeed({
        speed: GasSpeed.URGENT,
      }),
      fast: parseGasFeeParamsSpeed({
        speed: GasSpeed.FAST,
      }),
      normal: parseGasFeeParamsSpeed({
        speed: GasSpeed.NORMAL,
      }),
    };
  } else {
    const response = data as MeteorologyLegacyResponse;
    const chainWaitTime = getChainWaitTime(chainId);
    const parseGasFeeParamsSpeed = ({
      speed,
      gwei,
      waitTime,
    }: {
      speed: GasSpeed;
      gwei: string;
      waitTime: number | null;
    }) =>
      parseGasFeeLegacyParams({
        gwei,
        speed,
        waitTime,
        gasLimit,
        nativeAsset,
        currency,
        optimismL1SecurityFee,
      });

    return {
      custom: parseGasFeeParamsSpeed({
        gwei: response?.data.legacy.fastGasPrice,
        speed: GasSpeed.CUSTOM,
        waitTime: chainWaitTime
          ? chainWaitTime.fastWait + additionalTime
          : null,
      }),
      urgent: parseGasFeeParamsSpeed({
        gwei: response?.data.legacy.fastGasPrice,
        speed: GasSpeed.URGENT,
        waitTime: chainWaitTime
          ? chainWaitTime.fastWait + additionalTime
          : null,
      }),
      fast: parseGasFeeParamsSpeed({
        gwei: response?.data.legacy.proposeGasPrice,
        speed: GasSpeed.FAST,
        waitTime: chainWaitTime
          ? chainWaitTime.proposedWait + additionalTime
          : null,
      }),
      normal: parseGasFeeParamsSpeed({
        gwei: response?.data.legacy.safeGasPrice,
        speed: GasSpeed.NORMAL,
        waitTime: chainWaitTime
          ? chainWaitTime.safeWait + additionalTime
          : null,
      }),
    };
  }
};

export const gasFeeParamsChanged = (
  gasFeeParams1: GasFeeParams | GasFeeLegacyParams,
  gasFeeParams2: GasFeeParams | GasFeeLegacyParams,
) => gasFeeParams1?.gasFee?.amount !== gasFeeParams2?.gasFee?.amount;

export const getBaseFeeTrendParams = (trend: number) => {
  switch (trend) {
    case -1:
      return {
        color: 'green',
        borderColor: globalColors.greenA10,
        label: i18n.t('custom_gas.base_trend.falling'),
        symbol: 'arrow.down.forward',
        explainer: i18n.t('explainers.custom_gas.current_base_falling'),
        emoji: '📉',
      };
    case 0:
      return {
        color: 'yellow',
        borderColor: globalColors.yellowA10,
        label: i18n.t('custom_gas.base_trend.stable'),
        symbol: 'sun.max.fill',
        explainer: i18n.t('explainers.custom_gas.current_base_stable'),
        emoji: '🌞',
      };
    case 1:
      return {
        color: 'red',
        borderColor: globalColors.redA10,
        label: i18n.t('custom_gas.base_trend.surging'),
        symbol: 'exclamationmark.triangle.fill',
        explainer: i18n.t('explainers.custom_gas.current_base_surging'),
        emoji: '🎢',
      };
    case 2:
      return {
        color: 'orange',
        borderColor: globalColors.orangeA10,
        label: i18n.t('custom_gas.base_trend.rising'),
        symbol: 'arrow.up.forward',
        explainer: i18n.t('explainers.custom_gas.current_base_rising'),
        emoji: '🥵',
      };
    default:
      return {
        color: 'blue',
        borderColor: '',
        label: '',
        symbol: '',
        explainer: '',
        emoji: '⛽',
      };
  }
};

export const chainShouldUseDefaultTxSpeed = (chainId: ChainId) =>
  chainId === ChainId.mainnet || chainId === ChainId.polygon;
