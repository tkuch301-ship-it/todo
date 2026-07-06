(() => {
  "use strict";

  const STORAGE_KEY = "todo-tasks-v1";
  const META_KEY = "todo-meta-v1";
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };
  const XP_PER_TASK = 10;
  const XP_PER_LEVEL = 100;
  const DAILY_GOAL = 3;
  const PRAISE = [
    "えらい!🎉",
    "その調子!💪",
    "ナイス!👍",
    "確実に前進してる!",
    "今日もやったね!✨",
    "小さな一歩が積み重なる!",
    "天才かもしれない…🤔",
    "未来の自分が感謝してる!",
  ];
  const STREAK_MILESTONES = [3, 5, 7, 14, 21, 30, 50, 100];
  const TITLES = [
    "はじめの一歩",
    "かけだし",
    "コツコツさん",
    "継続の人",
    "習慣の達人",
    "鉄の意志",
    "もはや伝説",
  ];

  // サンドボックス環境では localStorage が使えないことがあるため、
  // その場合はメモリ上のストレージにフォールバックする
  const storage = (() => {
    try {
      const t = "__storage_test__";
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return localStorage;
    } catch {
      const mem = new Map();
      return {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => mem.set(k, String(v)),
        removeItem: (k) => mem.delete(k),
      };
    }
  })();

  let tasks = loadJSON(STORAGE_KEY) || [];
  // meta: xp = 累計経験値, log = 日付ごとの完了件数 { "2026-07-06": 2 }
  let meta = Object.assign({ xp: 0, log: {} }, loadJSON(META_KEY));
  let filter = "all";
  let query = "";
  let sortBy = "created";
  let editingId = null;

  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("task-title");
  const dueInput = document.getElementById("task-due");
  const priorityInput = document.getElementById("task-priority");
  const repeatInput = document.getElementById("task-repeat");
  const list = document.getElementById("task-list");
  const stats = document.getElementById("stats");
  const emptyMessage = document.getElementById("empty-message");
  const searchInput = document.getElementById("search");
  const filterButtons = document.getElementById("filters");
  const sortSelect = document.getElementById("sort");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const streakCount = document.getElementById("streak-count");
  const streakNote = document.getElementById("streak-note");
  const levelLabel = document.getElementById("level-label");
  const levelTitle = document.getElementById("level-title");
  const xpFill = document.getElementById("xp-fill");
  const goalCount = document.getElementById("goal-count");
  const goalFill = document.getElementById("goal-fill");
  const weekDots = document.getElementById("week-dots");

  function loadJSON(key) {
    try {
      return JSON.parse(storage.getItem(key));
    } catch {
      return null;
    }
  }

  function save() {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function saveMeta() {
    storage.setItem(META_KEY, JSON.stringify(meta));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function todayStr() {
    return dateStr(new Date());
  }

  // 習慣タスクは「今日やったか」、通常タスクは「完了したか」
  function isDone(task) {
    if (task.repeat === "daily") {
      return (task.doneDates || []).includes(todayStr());
    }
    return task.completed;
  }

  function calcStreak() {
    const d = new Date();
    // 今日まだ未完了でもストリークは昨日まで継続扱いにする
    if (!meta.log[dateStr(d)]) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (meta.log[dateStr(d)] > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function recordComplete() {
    const today = todayStr();
    meta.log[today] = (meta.log[today] || 0) + 1;
    meta.xp += XP_PER_TASK;
    saveMeta();
  }

  function recordUncomplete(date) {
    if (meta.log[date]) {
      meta.log[date]--;
      if (meta.log[date] <= 0) delete meta.log[date];
    }
    meta.xp = Math.max(0, meta.xp - XP_PER_TASK);
    saveMeta();
  }

  function celebrate() {
    const today = todayStr();
    const streak = calcStreak();
    let message;
    if (meta.log[today] === 1 && STREAK_MILESTONES.includes(streak)) {
      message = `🔥${streak}日連続!すごすぎ!`;
    } else if (meta.log[today] === DAILY_GOAL) {
      message = `🎯今日の目標${DAILY_GOAL}件クリア!`;
    } else {
      message = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    }
    showToast(message);
    confetti();
  }

  function showToast(message) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1900);
  }

  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const colors = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
    const parts = Array.from({ length: 50 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 9 - 3,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));
    const start = performance.now();
    (function tick(now) {
      const t = (now - start) / 1400;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (t >= 1) {
        canvas.remove();
        return;
      }
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      requestAnimationFrame(tick);
    })(start);
  }

  function visibleTasks() {
    let result = tasks.filter((t) => {
      if (filter === "active" && isDone(t)) return false;
      if (filter === "completed" && !isDone(t)) return false;
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortBy === "due") {
        return (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99");
      }
      if (sortBy === "priority") {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      return a.createdAt - b.createdAt;
    });
    return result;
  }

  function renderMomentum() {
    const today = todayStr();
    const streak = calcStreak();
    streakCount.textContent = `${streak}日`;
    streakNote.textContent = meta.log[today]
      ? "連続記録 継続中!"
      : streak > 0
        ? "今日1件やれば継続!"
        : "今日1件で記録開始!";

    const level = Math.floor(meta.xp / XP_PER_LEVEL) + 1;
    levelLabel.textContent = `Lv.${level}`;
    levelTitle.textContent =
      TITLES[Math.min(Math.floor((level - 1) / 2), TITLES.length - 1)];
    xpFill.style.width = `${((meta.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%`;

    const doneToday = meta.log[today] || 0;
    goalCount.textContent = `${doneToday} / ${DAILY_GOAL}件`;
    goalFill.style.width = `${Math.min(doneToday / DAILY_GOAL, 1) * 100}%`;

    weekDots.innerHTML = "";
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateStr(d);
      const dot = document.createElement("span");
      dot.className =
        "dot" + (meta.log[key] ? " on" : "") + (i === 0 ? " today" : "");
      dot.title = `${key}: ${meta.log[key] || 0}件`;
      weekDots.appendChild(dot);
    }
  }

  function render() {
    const visible = visibleTasks();
    list.innerHTML = "";
    emptyMessage.hidden = visible.length > 0;

    const today = todayStr();

    for (const task of visible) {
      const done = isDone(task);
      const li = document.createElement("li");
      li.className = "task-item" + (done ? " completed" : "");
      li.dataset.priority = task.priority;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = done;
      checkbox.setAttribute("aria-label", "完了");
      checkbox.addEventListener("change", () => toggle(task.id));

      const body = document.createElement("div");
      body.className = "task-body";

      if (editingId === task.id) {
        const editInput = document.createElement("input");
        editInput.type = "text";
        editInput.className = "task-edit-input";
        editInput.value = task.title;
        editInput.maxLength = 200;
        const commit = () => {
          const value = editInput.value.trim();
          if (value) task.title = value;
          editingId = null;
          save();
          render();
        };
        editInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            editingId = null;
            render();
          }
        });
        editInput.addEventListener("blur", commit);
        body.appendChild(editInput);
        requestAnimationFrame(() => editInput.focus());
      } else {
        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = task.title;
        title.addEventListener("dblclick", () => startEdit(task.id));

        const metaLine = document.createElement("div");
        metaLine.className = "task-meta";
        if (task.repeat === "daily") {
          const rep = document.createElement("span");
          rep.textContent = "🔁 毎日";
          metaLine.appendChild(rep);
        }
        const prio = document.createElement("span");
        prio.textContent = `優先度: ${PRIORITY_LABEL[task.priority]}`;
        metaLine.appendChild(prio);
        if (task.due) {
          const due = document.createElement("span");
          due.textContent = `期限: ${task.due}`;
          if (!done && task.due < today) {
            due.classList.add("overdue");
            due.textContent += "(期限切れ)";
          }
          metaLine.appendChild(due);
        }
        body.appendChild(title);
        body.appendChild(metaLine);
      }

      const actions = document.createElement("div");
      actions.className = "task-actions";

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.title = "編集";
      editBtn.setAttribute("aria-label", "編集");
      editBtn.addEventListener("click", () => startEdit(task.id));

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "削除";
      deleteBtn.setAttribute("aria-label", "削除");
      deleteBtn.addEventListener("click", () => remove(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(checkbox);
      li.appendChild(body);
      li.appendChild(actions);
      list.appendChild(li);
    }

    const remaining = tasks.filter((t) => !isDone(t)).length;
    stats.textContent = `全${tasks.length}件 / 未完了${remaining}件`;
    clearCompletedBtn.hidden = !tasks.some((t) => !t.repeat && t.completed);

    renderMomentum();
  }

  function addTask(title, due, priority, repeat) {
    tasks.push({
      id: uid(),
      title,
      due,
      priority,
      repeat: repeat ? "daily" : undefined,
      doneDates: repeat ? [] : undefined,
      completed: false,
      createdAt: Date.now(),
    });
    save();
    render();
  }

  function toggle(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const today = todayStr();
    if (task.repeat === "daily") {
      task.doneDates = task.doneDates || [];
      const i = task.doneDates.indexOf(today);
      if (i >= 0) {
        task.doneDates.splice(i, 1);
        recordUncomplete(today);
      } else {
        task.doneDates.push(today);
        recordComplete();
        celebrate();
      }
    } else if (task.completed) {
      task.completed = false;
      recordUncomplete(task.completedOn || today);
      delete task.completedOn;
    } else {
      task.completed = true;
      task.completedOn = today;
      recordComplete();
      celebrate();
    }
    save();
    render();
  }

  function remove(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }

  function startEdit(id) {
    editingId = id;
    render();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    addTask(title, dueInput.value, priorityInput.value, repeatInput.checked);
    form.reset();
    titleInput.focus();
  });

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    render();
  });

  filterButtons.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    filter = btn.dataset.filter;
    for (const b of filterButtons.querySelectorAll("button")) {
      b.classList.toggle("active", b === btn);
    }
    render();
  });

  sortSelect.addEventListener("change", () => {
    sortBy = sortSelect.value;
    render();
  });

  clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter((t) => t.repeat || !t.completed);
    save();
    render();
  });

  render();
})();
