export type SessionMode = 'fixed' | 'open'
export type SessionStatus = 'running' | 'completed' | 'cancelled'
export type StatsPeriod = 'day' | 'week' | 'month'

export interface Project {
  id: string
  name: string
  color: string | null
  created_at?: string
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  completed: boolean
  created_at?: string
}

export interface FocusSession {
  id: string
  task_id: string
  project_id: string | null
  mode: SessionMode
  planned_seconds: number | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  status: SessionStatus
}
