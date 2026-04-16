"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function keyForPath(pathname: string) {
  // Only key by pathname so redirects that add/remove query params still restore scroll.
  return `tuition-scheduler:scroll:${pathname || "/"}`;
}

function scrollToHashTarget(hash: string) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return false;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const byId = document.getElementById(decoded);
  const escaped = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(decoded) : decoded;
  const byName = document.querySelector(`[name="${escaped}"]`) as HTMLElement | null;
  const target = byId ?? byName;
  if (!target) return false;

  target.scrollIntoView({ block: "start", inline: "nearest" });
  return true;
}

export default function ScrollManager() {
  const pathname = usePathname();
  const router = useRouter();
  const APPLY_INTERCEPT_PATHS: RegExp[] = [
    /^\/admin\/students$/,
    /^\/admin\/teachers$/,
    /^\/admin\/enrollments$/,
    /^\/admin\/schedule$/,
    /^\/admin\/todos$/,
    /^\/admin\/feedbacks$/,
    /^\/admin\/packages$/,
    /^\/admin\/classes$/,
    /^\/admin\/conflicts$/,
    /^\/admin\/tickets$/,
    /^\/admin\/tickets\/handover$/,
    /^\/admin\/tickets\/archived$/,
    /^\/admin\/reports\/.+$/,
    /^\/teacher\/student-feedbacks$/,
    /^\/teacher\/payroll$/,
  ];

  const getMainScrollTop = () => {
    const main = document.querySelector(".app-main") as HTMLElement | null;
    if (main) return main.scrollTop || 0;
    return window.scrollY || 0;
  };

  const applyScrollTop = (y: number) => {
    const top = Math.max(0, y);
    const main = document.querySelector(".app-main") as HTMLElement | null;
    if (main) {
      main.scrollTop = top;
      requestAnimationFrame(() => {
        main.scrollTop = top;
      });
      setTimeout(() => {
        main.scrollTop = top;
      }, 120);
      return;
    }
    window.scrollTo({ top, left: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      window.scrollTo({ top, left: 0, behavior: "auto" });
    });
  };

  useLayoutEffect(() => {
    try {
      if (window.location.hash && scrollToHashTarget(window.location.hash)) {
        return;
      }
      const key = keyForPath(pathname);
      const raw = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      if (!raw) {
        // Cross-page navigation should start from top by default.
        applyScrollTop(0);
        return;
      }
      const y = Number(raw);
      if (!Number.isFinite(y)) {
        applyScrollTop(0);
        return;
      }
      applyScrollTop(y);
    } catch {
      // ignore
    }
  }, [pathname]);

  useEffect(() => {
    const saveForPath = (path: string) => {
      try {
        sessionStorage.setItem(keyForPath(path), String(getMainScrollTop()));
      } catch {
        // ignore
      }
    };

    const isApplySubmit = (el: HTMLElement | null) => {
      if (!el) return false;
      if (el instanceof HTMLInputElement) {
        return /(apply|应用)/i.test(String(el.value || "").trim());
      }
      const text = (el.textContent || "").trim();
      return /(apply|应用)/i.test(text);
    };

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form || !(form instanceof HTMLFormElement)) return;

      const method = String(form.getAttribute("method") || "get").toUpperCase();
      if (method !== "GET") {
        saveForPath(pathname);
        return;
      }
      if (!APPLY_INTERCEPT_PATHS.some((re) => re.test(pathname))) {
        saveForPath(pathname);
        return;
      }
      if (form.hasAttribute("data-native-submit")) {
        saveForPath(pathname);
        return;
      }
      if (form.target && form.target !== "_self") {
        saveForPath(pathname);
        return;
      }

      const submitEvent = e as SubmitEvent;
      const guessedSubmitter =
        (submitEvent.submitter as HTMLElement | null) ??
        (form.querySelector("button[type='submit'],input[type='submit']") as HTMLElement | null);
      const markedApply =
        form.getAttribute("data-apply-submit") === "1" ||
        guessedSubmitter?.getAttribute("data-apply-submit") === "1";
      if (!markedApply && !isApplySubmit(guessedSubmitter)) {
        saveForPath(pathname);
        return;
      }

      let dest: URL;
      try {
        dest = new URL(form.getAttribute("action") || window.location.href, window.location.href);
        if (dest.origin !== window.location.origin) return;
      } catch {
        return;
      }

      e.preventDefault();
      // Match native GET submit behavior for filter forms: replace query by submitted fields.
      dest.search = "";
      const fd = new FormData(form);
      if (
        guessedSubmitter &&
        (guessedSubmitter instanceof HTMLButtonElement || guessedSubmitter instanceof HTMLInputElement) &&
        guessedSubmitter.name
      ) {
        fd.append(guessedSubmitter.name, guessedSubmitter.value ?? "");
      }
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") dest.searchParams.append(k, v);
      }

      if (dest.pathname === pathname) {
        saveForPath(pathname);
      }
      const next = `${dest.pathname}${dest.search}`;
      router.replace(next, { scroll: false });
      // Ensure server-rendered filter results update immediately.
      router.refresh();
    };

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      // Restore only when navigating within the same pathname (e.g. toggle query params on the same page).
      // That matches "stay where I am" expectations, and avoids surprising behavior across pages.
      let destPath = "";
      try {
        const dest = new URL(a.href, window.location.href);
        if (dest.origin !== window.location.origin) return;
        destPath = dest.pathname;
        if (dest.hash && dest.pathname === pathname) {
          e.preventDefault();
          window.history.replaceState(window.history.state, "", `${dest.pathname}${dest.search}${dest.hash}`);
          requestAnimationFrame(() => {
            scrollToHashTarget(dest.hash);
          });
          return;
        }
      } catch {
        return;
      }

      // Same-path interactions (query toggles, in-page actions) should keep position.
      if (destPath === pathname) {
        saveForPath(pathname);
      }
    };

    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [pathname, router]);

  return null;
}
