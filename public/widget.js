(function () {
  var script=document.currentScript;
  if(!script || document.getElementById('leadnuvia-launcher'))return;
  var id=script.getAttribute('data-agent-id');
  if(!id || !/^[0-9a-f-]{36}$/i.test(id))return;
  var origin=new URL(script.src).origin;
  var button=document.createElement('button');button.id='leadnuvia-launcher';button.type='button';button.textContent='Chat with us';button.setAttribute('aria-expanded','false');button.style.cssText='position:fixed;bottom:20px;right:20px;background:#0f766e;color:white;border:0;border-radius:30px;padding:16px 22px;cursor:pointer;font:600 14px system-ui;box-shadow:0 6px 24px #0002;z-index:2147483646';
  var iframe;var open=false;
  button.onclick=function(){open=!open;button.setAttribute('aria-expanded',String(open));button.textContent=open?'Close chat':'Chat with us';if(!iframe){iframe=document.createElement('iframe');iframe.title='AI sales assistant';iframe.src=origin+'/embed/'+id;iframe.style.cssText='position:fixed;right:16px;bottom:82px;width:min(390px,calc(100vw - 32px));height:min(640px,calc(100dvh - 110px));border:0;border-radius:20px;box-shadow:0 16px 60px #0003;z-index:2147483646;background:white';document.body.appendChild(iframe);}iframe.style.display=open?'block':'none';};
  window.addEventListener('message',function(event){if(iframe&&event.source===iframe.contentWindow&&event.origin===origin&&event.data&&event.data.type==='leadnuvia-ready')iframe.contentWindow.postMessage({type:'leadnuvia-init'},origin);});
  if(document.body)document.body.appendChild(button);else document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(button);});
})();
