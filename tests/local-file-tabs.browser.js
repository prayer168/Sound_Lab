// Run in the browser console after directly opening index.html (file://).
(async () => {
  const ids = ["mission", "tone", "mic", "media", "games", "learn", "quiz", "resources"];
  const results = ids.map((id) => {
    document.querySelector(`[data-tab="${id}"]`).click();
    return { id, active: document.querySelector(".panel.active")?.id };
  });
  const passed = results.every((result) => result.id === result.active);
  console.table(results);
  if (!passed) throw new Error("One or more tabs did not switch in file:// mode");
  return `${results.length} local file tab checks passed`;
})();
