"use server"

import {
  getDashboardData,
  getDashboardStats,
  getInquiriesBySource,
  getInquiriesByStatus,
  getPropertyStatusDistribution,
  getUpcomingAppointments,
  getRecentActivities,
} from "@/features/dashboard/infrastructure/dashboard.service"

/**
 * Composite action — single fetch under the hood, returns all KPIs +
 * chart data + upcoming appointments + recent activities in one
 * payload. Used by the `/dashboard` page composer to avoid the
 * previous N-redundant-Inquiry-fetches pattern.
 */
export async function getDashboardDataAction() {
  return getDashboardData()
}

export async function getDashboardStatsAction() {
  return getDashboardStats()
}

export async function getInquiriesBySourceAction() {
  return getInquiriesBySource()
}

export async function getInquiriesByStatusAction() {
  return getInquiriesByStatus()
}

export async function getPropertyStatusDistributionAction() {
  return getPropertyStatusDistribution()
}

export async function getUpcomingAppointmentsAction() {
  return getUpcomingAppointments()
}

export async function getRecentActivitiesAction(limit?: number) {
  return getRecentActivities(limit)
}
