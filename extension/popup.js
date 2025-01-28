window.onload = function () {
  const autoModeRadio = document.querySelector("#auto-mode");
  const manualModeRadio = document.querySelector("#manual-mode");
  const webhookUrlInput = document.querySelector("#webhook-url");
  const lastMeetingTranscriptLink = document.querySelector(
    "#last-meeting-transcript"
  );

  chrome.storage.sync.get(["operationMode", "webhookUrl"], function (result) {
    if (result.operationMode == undefined) autoModeRadio.checked = true;
    else if (result.operationMode == "auto") autoModeRadio.checked = true;
    else if (result.operationMode == "manual") manualModeRadio.checked = true;

    // Set webhook URL from storage if exists
    if (result.webhookUrl) {
      webhookUrlInput.value = result.webhookUrl;
    }
  });

  autoModeRadio.addEventListener("change", function () {
    chrome.storage.sync.set({ operationMode: "auto" }, function () {});
  });
  manualModeRadio.addEventListener("change", function () {
    chrome.storage.sync.set({ operationMode: "manual" }, function () {});
  });

  // Save webhook URL when changed or input
  webhookUrlInput.addEventListener("input", function () {
    chrome.storage.sync.set(
      { webhookUrl: webhookUrlInput.value },
      function () {}
    );
  });
  lastMeetingTranscriptLink.addEventListener("click", () => {
    chrome.storage.local.get(["transcript"], function (result) {
      if (result.transcript)
        chrome.runtime.sendMessage({ type: "download" }, function (response) {
          console.log(response);
        });
      else
        alert(
          "No transcript found from previous meetings. Join a meeting first to generate a transcript."
        );
    });
  });
};
