import { initializeApp } from 'firebase/app'
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyDzYpCOhVL6CSsjBlM4mImWcjTwtgwI71E',
  authDomain: 'almotamayz-59967.firebaseapp.com',
  projectId: 'almotamayz-59967',
  storageBucket: 'almotamayz-59967.firebasestorage.app',
  messagingSenderId: '360583706748',
  appId: '1:360583706748:web:f869353ab08adba511b1f9',
  measurementId: 'G-0L4545MQ2K',
}

export const VAPID_KEY =
  'BLYzXc3KNDwba8JPmtdp22S9LVuVSuo4ghMPrsdMciqODuBzQ37B2YL0UYGZ0uonsa-bfY6VylFh2P8Tv3hHgdo'

export const firebaseApp = initializeApp(firebaseConfig)

let messagingPromise: Promise<Messaging | null> | null = null

export function getFirebaseMessaging() {
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(firebaseApp) : null))
      .catch(() => null)
  }

  return messagingPromise
}

export async function getFcmToken() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return null

  // A quick logout → login must not have the revoke delete the freshly issued token.
  await pendingRevoke

  const messaging = await getFirebaseMessaging()
  if (!messaging) return null
  if (Notification.permission === 'denied') return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  await navigator.serviceWorker.ready

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  return token || null
}

let pendingRevoke: Promise<void> = Promise.resolve()

/** Invalidates this browser's push token so a signed-out user stops receiving pushes. */
export function revokeFcmToken() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return pendingRevoke
  if (Notification.permission !== 'granted') return pendingRevoke

  pendingRevoke = pendingRevoke.then(async () => {
    try {
      const messaging = await getFirebaseMessaging()
      if (messaging) await deleteToken(messaging)
    } catch (error) {
      console.warn('Could not revoke push token', error)
    }
  })
  return pendingRevoke
}

export { onMessage }
export type { Messaging }
