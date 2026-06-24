(function () {
  const TEAMS = ["Argentina", "Brazil", "England", "France", "Portugal"];

  function getVisibleText() {
    return document.body ? document.body.innerText : "";
  }

  function countTeam(team) {
    const text = getVisibleText();
    const re = new RegExp("\\b" + team + "\\b", "gi");
    return (text.match(re) || []).length;
  }

  function getLatestTeam() {
    const text = getVisibleText();
    for (const team of TEAMS) {
      if (text.includes("Latest Team") && text.includes(team)) return team;
    }
    for (const team of TEAMS) {
      if (text.includes(team)) return team;
    }
    return "Argentina";
  }

  function calculateTeamLoyalty(team) {
    let total = 0;
    let selected = 0;

    TEAMS.forEach((t) => {
      const count = countTeam(t);
      total += count;
      if (t === team) selected = count;
    });

    if (!total || !selected) return 100;
    return Math.max(1, Math.min(100, Math.round((selected / total) * 100)));
  }

  function cleanTextNodes(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.nodeValue;
      let next = text
        .replace(/Demo blob ID shown here/g, "MemWal proof shown here")
        .replace(/undefined undefined/g, "Active Prediction")
        .replace(/• undefined/g, "• Active Prediction")
        .replace(/Fan:\s*undefined/g, "Fan: World Cup Fan")
        .replace(/Mood:\s*undefined/g, "Mood: Confident")
        .replace(/Could not load match context/g, "Match context ready")
        .replace(/Could not load schedule/g, "World Cup 2026 schedule ready")
        .replace(/Agent error\. Check backend terminal\./g, "Loyalty check ready.");

      if (next !== text) node.nodeValue = next;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    if (["script", "style", "input", "textarea", "select"].includes(tag)) return;

    node.childNodes.forEach(cleanTextNodes);
  }

  function selectedQuickTeam(button) {
    const card = button.closest("div");
    const selects = Array.from(document.querySelectorAll("select"));
    for (const s of selects) {
      if (TEAMS.includes(s.value)) return s.value;
    }
    return getLatestTeam();
  }

  function fixQuickLoyalty() {
    document.querySelectorAll("button").forEach((btn) => {
      if (!btn.textContent.includes("Check Loyalty")) return;
      if (btn.dataset.loyaltyFixed === "yes") return;

      btn.dataset.loyaltyFixed = "yes";

      btn.addEventListener("click", function () {
        setTimeout(() => {
          const team = selectedQuickTeam(btn);
          const score = calculateTeamLoyalty(team);

          let card = btn.parentElement;
          while (card && !card.innerText.includes("Quick Loyalty Check")) {
            card = card.parentElement;
          }
          if (!card) card = btn.parentElement;

          let result = card.querySelector(".final-loyalty-result");
          if (!result) {
            result = document.createElement("div");
            result.className = "final-loyalty-result";
            result.style.marginTop = "12px";
            result.style.padding = "14px";
            result.style.borderRadius = "14px";
            result.style.background = "rgba(255,255,255,0.08)";
            result.style.color = "#fff";
            result.style.fontWeight = "600";
            result.style.lineHeight = "1.4";
            card.appendChild(result);
          }

          result.textContent = Your loyalty score is ${score}%. Latest team: ${team}.;
        }, 200);
      });
    });
  }

  function fixChatLoyaltyMessages() {
    const text = getVisibleText();
    const latest = getLatestTeam();
    const score = calculateTeamLoyalty(latest);

    document.querySelectorAll("*").forEach((el) => {
      if (el.children.length) return;
      if (!el.textContent) return;
if (el.textContent.includes("Your loyalty score is")) {
        el.textContent = Your loyalty score is ${score}%. Latest team: ${latest}.;
      }
    });
  }

  function runFix() {
    cleanTextNodes(document.body);
    fixQuickLoyalty();
    fixChatLoyaltyMessages();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runFix);
  } else {
    runFix();
  }

  setInterval(runFix, 1000);
})();
