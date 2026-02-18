document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('provider');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    const groups = {
        gemini: document.getElementById('gemini-group'),
        claude: document.getElementById('claude-group'),
        openai: document.getElementById('openai-group'),
        custom: document.getElementById('custom-group'),
        default: null
    };

    // Load saved settings
    chrome.storage.local.get(['provider', 'geminiKey', 'claudeKey', 'openaiKey', 'customName', 'customEndpoint', 'customKey'], (result) => {
        if (result.provider) {
            providerSelect.value = result.provider;
            updateVisibility(result.provider);
        }
        if (result.geminiKey) document.getElementById('geminiKey').value = result.geminiKey;
        if (result.claudeKey) document.getElementById('claudeKey').value = result.claudeKey;
        if (result.openaiKey) document.getElementById('openaiKey').value = result.openaiKey;

        if (result.customName) document.getElementById('customName').value = result.customName;
        if (result.customEndpoint) document.getElementById('customEndpoint').value = result.customEndpoint;
        if (result.customKey) document.getElementById('customKey').value = result.customKey;
    });

    // Handle provider change
    providerSelect.addEventListener('change', (e) => {
        updateVisibility(e.target.value);
    });

    function updateVisibility(provider) {
        Object.values(groups).forEach(group => {
            if (group) group.style.display = 'none';
        });
        if (groups[provider]) {
            groups[provider].style.display = 'flex';
        }
    }

    // Save settings
    saveBtn.addEventListener('click', () => {
        const provider = providerSelect.value;
        const geminiKey = document.getElementById('geminiKey').value;
        const claudeKey = document.getElementById('claudeKey').value;
        const openaiKey = document.getElementById('openaiKey').value;

        const customName = document.getElementById('customName').value;
        const customEndpoint = document.getElementById('customEndpoint').value;
        const customKey = document.getElementById('customKey').value;

        chrome.storage.local.set({
            provider,
            geminiKey,
            claudeKey,
            openaiKey,
            customName,
            customEndpoint,
            customKey
        }, () => {
            statusDiv.textContent = 'Settings saved!';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 2000);
        });
    });
});
