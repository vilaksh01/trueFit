// Ensure Chrome APIs are available
const isChromeApiAvailable = () => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs;
};

// Wrapper for chrome.runtime.sendMessage
export const sendMessage = async (message) => {
  if (!isChromeApiAvailable()) {
    console.error('Chrome API not available');
    return null;
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
};

// Wrapper for chrome.storage
export const storage = {
  get: async (keys) => {
    if (!isChromeApiAvailable()) {
      console.error('Chrome API not available');
      return null;
    }
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result);
        }
      });
    });
  },
  set: async (data) => {
    if (!isChromeApiAvailable()) {
      console.error('Chrome API not available');
      return false;
    }
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
};

// Wrapper for chrome.tabs
export const tabs = {
  query: async (queryInfo) => {
    if (!isChromeApiAvailable()) {
      console.error('Chrome API not available');
      return null;
    }
    return new Promise((resolve) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Tabs error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(tabs);
        }
      });
    });
  },
  sendMessage: async (tabId, message) => {
    if (!isChromeApiAvailable()) {
      console.error('Chrome API not available');
      return null;
    }
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Tabs error:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }
};

// Setup message listeners
export const setupMessageListeners = (handlers) => {
  if (!isChromeApiAvailable()) {
    console.error('Chrome API not available');
    return;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received:', message);

    if (handlers[message.type]) {
      handlers[message.type](message, sender, sendResponse);
      return true; // Keep channel open for async response
    }

    return false;
  });
};

export default {
  sendMessage,
  storage,
  tabs,
  setupMessageListeners
};