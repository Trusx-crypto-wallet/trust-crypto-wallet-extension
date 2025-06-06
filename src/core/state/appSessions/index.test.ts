import { expect, test } from 'vitest';

import { ChainId } from '~/core/types/chains';

import { useAppSessionsStore } from '.';

const UNISWAP_HOST = 'uniswap.org';
const UNISWAP_URL = 'www.uniswap.org';
const OPENSEA_HOST = 'opensea.io';
const OPENSEA_URL = 'www.opensea.io';
const ADDRESS_1 = '0x123';
const ADDRESS_2 = '0x321';

test('should be able to add session', async () => {
  const { appSessions, addSession } = useAppSessionsStore.getState();
  expect(appSessions).toStrictEqual({});
  addSession({
    url: UNISWAP_URL,
    host: UNISWAP_HOST,
    address: ADDRESS_1,
    chainId: ChainId.mainnet,
  });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: { [ADDRESS_1]: ChainId.mainnet },
      activeSessionAddress: ADDRESS_1,
    },
  });
});

test('should be able to add session to an existent host', async () => {
  const { addSession } = useAppSessionsStore.getState();
  addSession({
    url: UNISWAP_URL,
    host: UNISWAP_HOST,
    address: ADDRESS_2,
    chainId: ChainId.arbitrum,
  });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: { [ADDRESS_1]: ChainId.mainnet, [ADDRESS_2]: ChainId.arbitrum },
      activeSessionAddress: ADDRESS_2,
    },
  });
});

test('should be able to add session to a new host', async () => {
  const { addSession } = useAppSessionsStore.getState();
  addSession({
    url: OPENSEA_URL,
    host: OPENSEA_HOST,
    address: ADDRESS_2,
    chainId: ChainId.arbitrum,
  });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: { [ADDRESS_1]: ChainId.mainnet, [ADDRESS_2]: ChainId.arbitrum },
      activeSessionAddress: ADDRESS_2,
    },
    [OPENSEA_HOST]: {
      url: OPENSEA_URL,
      host: OPENSEA_HOST,
      sessions: { [ADDRESS_2]: ChainId.arbitrum },
      activeSessionAddress: ADDRESS_2,
    },
  });
});

test('should be able to remove app session', async () => {
  const { removeAppSession } = useAppSessionsStore.getState();
  removeAppSession({ host: OPENSEA_HOST });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: { [ADDRESS_1]: ChainId.mainnet, [ADDRESS_2]: ChainId.arbitrum },
      activeSessionAddress: ADDRESS_2,
    },
  });
});

test('should be able to remove a session', async () => {
  const { removeSession } = useAppSessionsStore.getState();
  removeSession({ host: UNISWAP_HOST, address: ADDRESS_2 });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: { [ADDRESS_1]: ChainId.mainnet },
      activeSessionAddress: ADDRESS_1,
    },
  });
});

test('should be able to update active session', async () => {
  const { addSession, updateActiveSession } = useAppSessionsStore.getState();
  addSession({
    url: UNISWAP_URL,
    host: UNISWAP_HOST,
    address: ADDRESS_2,
    chainId: ChainId.arbitrum,
  });
  updateActiveSession({ host: UNISWAP_HOST, address: ADDRESS_1 });
  expect(
    useAppSessionsStore.getState().appSessions[UNISWAP_HOST]
      .activeSessionAddress,
  ).toStrictEqual(ADDRESS_1);
});

test('should be able to update active session chainId', async () => {
  const { updateActiveSessionChainId } = useAppSessionsStore.getState();

  updateActiveSessionChainId({ host: UNISWAP_HOST, chainId: ChainId.base });
  const activeSessionAddress =
    useAppSessionsStore.getState().appSessions[UNISWAP_HOST]
      .activeSessionAddress;
  expect(
    useAppSessionsStore.getState().appSessions[UNISWAP_HOST].sessions[
      activeSessionAddress
    ],
  ).toStrictEqual(ChainId.base);
});

test('should be able to update session chainId', async () => {
  const { updateSessionChainId } = useAppSessionsStore.getState();

  updateSessionChainId({
    host: UNISWAP_HOST,
    address: ADDRESS_1,
    chainId: ChainId.zora,
  });
  expect(
    useAppSessionsStore.getState().appSessions[UNISWAP_HOST].sessions[
      ADDRESS_1
    ],
  ).toStrictEqual(ChainId.zora);
});

test('should be able to clear all sessions', async () => {
  const { clearSessions } = useAppSessionsStore.getState();
  clearSessions();
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({});
});

test('should be able to check if host has an active session', async () => {
  const { addSession, getActiveSession } = useAppSessionsStore.getState();
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({});
  addSession({
    url: UNISWAP_URL,
    host: UNISWAP_HOST,
    address: ADDRESS_1,
    chainId: ChainId.mainnet,
  });
  const activeSession = getActiveSession({ host: UNISWAP_HOST });
  expect(activeSession).toStrictEqual({
    address: ADDRESS_1,
    chainId: ChainId.mainnet,
  });
});

test('should be able to update session chain id', async () => {
  const { updateSessionChainId } = useAppSessionsStore.getState();
  updateSessionChainId({
    host: UNISWAP_HOST,
    address: ADDRESS_1,
    chainId: ChainId.arbitrum,
  });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: { [ADDRESS_1]: ChainId.arbitrum },
      activeSessionAddress: ADDRESS_1,
    },
  });
});

test.todo('should be able to update session address', async () => {
  const { updateActiveSession } = useAppSessionsStore.getState();
  updateActiveSession({ host: UNISWAP_HOST, address: ADDRESS_2 });
  expect(useAppSessionsStore.getState().appSessions).toStrictEqual({
    [UNISWAP_HOST]: {
      url: UNISWAP_URL,
      host: UNISWAP_HOST,
      sessions: {
        [ADDRESS_1]: ChainId.arbitrum,
      },
      activeSessionAddress: ADDRESS_2,
    },
  });
});
