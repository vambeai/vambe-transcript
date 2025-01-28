chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log(message.type);
  if (message.type == "new_meeting_started") {
    // Saving current tab id, to send transcript when this tab is closed
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      chrome.storage.local.set({ meetingTabId: tabId }, function () {
        console.log("Meeting tab id saved");
      });
    });
  }
  if (message.type == "download") {
    // Invalidate tab id since transcript is sent
    chrome.storage.local.set({ meetingTabId: null }, function () {
      console.log("Meeting tab id cleared");
    });
    sendTranscriptToWebhook();
  }
  return true;
});

// Send transcript if meeting tab is closed
chrome.tabs.onRemoved.addListener(function (tabid) {
  chrome.storage.local.get(["meetingTabId"], function (data) {
    if (tabid == data.meetingTabId) {
      console.log("Successfully intercepted tab close");
      sendTranscriptToWebhook();
      // Clearing meetingTabId to prevent misfires of onRemoved until next meeting actually starts
      chrome.storage.local.set({ meetingTabId: null }, function () {
        console.log("Meeting tab id cleared for next meeting");
      });
    }
  });
});

function sendTranscriptToWebhook() {
  chrome.storage.sync.get(["webhookUrl"], function (syncData) {
    if (!syncData.webhookUrl) {
      console.log("No webhook URL configured");
      return;
    }

    chrome.storage.local.get(
      [
        "userName",
        "transcript",
        "chatMessages",
        "meetingTitle",
        "meetingStartTimeStamp",
      ],
      function (result) {
        if (result.userName && result.transcript) {
          // Extract unique attendees from transcript
          const attendees = new Set();
          result.transcript.forEach((entry) => {
            attendees.add(entry.personName.replace(/You/g, result.userName));
          });

          // Extract host (first person in the transcript)
          const host =
            result.transcript.length > 0
              ? result.transcript[0].personName.replace(/You/g, result.userName)
              : result.userName;

          // Prepare payload
          const payload = {
            meetingTitle: result.meetingTitle || "Untitled Meeting",
            meetingStartTime: result.meetingStartTimeStamp,
            host: host,
            attendees: Array.from(attendees),
            transcript: result.transcript.map((entry) => ({
              speaker: entry.personName.replace(/You/g, result.userName),
              timestamp: entry.timeStamp,
              text: entry.personTranscript,
            })),
            chatMessages: result.chatMessages
              ? result.chatMessages.map((msg) => ({
                  sender: msg.personName.replace(/You/g, result.userName),
                  timestamp: msg.timeStamp,
                  message: msg.chatMessageText,
                }))
              : [],
          };

          // Send to webhook
          fetch(syncData.webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              console.log("Transcript sent successfully to webhook");
            })
            .catch((error) => {
              console.error("Error sending transcript to webhook:", error);
            });
        } else {
          console.log("No transcript found");
        }
      }
    );
  });
}
