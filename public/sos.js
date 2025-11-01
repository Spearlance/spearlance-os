/**
 * SpearlanceOS Analytics Tracker (SOS)
 * Version 1.0.0
 * Lightweight, privacy-first web analytics
 */
(function() {
  'use strict';
  
  // Namespace safety - exit if already loaded
  if (window.sos) return;
  
  // Configuration
  const config = {
    version: '1.0.0',
    collectorUrl: null,
    workspaceKey: null,
    enablePopupConsent: false,
    policyUrl: '/privacy',
    autoTrackPageViews: true,
    autoTrackScroll: true,
    autoTrackEngagement: true
  };
  
  // State
  let sessionId = null;
  let userId = null;
  let consentGranted = false;
  let eventQueue = [];
  let scrollTracked = {};
  let engagedStart = null;
  let engagedTotal = 0;
  let sessionFirstPath = null;
  
  // Utility: Generate random ID
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Utility: Get/set localStorage safely
  function getStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  
  function setStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }
  
  // Utility: Check opt-out
  function isOptedOut() {
    return getStorage('sos_optout') === 'true';
  }
  
  // Utility: Parse URL for UTM params
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content')
    };
  }
  
  // Utility: Classify referrer source
  function classifyReferrer(ref) {
    if (!ref || ref === '' || ref.indexOf(window.location.hostname) !== -1) {
      return { source: 'direct', medium: 'none' };
    }
    
    try {
      const url = new URL(ref);
      const host = url.hostname.toLowerCase();
      
      // Search engines
      if (host.includes('google')) return { source: 'google', medium: 'organic' };
      if (host.includes('bing')) return { source: 'bing', medium: 'organic' };
      if (host.includes('duckduckgo')) return { source: 'duckduckgo', medium: 'organic' };
      if (host.includes('brave')) return { source: 'brave', medium: 'organic' };
      if (host.includes('yahoo')) return { source: 'yahoo', medium: 'organic' };
      
      // AI tools
      if (host.includes('chatgpt') || host.includes('openai')) {
        return { source: 'chatgpt', medium: 'referral' };
      }
      if (host.includes('claude') || host.includes('anthropic')) {
        return { source: 'claude', medium: 'referral' };
      }
      
      // Social media
      if (host.includes('facebook') || host.includes('fb.com')) return { source: 'facebook', medium: 'social' };
      if (host.includes('twitter') || host.includes('t.co')) return { source: 'twitter', medium: 'social' };
      if (host.includes('linkedin')) return { source: 'linkedin', medium: 'social' };
      if (host.includes('instagram')) return { source: 'instagram', medium: 'social' };
      if (host.includes('youtube')) return { source: 'youtube', medium: 'social' };
      if (host.includes('tiktok')) return { source: 'tiktok', medium: 'social' };
      if (host.includes('pinterest')) return { source: 'pinterest', medium: 'social' };
      
      // Default referral
      return { source: host.replace('www.', ''), medium: 'referral' };
    } catch (e) {
      return { source: 'direct', medium: 'none' };
    }
  }
  
  // Utility: Send event
  function send(eventData) {
    if (!config.collectorUrl || !config.workspaceKey) {
      return;
    }
    
    if (!consentGranted || isOptedOut()) {
      return; // Don't send if no consent or opted out
    }
    
    const payload = {
      workspaceKey: config.workspaceKey,
      ts: Date.now(),
      sid: sessionId,
      uid: userId,
      ...eventData
    };
    
    // Use sendBeacon if available, else fetch
    const data = JSON.stringify(payload);
    
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(config.collectorUrl, blob);
      } else {
        fetch(config.collectorUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(function() {}); // Silent fail
      }
    } catch (e) {
      // Silent fail - never break the site
    }
  }
  
  // Track page view
  function trackPageView() {
    try {
      const isEntry = sessionFirstPath === null;
      
      if (isEntry) {
        sessionFirstPath = window.location.pathname;
        try {
          sessionStorage.setItem('sos_first_path', sessionFirstPath);
        } catch (e) {}
      }
      
      const utm = getUTMParams();
      const ref = classifyReferrer(document.referrer);
      
      send({
        type: 'page_view',
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        source: ref.source,
        medium: ref.medium,
        ...utm,
        entry: isEntry,
        userAgent: navigator.userAgent.substring(0, 200) // Truncate
      });
      
      // Reset scroll tracking for new page
      scrollTracked = {};
      
    } catch (e) {
      // Silent fail
    }
  }
  
  // Track scroll depth
  function trackScrollDepth() {
    try {
      const scrollPercentage = Math.round(
        (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100
      );
      
      [25, 50, 75, 100].forEach(function(threshold) {
        if (scrollPercentage >= threshold && !scrollTracked[threshold]) {
          scrollTracked[threshold] = true;
          send({
            type: 'scroll_depth',
            path: window.location.pathname,
            value: threshold
          });
        }
      });
    } catch (e) {}
  }
  
  // Track engaged time
  function trackEngagedTime() {
    try {
      if (engagedStart !== null) {
        engagedTotal += Date.now() - engagedStart;
      }
      engagedStart = Date.now();
      
      // Send every 15 seconds of active time
      if (engagedTotal >= 15000) {
        send({
          type: 'engaged_time',
          path: window.location.pathname,
          value: Math.round(engagedTotal / 1000) // seconds
        });
        engagedTotal = 0;
      }
    } catch (e) {}
  }
  
  // Public API
  window.sos = {
    version: config.version,
    
    // Initialize with config
    init: function(opts) {
      try {
        config.collectorUrl = opts.collectorUrl;
        config.workspaceKey = opts.workspaceKey;
        config.enablePopupConsent = opts.enablePopupConsent || false;
        config.policyUrl = opts.policyUrl || '/privacy';
        
        // Initialize session
        sessionId = getStorage('sos_sid') || generateId();
        setStorage('sos_sid', sessionId);
        
        userId = getStorage('sos_uid');
        
        // Check existing consent
        const storedConsent = getStorage('sos_consent');
        if (storedConsent === 'granted') {
          consentGranted = true;
        }
        
        // Restore first path if in same session
        try {
          sessionFirstPath = sessionStorage.getItem('sos_first_path');
        } catch (e) {}
        
        // Show popup if needed
        if (config.enablePopupConsent && !storedConsent && !isOptedOut()) {
          window.sos._showConsentPopup();
        } else if (consentGranted) {
          window.sos._startTracking();
        }
      } catch (e) {
        // Silent fail
      }
    },
    
    // Set consent
    consent: function(state) {
      try {
        if (state === 'granted') {
          consentGranted = true;
          setStorage('sos_consent', 'granted');
          window.sos._startTracking();
        } else if (state === 'denied') {
          consentGranted = false;
          setStorage('sos_consent', 'denied');
        }
      } catch (e) {}
    },
    
    // Identify user
    identify: function(id) {
      try {
        userId = id;
        setStorage('sos_uid', id);
      } catch (e) {}
    },
    
    // Manual page track
    page: function() {
      trackPageView();
    },
    
    // Track custom event
    track: function(evt) {
      try {
        send(evt);
      } catch (e) {
        // Silent fail
      }
    },
    
    // Internal: Start tracking
    _startTracking: function() {
      // Initial page view
      if (config.autoTrackPageViews) {
        trackPageView();
      }
      
      // Scroll tracking
      if (config.autoTrackScroll) {
        let scrollTimeout;
        window.addEventListener('scroll', function() {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(trackScrollDepth, 200);
        }, { passive: true });
      }
      
      // Engagement tracking
      if (config.autoTrackEngagement) {
        engagedStart = Date.now();
        
        let engageTimeout;
        function throttledEngage() {
          clearTimeout(engageTimeout);
          engageTimeout = setTimeout(trackEngagedTime, 500);
        }
        
        window.addEventListener('mousemove', throttledEngage, { passive: true });
        window.addEventListener('keydown', throttledEngage, { passive: true });
        window.addEventListener('touchstart', throttledEngage, { passive: true });
        window.addEventListener('click', throttledEngage, { passive: true });
        
        // Pause on blur, resume on focus
        window.addEventListener('blur', function() {
          if (engagedStart !== null) {
            engagedTotal += Date.now() - engagedStart;
            engagedStart = null;
          }
        });
        window.addEventListener('focus', function() {
          engagedStart = Date.now();
        });
      }
      
      // SPA route change detection
      const pushState = history.pushState;
      history.pushState = function() {
        pushState.apply(history, arguments);
        setTimeout(trackPageView, 100);
      };
      
      window.addEventListener('popstate', function() {
        setTimeout(trackPageView, 100);
      });
    },
    
    // Internal: Show consent popup
    _showConsentPopup: function() {
      try {
        const popup = document.createElement('div');
        popup.id = 'sos-consent-popup';
        popup.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;max-width:500px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.5;';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-labelledby', 'sos-consent-title');
        popup.setAttribute('aria-modal', 'true');
        
        popup.innerHTML = '<div id="sos-consent-title" style="font-weight:600;margin-bottom:8px;color:#111;">Cookie Consent</div>' +
          '<p style="margin:0 0 12px;color:#555;">We use cookies to understand how you use our site and improve your experience. <a href="' + config.policyUrl + '" style="color:#0066cc;text-decoration:underline;" target="_blank" rel="noopener">Learn more</a></p>' +
          '<div style="display:flex;gap:8px;">' +
          '<button id="sos-accept" style="flex:1;background:#0066cc;color:#fff;border:none;border-radius:4px;padding:10px 16px;cursor:pointer;font-weight:500;font-size:14px;">Accept</button>' +
          '<button id="sos-decline" style="flex:1;background:#f0f0f0;color:#333;border:1px solid #ddd;border-radius:4px;padding:10px 16px;cursor:pointer;font-weight:500;font-size:14px;">Decline</button>' +
          '</div>';
        
        document.body.appendChild(popup);
        
        document.getElementById('sos-accept').onclick = function() {
          window.sos.consent('granted');
          popup.remove();
        };
        
        document.getElementById('sos-decline').onclick = function() {
          window.sos.consent('denied');
          popup.remove();
        };
        
        // Focus trap
        document.getElementById('sos-accept').focus();
        
        // ESC to close
        function handleEscape(e) {
          if (e.key === 'Escape') {
            window.sos.consent('denied');
            popup.remove();
            document.removeEventListener('keydown', handleEscape);
          }
        }
        document.addEventListener('keydown', handleEscape);
      } catch (e) {
        // Silent fail
      }
    }
  };
  
})();
