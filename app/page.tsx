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
            <p className={styles.eyebrow}>RUANG KERJA</p>
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
          <span>Nama proyek</span>
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
              defaultValue={task?.dueDate ?? "2026-11-30"}
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
            {task ? "Simpan perubahan" : "Buat tugas"}
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
  const [filter, setFilter] = useState("Semua tugas");

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");
    return tasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        `${task.title} ${task.project} ${task.assignee}`
          .toLocaleLowerCase("id")
          .includes(normalizedQuery);
      const matchesFilter =
        filter === "Semua tugas" ||
        (filter === "Sedang berjalan" && task.status === "Dikerjakan") ||
        (filter === "Selesai" && task.status === "Selesai");
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, tasks]);

  const activeCount = tasks.filter((task) => task.status !== "Selesai").length;
  const completedCount = tasks.filter((task) => task.status === "Selesai").length;

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

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar} aria-label="Navigasi utama">
        <a className={styles.brand} href="#" aria-label="RuangRapi, beranda">
          <span className={styles.brandMark} aria-hidden="true">
            r.
          </span>
          <span className={styles.brandName}>ruangrapi</span>
        </a>

        <div className={styles.workspaceLabel}>WORKSPACE</div>
        <div className={styles.workspaceSwitch}>
          <span className={styles.workspaceAvatar}>S</span>
          <span className={styles.workspaceText}>
            <strong>Studio Kecil</strong>
            <small>Tim kreatif</small>
          </span>
          <span className={styles.chevron} aria-hidden="true">
            ⌄
          </span>
        </div>

        <nav className={styles.navigation}>
          <a className={`${styles.navLink} ${styles.navActive}`} href="#tugas">
            <span aria-hidden="true">▦</span>
            <span className={styles.navLabel}>Ringkasan</span>
          </a>
          <a className={styles.navLink} href="#tugas">
            <span aria-hidden="true">◷</span>
            <span className={styles.navLabel}>Tugas</span>
            <span className={styles.navCount}>{tasks.length}</span>
          </a>
          <a className={styles.navLink} href="#proyek">
            <span aria-hidden="true">▤</span>
            <span className={styles.navLabel}>Proyek</span>
          </a>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarNote}>
            <span className={styles.noteIcon} aria-hidden="true">
              ✳
            </span>
            <p>Pelan-pelan, yang penting selesai.</p>
          </div>
          <div className={styles.profileButton}>
            <span className={styles.profileAvatar}>A</span>
            <span className={styles.profileInfo}>
              <strong>Aditya Putra</strong>
              <small>Admin workspace</small>
            </span>
            <span className={styles.moreIcon} aria-hidden="true">
              ···
            </span>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span>Studio Kecil</span>
            <span aria-hidden="true">/</span>
            <strong>Ringkasan</strong>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.todayLabel}>Senin, 23 November 2026</span>
            <span
              className={styles.mobileProfile}
              aria-hidden="true"
            >
              A
            </span>
          </div>
        </header>

        <div className={styles.contentWrap}>
          <section className={styles.welcomeRow} aria-labelledby="page-title">
            <div>
              <p className={styles.eyebrow}>SENIN, 23 NOVEMBER 2026</p>
              <h1 id="page-title">Pagi, Aditya <span aria-hidden="true">☀</span></h1>
              <p className={styles.welcomeSubtitle}>
                Sedikit demi sedikit, pekerjaan hari ini beres.
              </p>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => setDialogTask(null)}
            >
              <span aria-hidden="true">＋</span> Buat tugas
            </button>
          </section>

          {storageError && (
            <p className={styles.storageError} role="alert">
              {storageError}
            </p>
          )}

          <section className={styles.statsGrid} aria-label="Ringkasan tugas">
            <article className={styles.statCard}>
              <span className={styles.statIcon + " " + styles.statIconOrange} aria-hidden="true">↗</span>
              <div>
                <p>Tugas aktif</p>
                <strong>{activeCount.toString().padStart(2, "0")}</strong>
                <small>yang masih perlu dikerjakan</small>
              </div>
              <span className={styles.statAccent} aria-hidden="true">↗</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statIcon + " " + styles.statIconGreen} aria-hidden="true">✓</span>
              <div>
                <p>Selesai minggu ini</p>
                <strong>{completedCount.toString().padStart(2, "0")}</strong>
                <small>rapi, satu per satu</small>
              </div>
              <span className={styles.statAccent + " " + styles.statAccentGreen} aria-hidden="true">↗</span>
            </article>
            <article className={`${styles.statCard} ${styles.focusCard}`}>
              <div className={styles.focusCopy}>
                <p>Fokus minggu ini</p>
                <strong>Lebih sedikit, lebih baik.</strong>
                <small>Jaga ritme, bukan cuma kecepatan.</small>
              </div>
              <span className={styles.focusFlower} aria-hidden="true">✳</span>
            </article>
          </section>

          <section className={styles.tasksSection} id="tugas" aria-labelledby="tasks-title">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.headingWithCount}>
                  <h2 id="tasks-title">Daftar tugas</h2>
                  <span className={styles.totalCount}>{tasks.length}</span>
                </div>
                <p>Yang sedang ada di meja kerja.</p>
              </div>
              <a className={styles.viewAll} href="#tugas">
                Lihat semua <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <span aria-hidden="true">⌕</span>
                <span className={styles.visuallyHidden}>Cari tugas</span>
                <input
                  type="search"
                  placeholder="Cari tugas atau proyek..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <kbd>/</kbd>
              </label>
              <label className={styles.filterBox}>
                <span className={styles.visuallyHidden}>Filter tugas</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option>Semua tugas</option>
                  <option>Sedang berjalan</option>
                  <option>Selesai</option>
                </select>
              </label>
              <button
                className={styles.addTaskButton}
                type="button"
                onClick={() => setDialogTask(null)}
              >
                <span aria-hidden="true">＋</span> Tugas baru
              </button>
            </div>

            <div className={styles.taskList} role="list" aria-label="Daftar tugas">
              {visibleTasks.map((task) => (
                <article className={styles.taskRow} key={task.id} role="listitem">
                  <span className={styles.taskCheck} aria-hidden="true">
                    {task.status === "Selesai" ? "✓" : ""}
                  </span>
                  <div className={styles.taskMain}>
                    <h3>{task.title}</h3>
                    <p>{task.project}</p>
                  </div>
                  <span
                    className={`${styles.priority} ${
                      task.priority === "Penting"
                        ? styles.priorityHigh
                        : task.priority === "Santai"
                          ? styles.priorityLow
                          : styles.priorityNormal
                    }`}
                  >
                    <span aria-hidden="true">●</span> {task.priority}
                  </span>
                  <span className={`${styles.statusBadge} ${statusClass[task.status]}`}>
                    {task.status}
                  </span>
                  <span className={styles.dueDate}>
                    <span aria-hidden="true">◷</span> {formatDueDate(task.dueDate)}
                  </span>
                  <span className={styles.assignee} title={`Penanggung jawab: ${task.assignee}`}>
                    {task.assignee.slice(0, 1).toUpperCase()}
                  </span>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.iconButton}
                      type="button"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => setDialogTask(task)}
                    >
                      ↗
                    </button>
                    <button
                      className={`${styles.iconButton} ${styles.deleteButton}`}
                      type="button"
                      aria-label={`Hapus ${task.title}`}
                      onClick={() => deleteTask(task)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))}
              {visibleTasks.length === 0 && (
                <div className={styles.emptyState}>
                  <span aria-hidden="true">✳</span>
                  <strong>Belum ada tugas di sini.</strong>
                  <p>Coba ubah pencarian atau tambahkan tugas baru.</p>
                </div>
              )}
            </div>
            <p className={styles.listFooter}>
              Menampilkan {visibleTasks.length} dari {tasks.length} tugas
            </p>
          </section>

          <section className={styles.projectsStrip} id="proyek">
            <div>
              <span className={styles.projectsDot} aria-hidden="true" />
              <strong>Proyek yang lagi jalan</strong>
              <span>Identitas Kopi Purnama</span>
              <span>Website Taman Kota</span>
              <span>Kampanye Pasar Minggu</span>
            </div>
            <a href="#tugas">Buka proyek <span aria-hidden="true">→</span></a>
          </section>

          <footer className={styles.footer}>
            <span>Dibuat dengan tenang di Studio Kecil.</span>
            <span>Semua perubahan tersimpan otomatis.</span>
          </footer>
        </div>
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
