(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, reducedMotion || document.hidden ? 0 : ms));

  $("year").textContent = new Date().getFullYear();

  // Scroll progress + a restrained hero parallax effect.
  const heroCopy = document.querySelector(".hero-copy");
  let scrollScheduled = false;
  function onScroll() {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    $("progress").style.width = (available > 0 ? (window.scrollY / available) * 100 : 0) + "%";
    if (heroCopy && !reducedMotion && window.innerWidth >= 901) {
      const amount = Math.min(window.scrollY, 650);
      heroCopy.style.translate = "0 " + (amount * 0.12) + "px";
      heroCopy.style.opacity = String(Math.max(0.25, 1 - amount / 850));
    }
    scrollScheduled = false;
  }
  window.addEventListener("scroll", () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  // The old page held the main SQL query below the fold.
  // This second, visible-on-load editor gives the visitor an immediate live query.
  const heroParts = [
    ["comment", "-- developer_profile.sql\n"],
    ["keyword", "SELECT"], ["plain", " TOP (1)\n    "],
    ["plain", "Name, Role, Focus\n"],
    ["keyword", "FROM"], ["plain", " dbo.Engineers\n"],
    ["keyword", "WHERE"], ["plain", " Name = "],
    ["string", "'Sushith Jhenkar'"], ["plain", ";\n"]
  ];
  const profileParts = [
    ["comment", "-- Who is Sushith?\n"],
    ["keyword", "SELECT"], ["plain", " DeveloperName, Specialization,\n       PrimaryStack, Status\n"],
    ["keyword", "FROM"], ["plain", " dbo.Engineers\n"],
    ["keyword", "WHERE"], ["plain", " DeveloperName = "],
    ["string", "'Sushith Jhenkar'"], ["plain", ";"]
  ];

  // Text nodes inside token spans keep partially typed SQL valid and syntax-highlighted.
  async function typeSql(element, parts, isCurrent) {
    if (!element) return false;
    element.replaceChildren();
    if (reducedMotion) {
      for (const [kind, text] of parts) {
        const span = document.createElement("span");
        span.className = "sql-" + kind;
        span.textContent = text;
        element.appendChild(span);
      }
      return true;
    }
    const caret = document.createElement("span");
    caret.className = "live-caret";
    caret.setAttribute("aria-hidden", "true");
    for (const [kind, text] of parts) {
      if (!isCurrent()) return false;
      const span = document.createElement("span");
      span.className = "sql-" + kind;
      element.appendChild(span);
      element.appendChild(caret);
      for (const character of text) {
        if (!isCurrent()) return false;
        span.textContent += character;
        const pause = character === "\n" ? 145 : character === " " ? 42 : /[(),;]/.test(character) ? 76 : 20 + Math.random() * 20;
        await delay(pause);
      }
    }
    caret.remove();
    return isCurrent();
  }

  let heroSequence = 0;
  const heroQuery = $("hero-query");
  const heroStatus = $("hero-query-status");
  const heroResult = $("hero-result");
  const heroResultTime = $("hero-result-time");
  const replay = $("replay-query");
  async function playHeroQuery() {
    const sequence = ++heroSequence;
    const current = () => sequence === heroSequence;
    heroStatus.textContent = "● Typing query…";
    heroResultTime.textContent = "WAITING";
    heroResult.classList.remove("shown");
    heroResult.textContent = "Awaiting query execution…";
    replay.disabled = true;
    const finished = await typeSql(heroQuery, heroParts, current);
    if (!finished) return;
    heroStatus.textContent = "● Executing SELECT…";
    await delay(330);
    if (!current()) return;
    heroResult.replaceChildren();
    const record = document.createElement("div");
    record.className = "hero-result-row";
    const role = document.createElement("strong");
    role.textContent = "Sushith Jhenkar";
    const description = document.createElement("span");
    description.textContent = "SQL Server / Backend Engineer";
    const success = document.createElement("span");
    success.className = "query-success";
    success.textContent = "1 row returned";
    record.append(role, description, success);
    heroResult.appendChild(record);
    requestAnimationFrame(() => heroResult.classList.add("shown"));
    heroResultTime.textContent = "SUCCESS";
    heroStatus.textContent = "● Query completed · simulated data";
    replay.disabled = false;
  }
  replay?.addEventListener("click", playHeroQuery);

  // Secondary full-size workbench also types instead of showing a static code block.
  let profileSequence = 0;
  let startedProfile = false;
  let profileResultSequence = 0;
  const introQuery = $("intro-query");
  const runProfile = $("run-profile");
  async function executeProfile() {
    const sequence = ++profileResultSequence;
    runProfile.disabled = true;
    $("profile-message").textContent = "Executing simulated query…";
    $("profile-time").textContent = "RUNNING";
    $("profile-results").innerHTML = '<tr><td colspan="5" class="empty">Loading simulated result set…</td></tr>';
    await delay(350);
    if (sequence !== profileResultSequence) return;
    $("profile-results").innerHTML = '<tr><td>1</td><td>Sushith Jhenkar</td><td>SQL Server / Backend Engineer</td><td>T-SQL · C# · .NET</td><td class="success">ACTIVE</td></tr>';
    $("profile-message").textContent = "(1 row returned) · Demo data · Query completed successfully";
    $("profile-time").textContent = "SUCCESS";
    runProfile.disabled = false;
  }
  async function startProfileQuery() {
    if (startedProfile) return;
    startedProfile = true;
    const sequence = ++profileSequence;
    const ok = await typeSql(introQuery, profileParts, () => sequence === profileSequence);
    if (ok) executeProfile();
  }
  if (introQuery) {
    introQuery.classList.remove("typewriter-target");
    introQuery.textContent = "";
    if (reducedMotion || !("IntersectionObserver" in window)) {
      startProfileQuery();
    } else {
      const profileObserver = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          profileObserver.disconnect();
          startProfileQuery();
        }
      }, { threshold: 0.2 });
      profileObserver.observe(document.querySelector("#about .window"));
    }
  }
  runProfile.addEventListener("click", () => {
    if (!startedProfile) startProfileQuery();
    executeProfile();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!startedProfile) startProfileQuery();
      executeProfile();
    }
  });

  // Intersection-observer reveals are GPU-friendly: opacity and transform only.
  const revealElements = document.querySelectorAll(
    ".motion-section .section-label,.motion-section .heading,.motion-section .subheading,.motion-section .window,.motion-section .intro-columns,.motion-section .career-row,.motion-section .work-card,.motion-section .plan-panel,.motion-section .stack-row,.motion-section .contact-email"
  );
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          target.classList.add("is-visible");
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.07, rootMargin: "0px 0px -20px 0px" });
    revealElements.forEach((element) => observer.observe(element));
  }

  // Soft pointer spotlight, disabled for touch/reduced motion.
  const ambient = document.querySelector(".ambient-light");
  if (ambient && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    let targetX = -600, targetY = -600, x = targetX, y = targetY;
    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      ambient.style.opacity = "1";
    }, { passive: true });
    function paintSpotlight() {
      x += (targetX - x) * 0.11;
      y += (targetY - y) * 0.11;
      ambient.style.transform = "translate3d(" + (x - 240) + "px," + (y - 240) + "px,0)";
      requestAnimationFrame(paintSpotlight);
    }
    requestAnimationFrame(paintSpotlight);
  }

  // Interactive scan vs seek: intentionally illustrative, NOT actual SQL Server I/O metrics.
  const pages = $("pages");
  let labSequence = 0;
  function resetLab() {
    ++labSequence;
    pages.replaceChildren();
    for (let n = 1; n <= 24; n++) {
      const page = document.createElement("div");
      page.className = "page";
      page.textContent = String(n).padStart(2, "0");
      pages.append(page);
    }
    $("reads").textContent = "0";
    $("operator").textContent = "—";
    $("found").textContent = "—";
    $("lab-status").textContent = "READY";
    $("scan").disabled = false;
    $("seek").disabled = false;
  }
  async function runLab(mode) {
    resetLab();
    const sequence = labSequence;
    $("scan").disabled = true;
    $("seek").disabled = true;
    $("operator").textContent = mode === "scan" ? "SCAN" : "SEEK";
    $("lab-status").textContent = "RUNNING";
    const steps = mode === "scan" ? Array.from({ length: 17 }, (_, index) => index) : [3, 11, 16];
    for (let i = 0; i < steps.length; i++) {
      if (sequence !== labSequence) return;
      pages.children[steps[i]].classList.add("read");
      $("reads").textContent = String(i + 1);
      await delay(mode === "scan" ? 85 : 340);
    }
    if (sequence !== labSequence) return;
    pages.children[16].classList.remove("read");
    pages.children[16].classList.add("found");
    $("found").textContent = "ID 17";
    $("lab-status").textContent = "COMPLETE";
    $("scan").disabled = false;
    $("seek").disabled = false;
  }
  $("scan").addEventListener("click", () => runLab("scan"));
  $("seek").addEventListener("click", () => runLab("seek"));
  $("reset").addEventListener("click", resetLab);
  resetLab();

  // Start the intro on load, then reveal the hero SQL typing immediately.
  const bootOverlay = $("intro-overlay");
  if (reducedMotion) {
    bootOverlay?.classList.add("done");
    playHeroQuery();
  } else {
    window.setTimeout(() => {
      bootOverlay?.classList.add("done");
      playHeroQuery();
    }, 560);
  }
})();