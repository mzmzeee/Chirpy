(() => {
  "use strict";

  const BASE_PATH = "/api";
  const STORAGE_KEY = "raqmana-chirpy.session.v1";
  const AVATAR_SRC = "../assets/users_pfp.png?v=3";

  const state = {
    session: readSession(),
    chirps: [],
    sort: "desc",
    authMode: "login",
    loading: false,
  };

  const els = {
    authButton: document.querySelector("#authButton"),
    headerAvatar: document.querySelector("#headerAvatar"),
    headerUserName: document.querySelector("#headerUserName"),
    headerUserStatus: document.querySelector("#headerUserStatus"),
    composerAvatar: document.querySelector("#composerAvatar"),
    composerHint: document.querySelector("#composerHint"),
    chirpInput: document.querySelector("#chirpInput"),
    postChirpButton: document.querySelector("#postChirpButton"),
    sortButton: document.querySelector("#sortButton"),
    refreshFeedButton: document.querySelector("#refreshFeedButton"),
    chirpFeed: document.querySelector("#chirpFeed"),
    emptyState: document.querySelector("#emptyState"),
    chirpCount: document.querySelector("#chirpCount"),
    authorCount: document.querySelector("#authorCount"),
    miniChart: document.querySelector("#miniChart"),
    authModal: document.querySelector("#authModal"),
    authForm: document.querySelector("#authForm"),
    authEmail: document.querySelector("#authEmail"),
    authPassword: document.querySelector("#authPassword"),
    authError: document.querySelector("#authError"),
    authTitle: document.querySelector("#authTitle"),
    authEyebrow: document.querySelector("#authEyebrow"),
    authDescription: document.querySelector("#authDescription"),
    authSubmitButton: document.querySelector("#authSubmitButton"),
    loginTab: document.querySelector("#loginTab"),
    signupTab: document.querySelector("#signupTab"),
    profileModal: document.querySelector("#profileModal"),
    profileForm: document.querySelector("#profileForm"),
    profileAvatar: document.querySelector("#profileAvatar"),
    profileEmailLabel: document.querySelector("#profileEmailLabel"),
    profileBadge: document.querySelector("#profileBadge"),
    profileEmail: document.querySelector("#profileEmail"),
    profilePassword: document.querySelector("#profilePassword"),
    profileError: document.querySelector("#profileError"),
    logoutButton: document.querySelector("#logoutButton"),
    openProfileButton: document.querySelector("#openProfileButton"),
    focusComposerButton: document.querySelector("#focusComposerButton"),
    chirpTemplate: document.querySelector("#chirpTemplate"),
    toastRegion: document.querySelector("#toastRegion"),
  };

  function readSession() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return parsed && parsed.user && parsed.accessToken && parsed.refreshToken ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    state.session = session;
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
    renderSession();
  }

  function avatarHue(id) {
    let hash = 0;
    for (const char of id || "raqmana") hash = (hash * 31 + char.charCodeAt(0)) % 360;
    return hash;
  }

  function usernameFromEmail(email) {
    const localPart = String(email || "").split("@")[0].trim();
    return localPart ? `@${localPart}` : "@user";
  }

  function friendlyIdentity(id) {
    const firstNames = ["Avery", "Casey", "Jordan", "Morgan", "Riley", "Sam", "Taylor", "Alex", "Cameron", "Drew"];
    const lastNames = ["Finch", "Lark", "Robin", "Sparrow", "Starling", "Swift", "Wren", "Dove"];
    const hash = avatarHue(id);
    const firstName = firstNames[hash % firstNames.length];
    const lastName = lastNames[Math.floor(hash / firstNames.length) % lastNames.length];
    return {
      name: `${firstName} ${lastName}`,
      handle: `@${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    };
  }

  function normalizedID(value) {
    return String(value || "").trim().toLowerCase();
  }

  function avatarFallback() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("avatar-fallback");
    svg.innerHTML = '<path d="M37.6 12.7c-2.6-4-7.8-6.2-12.9-5.1-6.4 1.4-10.6 7.5-9.5 13.8.1.7.3 1.4.6 2.1L8.7 31c-.9.9-.3 2.5 1 2.5h8.6c3.1 3 7.6 4.4 12 3.3 7.3-1.7 11.8-9 10-16.2-.7-3.1-1.6-5.4-2.7-7.9Z"/><circle cx="31.5" cy="18.5" r="2.1"/><path d="m39.2 21.3 6.1 2.7-6.3 2.1"/>';
    return svg;
  }

  function styleAvatar(element, id, label) {
    const hue = avatarHue(id);
    const image = new Image();
    image.src = AVATAR_SRC;
    image.alt = "";
    image.decoding = "async";
    image.addEventListener("error", () => image.replaceWith(avatarFallback()), { once: true });

    element.replaceChildren(image);
    element.style.setProperty("--avatar-ring", `hsl(${hue} 78% 62%)`);
    element.setAttribute("aria-label", `${label || "User"} profile picture`);
  }

  function renderSession() {
    const signedIn = Boolean(state.session);
    const user = state.session?.user;

    els.chirpInput.disabled = !signedIn;
    updateComposerState();
    const username = signedIn ? usernameFromEmail(user.email) : "";
    els.composerHint.textContent = signedIn
      ? `Posting as ${username}`
      : "Sign in to publish an update.";

    if (signedIn) {
      styleAvatar(els.headerAvatar, user.id, username);
      styleAvatar(els.composerAvatar, user.id, username);
      styleAvatar(els.profileAvatar, user.id, username);
      els.headerUserName.textContent = username;
      els.headerUserStatus.textContent = user.is_chirpy_red ? "Raqmana member" : "account active";
      els.profileEmailLabel.textContent = username;
      els.profileBadge.textContent = user.is_chirpy_red ? "Raqmana member" : "Standard account";
      els.profileEmail.value = user.email;
    } else {
      [els.headerAvatar, els.composerAvatar, els.profileAvatar].forEach((element) => {
        element.removeAttribute("style");
        styleAvatar(element, "default", "Default user");
      });
      els.headerUserName.textContent = "Sign in";
      els.headerUserStatus.textContent = "access your account";
      els.profileEmailLabel.textContent = "Not signed in";
      els.profileBadge.textContent = "Standard account";
      els.profileEmail.value = "";
    }

    renderChirps();
  }

  function friendlyError(message, fallback) {
    const value = String(message || "").toLowerCase();
    if (value.includes("incorrect email or password")) return "Incorrect email or password.";
    if (value.includes("too long")) return "This update exceeds the allowed length.";
    if (value.includes("not the author")) return "You can only delete your own updates.";
    if (value.includes("chirp not found")) return "That update is no longer available.";
    if (value.includes("expired") || value.includes("token") || value.includes("authorization")) return "Your session expired. Sign in again.";
    if (value.includes("user not found")) return "Account not found.";
    if (value.includes("forbidden")) return "That action is not available.";
    return fallback;
  }

  async function request(path, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (options.auth !== false && state.session?.accessToken) {
      headers.set("Authorization", `Bearer ${state.session.accessToken}`);
    }

    const response = await fetch(`${BASE_PATH}${path}`, { ...options, headers });

    if (response.status === 401 && retry && options.auth !== false && state.session?.refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return request(path, options, false);
    }

    if (!response.ok) {
      let message = "Something went wrong. Please try again.";
      try {
        const payload = await response.json();
        message = friendlyError(payload.error, message);
      } catch {
        // Keep the user-facing fallback message.
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    const type = response.headers.get("content-type") || "";
    return type.includes("application/json") ? response.json() : response.text();
  }

  async function refreshAccessToken() {
    try {
      const response = await fetch(`${BASE_PATH}/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${state.session.refreshToken}` },
      });
      if (!response.ok) throw new Error("Session expired");
      const payload = await response.json();
      saveSession({ ...state.session, accessToken: payload.token });
      return true;
    } catch {
      saveSession(null);
      toast("Your session expired. Sign in again.", true);
      return false;
    }
  }

  function renderSkeletons() {
    els.chirpFeed.replaceChildren();
    for (let index = 0; index < 3; index += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "chirp-card skeleton";
      skeleton.setAttribute("aria-hidden", "true");
      els.chirpFeed.append(skeleton);
    }
    els.emptyState.hidden = true;
  }

  async function loadChirps({ quiet = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    if (!quiet) renderSkeletons();

    const query = new URLSearchParams({ sort: state.sort });

    try {
      state.chirps = await request(`/chirps?${query.toString()}`, { auth: false });
      renderChirps();
    } catch (error) {
      state.chirps = [];
      renderChirps();
      toast(`Couldn’t load the updates: ${error.message}`, true);
    } finally {
      state.loading = false;
    }
  }

  function renderChirps() {
    els.chirpFeed.replaceChildren();
    els.emptyState.hidden = state.chirps.length !== 0;

    state.chirps.forEach((chirp, index) => {
      const fragment = els.chirpTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".chirp-card");
      const avatar = fragment.querySelector(".chirp-avatar");
      const author = fragment.querySelector(".chirp-author");
      const handle = fragment.querySelector(".chirp-handle");
      const time = fragment.querySelector(".chirp-time");
      const body = fragment.querySelector(".chirp-body");
      const deleteButton = fragment.querySelector(".delete-button");
      const isOwn = normalizedID(chirp.user_id) === normalizedID(state.session?.user?.id);
      const ownUsername = usernameFromEmail(state.session?.user?.email);
      const identity = isOwn
        ? { name: ownUsername.slice(1), handle: ownUsername }
        : friendlyIdentity(chirp.user_id);

      card.style.animationDelay = `${Math.min(index * 38, 300)}ms`;
      styleAvatar(avatar, chirp.user_id, identity.handle);
      author.textContent = identity.name;
      handle.textContent = identity.handle;
      time.dateTime = chirp.created_at;
      time.textContent = relativeTime(chirp.created_at);
      time.title = new Date(chirp.created_at).toLocaleString();
      body.textContent = chirp.body;


      if (isOwn) {
        deleteButton.hidden = false;
        deleteButton.addEventListener("click", () => deleteChirp(chirp.id));
      }

      els.chirpFeed.append(fragment);
    });

    const authors = new Set(state.chirps.map((chirp) => chirp.user_id));
    els.chirpCount.textContent = String(state.chirps.length);
    els.authorCount.textContent = String(authors.size);
    renderActivityChart();
  }

  function renderActivityChart() {
    const buckets = Array(12).fill(0);
    const now = Date.now();
    const span = 12 * 60 * 60 * 1000;
    state.chirps.forEach((chirp) => {
      const age = now - new Date(chirp.created_at).getTime();
      const index = 11 - Math.min(11, Math.max(0, Math.floor(age / (span / 12))));
      buckets[index] += 1;
    });
    const max = Math.max(1, ...buckets);
    els.miniChart.replaceChildren();
    buckets.forEach((count, index) => {
      const bar = document.createElement("span");
      bar.style.height = `${Math.max(8, (count / max) * 100)}%`;
      bar.style.animationDelay = `${index * 25}ms`;
      bar.title = `${count} update${count === 1 ? "" : "s"}`;
      els.miniChart.append(bar);
    });
  }

  function relativeTime(value) {
    const timestamp = new Date(value).getTime();
    const seconds = Math.round((timestamp - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const divisions = [
      { amount: 60, unit: "second" },
      { amount: 60, unit: "minute" },
      { amount: 24, unit: "hour" },
      { amount: 7, unit: "day" },
      { amount: 4.345, unit: "week" },
      { amount: 12, unit: "month" },
      { amount: Infinity, unit: "year" },
    ];
    let duration = seconds;
    for (const division of divisions) {
      if (Math.abs(duration) < division.amount) return formatter.format(Math.round(duration), division.unit);
      duration /= division.amount;
    }
    return "recently";
  }

  async function postChirp() {
    const body = els.chirpInput.value.trim();
    if (!body || !state.session) return;
    setButtonBusy(els.postChirpButton, true, "Sending…");
    try {
      const chirp = await request("/chirps", { method: "POST", body: JSON.stringify({ body }) });
      els.chirpInput.value = "";
      updateComposerState();
      state.chirps = state.sort === "desc" ? [chirp, ...state.chirps] : [...state.chirps, chirp];
      renderChirps();
      toast("Your update has been published.");
    } catch (error) {
      toast(`Couldn’t post: ${error.message}`, true);
    } finally {
      setButtonBusy(els.postChirpButton, false, "Publish");
      updateComposerState();
    }
  }

  async function deleteChirp(id) {
    const confirmed = window.confirm("Delete this update? This action cannot be undone.");
    if (!confirmed) return;
    try {
      await request(`/chirps/${id}`, { method: "DELETE" });
      state.chirps = state.chirps.filter((chirp) => chirp.id !== id);
      renderChirps();
      toast("Update deleted.");
    } catch (error) {
      toast(`Couldn’t delete: ${error.message}`, true);
    }
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const isLogin = mode === "login";
    els.loginTab.classList.toggle("is-active", isLogin);
    els.signupTab.classList.toggle("is-active", !isLogin);
    els.loginTab.setAttribute("aria-selected", String(isLogin));
    els.signupTab.setAttribute("aria-selected", String(!isLogin));
    els.authEyebrow.textContent = isLogin ? "WELCOME BACK" : "CREATE AN ACCOUNT";
    els.authTitle.textContent = isLogin ? "Sign in to participate." : "Create your account.";
    els.authDescription.textContent = isLogin
      ? "Sign in to publish and manage your updates."
      : "Create an account to publish updates and manage your profile.";
    els.authSubmitButton.querySelector("span").textContent = isLogin ? "Sign in" : "Create account";
    els.authPassword.autocomplete = isLogin ? "current-password" : "new-password";
    els.authError.textContent = "";
  }

  function openAuth() {
    if (state.session) return openProfile();
    setAuthMode("login");
    els.authForm.reset();
    els.authModal.showModal();
    window.setTimeout(() => els.authEmail.focus(), 50);
  }

  function openProfile() {
    if (!state.session) return openAuth();
    els.profileEmail.value = state.session.user.email;
    els.profilePassword.value = "";
    els.profileError.textContent = "";
    els.profileModal.showModal();
  }

  async function submitAuth(event) {
    event.preventDefault();
    const email = els.authEmail.value.trim();
    const password = els.authPassword.value;
    if (!email || !password) return;

    els.authError.textContent = "";
    setButtonBusy(els.authSubmitButton, true, state.authMode === "login" ? "Signing in…" : "Creating…");
    try {
      if (state.authMode === "signup") {
        await request("/users", {
          method: "POST",
          auth: false,
          body: JSON.stringify({ email, password }),
        });
      }
      const user = await request("/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      const { token, refresh_token: refreshToken, ...profile } = user;
      saveSession({ user: profile, accessToken: token, refreshToken });
      els.authModal.close();
      toast(state.authMode === "signup" ? "Account created. Welcome to Raqmana Chirpy." : "Signed in. Welcome back.");
    } catch (error) {
      els.authError.textContent = error.message;
    } finally {
      setButtonBusy(els.authSubmitButton, false, state.authMode === "login" ? "Sign in" : "Create account");
    }
  }

  async function updateProfile(event) {
    event.preventDefault();
    if (!state.session) return;
    const email = els.profileEmail.value.trim();
    const password = els.profilePassword.value;
    if (!email || !password) return;

    els.profileError.textContent = "";
    const button = document.querySelector("#saveProfileButton");
    setButtonBusy(button, true, "Saving…");
    try {
      const user = await request("/users", {
        method: "PUT",
        body: JSON.stringify({ email, password }),
      });
      saveSession({ ...state.session, user });
      els.profileModal.close();
      toast("Profile updated.");
    } catch (error) {
      els.profileError.textContent = error.message;
    } finally {
      setButtonBusy(button, false, "Save changes");
    }
  }

  async function logout() {
    const refreshToken = state.session?.refreshToken;
    saveSession(null);
    els.profileModal.close();
    if (refreshToken) {
      try {
        await fetch(`${BASE_PATH}/revoke`, {
          method: "POST",
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
      } catch {
        // Local sign-out still succeeds when the service is unavailable.
      }
    }
    toast("Signed out.");
  }

  function updateComposerState() {
    els.postChirpButton.disabled = !state.session || !els.chirpInput.value.trim();
  }

  function setButtonBusy(button, busy, label) {
    button.disabled = busy;
    const labelElement = button.querySelector("span");
    if (labelElement) labelElement.textContent = label;
  }

  function toast(message, isError = false) {
    const element = document.createElement("div");
    element.className = `toast${isError ? " is-error" : ""}`;
    element.textContent = message;
    els.toastRegion.append(element);
    window.setTimeout(() => element.remove(), 3600);
  }

  els.authButton.addEventListener("click", openAuth);
  els.openProfileButton.addEventListener("click", openProfile);
  els.focusComposerButton.addEventListener("click", () => {
    if (!state.session) return openAuth();
    els.chirpInput.focus();
    els.chirpInput.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth" }));
  });

  els.chirpInput.addEventListener("input", updateComposerState);
  els.postChirpButton.addEventListener("click", postChirp);
  els.refreshFeedButton.addEventListener("click", () => loadChirps());
  els.sortButton.addEventListener("click", () => {
    state.sort = state.sort === "desc" ? "asc" : "desc";
    els.sortButton.dataset.sort = state.sort;
    els.sortButton.querySelector("span:first-child").textContent = state.sort === "desc" ? "Newest first" : "Oldest first";
    els.sortButton.querySelector("span:last-child").textContent = state.sort === "desc" ? "↓" : "↑";
    loadChirps();
  });

  els.loginTab.addEventListener("click", () => setAuthMode("login"));
  els.signupTab.addEventListener("click", () => setAuthMode("signup"));
  els.authForm.addEventListener("submit", submitAuth);
  els.profileForm.addEventListener("submit", updateProfile);
  els.logoutButton.addEventListener("click", logout);

  [els.authModal, els.profileModal].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });


  renderSession();
  updateComposerState();
  loadChirps();
})();
