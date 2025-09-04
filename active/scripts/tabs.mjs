import { getFavicon, rAlert } from "./utils.mjs";
import { getUV, search as processSearchTerm } from "./prxy.mjs";

const { span, iframe, button, img } = van.tags;
const {
  tags: { "ion-icon": ionIcon },
} = van;

var tabs = [];
var selectedTab = null;

const pageBack = document.getElementById("page-back");
const pageForward = document.getElementById("page-forward");
const pageRefreshBtn = document.getElementById("page-refresh"); // Renamed for clarity
const pageRefreshIcon = pageRefreshBtn.querySelector('ion-icon'); // Get the icon element

const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");

const newTabTopButton = document.getElementById("new-tab-button");
const devtoolsIconBtn = document.getElementById("devtools-icon-btn");

const tabList = document.getElementById("tab-list");
const tabView = document.getElementById("tab-view");

const newTabPageContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>New Tab</title>
    <style>
      body { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #282a36; font-family: 'Inter', 'DM Sans', sans-serif; color: #f8f8f2; text-align: center; }
      .search-container { width: 90%; max-width: 600px; }
      h2 { font-size: 2.5em; font-weight: 600; color: #bd93f9; margin-bottom: 0.5em; }
      #new-tab-search-input {
        padding: 12px 20px;
        font-size: 1.1em;
        border: 1px solid #44475a;
        border-radius: 25px;
        background-color: #1e1e1e;
        color: #f8f8f2;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
        margin-top: 1em;
      }
      #new-tab-search-input:focus {
        border-color: #5a32e3;
        box-shadow: 0 0 0 2px rgba(90, 50, 227, 0.5);
      }
      #new-tab-search-form { margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="search-container">
      <h2>UV Static v2</h2>
      <form id="new-tab-search-form">
        <input type="text" id="new-tab-search-input" placeholder="Search or enter address" autofocus />
      </form>
    </div>
    <script>
      document.getElementById('new-tab-search-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const query = document.getElementById('new-tab-search-input').value;
        if (query.trim()) {
          window.parent.postMessage({ type: 'newTabSearch', query: query }, '*');
        }
      });
      window.addEventListener('message', function(event) {
        if (event.data === 'focusSearchInput' && document.getElementById('new-tab-search-input')) {
          document.getElementById('new-tab-search-input').focus();
          document.getElementById('new-tab-search-input').select();
        }
      });
    <\/script>
  </body>
  </html>
`;
const newTabPageDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(newTabPageContent)}`;

// --- Helper for Refresh/Stop Icon ---
function updateRefreshButtonUIDisplay(isLoading) {
  if (isLoading) {
    pageRefreshIcon.name = "close-outline";
    pageRefreshBtn.title = "Stop loading";
  } else {
    pageRefreshIcon.name = "refresh-outline";
    pageRefreshBtn.title = "Refresh";
  }
}

// --- Event Listeners ---
pageBack.onclick = () => { /* ... (no change) ... */ };
pageForward.onclick = () => { /* ... (no change) ... */ };

pageRefreshBtn.onclick = () => {
  if (selectedTab && selectedTab.view && selectedTab.view.contentWindow) {
    if (selectedTab.isLoading) { // If icon is 'stop' (meaning page is loading)
      try {
        selectedTab.view.contentWindow.stop(); // Stop loading
      } catch (e) { console.warn("Could not stop window loading:", e); }
      selectedTab.isLoading = false;
      updateRefreshButtonUIDisplay(false);
    } else { // If icon is 'refresh'
      try {
        if (selectedTab.view.src && !selectedTab.view.src.startsWith("about:") && !selectedTab.view.src.startsWith("data:")) {
           selectedTab.isLoading = true; // Assume loading starts
           updateRefreshButtonUIDisplay(true);
           selectedTab.view.contentWindow.location.reload();
        } else if (selectedTab.view.src === newTabPageDataUrl) {
          selectedTab.isLoading = true; // Setting src implies loading
          updateRefreshButtonUIDisplay(true);
          selectedTab.view.src = newTabPageDataUrl; // This will trigger onload
        }
        // For about:blank, refresh doesn't really do much, icon should remain 'refresh'
      } catch (e) {
        console.error("Error reloading page:", e);
        selectedTab.isLoading = false; // Reset state on error
        updateRefreshButtonUIDisplay(false);
      }
    }
  }
};

newTabTopButton.onclick = () => { addTab(null, true); };

const eruda = `...`; // (no change)
devtoolsIconBtn.onclick = () => { /* ... (no change) ... */ };

urlForm.onsubmit = async (e) => {
  e.preventDefault();
  let rawInput = urlInput.value.trim();
  if (!rawInput) { return; }

  if (selectedTab) {
    selectedTab.isLoading = true;
    updateRefreshButtonUIDisplay(true);
    selectedTab.view.src = await getUV(rawInput);
  } else {
    // This case should be rare if a tab is always present
    await addTab(rawInput); // addTab will set isLoading and update icon
  }
};

const tabItem = (tab) => {
  const children = [];
  if (tab.icon && tab.icon !== "") { // Only add image if icon URL exists
    children.push(img({ src: tab.icon, alt: "" , class:"tab-favicon"}));
  } else {
    // Add a placeholder div for alignment if no icon, or style .tab-item padding
    children.push(span({class: 'tab-favicon-placeholder'})); // An empty span to take up space
  }
  children.push(span({class: 'tab-title'},tab.title || "New Tab"));
  children.push(
    button(
      {
        onclick: () => {
          const tabIndex = tabs.indexOf(tab);
          if (tabIndex > -1) { tabs.splice(tabIndex, 1); }
          if (tab.view && tab.view.parentNode) { tabView.removeChild(tab.view); }
          if (tab.item && tab.item.parentNode) { tabList.removeChild(tab.item); }
          if (tab.view) tab.view.remove();
          if (tab.item) tab.item.remove();

          if (tab == selectedTab) {
            selectedTab = null;
            if (tabs.length > 0) {
              focusTab(tabs[Math.max(0, tabIndex - 1)]);
            } else {
              addTab(null, true);
            }
          }
          saveTabsToLocalStorage();
        },
        class: "close",
        title: "Close tab"
      },
      ionIcon({ name: "close", class: "close-icon" })
    )
  );

  return button(
    {
      onclick: (e) => {
        if (
          !e.target.classList.contains("close") &&
          !e.target.classList.contains("close-icon") &&
          e.target.closest('.tab-item') !== selectedTab.item
        ) {
          focusTab(tab);
        }
      },
      class: "tab-item hover-focus1",
    },
    ...children
  );
};

const tabFrame = (tab) => {
  return iframe({
    class: "tab-frame",
    src: tab.proxiedUrl,
    sandbox: "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation",
    onload: (e) => {
      const iframeWindow = e.target.contentWindow;
      // Update tab state as loaded
      const loadedTab = tabs.find(t => t.view === e.target);
      if (loadedTab) {
        loadedTab.isLoading = false;
        if (loadedTab === selectedTab) {
          updateRefreshButtonUIDisplay(false);
        }
      }

      if (e.target.src === newTabPageDataUrl) {
        tab.title = "New Tab";
        tab.url = "";
        if (tab === selectedTab) {
            urlInput.value = "";
            urlInput.placeholder = "Search or enter URL";
            if (iframeWindow) {
                iframeWindow.postMessage('focusSearchInput', '*');
            }
        }
      } else if (e.target.src === "about:blank") {
        tab.title = "Blank Page";
        tab.url = "";
        if (tab === selectedTab) {
            urlInput.value = "";
            urlInput.placeholder = "Search or enter URL";
        }
      } else {
        try {
            let currentPath = iframeWindow.location.pathname;
            if (currentPath && currentPath.startsWith(__uv$config.prefix)) {
                let parts = currentPath.slice(__uv$config.prefix.length).split("/");
                let encodedUrl = parts[parts.length -1] || parts[parts.length-2];
                tab.url = __uv$config.decodeUrl(encodedUrl);
            } else {
                 tab.url = iframeWindow.location.href;
                 if (tab.url.startsWith("about:") && tab.url !== "about:blank") tab.url = "";
            }
            tab.title = iframeWindow.document.title || tab.url.split('/')[2] || "Page";
        } catch (err) {
            console.warn("Could not access iframe content for tab info:", err);
            tab.title = tab.title || "Error Loading Page";
        }
      }

      tab.icon = getFavicon(tab.url || (e.target.src === newTabPageDataUrl ? "about:newtab" : "about:blank"));
      updateTabItemDisplay(tab);

      if (tab == selectedTab) {
        urlInput.value = tab.url;
      }
      saveTabsToLocalStorage();
    },
    onerror: (e) => {
        console.error("Iframe loading error for tab:", tab, e);
        // Update tab state as loaded (with error)
        const errorTab = tabs.find(t => t.view === e.target);
        if (errorTab) {
            errorTab.isLoading = false;
            if (errorTab === selectedTab) {
                updateRefreshButtonUIDisplay(false);
            }
        }

        tab.title = "Load Error";
        tab.url = tab.url || "error";
        tab.icon = getFavicon("error");
        updateTabItemDisplay(tab);
        if (tab == selectedTab) {
            urlInput.value = tab.url;
        }
    }
  });
};

function updateTabItemDisplay(tab) {
    if (tab && tab.item && tabs.includes(tab)) {
        const tabElement = tab.item;
        const imgElement = tabElement.querySelector("img.tab-favicon"); // Target specific class
        const titleElement = tabElement.querySelector("span.tab-title");
        const placeholderElement = tabElement.querySelector("span.tab-favicon-placeholder");


        if (tab.icon && tab.icon !== "") {
            if (imgElement) {
                imgElement.src = tab.icon;
                imgElement.style.display = 'inline';
            } else { // if img element was not rendered initially, recreate it
                const newImg = img({ src: tab.icon, alt: "", class: "tab-favicon" });
                if(placeholderElement) placeholderElement.replaceWith(newImg); // replace placeholder
                else if(titleElement) titleElement.before(newImg); // or insert before title
            }
            if (placeholderElement) placeholderElement.style.display = 'none';
        } else {
            if (imgElement) imgElement.style.display = 'none';
            if (placeholderElement) placeholderElement.style.display = 'inline'; // Ensure placeholder is visible
        }
        if (titleElement) titleElement.textContent = tab.title || "Untitled";
    }
}


function focusTab(tab) {
  if (selectedTab) {
    if (selectedTab.view) selectedTab.view.style.display = "none";
    if (selectedTab.item) selectedTab.item.classList.remove("selectedTab");
  }
  selectedTab = tab;
  if (tab.view) tab.view.style.display = "block";
  if (tab.item) tab.item.classList.add("selectedTab");

  urlInput.value = tab.url || "";
  if (tab.proxiedUrl === newTabPageDataUrl || tab.url === "") {
    urlInput.placeholder = "Search or enter URL";
    urlInput.focus();
    urlInput.select();
    if (tab.view && tab.view.contentWindow && tab.proxiedUrl === newTabPageDataUrl) {
        tab.view.contentWindow.postMessage('focusSearchInput', '*');
    }
  }
  document.title = (tab.title || "Browser") + " - UV Static v2";
  updateRefreshButtonUIDisplay(tab.isLoading || false); // Update refresh icon based on focused tab's loading state
}

async function addTab(link, isBlank = false) {
  let tab = {
    title: "Loading...",
    url: "",
    proxiedUrl: "about:blank",
    icon: getFavicon("about:blank"),
    isLoading: true, // Assume loading starts when tab is added
  };

  if (isBlank || !link || link.trim() === "") {
    tab.title = "New Tab";
    tab.url = "";
    tab.proxiedUrl = newTabPageDataUrl;
    tab.icon = getFavicon("about:newtab"); // Returns ""
    // For new tabs, loading is very fast, onload will set isLoading to false.
  } else {
    tab.url = processSearchTerm(link, "https://duckduckgo.com/?q=%s&ia=web");
    try {
        tab.proxiedUrl = await getUV(link);
        let decodedPotentialUrl = __uv$config.decodeUrl(tab.proxiedUrl.substring(tab.proxiedUrl.lastIndexOf("/") + 1));
        tab.title = decodedPotentialUrl.replace(/^https?:\/\//, "").split('/')[0] || "Loading...";
    } catch (e) {
        console.error("Error getting UV URL for", link, e);
        tab.title = "Error";
        tab.url = link;
        tab.proxiedUrl = "about:blank";
        tab.isLoading = false; // Not loading if error occurred before navigation attempt
        rAlert(`Failed to load: ${link}`);
    }
    tab.icon = getFavicon(tab.url);
  }

  tab.view = tabFrame(tab);
  tab.item = tabItem(tab);

  if(tab.view.contentWindow) { tryAttachLinkInterceptor(tab); }
  else { tab.view.addEventListener('load', () => tryAttachLinkInterceptor(tab), { once: true }); }

  tabs.push(tab);
  tabList.appendChild(tab.item);
  tabView.appendChild(tab.view);
  
  // Focus the new tab, which will also update the refresh icon
  focusTab(tab); 
  // If it's a very quickly loading local page (like newTabPageDataUrl or about:blank),
  // isLoading might already be false from its own onload before focusTab is called,
  // or it will be set by its onload handler very soon after.
  // If addTab is called for a real URL, isLoading is true, and focusTab will show stop icon.
  
  saveTabsToLocalStorage();

  if (isBlank || tab.proxiedUrl === "about:blank" || tab.proxiedUrl === newTabPageDataUrl) {
      urlInput.focus();
      urlInput.select();
  }
}

function tryAttachLinkInterceptor(tab) { /* ... (no change) ... */ }
function saveTabsToLocalStorage() { /* ... (no change) ... */ }
function loadTabsFromLocalStorage() { /* ... (no change, but initial tabs will also trigger loading states) ... */ }

window.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'newTabSearch') {
    const query = event.data.query;
    if (query && selectedTab && selectedTab.proxiedUrl === newTabPageDataUrl) {
      urlInput.value = query;
      selectedTab.isLoading = true; // Mark as loading
      updateRefreshButtonUIDisplay(true); // Update icon to 'stop'
      selectedTab.view.src = await getUV(query);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadTabsFromLocalStorage();
  // Automatically open a new tab on load if no tabs were loaded from storage
  if (tabs.length === 0) {
    addTab(null, true);
  } else if (selectedTab) {
    updateRefreshButtonUIDisplay(selectedTab.isLoading || false);
  } else if (tabs.length > 0) {
    // If tabs were loaded but none were selected, focus the first one
    focusTab(tabs[0]);
    updateRefreshButtonUIDisplay(tabs[0].isLoading || false);
  } else {
    updateRefreshButtonUIDisplay(false); // Default to refresh if no tabs somehow
  }
});