/* sidebar.js */
(function() {
    document.addEventListener('DOMContentLoaded', () => {
      if (!document.body) {
        console.error('sidebar.js: document.body is null, retrying...');
        setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 100);
        return;
      }

      // Create sidebar container if it doesn't exist
      let container = document.getElementById('sidebar-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'sidebar-container';
        document.body.appendChild(container);
      }

      // Resolve paths for sidebar.html and style.css
      const script = document.querySelector('script[src*="sidebar.js"]');
      let sidebarPath = '/sidebar.html';
      let cssPath = '/style.css';
      let cssLink = null;
      if (script?.src) {
        const scriptDir = script.src.substring(0, script.src.lastIndexOf('/'));
        sidebarPath = scriptDir + '/sidebar.html';
        cssPath = scriptDir + '/style.css';
      }

      // Load sidebar HTML and stylesheet
      function loadSidebar() {
        fetch(sidebarPath)
          .then(response => {
            if (!response.ok) throw new Error('Failed to fetch sidebar.html: ' + response.status);
            return response.text();
          })
          .then(data => {
            container.innerHTML = data;
            if (!document.getElementById('settings-stylesheet')) {
              cssLink = document.createElement('link');
              cssLink.rel = 'stylesheet';
              cssLink.type = 'text/css';
              cssLink.href = cssPath;
              cssLink.id = 'settings-stylesheet';
              document.head.appendChild(cssLink);
            }
            initializeSidebar();
          })
          .catch(error => {
            console.error('sidebar.js: Error loading sidebar:', error);
            setTimeout(loadSidebar, 1000);
          });
      }

      loadSidebar();

      function initializeSidebar() {
        const sidebar = document.querySelector('.sidebar');

        // Toggle sidebar-active class on body
        function toggleSidebarActive(isActive) {
          document.body.classList.toggle('sidebar-active', isActive);
          sidebar.classList.toggle('active', isActive);
        }

        // Handle hover and focus for sidebar
        sidebar.addEventListener('mouseenter', () => toggleSidebarActive(true));
        sidebar.addEventListener('mouseleave', () => {
          if (!sidebar.contains(document.activeElement)) {
            toggleSidebarActive(false);
          }
        });
        sidebar.addEventListener('focusin', () => toggleSidebarActive(true));
        sidebar.addEventListener('focusout', (e) => {
          if (!sidebar.contains(e.relatedTarget)) {
            toggleSidebarActive(false);
          }
        });

        // Toggle sidebar on click/touch for mobile
        sidebar.addEventListener('click', (e) => {
          if (window.innerWidth <= 768 && !sidebar.classList.contains('active')) {
            e.preventDefault();
            toggleSidebarActive(true);
          }
        });

        // Allow clicking outside to close sidebar on mobile
        document.addEventListener('click', (e) => {
          if (window.innerWidth <= 768 && sidebar.classList.contains('active') && !sidebar.contains(e.target)) {
            toggleSidebarActive(false);
          }
        });

        // Switch between settings tabs
        function switchTab(tabName) {
          const tabs = document.querySelectorAll('.settings-overlay--scoped .settings-tabs .tab');
          const contents = document.querySelectorAll('.settings-overlay--scoped .tab-content');

          tabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive);
          });

          contents.forEach(content => {
            content.classList.toggle('active', content.id === tabName);
          });
        }

        // Initialize tab navigation
        const tabs = document.querySelectorAll('.settings-overlay--scoped .settings-tabs .tab');
        tabs.forEach(tab => {
          tab.addEventListener('click', () => switchTab(tab.dataset.tab));
          tab.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              switchTab(tab.dataset.tab);
            }
          });
        });

        switchTab('general');

        // Toggle changelog visibility
        window.toggleChangelog = function() {
          const content = document.getElementById('changelog-content');
          content.style.display = content.style.display === 'block' ? 'none' : 'block';
          content.setAttribute('aria-expanded', content.style.display === 'block');
        };

        // Hide changelog when clicking outside
        document.addEventListener('click', function(e) {
          const changelog = document.getElementById('changelog-content');
          const changelogButton = document.querySelector('.sidebar-item[onclick="toggleChangelog()"]');
          if (changelog && changelog.style.display === 'block') {
            if (!changelog.contains(e.target) && e.target !== changelogButton) {
              changelog.style.display = 'none';
              changelog.setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle settings overlay
        window.toggleSettings = function() {
          const overlay = document.getElementById('settings-overlay');
          overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
          if (overlay.style.display === 'flex') {
            overlay.classList.add('slide-in');
            if (!document.getElementById('settings-stylesheet') && !cssLink) {
              cssLink = document.createElement('link');
              cssLink.rel = 'stylesheet';
              cssLink.type = 'text/css';
              cssLink.href = cssPath;
              cssLink.id = 'settings-stylesheet';
              document.head.appendChild(cssLink);
            }
            document.querySelector('.settings-tabs .tab.active')?.focus();
          } else {
            overlay.classList.remove('slide-in');
            console.log('sidebar.js: Settings closed, stylesheet retained');
          }
        };

        // Open current page in about:blank
        window.openInAboutBlankNow = function() {
          if (typeof openURLInAboutBlank === 'function') {
            openURLInAboutBlank(window.location.href);
          }
        };

        // Navigate to index page
        window.navigateToIndex = function() {
          const script = document.querySelector('script[src*="sidebar.js"]');
          let indexPath = '../index.html';
          if (script?.src) {
            const scriptDir = script.src.substring(0, script.src.lastIndexOf('/'));
            indexPath = scriptDir + '/../index.html';
          }
          const autoAboutBlank = localStorage.getItem('autoAboutBlank') === 'true';
          if (autoAboutBlank && typeof openURLInAboutBlank === 'function') {
            openURLInAboutBlank(indexPath);
          } else {
            window.location.href = indexPath;
          }
        };

        // Clear all caches
        window.clearCache = function() {
          if ('caches' in window) {
            caches.keys()
              .then(keys => Promise.all(keys.map(key => caches.delete(key))))
              .then(() => {
                alert('All caches cleared successfully.');
                // Force reload to ensure new service worker and cache take effect
                window.location.reload(true);
              })
              .catch(error => {
                console.error('sidebar.js: Error clearing caches:', error);
                alert('Failed to clear caches.');
              });
          } else {
            alert('Cache API not supported in this browser.');
          }
        };

        // Close settings on overlay click or Escape key
        const settingsOverlay = document.getElementById('settings-overlay');
        settingsOverlay.addEventListener('click', function(e) {
          if (e.target === this) toggleSettings();
        });
        settingsOverlay.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') toggleSettings();
        });

        // Performance mode toggle
        const performanceModeToggle = document.getElementById('performance-mode-toggle');
        if (performanceModeToggle) {
          const savedState = localStorage.getItem('performanceMode');
          performanceModeToggle.checked = savedState === 'true';
          const effectsContainer = document.querySelector('.effects-container');
          effectsContainer.style.display = performanceModeToggle.checked ? 'none' : 'block';
          document.body.classList.toggle('visual-effects-enabled', !performanceModeToggle.checked);
          performanceModeToggle.addEventListener('change', function() {
            localStorage.setItem('performanceMode', this.checked);
            effectsContainer.style.display = this.checked ? 'none' : 'block';
            document.body.classList.toggle('visual-effects-enabled', !this.checked);
            if (typeof window.updateEffects === 'function') {
              window.updateEffects();
            }
          });
        }

        // Effect density selection
        const effectDensitySelect = document.getElementById('effect-density-select');
        if (effectDensitySelect) {
          effectDensitySelect.value = localStorage.getItem('effectDensity') || 'high';
          effectDensitySelect.addEventListener('change', function() {
            localStorage.setItem('effectDensity', this.value);
            if (typeof window.updateEffects === 'function') {
              window.updateEffects();
            }
          });
        }

        // Custom content toggle
        const customContentToggle = document.getElementById('custom-content-toggle');
        if (customContentToggle) {
          const savedState = localStorage.getItem('customContentEnabled');
          customContentToggle.checked = savedState !== null ? savedState === 'true' : true;
          customContentToggle.addEventListener('change', function() {
            localStorage.setItem('customContentEnabled', this.checked);
            if (typeof renderContentList === 'function') {
              renderContentList();
            }
          });
        }

        // Anti-close toggle
        const antiClose = document.getElementById('anti-close');
        if (antiClose) {
          antiClose.checked = localStorage.getItem('antiClose') === 'true';
          antiClose.addEventListener('change', function() {
            localStorage.setItem('antiClose', this.checked);
            if (typeof applyAntiClose === 'function') {
              applyAntiClose();
            }
          });
        }

        // Auto about:blank toggle
        const autoAboutBlank = document.getElementById('auto-about-blank');
        if (autoAboutBlank) {
          autoAboutBlank.checked = localStorage.getItem('autoAboutBlank') === 'true';
          autoAboutBlank.addEventListener('change', function(e) {
            localStorage.setItem('autoAboutBlank', e.target.checked);
            if (e.target.checked && !inFrame()) {
              if (typeof openURLInAboutBlank === 'function') {
                openURLInAboutBlank(window.location.href);
                window.location.href = 'https://www.edpuzzle.com';
              }
            }
          });
        }

        // Cloak selection
        const cloakSelect = document.getElementById('cloak-select');
        if (cloakSelect) {
          cloakSelect.value = localStorage.getItem('selectedCloak') || 'default';
          cloakSelect.addEventListener('change', function() {
            localStorage.setItem('selectedCloak', this.value);
            if (typeof applyCloak === 'function') {
              applyCloak(this.value);
            }
          });
        }

        // Theme selection
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
          const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
          themeSelect.value = savedTheme;
          const customSettings = document.querySelectorAll('.settings-overlay--scoped .custom-theme-settings');
          customSettings.forEach(el => {
            el.style.display = savedTheme === 'custom' ? 'block' : 'none';
          });
          themeSelect.addEventListener('change', function() {
            const selectedTheme = this.value;
            localStorage.setItem('selectedTheme', selectedTheme);
            customSettings.forEach(el => {
              el.style.display = selectedTheme === 'custom' ? 'block' : 'none';
            });
            if (typeof window.setTheme === 'function') {
              window.setTheme(selectedTheme);
            }
          });
        }

        // Custom background color
        const customBgColor = document.getElementById('custom-bg-color');
        if (customBgColor) {
          customBgColor.value = localStorage.getItem('customBgColor') || '#000000';
          customBgColor.addEventListener('change', function() {
            localStorage.setItem('customBgColor', this.value);
            if (themeSelect.value === 'custom') {
              window.setTheme('custom');
            }
          });
        }

        // Custom gradient
        const customGradient = document.getElementById('custom-gradient');
        if (customGradient) {
          customGradient.value = localStorage.getItem('customGradient') || '';
          customGradient.addEventListener('change', function() {
            localStorage.setItem('customGradient', this.value);
            if (themeSelect.value === 'custom') {
              window.setTheme('custom');
            }
          });
        }

        // Custom video URL
        const customVideoUrl = document.getElementById('custom-video-url');
        if (customVideoUrl) {
          customVideoUrl.value = localStorage.getItem('customVideoUrl') || '';
          customVideoUrl.addEventListener('change', function() {
            localStorage.setItem('customVideoUrl', this.value);
            if (themeSelect.value === 'custom') {
              window.setTheme('custom');
            }
          });
        }

        // Dot speed selection
        const dotSpeedSelect = document.getElementById('dot-speed-select');
        if (dotSpeedSelect) {
          dotSpeedSelect.value = localStorage.getItem('selectedDotSpeed') || 'normal';
          dotSpeedSelect.addEventListener('change', function() {
            localStorage.setItem('selectedDotSpeed', this.value);
            if (typeof window.setDotSpeed === 'function') {
              window.setDotSpeed(this.value);
            }
          });
        }

        // Panic URL input
        const panicUrlInput = document.getElementById('panic-url');
        if (panicUrlInput) {
          panicUrlInput.value = localStorage.getItem('panicAction') || 'https://edpuzzle.com/notifications';
          panicUrlInput.addEventListener('change', function() {
            const newUrl = this.value;
            if (newUrl && /^https?:\/\//.test(newUrl)) {
              localStorage.setItem('panicAction', newUrl);
            } else {
              alert('Please enter a valid URL starting with http:// or https://');
              this.value = localStorage.getItem('panicAction') || 'https://edpuzzle.com/notifications';
            }
          });
        }

        // Ensure sidebar is visible
        if (sidebar) {
          sidebar.style.visibility = 'visible';
        }
      }

      // Check if page is in a frame
      function inFrame() {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      }
    });
})();