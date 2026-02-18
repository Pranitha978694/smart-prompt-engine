/**
 * Content script for injecting the Promptly button into the ChatGPT UI.
 */

console.log("Promptly loading for ChatGPT...");

const observer = new MutationObserver(() => {
  try {
    // Check if runtime is still valid
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }

    Array.from(document.getElementsByClassName("bg-token-bg-primary")).forEach(inputBox => {
      // Skip if button already exists
      if (inputBox.querySelector("#promptly-btn")) return;

      // Find the trailing wrapper (parent of last button)
      const trailingWrapper = inputBox.querySelector("div > button:last-of-type")?.parentNode;
      if (!trailingWrapper) return;

      // Create button
      const promptlyButton = document.createElement("button");
      promptlyButton.id = "promptly-btn";
      Object.assign(promptlyButton.style, {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '6px',
        padding: '0',
        position: 'relative',
        transition: 'box-shadow 0.3s, transform 0.2s',
      });

      // Icon handling
      const iconUrl = chrome.runtime.getURL("icons8-bulb.gif");
      const imgElement = document.createElement('img');
      imgElement.style.cssText = "width: 100%; height: 100%; border-radius: 50%; object-fit: cover; pointer-events: none;";
      imgElement.alt = "Optimize";

      // Prepare static frame
      let staticIconUrl = iconUrl;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const freezerImg = new Image();
      freezerImg.crossOrigin = "Anonymous";
      freezerImg.src = iconUrl;

      freezerImg.onload = () => {
        canvas.width = freezerImg.naturalWidth;
        canvas.height = freezerImg.naturalHeight;
        ctx.drawImage(freezerImg, 0, 0);
        staticIconUrl = canvas.toDataURL();
        if (!promptlyButton.classList.contains('active')) {
          imgElement.src = staticIconUrl;
        }
      };

      imgElement.src = iconUrl;
      promptlyButton.appendChild(imgElement);

      // Create tooltip
      const tooltip = document.createElement("div");
      tooltip.textContent = "Optimize";
      Object.assign(tooltip.style, {
        position: 'fixed',
        backgroundColor: document.body.classList.contains('dark') ? '#222' : '#333',
        color: '#fff',
        padding: '4px 8px',
        fontSize: '12px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        opacity: '0',
        pointerEvents: 'none',
        transition: 'opacity 0.2s',
        zIndex: '9999',
      });

      document.body.appendChild(tooltip);

      // Tooltip hover effects
      promptlyButton.addEventListener("mouseenter", () => {
        tooltip.style.opacity = '1';
        const rect = promptlyButton.getBoundingClientRect();
        tooltip.style.top = rect.bottom + 6 + "px";
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
        promptlyButton.style.transform = 'scale(1.1)';
      });

      promptlyButton.addEventListener("mouseleave", () => {
        tooltip.style.opacity = '0';
        if (!promptlyButton.classList.contains('active')) {
          promptlyButton.style.transform = 'scale(1)';
        }
      });

      // Click handler - toggle active state
      promptlyButton.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();

        promptlyButton.classList.toggle('active');

        if (promptlyButton.classList.contains('active')) {
          imgElement.src = iconUrl; // Switch to animated GIF
          promptlyButton.style.boxShadow = "0 0 15px 4px #FFC107"; // Warm halogen glow
          promptlyButton.style.transform = "scale(1.15)";
          console.log("Promptly activated");

          // --- OPTIMIZATION LOGIC ---
          const inputArea = document.getElementById('prompt-textarea');
          if (inputArea) {
            // ChatGPT #prompt-textarea is often a DIV with contenteditable="true"
            let originalText = "";
            if (inputArea.tagName === 'DIV' || inputArea.getAttribute('contenteditable') === 'true') {
              // Try to get text from the inner <p> tag as per user xpath
              const pTag = inputArea.querySelector('p');
              originalText = pTag ? pTag.innerText : inputArea.innerText;
            } else {
              // It's a real textarea
              originalText = inputArea.value;
            }
            if (originalText && originalText.trim().length > 0) {
              console.log("Sending text for optimization:", originalText);

              promptlyButton.style.cursor = "wait";

              try {
                if (!chrome.runtime?.id) {
                  throw new Error("Extension context invalidated");
                }

                chrome.runtime.sendMessage({ action: "optimize_prompt", text: originalText }, (response) => {
                  promptlyButton.style.cursor = "pointer";

                  // Check for runtime errors (like context invalidation during request)
                  if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message;
                    if (msg.includes("Extension context invalidated")) {
                      alert("Extension updated. Please refresh the page.");
                    } else {
                      alert("Error: " + msg);
                    }
                    return;
                  }

                  if (!response) {
                    return; // Silent fail or log
                  }

                  if (response.error) {
                    alert("Optimization Error: " + response.error);
                    return;
                  }

                  if (response.optimizedText) {
                    // Focus and selecting all text ensures we replace existing content
                    inputArea.focus();

                    // Helper to safely replace text in contenteditable or textarea
                    const replaceContent = (text) => {
                      // Check if it's a textarea/input or contenteditable div
                      if (inputArea.tagName === 'TEXTAREA' || inputArea.tagName === 'INPUT') {
                        const lastValue = inputArea.value;
                        inputArea.value = text;
                        const tracker = inputArea._valueTracker;
                        if (tracker) {
                          tracker.setValue(lastValue);
                        }
                        inputArea.dispatchEvent(new Event('input', { bubbles: true }));
                      } else {
                        // ContentEditable (Div) Logic
                        const range = document.createRange();

                        // Try to find the specific <p> tag the user identified
                        const pTag = inputArea.querySelector('p');
                        if (pTag) {
                          range.selectNodeContents(pTag);
                        } else {
                          range.selectNodeContents(inputArea);
                        }

                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(range);

                        // Try execCommand first (best for frameworks)
                        if (!document.execCommand('insertText', false, text)) {
                          // Fallback: If execCommand ignores us, force the innerHTML structure
                          if (pTag) {
                            pTag.textContent = text;
                          } else {
                            inputArea.innerHTML = `<p>${text}</p>`;
                          }
                          inputArea.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }
                    };

                    try {
                      replaceContent(response.optimizedText);
                    } catch (e) {
                      console.error("Text replacement failed:", e);
                      // Last resort fallback
                      inputArea.textContent = response.optimizedText;
                    }

                    // Adjust height if needed
                    inputArea.style.height = 'auto';
                    inputArea.style.height = inputArea.scrollHeight + 'px';

                    console.log("Text optimized successfully");
                  }
                });
              } catch (e) {
                promptlyButton.style.cursor = "pointer";
                if (e.message.includes("Extension context invalidated")) {
                  alert("Extension updated. Please refresh the page to use.");
                } else {
                  alert("Error: " + e.message);
                }
              }
            } else {
              alert("Please enter a prompt first!");
            }
          } else {
            console.error("Could not find ChatGPT input area (#prompt-textarea)");
          }
          // --- END OPTIMIZATION LOGIC ---

        } else {
          imgElement.src = staticIconUrl; // Switch to static frame
          promptlyButton.style.boxShadow = "none";
          promptlyButton.style.transform = "scale(1)";
          console.log("Promptly deactivated");

          // Add your custom cleanup here
        }
      });

      // Insert button before the last child in the wrapper
      trailingWrapper.insertBefore(promptlyButton, trailingWrapper.lastChild);
    });
  } catch (error) {
    if (error.message && error.message.includes("Extension context invalidated")) {
      observer.disconnect();
    } else {
      console.error("Observer Error:", error);
    }
  }
});

// Start observing DOM changes
observer.observe(document.body, { subtree: true, childList: true });

console.log("Promptly button loaded for ChatGPT.");