export function getFavicon(url) {
  // Return empty for blank, newtab, or data URLs to prevent failed Google S2 calls
  if (!url || url === "about:blank" || url === "about:newtab" || url.startsWith("data:")) { //
    return ""; // Or path to a local default icon e.g., "/icons/default-tab.svg"
  }
  return (
    "https://s2.googleusercontent.com/s2/favicons?sz=64&domain_url=" +
    encodeURIComponent(url)
  );
}

export function rAlert(text) {
  const div = document.createElement("div");
  div.className = "r-alert";

  div.innerHTML = `<p>${text}</p>`;

  document.body.appendChild(div);

  div.style.transform = "translateX(150%)";
  setTimeout(() => {
    div.style.transform = "translateX(0)";
  }, 10);

  setTimeout(() => {
    div.style.transform = "translateX(150%)";
    setTimeout(() => {
      div.remove();
    }, 150);
  }, 1500);
}