const observer = new MutationObserver(() => {
  // Find the flex container with feature buttons
  const flexContainers = document.querySelectorAll('.relative.flex-1');

  // Collect all valid containers
  const validContainers = Array.from(flexContainers).filter(container => {
    const buttons = container.querySelectorAll('button');
    if (buttons.length === 0) return false;
    return Array.from(buttons).some(btn =>
      btn.textContent.toLowerCase().includes('extend') ||
      btn.textContent.toLowerCase().includes('search') ||
      btn.querySelector('svg')
    );
  });

  if (validContainers.length === 0) return;

  // Find the BEST container (one with extended thinking)
  let bestContainer = validContainers.find(container =>
    Array.from(container.querySelectorAll('button')).some(btn => {
      const text = btn.textContent.toLowerCase();
      return text.includes('extend') || text.includes('think');
    })
  );

  // Fallback to the last valid container if no specific "extended thinking" button found
  // (Using last one is often safer in toolbar lists than the first one which might be hidden/inactive)
  if (!bestContainer) {
    bestContainer = validContainers[validContainers.length - 1];
  }

  // Target the chosen container
  const container = bestContainer;

  // Skip if button already exists globally
  if (document.getElementById("promptly-btn")) return;
  if (container.querySelector("#promptly-btn")) return;

  // Create Promptly button
  const promptlyButton = document.createElement("button");
  promptlyButton.id = "promptly-btn";
  promptlyButton.type = "button";

  // Style the button
  Object.assign(promptlyButton.style, {
    width: '36px',
    height: '36px',
    borderRadius: '0.5rem',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    marginRight: '8px',
    transition: 'all 0.2s ease',
    color: 'currentColor',
  });

  // Icon handling
  const iconUrl = chrome.runtime.getURL("icons8-bulb.gif");
  const imgElement = document.createElement('img');
  imgElement.style.cssText = "width: 100%; height: 100%; border-radius: 4px; object-fit: cover; pointer-events: none;";
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
    backgroundColor: '#222',
    color: '#fff',
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.2s',
    zIndex: '99999',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });

  document.body.appendChild(tooltip);

  // Tooltip hover effects
  promptlyButton.addEventListener("mouseenter", () => {
    tooltip.style.opacity = '1';
    const rect = promptlyButton.getBoundingClientRect();
    tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + "px";
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";

    if (!promptlyButton.classList.contains('active')) {
      promptlyButton.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      promptlyButton.style.borderColor = 'rgba(0, 0, 0, 0.2)';
    }
    promptlyButton.style.transform = 'scale(1.1)';
  });

  promptlyButton.addEventListener("mouseleave", () => {
    tooltip.style.opacity = '0';
    if (!promptlyButton.classList.contains('active')) {
      promptlyButton.style.backgroundColor = 'transparent';
      promptlyButton.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    }
    promptlyButton.style.transform = 'scale(1)';
  });

  // Click handler - toggle active state
  promptlyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();

    promptlyButton.classList.toggle('active');

    if (promptlyButton.classList.contains('active')) {
      imgElement.src = iconUrl; // Animate
      promptlyButton.style.backgroundColor = 'rgba(255, 193, 7, 0.2)'; // Light transparent amber background
      promptlyButton.style.borderColor = '#FFC107';
      promptlyButton.style.color = '#FFC107';
      promptlyButton.style.boxShadow = "0 0 15px 4px #FFC107"; // Warm halogen glow
      promptlyButton.style.transform = "scale(1.15)";
      console.log("Promptly activated");

      // --- OPTIMIZATION LOGIC ---
      // Find Claude input field
      const inputArea = document.querySelector('div[data-testid="chat-input"]') ||
        document.querySelector('.ProseMirror') ||
        document.querySelector('div[contenteditable="true"]');

      if (inputArea) {
        const originalText = inputArea.innerText;
        if (originalText && originalText.trim().length > 0) {
          console.log("Sending text for optimization:", originalText);

          promptlyButton.style.cursor = "wait";

          chrome.runtime.sendMessage({ action: "optimize_prompt", text: originalText }, (response) => {
            promptlyButton.style.cursor = "pointer";

            if (chrome.runtime.lastError) {
              alert("Error: " + chrome.runtime.lastError.message);
              return;
            }

            if (!response) {
              console.error("No response received from background script.");
              return;
            }

            if (response.error) {
              alert("Optimization Error: " + response.error);
              return;
            }

            if (response.optimizedText) {
              try {
                inputArea.focus();

                // Select text to replace
                const range = document.createRange();

                // User indicated text is in a <p> tag. Try to find it.
                const pTag = inputArea.querySelector('p');
                if (pTag) {
                  range.selectNodeContents(pTag);
                } else {
                  range.selectNodeContents(inputArea);
                }

                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                // Execute insert command which handles Framework state better
                const success = document.execCommand('insertText', false, response.optimizedText);

                if (!success) {
                  // Fallback: Tiptap (Claude) expects paragraphs
                  inputArea.innerHTML = `<p>${response.optimizedText}</p>`;
                  inputArea.dispatchEvent(new Event('input', { bubbles: true }));
                }
              } catch (e) {
                console.error("Replacement failed", e);
                // Explicitly set structure on error
                inputArea.innerHTML = `<p>${response.optimizedText}</p>`;
              }

              console.log("Text optimized successfully");
            }
          });
        } else {
          alert("Please enter a prompt first!");
        }
      } else {
        console.error("Could not find Claude input area");
      }
      // --- END OPTIMIZATION LOGIC ---

    }

    else {
      imgElement.src = staticIconUrl; // Freeze
      promptlyButton.style.backgroundColor = 'transparent';
      promptlyButton.style.borderColor = 'rgba(0, 0, 0, 0.1)';
      promptlyButton.style.color = 'currentColor';
      promptlyButton.style.boxShadow = "none";
      promptlyButton.style.transform = "scale(1)";
      console.log("Promptly deactivated");

      // Add your custom cleanup here
    }
  });

  // Insert button after extended thinking button if found
  const extendedThinkingBtn = Array.from(container.querySelectorAll('button')).find(btn => {
    const text = btn.textContent.toLowerCase();
    return text.includes('extend') || text.includes('think');
  });

  if (extendedThinkingBtn) {
    extendedThinkingBtn.parentNode.insertBefore(promptlyButton, extendedThinkingBtn.nextSibling);
  } else {
    container.appendChild(promptlyButton);
  }
});

// Start observing DOM changes
observer.observe(document.body, { subtree: true, childList: true });

console.log("Promptly button loaded for claude");
