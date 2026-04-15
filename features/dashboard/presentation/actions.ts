"use server"

import {
  getDashboardStats,
  getLeadsBySource,
  getLeadsByStatus,
  getPropertyStatusDistribution,
  getUpcomingAppointments,
  getRecentActivities,
} from "@/features/dashboard/infrastructure/dashboard.service"

export async function getDashboardStatsAction() {
  return getDashboardStats()
}

export async function getLeadsBySourceAction() {
  return getLeadsBySource()
}

export async function getLeadsByStatusAction() {
  return getLeadsByStatus()
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
