let profileLinks = [];
let currentIndex = 0;
let messagesSent = 0;
let isSending = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "storeProfiles") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabs[0].id },
                    func: () => Array.from(document.querySelectorAll('.tiles.small-tiles a')).map(a => a.href.replace('/profile/', '/chat/'))
                },
                (results) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, message: chrome.runtime.lastError.message });
                        return;
                    }
                    profileLinks = results[0]?.result || [];
                    currentIndex = 0;
                    messagesSent = 0;
                    sendResponse({
                        success: true,
                        totalProfiles: profileLinks.length,
                    });
                    console.log(profileLinks)
                }
            );
        });
        return true; // Keep the message channel open
    } else if (message.action === "startSending") {
        if (profileLinks.length === 0) {
            sendResponse({ success: false, message: "No profiles stored. Please store profiles first." });
            return;
        }
        if (isSending) {
            sendResponse({ success: false, message: "Already sending messages." });
            return;
        }
        isSending = true;
        visitNextProfile();
        sendResponse({ success: true });
    } else if (message.action === "stopSending") {
        isSending = false;
        sendResponse({ success: true });
    } else if (message.action === "getCounts") {
        sendResponse({
            totalProfiles: profileLinks.length,
            messagesSent: messagesSent,
            remainingProfiles: profileLinks.length - currentIndex,
            isSending: isSending,
        });
    } else {
        sendResponse({ success: false, message: "Unknown action." });
    }
});

function visitNextProfile() {
    if (!isSending || currentIndex >= profileLinks.length) {
        isSending = false;
        return;
    }

    const nextProfile = profileLinks[currentIndex];
    currentIndex++;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript(
            {
                target: { tabId: tabs[0].id },
                func: (url) => {
                    window.location.href = url;
                },
                args: [nextProfile],
            },
            () => {
                // Wait for the page to load for 7 seconds
                setTimeout(() => {
                    waitForPageToLoad(tabs[0].id, 7000) // 7 seconds wait for page to load
                        .then(() => {
                            sendMessage(tabs[0].id); // Send message after page is loaded
                        })
                        .catch(() => {
                            // Retry after some time if page isn't loaded
                            console.log("Page load timeout, retrying.");
                            visitNextProfile(); // Retry loading the next profile
                        });
                }, 7000); // Add 7 seconds delay before starting page load check
            }
        );
    });
}

function waitForPageToLoad(tabId, timeout = 7000) {
    return new Promise((resolve, reject) => {
        let elapsed = 0;

        const check = () => {
            chrome.scripting.executeScript(
                {
                    target: { tabId },
                    func: () => document.querySelector('textarea[cols="1"]') !== null,
                },
                (results) => {
                    if (results[0]?.result) {
                        resolve();
                    } else if (elapsed >= timeout) {
                        reject('Page load timeout');
                    } else {
                        elapsed += 1000;
                        setTimeout(check, 1000); // Check every second
                    }
                }
            );
        };

        check();
    });
}


function sendMessage(tabId) {
    chrome.scripting.executeScript(
        {
            target: { tabId },
            func: () => {
                const textarea = document.querySelector('textarea[cols="1"]');
                if (textarea) {
                    textarea.value = "hello there";
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));

                    // Wait for 5 seconds before sending the message
                    setTimeout(() => {
                        const enterEvent = new KeyboardEvent("keydown", {
                            key: "Enter",
                            code: "Enter",
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                        });
                        textarea.dispatchEvent(enterEvent);

                        // Wait for 10 seconds after sending the message
                        setTimeout(() => {
                            console.log("Message sent, waiting 10 seconds before moving to next profile.");
                        }, 10000); // Wait 10 seconds after pressing Enter
                    }, 5000); // Wait 5 seconds before sending the message
                }
                else{
                    console.log('textarea not found');
                }
            },
        },
        () => {
            messagesSent++;
            // Wait before visiting the next profile after the 10-second delay
            setTimeout(visitNextProfile, 18000); // 10 second delay before moving to the next profile
        }
    );
}