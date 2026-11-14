export interface PwaStore {
  readonly needRefresh: boolean
  readonly offlineReady: boolean
  readonly isProduction: boolean
  check: () => void
  update: () => void
}

export function createPwaStore(): PwaStore {
  let needRefresh = $state(false)
  let offlineReady = $state(false)
  let registration: ServiceWorkerRegistration | undefined
  let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined

  if (
    import.meta.env.PROD &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  ) {
    void import("virtual:pwa-register")
      .then(({ registerSW: register }) => {
        updateServiceWorker = register({
          immediate: true,
          onNeedRefresh() {
            needRefresh = true
          },
          onOfflineReady() {
            offlineReady = true
          },
          onRegisteredSW(_url, registered) {
            registration = registered
          },
        })
      })
      .catch(() => {
        // Development and browsers without service worker support.
      })
  }

  return {
    get needRefresh() {
      return needRefresh
    },
    get offlineReady() {
      return offlineReady
    },
    get isProduction() {
      return import.meta.env.PROD
    },
    check() {
      registration?.update()
    },
    update() {
      updateServiceWorker?.(true)
    },
  }
}
