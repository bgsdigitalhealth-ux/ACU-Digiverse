import type { ComponentType } from 'react'
import { template as reportReminderTemplate } from './templates/report-reminder'
import { template as passwordChangedTemplate } from './templates/password-changed'
import { template as departmentAssignedTemplate } from './templates/department-assigned'
import { template as inviteTemplate } from './templates/invite'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'report-reminder': reportReminderTemplate,
  'password-changed': passwordChangedTemplate,
  'department-assigned': departmentAssignedTemplate,
  'invite': inviteTemplate,
}
