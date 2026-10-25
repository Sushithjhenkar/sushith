(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Keep animation timers from racing through their frames in a background tab.
  async function delay(ms) {
    if (document.hidden) {
      await new Promise((resolve) => {
        const wake = () => {
          if (!document.hidden) {
            document.removeEventListener("visibilitychange", wake);
            resolve();
          }
        };
        document.addEventListener("visibilitychange", wake);
      });
    }
    if (reducedMotion) return;
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }

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
  // All three queries are illustrative portfolio data, never real DB connections.
  const heroQueries = [
    {
      file: "developer_profile.sql",
      parts: [
        ["comment", "-- developer_profile.sql\n"],
        ["keyword", "SELECT"], ["plain", " TOP (1)\n    Name, Role, Focus\n"],
        ["keyword", "FROM"], ["plain", " dbo.Engineers\n"],
        ["keyword", "WHERE"], ["plain", " Name = "],
        ["string", "'Sushith Jhenkar'"], ["plain", ";"]
      ],
      resultTitle: "Sushith Jhenkar",
      resultValue: "SQL Server / Backend Engineer"
    },
    {
      file: "backend_stack.sql",
      parts: [
        ["comment", "-- backend_stack.sql\n"],
        ["keyword", "SELECT"], ["plain", " STRING_AGG(Skill, ', ') AS Stack\n"],
        ["keyword", "FROM"], ["plain", " dbo.EngineerSkills\n"],
        ["keyword", "WHERE"], ["plain", " Category = "],
        ["string", "'Backend'"], ["plain", ";"]
      ],
      resultTitle: "Backend stack",
      resultValue: "SQL Server · T-SQL · C# · .NET"
    },
    {
      file: "production_focus.sql",
      parts: [
        ["comment", "-- production_focus.sql\n"],
        ["keyword", "SELECT"], ["plain", " TOP (1) CurrentFocus\n"],
        ["keyword", "FROM"], ["plain", " dbo.Engineers\n"],
        ["keyword", "WHERE"], ["plain", " Name = "],
        ["string", "'Sushith Jhenkar'"], ["plain", ";"]
      ],
      resultTitle: "Engineering focus",
      resultValue: "Transaction processing · Billing · Integrations"
    }
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
  const heroFile = $("hero-file");
  const heroCycle = $("hero-cycle");
  const replay = $("replay-query");

  // A cancellable generation counter keeps Replay from creating simultaneous loops.
  // Reduced-motion visitors see one complete query without automatic repetition.
  async function playHeroQuery() {
    const sequence = ++heroSequence;
    const current = () => sequence === heroSequence;
    let index = 0;
    while (current()) {
      const data = heroQueries[index];
      if (!reducedMotion && index !== 0) {
        heroQuery.classList.add("cycle-out");
        heroResult.classList.add("cycle-out");
        await delay(390);
        if (!current()) return;
      }
      heroFile.textContent = data.file;
      heroCycle.textContent = String(index + 1).padStart(2, "0") + " / " + String(heroQueries.length).padStart(2, "0");
      heroQuery.classList.remove("cycle-out");
      heroResult.classList.remove("cycle-out", "shown");
      heroResult.textContent = "Awaiting query execution…";
      heroResultTime.textContent = "WAITING";
      heroStatus.textContent = "● Typing query…";
      const finished = await typeSql(heroQuery, data.parts, current);
      if (!finished || !current()) return;
      heroStatus.textContent = "● Executing SELECT…";
      await delay(460);
      if (!current()) return;
      const record = document.createElement("div");
      record.className = "hero-result-row";
      const label = document.createElement("strong");
      label.textContent = data.resultTitle;
      const value = document.createElement("span");
      value.textContent = data.resultValue;
      const success = document.createElement("span");
      success.className = "query-success";
      success.textContent = "1 row returned";
      record.append(label, value, success);
      heroResult.replaceChildren(record);
      requestAnimationFrame(() => {
        if (current()) heroResult.classList.add("shown");
      });
      heroResultTime.textContent = "SUCCESS";
      heroStatus.textContent = "● Query completed · simulated data";
      if (reducedMotion) return;
      await delay(2700);
      if (!current()) return;
      index = (index + 1) % heroQueries.length;
    }
  }
  replay?.addEventListener("click", () => playHeroQuery());

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
    ".motion-section .section-label,.motion-section .heading,.motion-section .subheading,.motion-section .window,.motion-section .intro-columns,.motion-section .career-row,.motion-section .work-card,.motion-section .plan-panel,.motion-section .inline-note,.motion-section .info-panel,.motion-section .edu,.motion-section .pipeline > div,.motion-section .contact-social,.motion-section .commit,.motion-section .stack-row,.motion-section .contact-email"
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

  // Keep navigation context in sync with whichever engineering section is in view.
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        navLinks.forEach((link) => {
          const selected = link.getAttribute("href") === "#" + target.id;
          link.classList.toggle("is-active", selected);
          if (selected) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }
    }, { rootMargin: "-25% 0px -60% 0px", threshold: 0 });
    document.querySelectorAll("#about,#experience,#work,#skills,#contact").forEach(section => sectionObserver.observe(section));
  }

  // A low-cost moving light on project cards; disabled for touch and reduced motion.
  if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".work-card").forEach((card) => {
      let rect = null;
      card.addEventListener("pointerenter", () => { rect = card.getBoundingClientRect(); });
      card.addEventListener("pointerleave", () => { rect = null; });
      card.addEventListener("pointermove", (event) => {
        if (!rect) return;
        card.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
        card.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
      }, { passive: true });
    });
  }

  // Start in the first viewport on initial load; no intro screen obscures the typing.
  $("intro-overlay")?.classList.add("done");
  if (reducedMotion) playHeroQuery();
  else window.setTimeout(playHeroQuery, 290);
})();