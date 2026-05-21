import Script from 'next/script';

/** Suppresses noisy 404 logs when stale Next.js chunks are requested after deploy. */
export default function ChunkLoadErrorHandler() {
  return (
    <Script
      id="chunk-load-error-handler"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeName === 'SCRIPT' && node.src) {
          var src = node.src;
          if (src.indexOf('/_next/static/chunks/') !== -1 ||
              src.indexOf('/_next/static/') !== -1 ||
              src.indexOf('webpack-') !== -1 ||
              (src.indexOf('chunks/') !== -1 && src.indexOf('resources.sageoutdooradvisory.com') !== -1)) {
            node.addEventListener('error', function(e) {
              e.stopImmediatePropagation();
              e.preventDefault();
              e.stopPropagation();
              if (node.parentNode) node.parentNode.removeChild(node);
              return false;
            }, true);
          }
        }
      });
    });
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
  if (document.head) {
    observer.observe(document.head, { childList: true, subtree: true });
  }
  var originalError = window.onerror;
  window.onerror = function(msg, url, line, col, error) {
    if (url && (
      url.indexOf('/_next/static/chunks/') !== -1 ||
      url.indexOf('/_next/static/') !== -1 ||
      url.indexOf('webpack-') !== -1 ||
      url.indexOf('chunks/') !== -1
    )) {
      return true;
    }
    if (originalError) return originalError.apply(this, arguments);
    return false;
  };
  window.addEventListener('error', function(e) {
    if (e.target && e.target.tagName === 'SCRIPT' && e.target.src) {
      var src = e.target.src;
      if (src.indexOf('/_next/static/chunks/') !== -1 ||
          src.indexOf('/_next/static/') !== -1 ||
          src.indexOf('webpack-') !== -1 ||
          src.indexOf('chunks/') !== -1) {
        e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
        if (e.target.parentNode) e.target.parentNode.removeChild(e.target);
        return false;
      }
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason) {
      var message = e.reason && e.reason.message ? e.reason.message : String(e.reason);
      var stack = e.reason && e.reason.stack ? e.reason.stack : '';
      if (message.indexOf('Loading chunk') !== -1 ||
          message.indexOf('Failed to fetch dynamically imported module') !== -1 ||
          message.indexOf('ChunkLoadError') !== -1 ||
          message.indexOf('404') !== -1 ||
          stack.indexOf('chunks/') !== -1 ||
          stack.indexOf('webpack-') !== -1) {
        e.preventDefault();
        return false;
      }
    }
  });
  var originalConsoleError = console.error;
  console.error = function() {
    var message = Array.prototype.join.call(arguments, ' ');
    if (message.indexOf('/_next/static/chunks/') !== -1 ||
        message.indexOf('/_next/static/') !== -1 ||
        message.indexOf('webpack-') !== -1 ||
        message.indexOf('Failed to load resource') !== -1 ||
        (message.indexOf('404') !== -1 && (message.indexOf('chunks/') !== -1 || message.indexOf('webpack-') !== -1))) {
      return;
    }
    originalConsoleError.apply(console, arguments);
  };
})();
        `,
      }}
    />
  );
}
