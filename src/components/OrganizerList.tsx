import type { Project, Task } from '../types'

type Props = {
  projects: Project[]
  tasks: Task[]
  onDeleteTask: (task: Task) => Promise<void>
  onDeleteProject: (project: Project) => Promise<void>
}

export function OrganizerList({ projects, tasks, onDeleteTask, onDeleteProject }: Props) {
  if (projects.length === 0 && tasks.length === 0) return null

  const unassigned = tasks.filter(task => !task.project_id)

  return (
    <div className="organizer-list">
      {projects.map(project => {
        const projectTasks = tasks.filter(task => task.project_id === project.id)
        return (
          <div className="organizer-group" key={project.id}>
            <div className="organizer-project-row">
              <div className="organizer-project-title">
                <span className="organizer-dot" aria-hidden="true" />
                <strong>{project.name}</strong>
                <span className="organizer-count">{projectTasks.length}</span>
              </div>
              <button
                className="icon-danger"
                type="button"
                title="מחיקת פרויקט"
                aria-label={`מחיקת הפרויקט ${project.name}`}
                onClick={() => void onDeleteProject(project)}
              >
                ✕
              </button>
            </div>

            {projectTasks.length > 0 ? (
              <div className="organizer-tasks">
                {projectTasks.map(task => (
                  <div className="organizer-task-row" key={task.id}>
                    <span>{task.title}</span>
                    <button
                      className="task-delete"
                      type="button"
                      onClick={() => void onDeleteTask(task)}
                      aria-label={`מחיקת המשימה ${task.title}`}
                    >
                      מחק
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="organizer-empty">אין משימות בפרויקט</div>
            )}
          </div>
        )
      })}

      {unassigned.length > 0 && (
        <div className="organizer-group">
          <div className="organizer-project-row">
            <div className="organizer-project-title"><strong>ללא פרויקט</strong><span className="organizer-count">{unassigned.length}</span></div>
          </div>
          <div className="organizer-tasks">
            {unassigned.map(task => (
              <div className="organizer-task-row" key={task.id}>
                <span>{task.title}</span>
                <button className="task-delete" type="button" onClick={() => void onDeleteTask(task)}>מחק</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
