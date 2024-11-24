const storeLinksButton = document.getElementById("storeLinksButton");
const startSendingButton = document.getElementById("startSendingButton");
const stopSendingButton = document.getElementById("stopSendingButton");
const totalProfilesElem = document.getElementById("totalProfiles");
const messagesSentElem = document.getElementById("messagesSent");
const remainingProfilesElem = document.getElementById("remainingProfiles");
const messageElem = document.getElementById("message");

function updateUI(state) {
    if (state.isSending) {
        startSendingButton.style.display = "none";
        stopSendingButton.style.display = "block";
    } else {
        startSendingButton.style.display = "block";
        stopSendingButton.style.display = "none";
    }
    totalProfilesElem.textContent = state.totalProfiles || 0;
    messagesSentElem.textContent = state.messagesSent || 0;
    remainingProfilesElem.textContent = state.remainingProfiles || 0;
}

function sendMessage(action, callback) {
    chrome.runtime.sendMessage({ action }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            messageElem.textContent = "Error communicating with the background script.";
        } else if (response) {
            callback(response);
        } else {
            messageElem.textContent = "No response received.";
        }
    });
}

storeLinksButton.addEventListener("click", () => {
    sendMessage("storeProfiles", (response) => {
        if (response.success) {
            totalProfilesElem.textContent = response.totalProfiles;
            messageElem.textContent = `Stored ${response.totalProfiles} profile links.`;
        } else {
            messageElem.textContent = response.message || "Failed to store profiles.";
        }
    });
});

startSendingButton.addEventListener("click", () => {
    sendMessage("startSending", (response) => {
        if (response.success) {
            messageElem.textContent = "Started sending messages.";
            updateUI({ isSending: true });
        } else {
            messageElem.textContent = response.message || "Error starting message sending.";
        }
    });
});

stopSendingButton.addEventListener("click", () => {
    sendMessage("stopSending", (response) => {
        if (response.success) {
            messageElem.textContent = "Stopped sending messages.";
            updateUI({ isSending: false });
        }
    });
});

function refreshCounts() {
    sendMessage("getCounts", (response) => {
        if (response) {
            updateUI({
                totalProfiles: response.totalProfiles,
                messagesSent: response.messagesSent,
                remainingProfiles: response.remainingProfiles,
                isSending: response.isSending,
            });
        }
    });
}

// Periodically refresh counts
setInterval(refreshCounts, 1000);

// Initial UI update
refreshCounts();
