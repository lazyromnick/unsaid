
const STORAGE_KEY = "unsaid_journal_entries_v1";
const THEME_KEY = "unsaid_theme_v1";

const JOURNAL_CATEGORIES = [
  "Personal Thoughts",
  "Feelings",
  "Problems",
  "Random Thoughts",
  "Ideas",
  "Realizations",
  "Unsent Messages",
  "Dreams & Aspirations",
  "Questions"
];

const PROMPTS = {
  "Self-Discovery": [
    "What is something you wish you understood about yourself?",
    "When do you feel most like yourself?",
    "What is a quality in yourself that you are learning to appreciate?",
    "What is something you have changed your mind about?",
    "What does feeling comfortable in your own company mean to you?"
  ],
  "Emotions": [
    "What feeling has been visiting you most often lately?",
    "What helps you feel calm when your mind is busy?",
    "Is there an emotion you find difficult to put into words?",
    "What is one small thing that made you feel lighter recently?",
    "If your current mood had a color, what would it be and why?"
  ],
  "Relationships": [
    "What makes you feel genuinely understood by another person?",
    "What is something you appreciate but rarely say out loud?",
    "What does a healthy friendship look like to you?",
    "What is one thing you wish people understood about the way you communicate?",
    "What kind of conversations do you wish you had more often?"
  ],
  "Life & Experiences": [
    "What small moment from recently would you like to remember?",
    "What experience taught you something unexpected?",
    "What is something ordinary that makes your day better?",
    "If you could revisit one peaceful moment, which would it be?",
    "What has been taking up most of your thoughts lately?"
  ],
  "Dreams & Goals": [
    "What is something you hope your future self gets to experience?",
    "What kind of life would feel meaningful to you?",
    "What is one small step you could take toward a goal?",
    "What are you curious to learn or try someday?",
    "What would you do if you were less worried about making mistakes?"
  ],
  "Random Thoughts": [
    "What random thought crossed your mind today?",
    "What is a tiny detail that other people might overlook?",
    "What question has no practical reason to be on your mind, but is there anyway?",
    "Describe a place you find interesting.",
    "What is something you have been overthinking for no particular reason?"
  ],
  "Creativity": [
    "Invent a place where you would love to spend an afternoon.",
    "If today were a short story, what would its title be?",
    "Describe a scene using only the details you can hear and see.",
    "What idea have you wanted to create but haven't started yet?",
    "Write a message from your future self to your present self."
  ],
  "Deep Questions": [
    "What does being understood mean to you?",
    "Can a person outgrow an old version of themselves?",
    "What makes a place feel like home?",
    "What is something you believe now that you did not believe before?",
    "What do you think people need more of in their everyday lives?"
  ]
};

const GREETINGS = [
  "A little space for you.",
  "Welcome back to your quiet corner.",
  "Take a breath. You're here.",
  "Whatever is on your mind, it belongs here.",
  "Make room for the thoughts you've been carrying.",
  "A new page, whenever you're ready."
];

const MOOD_EMOJI = {
  Happy: "😊",
  Sad: "☁️",
  Anxious: "🫧",
  Confused: "🌀",
  Excited: "✨",
  Grateful: "♡",
  Lonely: "🌙",
  Frustrated: "🌧️",
  Peaceful: "🕊️",
  Motivated: "🌱",
  Neutral: "○"
};

let entries = [];
let currentPage = "home";
let previousPage = "journal";
let currentReadingId = null;
let pendingConfirmation = null;
let currentPrompt = "";
let currentPromptCategory = "";
let storageAvailable = true;

/* ---------- 2. DOM helpers ---------- */

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

function getElement(id) {
  return document.getElementById(id);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
}

function localDateKey(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue, includeTime = false) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const options = includeTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function countWords(text) {
  const trimmed = String(text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function activeEntries() {
  return entries.filter((entry) => !entry.archived);
}

function findEntry(id) {
  return entries.find((entry) => entry.id === id);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ---------- 3. LocalStorage ---------- */

function loadEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || makeId()),
        title: String(item.title || ""),
        content: String(item.content || ""),
        category: JOURNAL_CATEGORIES.includes(item.category) ? item.category : "Personal Thoughts",
        mood: String(item.mood || "Neutral"),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        favorite: Boolean(item.favorite),
        archived: Boolean(item.archived)
      }));
  } catch (error) {
    console.error("Could not read UNSAID journal data:", error);
    storageAvailable = false;
    return [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    storageAvailable = true;
    return true;
  } catch (error) {
    console.error("Could not save UNSAID journal data:", error);
    storageAvailable = false;
    return false;
  }
}

function showStorageWarningIfNeeded() {
  if (!storageAvailable) {
    window.setTimeout(() => {
      window.alert(
        "UNSAID could not access browser storage. Your changes may not be saved. Check your browser settings or available storage."
      );
    }, 300);
  }
}

/* ---------- 4. Navigation ---------- */

function navigateTo(pageName) {
  const page = getElement(`page-${pageName}`);
  if (!page) return;

  if (pageName !== "reading" && pageName !== "write") {
    previousPage = pageName;
  }

  currentPage = pageName;

  $$(".page").forEach((section) => {
    const isActive = section.dataset.page === pageName;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });

  $$("[data-page-link]").forEach((link) => {
    const isActive = link.dataset.pageLink === pageName;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  closeSidebar();

  if (pageName === "home") renderDashboard();
  if (pageName === "journal") renderJournal();
  if (pageName === "favorites") renderFavorites();
  if (pageName === "archive") renderArchive();
  if (pageName === "statistics") renderStatistics();

  window.scrollTo({ top: 0, behavior: "smooth" });
  if (pageName !== "reading") {
    const hash = pageName === "home" ? "#home" : `#${pageName}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, "", hash);
    }
  }
}

function openSidebar() {
  const sidebar = getElement("sidebar");
  const toggle = getElement("menuToggle");
  sidebar.classList.add("is-open");
  getElement("sidebarBackdrop").classList.add("is-visible");
  toggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("sidebar-open");
}

function closeSidebar() {
  const sidebar = getElement("sidebar");
  const toggle = getElement("menuToggle");
  if (!sidebar || !toggle) return;
  sidebar.classList.remove("is-open");
  getElement("sidebarBackdrop").classList.remove("is-visible");
  toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("sidebar-open");
}

/* ---------- 5. Dashboard and streak calculations ---------- */

function calculateWritingStreak() {
  const dates = new Set(
    activeEntries().map((entry) => localDateKey(entry.createdAt))
  );

  if (dates.size === 0) return 0;

  const today = new Date();
  const todayKey = localDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);

  // A streak remains current if the user wrote today or yesterday.
  let cursor;
  if (dates.has(todayKey)) {
    cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  } else if (dates.has(yesterdayKey)) {
    cursor = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  } else {
    return 0;
  }

  let streak = 0;
  while (dates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function updateGreeting() {
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  const greetingElement = getElement("welcomeGreeting");
  if (greetingElement) greetingElement.textContent = greeting;

  const dateElement = getElement("currentDate");
  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(new Date()).toUpperCase();
  }
}

function renderDashboard() {
  const active = activeEntries();
  const totalWords = active.reduce((sum, entry) => sum + countWords(entry.content), 0);
  const favorites = active.filter((entry) => entry.favorite).length;
  const streak = calculateWritingStreak();

  setText("totalEntries", active.length);
  setText("totalWords", totalWords.toLocaleString());
  setText("writingStreak", `${streak} ${streak === 1 ? "day" : "days"}`);
  setText("favoriteCount", favorites);

  const recent = [...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  renderEntryList("recentEntriesList", recent, "recent");
}

function setText(id, value) {
  const element = getElement(id);
  if (element) element.textContent = String(value);
}

/* ---------- 6. Entry cards and lists ---------- */

function createEntryCard(entry, context) {
  const card = makeElement("article", "entry-card");
  const top = makeElement("div", "entry-card-top");
  const title = makeElement("h3", "", entry.title || "Untitled thought");
  const date = makeElement("span", "entry-meta", formatDate(entry.createdAt));
  top.append(title, date);

  const preview = makeElement("p", "entry-preview", entry.content);
  const footer = makeElement("div", "entry-card-footer");
  const metadata = makeElement("div", "entry-meta");
  metadata.append(
    makeElement("span", "entry-tag", entry.category),
    makeElement("span", "entry-mood", `${MOOD_EMOJI[entry.mood] || "○"} ${entry.mood}`)
  );
  footer.append(metadata);

  const actions = makeElement("div", "entry-card-actions");

  const readButton = makeActionButton("Read", "read", entry.id, "Open this entry");
  actions.append(readButton);

  if (context !== "archive") {
    const favoriteButton = makeActionButton(
      entry.favorite ? "♥" : "♡",
      "favorite",
      entry.id,
      entry.favorite ? "Remove from favorites" : "Add to favorites"
    );
    if (entry.favorite) favoriteButton.classList.add("is-active");
    actions.append(favoriteButton);

    const archiveButton = makeActionButton("▣", "archive", entry.id, "Archive entry");
    actions.append(archiveButton);
  } else {
    actions.append(makeActionButton("Restore", "restore", entry.id, "Restore entry"));
  }

  const editButton = makeActionButton("✎", "edit", entry.id, "Edit entry");
  actions.append(editButton);

  const deleteButton = makeActionButton("⌫", "delete", entry.id, "Delete entry");
  actions.append(deleteButton);

  card.append(top, preview, footer, actions);
  return card;
}

function makeActionButton(label, action, id, accessibleLabel) {
  const button = makeElement("button", "entry-action", label);
  button.type = "button";
  button.dataset.action = action;
  button.dataset.id = id;
  button.setAttribute("aria-label", accessibleLabel);
  return button;
}

function renderEntryList(containerId, list, context) {
  const container = getElement(containerId);
  if (!container) return;

  container.replaceChildren();

  if (list.length === 0) {
    const empty = makeElement("div", "empty-state");
    const icon = makeElement("span", "empty-state-icon", context === "archive" ? "▣" : "✧");
    icon.setAttribute("aria-hidden", "true");

    let heading = "No entries yet";
    let message = "Your journal will grow one thought at a time.";
    let buttonLabel = "Write your first entry";

    if (context === "favorites") {
      heading = "Nothing saved here yet";
      message = "Mark an entry as a favorite and it will appear in this space.";
      buttonLabel = "";
    } else if (context === "archive") {
      heading = "Your archive is empty";
      message = "Archived entries will be kept here until you restore or delete them.";
      buttonLabel = "";
    } else if (context === "recent") {
      heading = "Your pages are waiting.";
      message = "Your recent entries will appear here after you write your first thought.";
      buttonLabel = "Create your first entry →";
    } else if (context === "search") {
      heading = "No matching thoughts";
      message = "Try another search term or choose a different category.";
      buttonLabel = "";
    }

    empty.append(icon, makeElement("h3", "", heading), makeElement("p", "", message));

    if (buttonLabel) {
      const button = makeElement("button", "text-button", buttonLabel);
      button.type = "button";
      button.dataset.navigate = "write";
      empty.append(button);
    }
    container.append(empty);
    return;
  }

  list.forEach((entry) => container.append(createEntryCard(entry, context)));
}

function renderJournal() {
  const query = (getElement("journalSearch")?.value || "").trim().toLowerCase();
  const category = getElement("journalCategoryFilter")?.value || "all";
  const sort = getElement("journalSort")?.value || "newest";

  let list = activeEntries().filter((entry) => {
    const matchesQuery =
      !query ||
      entry.title.toLowerCase().includes(query) ||
      entry.content.toLowerCase().includes(query) ||
      entry.category.toLowerCase().includes(query) ||
      entry.mood.toLowerCase().includes(query);

    const matchesCategory = category === "all" || entry.category === category;
    return matchesQuery && matchesCategory;
  });

  if (sort === "oldest") {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sort === "title") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  setText("journalResultsNote", `${list.length} ${list.length === 1 ? "entry" : "entries"}`);
  renderEntryList("journalEntriesList", list, list.length ? "journal" : "search");
}

function renderFavorites() {
  const list = activeEntries()
    .filter((entry) => entry.favorite)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  renderEntryList("favoriteEntriesList", list, "favorites");
}

function renderArchive() {
  const list = entries
    .filter((entry) => entry.archived)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  renderEntryList("archivedEntriesList", list, "archive");
}

/* ---------- 7. Writing and editing entries ---------- */

function resetEntryForm() {
  const form = getElement("entryForm");
  if (form) form.reset();
  setValue("entryId", "");
  setText("writePageTitle", "Write a thought");
  setText("saveEntryButton", "Save entry");
  setText("wordCount", "0 words");
  setText("entryFormMessage", "");
}

function setValue(id, value) {
  const element = getElement(id);
  if (element) element.value = value;
}

function startNewEntry(promptText = "") {
  resetEntryForm();
  if (promptText) {
    setValue("entryContent", `${promptText}\n\n`);
    updateWordCount();
  }
  previousPage = currentPage === "write" || currentPage === "reading" ? "journal" : currentPage;
  navigateTo("write");
  window.setTimeout(() => getElement("entryTitle")?.focus(), 100);
}

function startEditingEntry(id) {
  const entry = findEntry(id);
  if (!entry) return;

  previousPage = currentPage === "reading" ? previousPage : currentPage;
  resetEntryForm();
  setValue("entryId", entry.id);
  setValue("entryTitle", entry.title);
  setValue("entryCategory", entry.category);
  setValue("entryMood", entry.mood);
  setValue("entryContent", entry.content);
  setText("writePageTitle", "Edit your thought");
  setText("saveEntryButton", "Save changes");
  updateWordCount();
  navigateTo("write");
  window.setTimeout(() => getElement("entryTitle")?.focus(), 100);
}

function handleEntrySubmit(event) {
  event.preventDefault();

  const id = getElement("entryId").value;
  const title = getElement("entryTitle").value.trim();
  const category = getElement("entryCategory").value;
  const mood = getElement("entryMood").value;
  const content = getElement("entryContent").value.trim();

  if (!title || !category || !mood || !content) {
    setText("entryFormMessage", "Please complete all fields before saving.");
    return;
  }

  const now = new Date().toISOString();

  if (id) {
    const existing = findEntry(id);
    if (!existing) {
      setText("entryFormMessage", "This entry could not be found. Please try again.");
      return;
    }

    existing.title = title;
    existing.category = category;
    existing.mood = mood;
    existing.content = content;
    existing.updatedAt = now;
  } else {
    entries.push({
      id: makeId(),
      title,
      category,
      mood,
      content,
      createdAt: now,
      updatedAt: now,
      favorite: false,
      archived: false
    });
  }

  const saved = saveEntries();
  resetEntryForm();
  renderAll();

  if (!saved) {
    setText("entryFormMessage", "Your entry may not have been saved. Check browser storage.");
    navigateTo("write");
    return;
  }

  navigateTo("journal");
}

function updateWordCount() {
  const content = getElement("entryContent")?.value || "";
  const words = countWords(content);
  setText("wordCount", `${words} ${words === 1 ? "word" : "words"}`);
}

/* ---------- 8. Reading mode ---------- */

function openReadingMode(id) {
  const entry = findEntry(id);
  if (!entry) return;

  currentReadingId = id;
  previousPage = currentPage === "reading" ? previousPage : currentPage;

  setText("readingEntryMeta",
    `${formatDate(entry.createdAt, true)}  ·  ${entry.category}  ·  ${MOOD_EMOJI[entry.mood] || ""} ${entry.mood}`
  );
  setText("readingEntryTitle", entry.title || "Untitled thought");

  const body = getElement("readingEntryBody");
  body.textContent = entry.content;
  body.style.whiteSpace = "pre-wrap";

  const favoriteButton = getElement("readingFavoriteButton");
  favoriteButton.textContent = entry.favorite ? "♥" : "♡";
  favoriteButton.classList.toggle("is-active", entry.favorite);
  favoriteButton.setAttribute("aria-label", entry.favorite ? "Remove from favorites" : "Add to favorites");

  const archiveButton = getElement("readingArchiveButton");
  archiveButton.textContent = entry.archived ? "↶" : "▣";
  archiveButton.setAttribute("aria-label", entry.archived ? "Restore entry" : "Archive entry");

  navigateTo("reading");
}

function returnFromReading() {
  const destination = previousPage === "write" || previousPage === "reading" ? "journal" : previousPage;
  navigateTo(destination || "journal");
}

/* ---------- 9. Favorites, archive, restore, delete ---------- */

function toggleFavorite(id) {
  const entry = findEntry(id);
  if (!entry) return;

  entry.favorite = !entry.favorite;
  entry.updatedAt = new Date().toISOString();
  saveEntries();
  renderAll();

  if (currentPage === "reading") openReadingMode(id);
}

function toggleArchive(id) {
  const entry = findEntry(id);
  if (!entry) return;

  entry.archived = !entry.archived;
  entry.updatedAt = new Date().toISOString();
  saveEntries();
  renderAll();

  if (currentPage === "reading") {
    navigateTo(entry.archived ? "archive" : "journal");
  }
}

function requestDeleteEntry(id) {
  const entry = findEntry(id);
  if (!entry) return;

  pendingConfirmation = () => {
    entries = entries.filter((item) => item.id !== id);
    saveEntries();
    renderAll();

    if (currentPage === "reading") {
      navigateTo(previousPage === "archive" ? "archive" : "journal");
    } else if (currentPage === "archive") {
      renderArchive();
    } else if (currentPage === "favorites") {
      renderFavorites();
    } else if (currentPage === "journal") {
      renderJournal();
    }
  };

  openConfirmation(
    "Delete this thought?",
    "This entry will be permanently deleted from this browser. This action cannot be undone.",
    "Delete"
  );
}

function openConfirmation(title, message, confirmLabel) {
  setText("confirmationTitle", title);
  setText("confirmationMessage", message);
  setText("confirmActionButton", confirmLabel);

  const dialog = getElement("confirmationDialog");
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    const shouldContinue = window.confirm(`${title}\n\n${message}`);
    if (shouldContinue && pendingConfirmation) {
      pendingConfirmation();
      pendingConfirmation = null;
    }
  }
}

function closeConfirmation(confirmed) {
  const dialog = getElement("confirmationDialog");
  if (dialog.open) dialog.close();

  if (confirmed && typeof pendingConfirmation === "function") {
    const action = pendingConfirmation;
    pendingConfirmation = null;
    action();
  } else {
    pendingConfirmation = null;
  }
}

/* ---------- 10. Writing prompts ---------- */

function getRandomPrompt(category = "") {
  const pool = category && PROMPTS[category]
    ? PROMPTS[category]
    : Object.values(PROMPTS).flat();

  if (pool.length === 0) return "What has been on your mind lately?";
  if (pool.length === 1) return pool[0];

  let prompt = pool[Math.floor(Math.random() * pool.length)];
  if (prompt === currentPrompt) {
    const alternatives = pool.filter((item) => item !== currentPrompt);
    prompt = alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  return prompt;
}

function showNewPrompt(category = "") {
  currentPromptCategory = category;
  currentPrompt = getRandomPrompt(category);
  setText("dailyPromptText", currentPrompt);
  setText("explorePromptText", currentPrompt);
}

function useCurrentPrompt() {
  startNewEntry(currentPrompt || getElement("dailyPromptText")?.textContent || "");
}

function renderPromptCategory(category) {
  const results = getElement("promptResults");
  if (!results) return;

  results.replaceChildren();
  const prompts = PROMPTS[category] || [];

  $$(".category-card").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.promptCategory === category);
  });

  if (!prompts.length) return;

  const heading = makeElement("h3", "", category);
  heading.style.margin = "5px 0 0";
  heading.style.fontFamily = 'Georgia, "Times New Roman", serif';
  heading.style.fontWeight = "500";
  results.append(heading);

  prompts.forEach((prompt) => {
    const item = makeElement("div", "prompt-result");
    const text = makeElement("p", "", prompt);
    text.style.margin = "0 0 9px";
    const button = makeElement("button", "text-button", "Write about this →");
    button.type = "button";
    button.addEventListener("click", () => startNewEntry(prompt));
    item.append(text, button);
    results.append(item);
  });
}

/* ---------- 11. Statistics ---------- */

function renderStatistics() {
  const active = activeEntries();
  const totalWords = active.reduce((sum, entry) => sum + countWords(entry.content), 0);
  const favoriteCount = active.filter((entry) => entry.favorite).length;
  const streak = calculateWritingStreak();

  setText("statisticsTotalEntries", active.length);
  setText("statisticsTotalWords", totalWords.toLocaleString());
  setText("statisticsStreak", `${streak} ${streak === 1 ? "day" : "days"}`);
  setText("statisticsFavorites", favoriteCount);

  renderMonthlyActivity(active);
  renderMoodDistribution(active);
  renderFavoriteCategory(active);
}

function renderMonthlyActivity(list) {
  const container = getElement("monthlyActivity");
  if (!container) return;
  container.replaceChildren();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const title = makeElement("p", "", new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(now));
  title.style.fontWeight = "800";
  title.style.color = "var(--text)";
  container.append(title);

  const grid = makeElement("div", "activity-month");
  const counts = new Map();

  list.forEach((entry) => {
    const date = new Date(entry.createdAt);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      counts.set(day, (counts.get(day) || 0) + 1);
    }
  });

  for (let index = 0; index < firstDay; index += 1) {
    const blank = makeElement("span", "activity-day");
    blank.style.visibility = "hidden";
    grid.append(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const count = counts.get(day) || 0;
    const cell = makeElement("span", `activity-day${count ? " has-entry" : ""}${count > 1 ? " has-many" : ""}`);
    cell.title = `${day}: ${count} ${count === 1 ? "entry" : "entries"}`;
    cell.setAttribute("aria-label", cell.title);
    grid.append(cell);
  }

  container.append(grid);
}

function renderMoodDistribution(list) {
  const container = getElement("moodDistribution");
  if (!container) return;
  container.replaceChildren();

  if (!list.length) {
    container.append(makeElement("p", "", "Your selected moods will appear here as you add entries."));
    return;
  }

  const counts = new Map();
  list.forEach((entry) => counts.set(entry.mood, (counts.get(entry.mood) || 0) + 1));

  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([mood, count]) => {
      const row = makeElement("div", "mood-row");
      const label = makeElement("span", "", `${MOOD_EMOJI[mood] || "○"} ${mood}`);
      const track = makeElement("div", "mood-bar-track");
      const fill = makeElement("div", "mood-bar-fill");
      fill.style.width = `${(count / list.length) * 100}%`;
      track.append(fill);
      const number = makeElement("span", "", String(count));
      row.append(label, track, number);
      container.append(row);
    });
}

function renderFavoriteCategory(list) {
  const container = getElement("favoriteCategory");
  if (!container) return;
  container.replaceChildren();

  if (!list.length) {
    container.append(makeElement("p", "", "Your most-used category will appear here."));
    return;
  }

  const counts = new Map();
  list.forEach((entry) => counts.set(entry.category, (counts.get(entry.category) || 0) + 1));
  const [category, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  container.append(
    makeElement("p", "", "Your most-used category"),
    makeElement("h3", "", category),
    makeElement("p", "", `${count} ${count === 1 ? "entry" : "entries"}`)
  );
  const heading = $("h3", container);
  if (heading) {
    heading.style.margin = "7px 0";
    heading.style.color = "var(--primary-dark)";
    heading.style.fontFamily = 'Georgia, "Times New Roman", serif';
    heading.style.fontSize = "21px";
  }
}

/* ---------- 12. Export JSON backup ---------- */

function exportBackup() {
  const message = getElement("backupMessage");
  const backup = {
    application: "UNSAID",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    entries
  };

  try {
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = makeElement("a");
    link.href = url;
    link.download = `unsaid-backup-${localDateKey(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    if (message) message.textContent = "Your backup is ready.";
  } catch (error) {
    console.error("Could not export backup:", error);
    if (message) message.textContent = "The backup could not be created. Please try again.";
  }
}

/* ---------- 13. Theme ---------- */

function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.style.colorScheme = selectedTheme;

  const selector = getElement("themeSelect");
  if (selector) selector.value = selectedTheme;

  try {
    localStorage.setItem(THEME_KEY, selectedTheme);
  } catch (error) {
    console.warn("Theme preference could not be saved:", error);
  }
}

function loadTheme() {
  let theme = "light";
  try {
    theme = localStorage.getItem(THEME_KEY) || "light";
  } catch (error) {
    console.warn("Theme preference could not be loaded:", error);
  }
  applyTheme(theme);
}

/* ---------- 14. Refresh visible data ---------- */

function renderAll() {
  renderDashboard();
  renderJournal();
  renderFavorites();
  renderArchive();
  renderStatistics();

  if (currentReadingId && currentPage === "reading") {
    const entry = findEntry(currentReadingId);
    if (entry) openReadingMode(currentReadingId);
  }
}

/* ---------- 15. Event listeners ---------- */

function handleGlobalClick(event) {
  const navigationTarget = event.target.closest("[data-navigate]");
  if (navigationTarget) {
    event.preventDefault();
    const destination = navigationTarget.dataset.navigate;
    if (destination === "write") {
      startNewEntry();
    } else {
      navigateTo(destination);
    }
    return;
  }

  const pageLink = event.target.closest("[data-page-link]");
  if (pageLink) {
    event.preventDefault();
    navigateTo(pageLink.dataset.pageLink);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const { action, id } = actionButton.dataset;
    if (action === "read") openReadingMode(id);
    if (action === "favorite") toggleFavorite(id);
    if (action === "archive") toggleArchive(id);
    if (action === "restore") toggleArchive(id);
    if (action === "edit") startEditingEntry(id);
    if (action === "delete") requestDeleteEntry(id);
  }
}

function bindEvents() {
  document.addEventListener("click", handleGlobalClick);

  getElement("menuToggle")?.addEventListener("click", openSidebar);
  getElement("sidebarClose")?.addEventListener("click", closeSidebar);
  getElement("sidebarBackdrop")?.addEventListener("click", closeSidebar);

  getElement("entryForm")?.addEventListener("submit", handleEntrySubmit);
  getElement("entryContent")?.addEventListener("input", updateWordCount);

  getElement("cancelWritingButton")?.addEventListener("click", () => {
    resetEntryForm();
    navigateTo(previousPage === "write" ? "journal" : previousPage);
  });

  getElement("journalSearch")?.addEventListener("input", renderJournal);
  getElement("journalCategoryFilter")?.addEventListener("change", renderJournal);
  getElement("journalSort")?.addEventListener("change", renderJournal);

  getElement("newPromptButton")?.addEventListener("click", () => showNewPrompt());
  getElement("randomPromptButton")?.addEventListener("click", () => {
    showNewPrompt(currentPromptCategory);
  });
  getElement("usePromptButton")?.addEventListener("click", useCurrentPrompt);
  getElement("exploreUsePromptButton")?.addEventListener("click", useCurrentPrompt);

  $$(".category-card").forEach((button) => {
    button.addEventListener("click", () => {
      renderPromptCategory(button.dataset.promptCategory);
      showNewPrompt(button.dataset.promptCategory);
    });
  });

  getElement("backFromReadingButton")?.addEventListener("click", returnFromReading);
  getElement("readingFavoriteButton")?.addEventListener("click", () => {
    if (currentReadingId) toggleFavorite(currentReadingId);
  });
  getElement("readingArchiveButton")?.addEventListener("click", () => {
    if (currentReadingId) toggleArchive(currentReadingId);
  });
  getElement("readingEditButton")?.addEventListener("click", () => {
    if (currentReadingId) startEditingEntry(currentReadingId);
  });
  getElement("readingDeleteButton")?.addEventListener("click", () => {
    if (currentReadingId) requestDeleteEntry(currentReadingId);
  });

  getElement("cancelConfirmationButton")?.addEventListener("click", () => closeConfirmation(false));
  getElement("confirmActionButton")?.addEventListener("click", () => closeConfirmation(true));

  getElement("confirmationDialog")?.addEventListener("click", (event) => {
    if (event.target === getElement("confirmationDialog")) {
      closeConfirmation(false);
    }
  });

  getElement("themeSelect")?.addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });

  getElement("exportBackupButton")?.addEventListener("click", exportBackup);

  window.addEventListener("hashchange", () => {
    const pageName = window.location.hash.replace("#", "") || "home";
    if (getElement(`page-${pageName}`) && pageName !== "reading") {
      navigateTo(pageName);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

/* ---------- 16. Initialize application ---------- */

function initializeApp() {
  entries = loadEntries();
  loadTheme();
  bindEvents();
  updateGreeting();
  showNewPrompt();
  renderAll();

  const initialPage = window.location.hash.replace("#", "");
  if (initialPage && getElement(`page-${initialPage}`) && initialPage !== "reading") {
    navigateTo(initialPage);
  } else {
    navigateTo("home");
  }

  showStorageWarningIfNeeded();
}

document.addEventListener("DOMContentLoaded", initializeApp);