JavaScript
(function () {
  // Prevent duplicate script instantiation
  if (window.__AI_SALES_WIDGET_LOADED__) return;
  window.__AI_SALES_WIDGET_LOADED__ = true;

  // 1. Find the parent script tag to extract configuration attributes
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var agentId = currentScript.getAttribute('data-agent-id');
  var baseUrl = currentScript.getAttribute('data-host') || 'https://your-app.com';

  if (!agentId) {
    console.error('AI Sales Widget: Missing required data-agent-id attribute.');
    return;
  }

  // 2. Create Floating Launcher Button
  var button = document.createElement('div');
  button.id = 'ai-widget-launcher';
  button.style.cssText = [
    'position: fixed;',
    'bottom: 20px;',
    'right: 20px;',
    'width: 56px;',
    'height: 56px;',
    'border-radius: 50%;',
    'background-color: #4F46E5;',
    'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
    'cursor: pointer;',
    'z-index: 999999;',
    'display: flex;',
    'align-items: center;',
    'justify-content: center;',
    'transition: transform 0.2s ease;',
  ].join('');

  button.innerHTML = `
    <svg id="ai-widget-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <svg id="ai-widget-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  // 3. Create Iframe Drawer Container
  var iframe = document.createElement('iframe');
  iframe.id = 'ai-widget-container';
  iframe.src = baseUrl + '/embed/' + agentId;
  iframe.style.cssText = [
    'position: fixed;',
    'bottom: 88px;',
    'right: 20px;',
    'width: 380px;',
    'height: 600px;',
    'max-height: calc(100vh - 110px);',
    'border: none;',
    'border-radius: 16px;',
    'box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);',
    'z-index: 999998;',
    'display: none;',
    'transition: opacity 0.2s ease, transform 0.2s ease;',
  ].join('');

  // 4. Toggle Chat Drawer Visibility
  var isOpen = false;
  button.addEventListener('click', function () {
    isOpen = !isOpen;
    var openIcon = document.getElementById('ai-widget-icon-open');
    var closeIcon = document.getElementById('ai-widget-icon-close');

    if (isOpen) {
      iframe.style.display = 'block';
      openIcon.style.display = 'none';
      closeIcon.style.display = 'block';
      button.style.transform = 'scale(0.95)';
    } else {
      iframe.style.display = 'none';
      openIcon.style.display = 'block';
      closeIcon.style.display = 'none';
      button.style.transform = 'scale(1)';
    }
  });

  // Attach to DOM when document is ready
  if (document.body) {
    document.body.appendChild(button);
    document.body.appendChild(iframe);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(button);
      document.body.appendChild(iframe);
    });
  }
})();
