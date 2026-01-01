/**
 * Service Worker Registration
 * Registers the service worker for PWA functionality and offline support
 * Note: Service workers only work in production builds or when served over HTTPS
 */

export async function registerServiceWorker() {
  // Service workers don't work in preview/dev environments due to MIME type issues
  const isProduction = process.env.NODE_ENV === "production"
  const isDevelopment =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Service workers not supported")
    return null
  }

  // Skip registration in preview environments (vusercontent.net)
  if (typeof window !== "undefined" && window.location.hostname.includes("vusercontent.net")) {
    console.log("[SW] Skipping registration in preview environment")
    return null
  }

  // Only register in production or local development
  if (!isProduction && !isDevelopment) {
    console.log("[SW] Skipping registration - not in production or local dev")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })

    console.log("[SW] Registration successful:", registration.scope)

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[SW] New version available")
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.log(
      "[SW] Registration skipped or failed (expected in preview):",
      error instanceof Error ? error.message : error,
    )
    return null
  }
}

export async function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      console.log("[SW] Unregistered")
    }
  }
}
