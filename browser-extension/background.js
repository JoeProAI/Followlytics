// Followlytics Browser Extension - Background Script
chrome.runtime.onInstalled.addListener(() => {
  console.log('Followlytics extension installed');
});

// Handle messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages from content script to popup
  if (sender.tab) {
    // This message came from a content script, forward to popup if open
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, that's okay
    });
  }
  
  return true; // Keep message channel open
});
