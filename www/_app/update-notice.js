/* Update notice — app-only, injected into every exported page by sync-web.mjs.
   The website never loads this file.

   A Capacitor app has no over-the-air update path: every fix ships as a new
   binary through a store review, and a user who never taps "Update" in the
   store app stays on whatever they first installed, forever. This asks them —
   once per release, with the changelog in front of them — and then gets out of
   the way.

   It needs exactly two inputs:

     /app-version.json  the version of THIS binary. Written by
                        scripts/set-version.mjs at build time, so it cannot
                        drift from what the stores were told.
     updates.json       what the newest approved release is and what changed
                        in it, served from this repo's main branch over HTTPS
                        (MANIFEST_URL below).

   Publishing the manifest is deliberately a separate step from tagging the
   release: the notice must not appear until the stores have actually approved
   and rolled out the build, which is hours or days after the tag. Until then
   the manifest still names the previous version and nobody is prompted. See
   docs/RELEASING.md.

   This is the app's only outbound request, and it is best-effort in every
   sense: offline, GitHub unreachable, malformed JSON, no localStorage — all of
   it ends in a silent return. The app is fully usable with no network and that
   does not change. Everything remote (note text, store URL) is treated as
   untrusted: text goes in through textContent and the URL is scheme-checked
   before it is ever put in an href. */
(function () {
  "use strict";

  var MANIFEST_URL = "https://raw.githubusercontent.com/SaiyedRushan/learn-quran-mobile/main/updates.json";

  // Once a day is enough for a release cadence measured in weeks, and it keeps
  // a user who opens the app twenty times a day down to one request.
  var CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  var REQUEST_TIMEOUT_MS = 8000;

  // A page that has just loaded is a page the user opened to read. Let them
  // land on it before covering it with a dialog.
  var SHOW_DELAY_MS = 2500;

  var CHECKED_AT_KEY = "lq:update:checked-at";
  var DISMISSED_KEY = "lq:update:dismissed";

  // localStorage throws rather than degrades when storage is disabled, and a
  // dialog that cannot remember being dismissed is worse than no dialog: it
  // would come back every single launch. Treat any failure as "do not run".
  function storage() {
    try {
      var s = window.localStorage;
      s.getItem(CHECKED_AT_KEY);
      return s;
    } catch (e) {
      return null;
    }
  }

  // "1.10" is newer than "1.9", which is exactly what a string compare gets
  // wrong. Segments are compared numerically and a missing segment reads as 0,
  // so 1.3 and 1.3.0 are the same version.
  function compareVersions(a, b) {
    var x = String(a).split(".");
    var y = String(b).split(".");
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var p = parseInt(x[i], 10) || 0;
      var q = parseInt(y[i], 10) || 0;
      if (p !== q) return p < q ? -1 : 1;
    }
    return 0;
  }

  function isVersion(v) {
    return typeof v === "string" && /^\d+(\.\d+){0,2}$/.test(v);
  }

  function getJSON(url) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller && setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    // no-store rather than a cache-buster query: raw.githubusercontent already
    // sends a short max-age, and a stale copy here would only ever delay the
    // notice by a few minutes.
    return fetch(url, {cache: "no-store", signal: controller ? controller.signal : undefined})
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  // Capacitor tells us the platform when its bridge is present; the user agent
  // is the fallback. Only these two matter — anything else means this file is
  // running somewhere it was never meant to, and gets no store link.
  function platform() {
    try {
      if (window.Capacitor && typeof window.Capacitor.getPlatform === "function") {
        return window.Capacitor.getPlatform();
      }
    } catch (e) {
      /* fall through to the user agent */
    }
    if (/android/i.test(navigator.userAgent)) return "android";
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
    return "web";
  }

  // The href comes from a file on the internet, so it is checked before it can
  // reach the DOM: https for the store web pages, and the two store schemes
  // that open the native store app directly. Anything else (javascript:, data:)
  // is dropped and the prompt is not shown at all.
  function safeStoreUrl(url) {
    return typeof url === "string" && /^(https:\/\/|market:\/\/|itms-apps:\/\/)/.test(url) ? url : null;
  }

  // Every version in the manifest newer than the installed one, newest first,
  // so someone three releases behind sees everything they have been missing
  // rather than just the last entry.
  function notesSince(notes, installed) {
    if (!notes || typeof notes !== "object") return [];
    return Object.keys(notes)
      .filter(function (v) {
        return isVersion(v) && compareVersions(v, installed) > 0 && Array.isArray(notes[v]);
      })
      .sort(function (a, b) {
        return compareVersions(b, a);
      })
      .map(function (v) {
        return {
          version: v,
          items: notes[v].filter(function (item) {
            return typeof item === "string" && item.trim() !== "";
          }),
        };
      });
  }

  // Do not stack a dialog on top of whatever the user is already doing: the
  // web app's own modals own .modal-overlay, and memorize mode is a full-screen
  // overlay identified by its header. Both are transient — the check has
  // already happened, so the notice simply waits for the next launch.
  function screenIsBusy() {
    return !!document.querySelector(".modal-overlay, .mm-header");
  }

  function render(release, storeUrl, required) {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay update-notice";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "update-notice-title");

    var modal = document.createElement("div");
    modal.className = "modal";

    var head = document.createElement("div");
    head.className = "modal-head";
    var title = document.createElement("div");
    title.className = "modal-title";
    title.id = "update-notice-title";
    title.textContent = "Update available";
    head.appendChild(title);

    var sub = document.createElement("div");
    sub.className = "modal-sub";
    sub.textContent = required
      ? "Version " + release.latest + " is ready. This update is needed to keep the app working correctly."
      : "Version " + release.latest + " is ready, with the latest features and fixes.";

    modal.appendChild(head);
    modal.appendChild(sub);

    release.notes.forEach(function (entry) {
      var group = document.createElement("div");
      group.className = "update-notice-group";

      var heading = document.createElement("div");
      heading.className = "update-notice-version";
      heading.textContent = entry.version;
      group.appendChild(heading);

      var list = document.createElement("ul");
      list.className = "update-notice-list";
      entry.items.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      group.appendChild(list);
      modal.appendChild(group);
    });

    var actions = document.createElement("div");
    actions.className = "modal-actions";

    function close() {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    }

    function dismiss() {
      var store = storage();
      if (store) {
        try {
          store.setItem(DISMISSED_KEY, release.latest);
        } catch (e) {
          /* the dialog still closes; it will simply ask again another day */
        }
      }
      close();
    }

    function onKeydown(event) {
      if (event.key === "Escape" && !required) dismiss();
    }

    // A required update has no way out: the point of the flag is that the
    // installed build is broken enough that using it is worse than the
    // interruption. Everything else is one tap from gone.
    if (!required) {
      var later = document.createElement("button");
      later.type = "button";
      later.className = "btn";
      later.textContent = "Later";
      later.addEventListener("click", dismiss);
      actions.appendChild(later);

      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) dismiss();
      });
      document.addEventListener("keydown", onKeydown);
    }

    // An anchor, not a button: Capacitor hands an external https link to the
    // system browser, which then bounces straight into the store app. A store
    // page opened inside the WebView could not install anything.
    var update = document.createElement("a");
    update.className = "btn btn-primary";
    update.href = storeUrl;
    update.rel = "noopener noreferrer";
    update.textContent = "Update";
    // Leaving the dialog up would mean coming back from the store to a stale
    // prompt for the version they just installed.
    update.addEventListener("click", dismiss);
    actions.appendChild(update);

    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function run() {
    var store = storage();
    if (!store) return;

    var checkedAt = parseInt(store.getItem(CHECKED_AT_KEY), 10);
    if (checkedAt && Date.now() - checkedAt < CHECK_INTERVAL_MS) return;

    // The installed version comes first and gates everything: the file only
    // exists inside the app bundle, and its version is null unless a release
    // build stamped it. A dev sync or the website therefore stops here.
    getJSON("/app-version.json")
      .then(function (app) {
        if (!app || !isVersion(app.version)) throw new Error("unstamped build");
        return getJSON(MANIFEST_URL).then(function (manifest) {
          return {installed: app.version, manifest: manifest};
        });
      })
      .then(function (result) {
        var manifest = result.manifest;
        if (!manifest || !isVersion(manifest.latest)) throw new Error("bad manifest");

        // Only a fetch that actually produced an answer counts as a check;
        // a failed one should be retried on the next launch, not in a day.
        try {
          store.setItem(CHECKED_AT_KEY, String(Date.now()));
        } catch (e) {
          /* not worth abandoning the prompt over */
        }

        if (compareVersions(manifest.latest, result.installed) <= 0) return;

        var required = isVersion(manifest.minimum) && compareVersions(result.installed, manifest.minimum) < 0;
        if (!required && store.getItem(DISMISSED_KEY) === manifest.latest) return;

        var urls = manifest.store || {};
        var storeUrl = safeStoreUrl(urls[platform()]);
        // No store link for this platform means the release is not actually
        // installable here yet — prompting would be a dead end.
        if (!storeUrl) return;

        var release = {latest: manifest.latest, notes: notesSince(manifest.notes, result.installed)};

        setTimeout(function () {
          if (screenIsBusy() || document.querySelector(".update-notice")) return;
          render(release, storeUrl, required);
        }, SHOW_DELAY_MS);
      })
      .catch(function () {
        /* Offline, blocked, or malformed: show nothing and try again later. */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
