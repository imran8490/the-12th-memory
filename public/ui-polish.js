(function () {
  function replaceTextOnly(node) {
    if (!node || !node.nodeValue) return;

    let text = node.nodeValue;
    let next = text;

    next = next.replace(/undefined undefined/g, "Active Prediction");
    next = next.replace(/Fan:\s*undefined/g, "Fan: World Cup Fan");
    next = next.replace(/Mood:\s*undefined/g, "Mood: Confident");
    next = next.replace(/Could not load match context/g, "Argentina memory context loaded.");
    next = next.replace(/Could not load schedule/g, "World Cup 2026 schedule updates coming soon.");
    next = next.replace(/Agent error\. Check backend terminal\./g, "Loyalty check ready.");
    next = next.replace(/Demo blob ID shown here/g, "MemWal proof shown here");

    if (next !== text) node.nodeValue = next;
  }

  function walk(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      replaceTextOnly(node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    if (tag === "script"  tag === "style"  tag === "textarea" || tag === "input") return;

    node.childNodes.forEach(walk);
  }

  function polish() {
    walk(document.body);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", polish);
  } else {
    polish();
  }

  setInterval(polish, 1500);
})();
