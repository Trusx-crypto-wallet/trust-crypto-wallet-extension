import {
  CallbackFunction,
  ReplyMessage,
  SendMessage,
  createMessenger,
} from './createMessenger';
import { isValidReply } from './isValidReply';
import { isValidSend } from './isValidSend';

/**
 * Creates an "extension messenger" that can be used to communicate between
 * scripts where `chrome.runtime` is defined.
 *
 * Compatible connections:
 * - ❌ Popup <-> Inpage
 * - ❌ Background <-> Inpage
 * - ✅ Background <-> Popup
 * - ❌ Popup <-> Content Script
 * - ❌ Background <-> Content Script
 * - ❌ Content Script <-> Inpage
 *
 * @see https://www.notion.so/rainbowdotme/Cross-script-Messaging-141de5115294435f95e31b87abcf4314#2af765a8378c4f08a1663d9bfcb60ad9
 */
export const extensionMessenger = createMessenger({
  available: Boolean(typeof chrome !== 'undefined' && chrome.runtime?.id),
  name: 'extensionMessenger',
  _listeners: {},
  async send<TPayload, TResponse>(
    topic: string,
    payload: TPayload,
    { id }: { id?: number | string } = {},
  ) {
    return new Promise<TResponse>((resolve, reject) => {
      const listener = (
        message: ReplyMessage<TResponse>,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void,
      ) => {
        if (!isValidReply<TResponse>({ id, message, topic })) return;

        chrome.runtime.onMessage.removeListener(listener);

        const { response: response_, error } = message.payload;
        if (error) reject(new Error(error.message));
        resolve({ ...response_, sender });
        sendResponse({});
        return true;
      };

      chrome.runtime.onMessage.addListener(listener);

      chrome.runtime.sendMessage({
        topic: `> ${topic}`,
        payload,
        id,
      });
    });
  },

  reply<TPayload, TResponse>(
    topic: string,
    callback: CallbackFunction<TPayload, TResponse>,
  ) {
    if (this._listeners[topic]) {
      this._listeners[topic].forEach((listener) => {
        chrome.runtime.onMessage.removeListener(listener);
      });
      this._listeners[topic] = [];
    } else {
      this._listeners[topic] = [];
    }

    const listener = async (
      message: SendMessage<TPayload>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (!isValidSend({ message, topic })) return;

      const repliedTopic = message.topic.replace('>', '<');

      try {
        const response = await callback(message.payload, {
          id: message.id,
          sender,
          topic: message.topic,
        });

        chrome.runtime.sendMessage({
          topic: repliedTopic,
          payload: { response, sender },
          id: message.id,
        });
      } catch (error_) {
        // Errors do not serialize properly over `chrome.runtime.sendMessage`, so
        // we are manually serializing it to an object.
        const error: Record<string, unknown> = {};
        for (const key of Object.getOwnPropertyNames(error_)) {
          error[key] = (<Error>error_)[<keyof Error>key];
        }
        chrome.runtime.sendMessage({
          topic: repliedTopic,
          payload: { error },
          id: message.id,
        });
      }
      sendResponse({});
      return true;
    };

    chrome.runtime.onMessage.addListener(listener);
    this._listeners[topic].push(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      const index = this._listeners[topic].indexOf(listener);
      if (index > -1) {
        this._listeners[topic].splice(index, 1);
      }
    };
  },
});
