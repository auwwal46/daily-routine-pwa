/**
 * Notification System
 * Handles permission requests, scheduling, and displaying notifications
 * Uses Web Notifications API with best-effort delivery
 */

import type { Activity } from "./types"

/**
 * Create a Date object for today with specified HH:mm time
 */
function createDateFromTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export type NotificationPermissionStatus = "granted" | "denied" | "default"

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!("Notification" in window)) {
    console.warn("[Notifications] Not supported in this browser")
    return "denied"
  }

  if (Notification.permission === "granted") {
    return "granted"
  }

  if (Notification.permission === "denied") {
    return "denied"
  }

  try {
    const permission = await Notification.requestPermission()
    console.log("[Notifications] Permission:", permission)
    return permission
  } catch (error) {
    console.error("[Notifications] Error requesting permission:", error)
    return "denied"
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!("Notification" in window)) {
    return "denied"
  }
  return Notification.permission
}

/**
 * Show a notification immediately
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission !== "granted") {
    console.warn("[Notifications] Permission not granted")
    return
  }

  try {
    const notification = new Notification(title, {
      icon: "/icon-192x192.jpg",
      badge: "/icon-192x192.jpg",
      requireInteraction: false,
      silent: false,
      ...options,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    console.log("[Notifications] Shown:", title)
  } catch (error) {
    console.error("[Notifications] Error showing notification:", error)
  }
}

/**
 * Schedule notifications for an activity
 * Returns timeout IDs that can be cleared later
 */
export function scheduleActivityNotifications(activity: Activity): number[] {
  const timeouts: number[] = []

  if (Notification.permission !== "granted") {
    console.warn("[Notifications] Permission not granted, skipping schedule")
    return timeouts
  }

  const now = new Date()
  let targetStartTime = createDateFromTime(activity.startTime)

  // If start time is in the past today, schedule for tomorrow
  if (targetStartTime < now) {
    targetStartTime = new Date(targetStartTime)
    targetStartTime.setDate(targetStartTime.getDate() + 1)
  }

  // Schedule start notification
  if (activity.notifyAtStart) {
    const msUntilStart = targetStartTime.getTime() - now.getTime()
    if (msUntilStart > 0) {
      const timeoutId = window.setTimeout(() => {
        showNotification(activity.title, {
          body: `Time for: ${activity.title}`,
          tag: `activity-${activity.id}-start`,
        })
      }, msUntilStart)

      timeouts.push(timeoutId)
      console.log(`[Notifications] Scheduled start notification for ${activity.title} in ${msUntilStart}ms`)
    }
  }

  // Schedule pre-alert notification
  if (activity.notifyBefore && activity.notifyBefore > 0) {
    const preAlertTime = new Date(targetStartTime)
    preAlertTime.setMinutes(preAlertTime.getMinutes() - activity.notifyBefore)
    const msUntilPreAlert = preAlertTime.getTime() - now.getTime()

    if (msUntilPreAlert > 0) {
      const timeoutId = window.setTimeout(() => {
        showNotification(`Upcoming: ${activity.title}`, {
          body: `Starts in ${activity.notifyBefore} minutes`,
          tag: `activity-${activity.id}-prealert`,
        })
      }, msUntilPreAlert)

      timeouts.push(timeoutId)
      console.log(`[Notifications] Scheduled pre-alert for ${activity.title} in ${msUntilPreAlert}ms`)
    }
  }

  return timeouts
}

/**
 * Clear scheduled notifications by timeout IDs
 */
export function clearScheduledNotifications(timeoutIds: number[]): void {
  timeoutIds.forEach((id) => {
    window.clearTimeout(id)
  })
  console.log(`[Notifications] Cleared ${timeoutIds.length} scheduled notifications`)
}

/**
 * Schedule all activities for the day
 */
export function scheduleAllNotifications(activities: Activity[]): Map<string, number[]> {
  const notificationMap = new Map<string, number[]>()

  activities.forEach((activity) => {
    const timeouts = scheduleActivityNotifications(activity)
    if (timeouts.length > 0) {
      notificationMap.set(activity.id, timeouts)
    }
  })

  console.log(`[Notifications] Scheduled notifications for ${notificationMap.size} activities`)
  return notificationMap
}

/**
 * Cancel all scheduled notifications
 */
export function cancelAllNotifications(notificationMap: Map<string, number[]>): void {
  let totalCleared = 0

  notificationMap.forEach((timeouts) => {
    clearScheduledNotifications(timeouts)
    totalCleared += timeouts.length
  })

  notificationMap.clear()
  console.log(`[Notifications] Cancelled all notifications (${totalCleared} total)`)
}

/**
 * Reschedule notifications after activities change
 */
export function rescheduleNotifications(
  activities: Activity[],
  existingNotifications: Map<string, number[]>,
): Map<string, number[]> {
  // Clear existing notifications
  cancelAllNotifications(existingNotifications)

  // Schedule new notifications
  return scheduleAllNotifications(activities)
}
