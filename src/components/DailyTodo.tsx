import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Field,
  Icon,
  IconButton,
  Inline,
  Label,
  PaperProvider,
  Stack,
  Switch,
  Text,
  useTheme,
} from "@studio-baeks/paper-ui";

import "@studio-baeks/paper-ui/styles.css";
import "./DailyTodo.css";

type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

type Checkpoint = {
  id: string;
  time: string;
  completedOn?: string;
  notifiedOn?: string;
};

type Routine = {
  id: string;
  title: string;
  checkpoints: Checkpoint[];
};

type Store = {
  todos: Todo[];
  routines: Routine[];
  notificationEnabled: boolean;
  dayKey: string;
};

type CompletionNotice =
  | { kind: "todo"; id: string; title: string }
  | { kind: "checkpoint"; id: string; routineId: string; title: string };

const STORAGE_KEY = "daily-todo:v1";

const pad = (value: number) => String(value).padStart(2, "0");
const localDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultStore = (): Store => ({
  todos: [],
  routines: [],
  notificationEnabled: false,
  dayKey: localDateKey(),
});

const readStore = (): Store => {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    const today = localDateKey();
    const todos = Array.isArray(parsed.todos) ? parsed.todos : [];
    return {
      todos: parsed.dayKey && parsed.dayKey !== today ? todos.filter((todo) => !todo.done) : todos,
      routines: Array.isArray(parsed.routines) ? parsed.routines : [],
      notificationEnabled: Boolean(parsed.notificationEnabled),
      dayKey: today,
    };
  } catch {
    return defaultStore();
  }
};

const TrashIcon = () => (
  <Icon aria-hidden>
    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
  </Icon>
);

const PlusIcon = () => (
  <Icon aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

const SunIcon = () => (
  <Icon aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
  </Icon>
);

const MoonIcon = () => (
  <Icon aria-hidden>
    <path d="M20 15.1A8.5 8.5 0 0 1 8.9 4a8.5 8.5 0 1 0 11.1 11.1Z" />
  </Icon>
);

const BellIcon = () => (
  <Icon aria-hidden>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
  </Icon>
);

const GripIcon = () => (
  <Icon aria-hidden><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" strokeWidth="3" strokeLinecap="round" /></Icon>
);

function SortableRow({ id, label, editing, className, children }: {
  id: string;
  label: string;
  editing: boolean;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  return (
    <li ref={setNodeRef} className={`${className}${isDragging ? " is-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      {children}
      {editing ? (
        <button type="button" className="drag-handle" ref={setActivatorNodeRef}
          {...attributes} {...listeners} aria-label={`${label} 드래그하여 순서 변경`}>
          <GripIcon />
        </button>
      ) : null}
    </li>
  );
}

function ThemeButton() {
  const { resolved, setTheme } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <IconButton
      aria-label={`${next === "dark" ? "다크" : "라이트"} 모드로 전환`}
      variant="ghostMuted"
      onClick={() => setTheme(next)}
    >
      {resolved === "dark" ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}

function DailyTodoApp() {
  const [store, setStore] = useState<Store>(() => readStore());
  const [todoTitle, setTodoTitle] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const [draftTimes, setDraftTimes] = useState<string[]>([]);
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingRoutines, setEditingRoutines] = useState(false);
  const [editingTodos, setEditingTodos] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [exitingKeys, setExitingKeys] = useState<Set<string>>(() => new Set());
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(() => new Set());
  const [completionNotice, setCompletionNotice] = useState<CompletionNotice | null>(null);
  const exitTimers = useRef(new Map<string, number>());
  const enterTimers = useRef(new Map<string, number>());
  const noticeTimer = useRef<number | null>(null);
  const storeRef = useRef(store);
  const today = localDateKey(now);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    storeRef.current = store;
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [ready, store]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    exitTimers.current.forEach((timer) => window.clearTimeout(timer));
    enterTimers.current.forEach((timer) => window.clearTimeout(timer));
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    if (store.dayKey === today) return;
    setStore((previous) => ({
      ...previous,
      dayKey: today,
      todos: previous.todos.filter((todo) => !todo.done),
    }));
  }, [store.dayKey, today]);

  const checkNotifications = useCallback(async () => {
    const current = new Date();
    const currentTime = `${pad(current.getHours())}:${pad(current.getMinutes())}`;
    const date = localDateKey(current);
    const currentStore = storeRef.current;
    if (
      !currentStore.notificationEnabled ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const due: { routine: Routine; checkpoint: Checkpoint }[] = [];
    const routines = currentStore.routines.map((routine) => ({
      ...routine,
      checkpoints: routine.checkpoints.map((checkpoint) => {
        if (
          checkpoint.time === currentTime &&
          checkpoint.completedOn !== date &&
          checkpoint.notifiedOn !== date
        ) {
          due.push({ routine, checkpoint });
          return { ...checkpoint, notifiedOn: date };
        }
        return checkpoint;
      }),
    }));

    if (!due.length) return;
    const registration = "serviceWorker" in navigator
      ? await navigator.serviceWorker.ready.catch(() => null)
      : null;
    due.forEach(({ routine, checkpoint }) => {
      const title = `${routine.title} 체크할 시간`;
      const options = {
        body: `${checkpoint.time} 체크포인트를 완료해 주세요.`,
        icon: "/pwa-192x192.png",
        tag: `daily-${routine.id}-${checkpoint.id}-${date}`,
      };
      if (registration) void registration.showNotification(title, options);
      else new Notification(title, options);
    });
    setStore((previous) => ({ ...previous, routines }));
  }, []);

  useEffect(() => {
    void checkNotifications();
    const timer = window.setInterval(() => void checkNotifications(), 30_000);
    return () => window.clearInterval(timer);
  }, [checkNotifications]);

  const items = useMemo(() => {
    const todoItems = store.todos.map((todo) => todo.done);
    const checkpoints = store.routines.flatMap((routine) =>
      routine.checkpoints.map((checkpoint) => checkpoint.completedOn === today),
    );
    return [...todoItems, ...checkpoints];
  }, [store, today]);
  const completed = items.filter(Boolean).length;
  const total = items.length;
  const remaining = total - completed;
  const visibleRoutines = store.routines.filter((routine) => editingRoutines ||
    routine.checkpoints.some((point) => point.completedOn !== today || exitingKeys.has(`checkpoint:${point.id}`)));
  const visibleTodos = store.todos.filter((todo) => editingTodos || !todo.done || exitingKeys.has(`todo:${todo.id}`));

  const finishItem = (key: string, notice: CompletionNotice, nextKey?: string) => {
    const previousTimer = exitTimers.current.get(key);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    setExitingKeys((previous) => new Set(previous).add(key));
    exitTimers.current.set(key, window.setTimeout(() => {
      setExitingKeys((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
      exitTimers.current.delete(key);
      if (nextKey) {
        setEnteringKeys((previous) => new Set(previous).add(nextKey));
        const previousEnterTimer = enterTimers.current.get(nextKey);
        if (previousEnterTimer !== undefined) window.clearTimeout(previousEnterTimer);
        enterTimers.current.set(nextKey, window.setTimeout(() => {
          setEnteringKeys((previous) => {
            const next = new Set(previous);
            next.delete(nextKey);
            return next;
          });
          enterTimers.current.delete(nextKey);
        }, 220));
      }
    }, 150));
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    setCompletionNotice(notice);
    noticeTimer.current = window.setTimeout(() => {
      setCompletionNotice(null);
      noticeTimer.current = null;
    }, 5000);
  };

  const undoCompletion = () => {
    if (!completionNotice) return;
    const notice = completionNotice;
    const key = notice.kind === "todo" ? `todo:${notice.id}` : `checkpoint:${notice.id}`;
    const exitTimer = exitTimers.current.get(key);
    if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    exitTimers.current.delete(key);
    setExitingKeys((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
    setStore((previous) => notice.kind === "todo" ? {
      ...previous,
      todos: previous.todos.map((todo) => todo.id === notice.id ? { ...todo, done: false } : todo),
    } : {
      ...previous,
      routines: previous.routines.map((routine) => routine.id === notice.routineId ? {
        ...routine,
        checkpoints: routine.checkpoints.map((point) => point.id === notice.id ? {
          ...point,
          completedOn: undefined,
        } : point),
      } : routine),
    });
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
    setCompletionNotice(null);
  };

  const addTodo = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;
    setStore((previous) => ({
      ...previous,
      todos: [...previous.todos, { id: uid(), title, done: false, createdAt: today }],
    }));
    setTodoTitle("");
    setShowTodoForm(false);
  };

  const addRoutine = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = routineTitle.trim();
    const times = draftTimes.filter(Boolean).sort();
    if (!title) return;
    setStore((previous) => ({
      ...previous,
      routines: [
        ...previous.routines,
        {
          id: uid(),
          title,
          checkpoints: (times.length ? times : [""]).map((time) => ({ id: uid(), time })),
        },
      ],
    }));
    setRoutineTitle("");
    setDraftTimes([]);
    setShowRoutineForm(false);
  };

  const reorderItems = (kind: "todos" | "routines", event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStore((previous) => {
      if (kind === "routines") {
        const from = previous.routines.findIndex((item) => item.id === active.id);
        const to = previous.routines.findIndex((item) => item.id === over.id);
        return from < 0 || to < 0 ? previous : { ...previous, routines: arrayMove(previous.routines, from, to) };
      }
      const from = previous.todos.findIndex((item) => item.id === active.id);
      const to = previous.todos.findIndex((item) => item.id === over.id);
      return from < 0 || to < 0 ? previous : { ...previous, todos: arrayMove(previous.todos, from, to) };
    });
  };

  const setNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setStore((previous) => ({ ...previous, notificationEnabled: false }));
      return;
    }
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setStore((previous) => ({
      ...previous,
      notificationEnabled: permission === "granted",
    }));
  };

  const formatted = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  const shortDate = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);

  const routineSection = (
    <Box as="section" aria-labelledby="routines-title">
      <Inline justify="between" gap="md" className="section-heading">
        <Text id="routines-title" variant="heading">Routine</Text>
        <Inline gap="xs">
          {editingRoutines ? (
            <Button size="sm" variant="ghost" onClick={() => setEditingRoutines(false)}>완료</Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowRoutineForm((value) => !value)}>
                {showRoutineForm ? "닫기" : "루틴 추가"}
              </Button>
              {store.routines.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => {
                  setShowRoutineForm(false);
                  setEditingRoutines(true);
                }}>편집</Button>
              ) : null}
            </>
          )}
        </Inline>
      </Inline>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragEnd={(event) => reorderItems("routines", event)}>
        <SortableContext items={visibleRoutines.map((routine) => routine.id)} strategy={verticalListSortingStrategy}>
          <Box as="ul" className="task-list">
            {visibleRoutines.map((routine) => {
              const checkpoint = routine.checkpoints.find((point) =>
                exitingKeys.has(`checkpoint:${point.id}`)
              ) ?? routine.checkpoints.find((point) => point.completedOn !== today);
              if (!checkpoint && !editingRoutines) return null;
              const checkpointIndex = checkpoint
                ? routine.checkpoints.findIndex((point) => point.id === checkpoint.id)
                : -1;
              const key = checkpoint ? `checkpoint:${checkpoint.id}` : `routine:${routine.id}:done`;
              const meta = checkpoint
                ? [
                    checkpoint.time,
                    routine.checkpoints.length > 1
                      ? `${checkpointIndex + 1}/${routine.checkpoints.length}`
                      : "",
                  ].filter(Boolean).join(" · ")
                : "오늘 완료";
              return (
                <SortableRow id={routine.id} key={routine.id} label={routine.title} editing={editingRoutines}
                  className={`task-row routine-row${editingRoutines ? " is-editing" : ""}${exitingKeys.has(key) ? " is-exiting" : ""}${enteringKeys.has(key) ? " is-entering" : ""}`}>
                  <Checkbox
                    checked={checkpoint ? checkpoint.completedOn === today : true}
                    disabled={editingRoutines || !checkpoint}
                    onChange={(event) => {
                      if (!checkpoint || !event.currentTarget.checked) return;
                      const nextCheckpoint = routine.checkpoints.slice(checkpointIndex + 1)
                        .find((point) => point.completedOn !== today);
                      setStore((previous) => ({
                        ...previous,
                        routines: previous.routines.map((item) => item.id === routine.id ? {
                          ...item,
                          checkpoints: item.checkpoints.map((point) => point.id === checkpoint.id
                            ? { ...point, completedOn: today } : point),
                        } : item),
                      }));
                      finishItem(key, {
                        kind: "checkpoint",
                        id: checkpoint.id,
                        routineId: routine.id,
                        title: `${routine.title}${checkpoint.time ? ` · ${checkpoint.time}` : ""}`,
                      }, nextCheckpoint ? `checkpoint:${nextCheckpoint.id}` : undefined);
                    }}
                    aria-label={`${routine.title} ${checkpoint?.time || "오늘"} 체크`}
                  />
                  <Text as="span" className="task-title">{routine.title}</Text>
                  {meta ? <Text as="span" variant="caption" ink="soft" className="task-meta">{meta}</Text> : null}
                  {editingRoutines ? (
                    <Inline gap="xs" className="edit-actions">
                      <IconButton aria-label={`${routine.title} 루틴 삭제`} variant="ghostMuted" size="sm"
                        onClick={() => setStore((previous) => ({
                          ...previous,
                          routines: previous.routines.filter((item) => item.id !== routine.id),
                        }))}>
                        <TrashIcon />
                      </IconButton>
                    </Inline>
                  ) : null}
                </SortableRow>
              );
            })}
            {store.routines.length === 0 ? (
              <Box as="li" className="empty-row"><Text ink="soft">등록한 루틴이 없습니다.</Text></Box>
            ) : !editingRoutines && store.routines.every((routine) =>
              routine.checkpoints.every((point) => point.completedOn === today)
            ) && !store.routines.some((routine) =>
              routine.checkpoints.some((point) => exitingKeys.has(`checkpoint:${point.id}`))
            ) ? (
              <Box as="li" className="empty-row"><Text ink="soft">오늘의 루틴을 모두 마쳤습니다.</Text></Box>
            ) : null}
          </Box>
        </SortableContext>
      </DndContext>

      {showRoutineForm ? <Box as="form" onSubmit={addRoutine} className="routine-form" radius="md" surface="sunken">
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="subheading">새 루틴</Text>
            <Text variant="caption" ink="soft">시각을 넣지 않으면 하루에 한 번 체크합니다.</Text>
          </Stack>
          <Field
            value={routineTitle}
            onChange={(event) => setRoutineTitle(event.currentTarget.value)}
            placeholder="루틴 이름"
            aria-label="새 루틴 이름"
          />
          <Stack gap="sm">
            <Label>체크할 시각 (선택)</Label>
            {draftTimes.map((time, index) => (
              <Inline key={index} gap="sm" className="time-row">
                <Field
                  type="time"
                  value={time}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDraftTimes((previous) =>
                      previous.map((item, itemIndex) => itemIndex === index ? value : item)
                    );
                  }}
                  aria-label={`${index + 1}번째 체크 시각`}
                />
                <IconButton
                  aria-label={`${index + 1}번째 시각 삭제`}
                  variant="ghostMuted"
                  onClick={() => setDraftTimes((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <TrashIcon />
                </IconButton>
              </Inline>
            ))}
            <Button
              type="button"
              variant="soft"
              onClick={() => setDraftTimes((previous) => [...previous, "12:00"])}
              className="add-time"
            >
              <PlusIcon /> 시각 추가
            </Button>
          </Stack>
          <Button type="submit" disabled={!routineTitle.trim()}>
            루틴 만들기
          </Button>
        </Stack>
      </Box> : null}
    </Box>
  );

  return (
    <Box className="app-shell" surface="canvas" minHeight="100dvh">
      <Box as="header" className="app-header" surface="raised">
        <Inline justify="between" gap="md" className="header-inner">
          <Inline gap="sm" align="center" className="brand">
            <img src="/favicon.svg" alt="" width="22" height="22" />
            <Text variant="subheading" as="p">Daily Todo</Text>
          </Inline>
          <Inline gap="xs">
            <Inline className="notification-control" gap="sm" align="center">
              <BellIcon />
              <Label htmlFor="notifications">알림</Label>
              <Switch
                id="notifications"
                checked={store.notificationEnabled}
                onChange={(event) => void setNotifications(event.currentTarget.checked)}
                aria-label="루틴 알림"
              />
            </Inline>
            <ThemeButton />
          </Inline>
        </Inline>
      </Box>

      <Stack as="main" className="app-main" gap="xl">
        <Stack gap="sm" className="page-heading">
          <Text variant="title">{shortDate}</Text>
          {total > 0 ? (
            <Text variant="caption" ink="soft" aria-live="polite">
              {remaining ? `${remaining}개 남음` : "끝!"}
            </Text>
          ) : null}
        </Stack>

        {routineSection}

        <Divider />

        <Box as="section" aria-labelledby="todos-title">
          <Inline justify="between" gap="md" className="section-heading">
            <Text id="todos-title" variant="heading">To-Do</Text>
            <Inline gap="xs">
              {editingTodos ? (
                <Button size="sm" variant="ghost" onClick={() => setEditingTodos(false)}>완료</Button>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShowTodoForm((value) => !value)}>
                    {showTodoForm ? "닫기" : "할 일 추가"}
                  </Button>
                  {store.todos.length > 0 ? (
                    <Button size="sm" variant="ghost" onClick={() => {
                      setShowTodoForm(false);
                      setEditingTodos(true);
                    }}>편집</Button>
                  ) : null}
                </>
              )}
            </Inline>
          </Inline>

          {showTodoForm ? <Box as="form" onSubmit={addTodo} className="add-row">
            <Field
              value={todoTitle}
              onChange={(event) => setTodoTitle(event.currentTarget.value)}
              placeholder="할 일 추가하기"
              aria-label="새 할 일"
              size="lg"
            />
            <Button type="submit" size="lg" disabled={!todoTitle.trim()}>추가</Button>
          </Box> : null}

          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragEnd={(event) => reorderItems("todos", event)}>
            <SortableContext items={visibleTodos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
              <Box as="ul" className="task-list">
                {visibleTodos.map((todo) => {
                  return <SortableRow id={todo.id} key={todo.id} label={todo.title} editing={editingTodos}
                    className={`task-row${todo.done && !editingTodos ? " is-exiting" : ""}${todo.done && editingTodos ? " is-completed" : ""}`}>
                    <Checkbox
                      checked={todo.done}
                      disabled={editingTodos}
                      onChange={(event) => {
                        const done = event.currentTarget.checked;
                        setStore((previous) => ({
                          ...previous,
                          todos: previous.todos.map((item) => item.id === todo.id ? { ...item, done } : item),
                        }));
                        if (done) finishItem(`todo:${todo.id}`, { kind: "todo", id: todo.id, title: todo.title });
                      }}
                      aria-label={`${todo.title} 완료`}
                    />
                    <Text as="span" className="task-title">{todo.title}</Text>
                    {editingTodos ? (
                      <Inline gap="xs" className="edit-actions">
                        <IconButton aria-label={`${todo.title} 삭제`} variant="ghostMuted" size="sm"
                          onClick={() => setStore((previous) => ({
                            ...previous,
                            todos: previous.todos.filter((item) => item.id !== todo.id),
                          }))}>
                          <TrashIcon />
                        </IconButton>
                      </Inline>
                    ) : null}
                  </SortableRow>;
                })}
                {store.todos.length === 0 ? (
                  <Box as="li" className="empty-row">
                    <Text ink="soft">등록한 할 일이 없습니다.</Text>
                  </Box>
                ) : !editingTodos && store.todos.every((todo) => todo.done) &&
                  !store.todos.some((todo) => exitingKeys.has(`todo:${todo.id}`)) ? (
                  <Box as="li" className="empty-row">
                    <Text ink="soft">오늘 할 일을 모두 마쳤습니다.</Text>
                  </Box>
                ) : null}
              </Box>
            </SortableContext>
          </DndContext>
        </Box>

        {completionNotice ? (
          <Box className="undo-notice" role="status">
            <Text as="span" variant="caption">{`${completionNotice.title} 완료됨`}</Text>
            <Button size="sm" variant="ghost" onClick={undoCompletion}>실행 취소</Button>
          </Box>
        ) : null}

        <Text variant="caption" ink="faint" className="storage-note">이 기기에 저장됨</Text>
      </Stack>
    </Box>
  );
}

export default function DailyTodo() {
  return (
    <PaperProvider defaultTheme="system">
      <DailyTodoApp />
    </PaperProvider>
  );
}
