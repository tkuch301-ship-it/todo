(() => {
  "use strict";

  const STORAGE_KEY = "todo-tasks-v1";
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };

  /** @type {{id:string,title:string,due:string,priority:string,completed:boolean,createdAt:number}[]} */
  let tasks = load();
  let filter = "all";
  let query = "";
  let sortBy = "created";
  let editingId = null;

  const form = document.getElementById("task-form");
  const titleInput = document.getElementById("task-title");
  const dueInput = document.getElementById("task-due");
  const priorityInput = document.getElementById("task-priority");
  const list = document.getElementById("task-list");
  const stats = document.getElementById("stats");
  const emptyMessage = document.getElementById("empty-message");
  const searchInput = document.getElementById("search");
  const filterButtons = document.getElementById("filters");
  const sortSelect = document.getElementById("sort");
  const clearCompletedBtn = document.getElementById("clear-completed");

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function visibleTasks() {
    let result = tasks.filter((t) => {
      if (filter === "active" && t.completed) return false;
      if (filter === "completed" && !t.completed) return false;
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

  function render() {
    const visible = visibleTasks();
    list.innerHTML = "";
    emptyMessage.hidden = visible.length > 0;

    const today = todayStr();

    for (const task of visible) {
      const li = document.createElement("li");
      li.className = "task-item" + (task.completed ? " completed" : "");
      li.dataset.priority = task.priority;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
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

        const meta = document.createElement("div");
        meta.className = "task-meta";
        const prio = document.createElement("span");
        prio.textContent = `優先度: ${PRIORITY_LABEL[task.priority]}`;
        meta.appendChild(prio);
        if (task.due) {
          const due = document.createElement("span");
          due.textContent = `期限: ${task.due}`;
          if (!task.completed && task.due < today) {
            due.classList.add("overdue");
            due.textContent += "(期限切れ)";
          }
          meta.appendChild(due);
        }
        body.appendChild(title);
        body.appendChild(meta);
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

    const remaining = tasks.filter((t) => !t.completed).length;
    stats.textContent = `全${tasks.length}件 / 未完了${remaining}件`;
    clearCompletedBtn.hidden = tasks.every((t) => !t.completed);
  }

  function addTask(title, due, priority) {
    tasks.push({
      id: uid(),
      title,
      due,
      priority,
      completed: false,
      createdAt: Date.now(),
    });
    save();
    render();
  }

  function toggle(id) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      save();
      render();
    }
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
    addTask(title, dueInput.value, priorityInput.value);
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
    tasks = tasks.filter((t) => !t.completed);
    save();
    render();
  });

  render();
})();
