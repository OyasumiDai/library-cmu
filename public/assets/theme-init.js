// Runs before the page paints so a saved colour theme or motion setting never flashes.
try {
  var saved = localStorage.getItem("cmu-library-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  if (localStorage.getItem("cmu-library-motion") === "reduced") document.documentElement.classList.add("reduce-motion");
} catch (error) { /* private mode: keep the defaults */ }
