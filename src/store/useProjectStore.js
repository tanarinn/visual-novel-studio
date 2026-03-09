import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { idbSet, idbGet, idbDelete } from '../utils/idb'

const initialProject = {
  id: null,
  title: 'New Project',
  createdAt: null,
  rawMarkdown: '',
  scenes: [],
  stylePreset: 'anime',
}

export const useProjectStore = create(
  persist(
    (set, get) => ({
      project: { ...initialProject },
      projects: [], // list of saved projects (id + title only)

      // Create new project from markdown
      createProject: (title, rawMarkdown) => {
        const id = Date.now().toString()
        const project = {
          ...initialProject,
          id,
          title,
          rawMarkdown,
          createdAt: new Date().toISOString(),
          scenes: [],
        }
        set((state) => ({
          project,
          projects: [
            { id, title, createdAt: project.createdAt },
            ...state.projects.filter((p) => p.id !== id),
          ],
        }))
        return id
      },

      // Load a saved project into current
      loadProject: (projectData) => {
        set({ project: projectData })
      },

      // Update scenes (after parsing)
      setScenes: (scenes) => {
        set((state) => ({ project: { ...state.project, scenes } }))
      },

      // Update a single scene
      updateScene: (sceneId, updates) => {
        set((state) => ({
          project: {
            ...state.project,
            scenes: state.project.scenes.map((s) =>
              s.id === sceneId ? { ...s, ...updates } : s
            ),
          },
        }))
      },

      // Save current project to IndexedDB (replaces localStorage — no quota limit)
      saveProject: async () => {
        const { project, projects } = get()
        if (!project.id) return
        // Update the project list immediately
        set({
          projects: [
            { id: project.id, title: project.title, createdAt: project.createdAt },
            ...projects.filter((p) => p.id !== project.id),
          ],
        })
        // Persist full data (including images) to IndexedDB
        await idbSet(`project_${project.id}`, project)
      },

      // Load project by id from IndexedDB (with automatic localStorage migration)
      loadProjectById: async (id) => {
        // Try IndexedDB first
        let project = await idbGet(`project_${id}`)

        // Migrate old data from localStorage if not in IndexedDB
        if (!project) {
          const raw = localStorage.getItem(`project_${id}`)
          if (raw) {
            try {
              project = JSON.parse(raw)
              await idbSet(`project_${id}`, project) // move to IndexedDB
              localStorage.removeItem(`project_${id}`)  // clean up
            } catch {}
          }
        }

        if (project) {
          set({ project })
          return project
        }
        return null
      },

      // Delete project from IndexedDB
      deleteProject: async (id) => {
        // Update UI immediately
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          project: state.project.id === id ? { ...initialProject } : state.project,
        }))
        await idbDelete(`project_${id}`)
      },

      // Update project style preset
      setStylePreset: (preset) => {
        set((state) => ({ project: { ...state.project, stylePreset: preset } }))
      },

      // Update project title
      setTitle: (title) => {
        set((state) => ({ project: { ...state.project, title } }))
      },

      // Import project from JSON data — saves to IndexedDB
      importProject: async (projectData) => {
        if (!projectData || !Array.isArray(projectData.scenes)) {
          throw new Error('不正なプロジェクトデータです（scenesフィールドが見つかりません）')
        }
        const id = projectData.id || Date.now().toString()
        const project = { ...initialProject, ...projectData, id }
        await idbSet(`project_${id}`, project)
        set((state) => ({
          project,
          projects: [
            { id, title: project.title, createdAt: project.createdAt },
            ...state.projects.filter((p) => p.id !== id),
          ],
        }))
        return id
      },

      // Reset current project
      resetProject: () => {
        set({ project: { ...initialProject } })
      },
    }),
    {
      name: 'visual-novel-projects',
      partialize: (state) => ({ projects: state.projects }),
    }
  )
)
