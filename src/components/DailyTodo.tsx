import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
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
  const [draftTimes, setDraftTimes] = useState(["08:00"]);
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const storeRef = useRef(store);
  const today = localDateKey(now);

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

  const addTodo = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;
    setStore((previous) => ({
      ...previous,
      todos: [...previous.todos, { id: uid(), title, done: false, createdAt: today }],
    }));
    setTodoTitle("");
  };

  const addRoutine = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = routineTitle.trim();
    const times = draftTimes.filter(Boolean).sort();
    if (!title || !times.length) return;
    setStore((previous) => ({
      ...previous,
      routines: [
        ...previous.routines,
        {
          id: uid(),
          title,
          checkpoints: times.map((time) => ({ id: uid(), time })),
        },
      ],
    }));
    setRoutineTitle("");
    setDraftTimes(["08:00"]);
    setShowRoutineForm(false);
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

  return (
    <Box className="app-shell" surface="canvas" minHeight="100dvh">
      <Box as="header" className="app-header" surface="raised">
        <Inline justify="between" gap="md" className="header-inner">
          <Text variant="subheading" as="p">Daily Todo</Text>
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
          <Inline justify="between" align="end" gap="md">
            {/* <Text variant="title">오늘</Text> */}
            <Text variant="caption" ink="soft">{completed} / {total} 완료</Text>
          </Inline>
        </Stack>

          <Box as="section" aria-labelledby="todos-title">
            <Inline justify="between" gap="md" className="section-heading">
              <Text id="todos-title" variant="heading">To-Do</Text>
              <Text variant="caption" ink="soft">{store.todos.filter((todo) => !todo.done).length}개 남음</Text>
            </Inline>

            <Box as="form" onSubmit={addTodo} className="add-row">
              <Field
                value={todoTitle}
                onChange={(event) => setTodoTitle(event.currentTarget.value)}
                placeholder="할 일 추가하기"
                aria-label="New"
                size="lg"
              />
              <Button type="submit" size="lg" disabled={!todoTitle.trim()}>추가</Button>
            </Box>

            <Box as="ul" className="task-list">
              {store.todos.length ? store.todos.map((todo) => (
                <Box as="li" key={todo.id} className={`task-row${todo.done ? " is-done" : ""}`}>
                  <Checkbox
                    checked={todo.done}
                    onChange={(event) => {
                      const done = event.currentTarget.checked;
                      setStore((previous) => ({
                        ...previous,
                        todos: previous.todos.map((item) => item.id === todo.id ? { ...item, done } : item),
                      }));
                    }}
                    aria-label={`${todo.title} 완료`}
                  />
                  <Text as="span" className="task-title">{todo.title}</Text>
                  <IconButton
                    aria-label={`${todo.title} 삭제`}
                    variant="ghostMuted"
                    size="sm"
                    onClick={() => setStore((previous) => ({
                      ...previous,
                      todos: previous.todos.filter((item) => item.id !== todo.id),
                    }))}
                  >
                    <TrashIcon />
                  </IconButton>
                </Box>
              )) : (
                <Box as="li" className="empty-row">
                  <Text ink="soft">등록한 할 일이 없습니다.</Text>
                </Box>
              )}
            </Box>
          </Box>

          <Divider />

          <Box as="section" aria-labelledby="routines-title">
            <Inline justify="between" gap="md" className="section-heading">
              <Stack gap="xs">
                <Text id="routines-title" variant="heading">루틴</Text>
                <Text variant="caption" ink="soft">매일 초기화 됩니다.</Text>
              </Stack>
              <Button size="sm" variant="outline" onClick={() => setShowRoutineForm((value) => !value)}>
                {showRoutineForm ? "닫기" : "루틴 추가"}
              </Button>
            </Inline>

            <Stack className="routine-list">
              {store.routines.map((routine) => {
                const routineDone = routine.checkpoints.filter((item) => item.completedOn === today).length;
                return (
                  <Box key={routine.id} className="routine-block">
                    <Inline justify="between" gap="md" className="routine-head">
                      <Inline gap="sm">
                        <Text variant="subheading">{routine.title}</Text>
                        <Text variant="caption" ink="soft">{routineDone}/{routine.checkpoints.length}</Text>
                      </Inline>
                      <IconButton
                        aria-label={`${routine.title} 루틴 삭제`}
                        variant="ghostMuted"
                        size="sm"
                        onClick={() => setStore((previous) => ({
                          ...previous,
                          routines: previous.routines.filter((item) => item.id !== routine.id),
                        }))}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Inline>
                    <Box as="ul" className="checkpoint-list">
                      {routine.checkpoints.map((checkpoint) => {
                        const checked = checkpoint.completedOn === today;
                        const isPast = checkpoint.time <= `${pad(now.getHours())}:${pad(now.getMinutes())}`;
                        return (
                          <Box as="li" key={checkpoint.id} className={`checkpoint${checked ? " is-done" : ""}`}>
                            <Checkbox
                              checked={checked}
                              onChange={(event) => {
                                const next = event.currentTarget.checked;
                                setStore((previous) => ({
                                  ...previous,
                                  routines: previous.routines.map((item) => item.id === routine.id ? {
                                    ...item,
                                    checkpoints: item.checkpoints.map((point) => point.id === checkpoint.id ? {
                                      ...point,
                                      completedOn: next ? today : undefined,
                                    } : point),
                                  } : item),
                                }));
                              }}
                              aria-label={`${routine.title} ${checkpoint.time} 체크`}
                            />
                            <Text as="span" family="mono" className="checkpoint-time">{checkpoint.time}</Text>
                            <Text as="span" variant="caption" ink="soft">{checked ? "완료" : isPast ? "미완료" : "예정"}</Text>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
              {!store.routines.length ? <Box className="empty-row"><Text ink="soft">등록한 루틴이 없습니다.</Text></Box> : null}
            </Stack>

            {showRoutineForm ? <Box as="form" onSubmit={addRoutine} className="routine-form" radius="md" surface="sunken">
              <Stack gap="md">
                <Stack gap="xs">
                  <Text variant="subheading">새 루틴</Text>
                  <Text variant="caption" ink="soft">예: 양치 · 물 마시기 · 자세 펴기</Text>
                </Stack>
                <Field
                  value={routineTitle}
                  onChange={(event) => setRoutineTitle(event.currentTarget.value)}
                  placeholder="루틴 이름"
                  aria-label="새 루틴 이름"
                />
                <Stack gap="sm">
                  <Label>체크할 시각</Label>
                  {draftTimes.map((time, index) => (
                    <Inline key={index} gap="sm" className="time-row">
                      <Field
                        type="time"
                        value={time}
                        onChange={(event) => setDraftTimes((previous) =>
                          previous.map((item, itemIndex) => itemIndex === index ? event.currentTarget.value : item)
                        )}
                        aria-label={`${index + 1}번째 체크 시각`}
                      />
                      {draftTimes.length > 1 ? (
                        <IconButton
                          aria-label={`${index + 1}번째 시각 삭제`}
                          variant="ghostMuted"
                          onClick={() => setDraftTimes((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <TrashIcon />
                        </IconButton>
                      ) : null}
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
                <Button type="submit" disabled={!routineTitle.trim() || !draftTimes.some(Boolean)}>
                  루틴 만들기
                </Button>
              </Stack>
            </Box> : null}
          </Box>

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
