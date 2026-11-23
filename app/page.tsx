"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./page.module.css";

type TaskStatus = "Belum mulai" | "Dikerjakan" | "Selesai";
type StatusFilter = "Semua" | "Aktif" | TaskStatus;
type Priority = "Santai" | "Normal" | "Penting";

type Task = {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  assignee: string;
};

const STORAGE_KEY = "ruangrapi.tasks.v1";
const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Finalisasi konsep visual",
    project: "Identitas Kopi Purnama",
    dueDate: "2026-11-25",
    priority: "Penting",
    status: "Dikerjakan",
    assignee: "Nadia",
  },
  {
    id: "task-2",
    title: "Pilih foto untuk halaman utama",
    project: "Website Taman Kota",
    dueDate: "2026-11-26",
    priority: "Normal",
    status: "Belum mulai",
    assignee: "Raka",
  },
  {
    id: "task-3",
    title: "Rapikan ilustrasi kemasan",
    project: "Identitas Kopi Purnama",
    dueDate: "2026-11-27",
    priority: "Santai",
    status: "Belum mulai",
    assignee: "Nadia",
  },
  {
    id: "task-4",
    title: "Kirim revisi pertama",
    project: "Kampanye Pasar Minggu",
    dueDate: "2026-11-24",
    priority: "Penting",
    status: "Selesai",
    assignee: "Dimas",
  },
];

type TaskSnapshot = { tasks: Task[]; error: string };
const initialSnapshot: TaskSnapshot = { tasks: initialTasks, error: "" };
let taskSnapshot = initialSnapshot;
let hasReadStorage = false;
const taskListeners = new Set<() => void>();

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.project === "string" &&
    typeof task.dueDate === "string" &&
    typeof task.assignee === "string" &&
    ["Santai", "Normal", "Penting"].includes(String(task.priority)) &&
    ["Belum mulai", "Dikerjakan", "Selesai"].includes(String(task.status))
  );
}

function getTaskSnapshot() {
  if (typeof window !== "undefined" && !hasReadStorage) {
    hasReadStorage = true;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isTask)) {
          throw new Error("Data tugas tidak sesuai format.");
        }
        taskSnapshot = { tasks: parsed, error: "" };
      }
    } catch {
      taskSnapshot = {
        tasks: initialTasks,
        error: "Data lokal tidak dapat dibaca. Periksa penyimpanan browser.",
      };
    }
  }
  return taskSnapshot;
}

function subscribeToTasks(listener: () => void) {
  taskListeners.add(listener);
  return () => taskListeners.delete(listener);
}

function updateTasks(update: (current: Task[]) => Task[]) {
  const tasks = update(taskSnapshot.tasks);
  let error = "";
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    error = "Perubahan belum tersimpan di browser ini.";
  }
  taskSnapshot = { tasks, error };
  taskListeners.forEach((listener) => listener());
}

const statusClass: Record<TaskStatus, string> = {
  "Belum mulai": styles.notStarted,
  Dikerjakan: styles.inProgress,
  Selesai: styles.completed,
};

const priorityClass: Record<Priority, string> = {
  Santai: styles.priorityLow,
  Normal: styles.priorityNormal,
  Penting: styles.priorityHigh,
};

function formatDueDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function TaskDialog({
  task,
  onSave,
  onDismiss,
}: {
  task: Task | null;
  onSave: (task: Omit<Task, "id">) => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const suppressCloseRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) {
        suppressCloseRef.current = true;
        dialog.close();
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      title: String(data.get("title")).trim(),
      project: String(data.get("project")).trim(),
      dueDate: String(data.get("dueDate")),
      priority: String(data.get("priority")) as Priority,
      status: String(data.get("status")) as TaskStatus,
      assignee: String(data.get("assignee")).trim(),
    });
    dialogRef.current?.close();
  }

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="dialog-title"
      onClose={() => {
        if (suppressCloseRef.current) {
          suppressCloseRef.current = false;
          return;
        }
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <form className={styles.taskForm} onSubmit={handleSubmit}>
        <div className={styles.dialogHeading}>
          <div>
            <p className={styles.eyebrow}>TUGAS</p>
            <h2 id="dialog-title">{task ? "Edit tugas" : "Tugas baru"}</h2>
          </div>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Tutup formulir"
            onClick={() => dialogRef.current?.close()}
          >
            ×
          </button>
        </div>

        <label className={styles.field}>
          <span>Nama tugas</span>
          <input
            autoFocus
            defaultValue={task?.title ?? ""}
            name="title"
            placeholder="Contoh: Susun referensi visual"
            required
            maxLength={90}
          />
        </label>

        <label className={styles.field}>
          <span>Proyek</span>
          <input
            defaultValue={task?.project ?? ""}
            name="project"
            placeholder="Contoh: Website Taman Kota"
            required
            maxLength={60}
          />
        </label>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Tenggat</span>
            <input
              defaultValue={task?.dueDate ?? new Date().toISOString().slice(0, 10)}
              name="dueDate"
              type="date"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Penanggung jawab</span>
            <input
              defaultValue={task?.assignee ?? ""}
              name="assignee"
              placeholder="Nama"
              required
              maxLength={30}
            />
          </label>
          <label className={styles.field}>
            <span>Prioritas</span>
            <select defaultValue={task?.priority ?? "Normal"} name="priority">
              <option>Santai</option>
              <option>Normal</option>
              <option>Penting</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Status</span>
            <select
              defaultValue={task?.status ?? "Belum mulai"}
              name="status"
            >
              <option>Belum mulai</option>
              <option>Dikerjakan</option>
              <option>Selesai</option>
            </select>
          </label>
        </div>

        <div className={styles.formActions}>
          <button
            className={styles.cancelButton}
            type="button"
            onClick={() => dialogRef.current?.close()}
          >
            Batal
          </button>
          <button className={styles.primaryButton} type="submit">
            {task ? "Simpan" : "Buat tugas"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default function Home() {
  const { tasks, error: storageError } = useSyncExternalStore(
    subscribeToTasks,
    getTaskSnapshot,
    () => initialSnapshot,
  );
  const [dialogTask, setDialogTask] = useState<Task | null | undefined>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Semua");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const projects = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.project))).sort(),
    [tasks],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");
    return tasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        `${task.title} ${task.project} ${task.assignee}`
          .toLocaleLowerCase("id")
          .includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "Semua" ||
        (statusFilter === "Aktif" && task.status !== "Selesai") ||
        task.status === statusFilter;
      const matchesProject = !projectFilter || task.project === projectFilter;
      return matchesQuery && matchesStatus && matchesProject;
    });
  }, [projectFilter, query, statusFilter, tasks]);

  const activeCount = tasks.filter((task) => task.status !== "Selesai").length;
  const completedCount = tasks.filter((task) => task.status === "Selesai").length;

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function saveTask(values: Omit<Task, "id">) {
    if (dialogTask) {
      updateTasks((current) =>
        current.map((task) =>
          task.id === dialogTask.id ? { ...values, id: task.id } : task,
        ),
      );
    } else {
      updateTasks((current) => [
        { ...values, id: `task-${crypto.randomUUID()}` },
        ...current,
      ]);
    }
    setDialogTask(undefined);
  }

  function deleteTask(task: Task) {
    if (window.confirm(`Hapus tugas “${task.title}”?`)) {
      updateTasks((current) => current.filter((item) => item.id !== task.id));
    }
  }

  function toggleTask(task: Task) {
    updateTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: task.status === "Selesai" ? "Belum mulai" : "Selesai",
            }
          : item,
      ),
    );
  }

  function showProject(project: string | null) {
    setProjectFilter(project);
    setStatusFilter("Semua");
    document.getElementById("tugas")?.scrollIntoView({ behavior: "smooth" });
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("Semua");
    setProjectFilter(null);
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="#ringkasan">
          <span className={styles.brandMark} aria-hidden="true">
            r.
          </span>
          <span>ruangrapi</span>
        </a>
        <nav className={styles.navigation} aria-label="Navigasi utama">
          <a href="#ringkasan">Ringkasan</a>
          <a href="#tugas">Tugas</a>
          <a href="#proyek">Proyek</a>
        </nav>
        <div className={styles.profile}>
          <span className={styles.profileAvatar} aria-hidden="true">A</span>
          <span>Aditya Putra</span>
        </div>
      </header>

      <main className={styles.content}>
        {storageError && (
          <p className={styles.storageError} role="alert">
            {storageError}
          </p>
        )}

        <section className={styles.welcomeRow} id="ringkasan">
          <div>
            <p className={styles.eyebrow}>STUDIO KECIL</p>
            <h1>Semua kerjaan, satu tempat.</h1>
            <p className={styles.subtitle}>
              Atur tugas tim tanpa bikin kepala penuh.
            </p>
          </div>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setDialogTask(null)}
          >
            <span aria-hidden="true">＋</span> Tugas baru
          </button>
        </section>

        <section className={styles.statsGrid} aria-label="Ringkasan tugas">
          <button
            className={`${styles.statCard} ${statusFilter === "Aktif" ? styles.selectedStat : ""}`}
            type="button"
            aria-pressed={statusFilter === "Aktif"}
            onClick={() => {
              setStatusFilter(statusFilter === "Aktif" ? "Semua" : "Aktif");
              setProjectFilter(null);
            }}
          >
            <span className={`${styles.statIcon} ${styles.activeIcon}`} aria-hidden="true">
              ↗
            </span>
            <span>
              <span className={styles.statLabel}>Tugas aktif</span>
              <strong>{activeCount.toString().padStart(2, "0")}</strong>
            </span>
            <span className={styles.statHint}>Tampilkan tugas aktif</span>
          </button>
          <button
            className={`${styles.statCard} ${statusFilter === "Selesai" ? styles.selectedStat : ""}`}
            type="button"
            aria-pressed={statusFilter === "Selesai"}
            onClick={() => {
              setStatusFilter(statusFilter === "Selesai" ? "Semua" : "Selesai");
              setProjectFilter(null);
            }}
          >
            <span className={`${styles.statIcon} ${styles.doneIcon}`} aria-hidden="true">
              ✓
            </span>
            <span>
              <span className={styles.statLabel}>Tugas selesai</span>
              <strong>{completedCount.toString().padStart(2, "0")}</strong>
            </span>
            <span className={styles.statHint}>Tampilkan tugas selesai</span>
          </button>
        </section>

        <section className={styles.tasksSection} id="tugas" aria-labelledby="tasks-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="tasks-title">Daftar tugas</h2>
              <p>{visibleTasks.length} dari {tasks.length} tugas</p>
            </div>
            {(query || statusFilter !== "Semua" || projectFilter) && (
              <button className={styles.resetButton} type="button" onClick={resetFilters}>
                Hapus filter
              </button>
            )}
          </div>

          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              <span aria-hidden="true">⌕</span>
              <input
                ref={searchRef}
                type="search"
                aria-label="Cari tugas"
                placeholder="Cari tugas atau proyek..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd aria-hidden="true">/</kbd>
            </label>
            <label className={styles.selectField}>
              <span className={styles.visuallyHidden}>Filter status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="Semua">Semua status</option>
                <option value="Aktif">Tugas aktif</option>
                <option value="Belum mulai">Belum mulai</option>
                <option value="Dikerjakan">Dikerjakan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </label>
            <label className={styles.selectField}>
              <span className={styles.visuallyHidden}>Filter proyek</span>
              <select
                value={projectFilter ?? ""}
                onChange={(event) => setProjectFilter(event.target.value || null)}
              >
                <option value="">Semua proyek</option>
                {projects.map((project) => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.taskList} role="list" aria-label="Daftar tugas">
            {visibleTasks.map((task) => (
              <article className={styles.taskRow} key={task.id} role="listitem">
                <button
                  className={`${styles.taskCheck} ${task.status === "Selesai" ? styles.checked : ""}`}
                  type="button"
                  aria-label={
                    task.status === "Selesai"
                      ? `Tandai ${task.title} belum selesai`
                      : `Tandai ${task.title} selesai`
                  }
                  onClick={() => toggleTask(task)}
                >
                  {task.status === "Selesai" ? "✓" : ""}
                </button>
                <div className={styles.taskMain}>
                  <h3 className={task.status === "Selesai" ? styles.taskDone : ""}>
                    {task.title}
                  </h3>
                  <p>{task.project}</p>
                </div>
                <span className={`${styles.priority} ${priorityClass[task.priority]}`}>
                  <span aria-hidden="true">●</span> {task.priority}
                </span>
                <span className={`${styles.statusBadge} ${statusClass[task.status]}`}>
                  {task.status}
                </span>
                <span className={styles.dueDate}>{formatDueDate(task.dueDate)}</span>
                <span className={styles.assignee} title={`Penanggung jawab: ${task.assignee}`}>
                  {task.assignee.slice(0, 1).toUpperCase()}
                </span>
                <div className={styles.rowActions}>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => setDialogTask(task)}
                  >
                    Edit
                  </button>
                  <button
                    className={`${styles.textButton} ${styles.deleteButton}`}
                    type="button"
                    onClick={() => deleteTask(task)}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))}
            {visibleTasks.length === 0 && (
              <div className={styles.emptyState}>
                <strong>Tugasnya tidak ditemukan.</strong>
                <p>Ubah filter atau tambahkan tugas baru.</p>
                <button className={styles.primaryButton} type="button" onClick={() => setDialogTask(null)}>
                  Tugas baru
                </button>
              </div>
            )}
          </div>
        </section>

        <section className={styles.projectsSection} id="proyek" aria-labelledby="projects-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="projects-title">Proyek</h2>
              <p>Pilih proyek untuk melihat tugasnya.</p>
            </div>
          </div>
          <div className={styles.projectList}>
            <button
              className={`${styles.projectChip} ${projectFilter === null ? styles.projectSelected : ""}`}
              type="button"
              aria-pressed={projectFilter === null}
              onClick={() => showProject(null)}
            >
              Semua proyek <span>{tasks.length}</span>
            </button>
            {projects.map((project) => {
              const count = tasks.filter((task) => task.project === project).length;
              return (
                <button
                  className={`${styles.projectChip} ${projectFilter === project ? styles.projectSelected : ""}`}
                  key={project}
                  type="button"
                  aria-pressed={projectFilter === project}
                  onClick={() => showProject(project)}
                >
                  {project} <span>{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <footer className={styles.footer}>Perubahan tersimpan otomatis di browser ini.</footer>
      </main>

      {dialogTask !== undefined && (
        <TaskDialog
          key={dialogTask?.id ?? "new"}
          task={dialogTask}
          onSave={saveTask}
          onDismiss={() => setDialogTask(undefined)}
        />
      )}
    </div>
  );
}
