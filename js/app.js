(() => {
  "use strict";

  const STORAGE_KEY = "todo-tasks-v1";
  const META_KEY = "todo-meta-v1";
  const GOALS_KEY = "todo-goals-v1";
  const NOTES_KEY = "todo-notes-v1";
  const MATERIALS_KEY = "todo-materials-v1";
  const NOTE_PAGE = 20;
  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
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

  // 「手順を考えるのが面倒」を解決するためのカテゴリ別プランテンプレート
  const GOAL_TEMPLATES = {
    exam: {
      steps: [
        "試験日と申込方法を調べる(5分)",
        "今の実力を測る(過去問・模試を1回解く)",
        "教材を1つだけ決めて用意する",
        "毎日の学習メニューを決める(例: 単語10個+問題5問)",
        "まず1週間続けてみる",
        "中間チェック①(模試・過去問をもう1回)",
        "いちばん苦手な分野を1つ潰す",
        "中間チェック②(伸びを確認する)",
        "直前1週間は総復習にあてる",
        "本番を受ける!",
      ],
      habit: "教材を1ページ(または単語10個)やる",
    },
    learning: {
      steps: [
        "できるようになりたいことを1つに絞る",
        "入門教材を1つだけ決める",
        "毎日やる量を決める(1日10分でOK)",
        "教材の前半を終わらせる",
        "教材を最後まで終わらせる",
        "小さな成果物を1つ作ってみる",
        "作ったものを人に見せる・公開する",
      ],
      habit: "教材を10分だけ進める",
    },
    exercise: {
      steps: [
        "目標を数字で決める(体重・回数・距離など)",
        "現状を記録する(体重計に乗る・写真を撮る)",
        "週の運動メニューを決める(最初は週2でOK)",
        "運動する曜日と時間を決めてカレンダーに入れる",
        "まず1週間続けてみる",
        "2週間後に数字をチェックする",
        "メニューを少しだけ増やす",
        "1ヶ月後に数字をチェックする",
      ],
      habit: "5分だけ体を動かす",
    },
    reading: {
      steps: [
        "読みたい本を3冊リストアップする",
        "1冊目を買う・借りる",
        "読むタイミングを決める(寝る前10分など)",
        "1冊目を読み終える",
        "感想を3行だけメモする",
        "2冊目を読み終える",
        "3冊目を読み終える",
      ],
      habit: "10分だけ本を読む",
    },
    money: {
      steps: [
        "目標金額と期限を決める",
        "月々いくら貯めるか逆算する",
        "先取り貯金(自動振替)を設定する",
        "固定費を1つ見直す(サブスク・スマホ代)",
        "1ヶ月目の残高をチェックする",
        "3ヶ月目の残高をチェックする",
      ],
      habit: "家計簿を1行だけつける",
    },
    generic: {
      steps: [
        "ゴールを具体的な数字・状態で書き直す",
        "期限から逆算して中間チェック日を決める",
        "最初の一歩(5分でできること)を決める",
        "毎日・毎週やることを1つ決める",
        "まず1週間続けてみる",
        "中間チェックで進み具合を確認する",
        "やり方を1つ調整する",
        "最後までやり切る!",
      ],
      habit: "5分だけ目標を進める",
    },
  };

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
  let goals = loadJSON(GOALS_KEY) || [];
  let notes = loadJSON(NOTES_KEY) || [];
  let materials = loadJSON(MATERIALS_KEY) || [];
  let filter = "all";
  let editingMaterialId = null;
  let deadlineExpanded = false;
  let query = "";
  let sortBy = "created";
  let editingId = null;
  let noteQuery = "";
  let noteTag = null;
  let noteLimit = 20;
  let editingNoteId = null;
  let flashbackNote = null;

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
  const addGoalBtn = document.getElementById("add-goal-btn");
  const goalForm = document.getElementById("goal-form");
  const goalTitleInput = document.getElementById("goal-title");
  const goalCategorySelect = document.getElementById("goal-category");
  const goalDateInput = document.getElementById("goal-date");
  const goalList = document.getElementById("goal-list");
  const goalsEmpty = document.getElementById("goals-empty");
  const noteForm = document.getElementById("note-form");
  const noteText = document.getElementById("note-text");
  const noteSearch = document.getElementById("note-search");
  const noteFlashbackBtn = document.getElementById("note-flashback");
  const noteTagsBox = document.getElementById("note-tags");
  const flashbackBox = document.getElementById("flashback-box");
  const noteList = document.getElementById("note-list");
  const notesEmpty = document.getElementById("notes-empty");
  const noteMoreBtn = document.getElementById("note-more");
  const deadlineSection = document.getElementById("deadline-section");
  const deadlineList = document.getElementById("deadline-list");
  const deadlineToggle = document.getElementById("deadline-toggle");
  const addMaterialBtn = document.getElementById("add-material-btn");
  const materialForm = document.getElementById("material-form");
  const materialName = document.getElementById("material-name");
  const materialTotal = document.getElementById("material-total");
  const materialUnit = document.getElementById("material-unit");
  const materialDate = document.getElementById("material-date");
  const materialList = document.getElementById("material-list");

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

  function saveGoals() {
    storage.setItem(GOALS_KEY, JSON.stringify(goals));
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

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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

  function goalFanfare(title) {
    showToast(`🏆「${title}」達成!おめでとう!!`);
    confetti();
    setTimeout(confetti, 250);
    setTimeout(confetti, 500);
  }

  function showToast(message) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const toast = el("div", "toast", message);
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

  // ---- 長期目標 ----

  function createGoal(title, category, targetDate) {
    const tpl = GOAL_TEMPLATES[category] || GOAL_TEMPLATES.generic;
    goals.push({
      id: uid(),
      title,
      category,
      targetDate,
      steps: tpl.steps.map((s) => ({ id: uid(), title: s, done: false })),
      suggestedHabit: tpl.habit,
      habitAdded: false,
      createdAt: Date.now(),
    });
    saveGoals();
  }

  // 戻り値: この操作で目標が達成状態になったか
  function setStepDone(goalId, stepId, done) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return false;
    const step = goal.steps.find((s) => s.id === stepId);
    if (!step || step.done === done) return false;
    step.done = done;
    if (done) step.doneOn = todayStr();
    else delete step.doneOn;
    saveGoals();
    return done && goal.steps.length > 0 && goal.steps.every((s) => s.done);
  }

  function toggleStep(goal, step) {
    if (step.done) {
      recordUncomplete(step.doneOn || todayStr());
      setStepDone(goal.id, step.id, false);
    } else {
      recordComplete();
      // 進行中の連動タスクがあれば一緒に完了させる
      const linked = tasks.find((t) => t.stepId === step.id && !t.completed);
      if (linked) {
        linked.completed = true;
        linked.completedOn = todayStr();
        save();
      }
      const goalDone = setStepDone(goal.id, step.id, true);
      if (goalDone) goalFanfare(goal.title);
      else celebrate();
    }
    render();
  }

  function addStepToTasks(goal, step) {
    tasks.push({
      id: uid(),
      title: step.title,
      due: "",
      priority: "medium",
      completed: false,
      createdAt: Date.now(),
      goalId: goal.id,
      stepId: step.id,
    });
    save();
    showToast("📥 今日のタスクに追加した!");
    render();
  }

  function paceText(goal, remaining) {
    if (!goal.targetDate || remaining === 0) return "";
    const days = Math.ceil(
      (new Date(goal.targetDate) - new Date(todayStr())) / 86400000,
    );
    if (days < 0) return "目標日を過ぎてる!日付を更新しよう";
    if (days === 0) return "今日が目標日!";
    const perWeek = Math.ceil(remaining / Math.max(days / 7, 1));
    const pace =
      perWeek <= 7
        ? `週${perWeek}ステップでOK`
        : `1日${Math.ceil(remaining / days)}ステップペース`;
    return `あと${days}日・${pace}`;
  }

  function renderGoals() {
    goalList.innerHTML = "";
    goalsEmpty.hidden = goals.length > 0;

    for (const goal of goals) {
      const total = goal.steps.length;
      const done = goal.steps.filter((s) => s.done).length;
      const completed = total > 0 && done === total;
      const next = goal.steps.find((s) => !s.done);

      const card = el("div", "goal-card" + (completed ? " goal-achieved" : ""));

      // ヘッダー: タイトル + 削除
      const head = el("div", "goal-head");
      const title = el(
        "strong",
        "goal-title",
        (completed ? "🏆 " : "") + goal.title,
      );
      const delBtn = el("button", "goal-del", "🗑️");
      delBtn.type = "button";
      delBtn.title = "目標を削除";
      delBtn.addEventListener("click", () => {
        if (delBtn.dataset.armed) {
          goals = goals.filter((g) => g.id !== goal.id);
          saveGoals();
          render();
        } else {
          delBtn.dataset.armed = "1";
          delBtn.textContent = "本当に削除?";
          setTimeout(() => {
            delete delBtn.dataset.armed;
            delBtn.textContent = "🗑️";
          }, 3000);
        }
      });
      head.appendChild(title);
      head.appendChild(delBtn);
      card.appendChild(head);

      // 進捗バー + ペース
      const progressRow = el("div", "goal-progress-row");
      const bar = el("div", "bar bar-goal");
      const fill = el("div");
      fill.style.width = total ? `${(done / total) * 100}%` : "0%";
      bar.appendChild(fill);
      progressRow.appendChild(bar);
      progressRow.appendChild(el("span", "goal-progress-num", `${done}/${total}`));
      card.appendChild(progressRow);
      const pace = completed ? "全ステップ達成!おつかれさま🎉" : paceText(goal, total - done);
      if (pace) card.appendChild(el("div", "m-note", pace));

      // 次の一歩(未完了の先頭だけを見せる)
      if (next) {
        const nextRow = el("div", "goal-next");
        nextRow.appendChild(el("span", "goal-next-label", "次の一歩"));
        nextRow.appendChild(el("span", "goal-next-title", next.title));
        const linked = tasks.some((t) => t.stepId === next.id && !isDone(t));
        const addBtn = el(
          "button",
          "btn-primary btn-small",
          linked ? "追加済み" : "▶ 今日のタスクに追加",
        );
        addBtn.type = "button";
        addBtn.disabled = linked;
        addBtn.addEventListener("click", () => addStepToTasks(goal, next));
        nextRow.appendChild(addBtn);
        card.appendChild(nextRow);
      }

      // 習慣の提案
      if (goal.suggestedHabit && !goal.habitAdded && !completed) {
        const habitBtn = el(
          "button",
          "btn-text goal-habit-btn",
          `🔁 毎日の習慣に追加: 「${goal.suggestedHabit}」`,
        );
        habitBtn.type = "button";
        habitBtn.addEventListener("click", () => {
          tasks.push({
            id: uid(),
            title: goal.suggestedHabit,
            due: "",
            priority: "medium",
            repeat: "daily",
            doneDates: [],
            completed: false,
            createdAt: Date.now(),
            goalId: goal.id,
          });
          goal.habitAdded = true;
          save();
          saveGoals();
          showToast("🔁 毎日の習慣に追加した!");
          render();
        });
        card.appendChild(habitBtn);
      }

      // ステップ一覧(折りたたみ)
      const details = document.createElement("details");
      const summary = el("summary", null, `ステップ一覧を見る(${done}/${total})`);
      details.appendChild(summary);
      const stepsUl = el("ul", "goal-steps");
      for (const step of goal.steps) {
        const li = el("li", step.done ? "step-done" : "");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = step.done;
        cb.setAttribute("aria-label", "ステップ完了");
        cb.addEventListener("change", () => toggleStep(goal, step));
        const label = el("span", "step-title", step.title);
        const rm = el("button", "step-del", "✕");
        rm.type = "button";
        rm.title = "ステップを削除";
        rm.addEventListener("click", () => {
          goal.steps = goal.steps.filter((s) => s.id !== step.id);
          saveGoals();
          render();
        });
        li.appendChild(cb);
        li.appendChild(label);
        li.appendChild(rm);
        stepsUl.appendChild(li);
      }
      details.appendChild(stepsUl);

      // ステップ追加
      const addRow = el("div", "step-add");
      const addInput = document.createElement("input");
      addInput.type = "text";
      addInput.placeholder = "ステップを追加...";
      addInput.maxLength = 200;
      const addStepBtn = el("button", "btn-secondary btn-small", "追加");
      addStepBtn.type = "button";
      const commitStep = () => {
        const v = addInput.value.trim();
        if (!v) return;
        goal.steps.push({ id: uid(), title: v, done: false });
        saveGoals();
        render();
      };
      addStepBtn.addEventListener("click", commitStep);
      addInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitStep();
        }
      });
      addRow.appendChild(addInput);
      addRow.appendChild(addStepBtn);
      details.appendChild(addRow);

      card.appendChild(details);
      goalList.appendChild(card);
    }
  }

  // ---- 教材の進捗 ----

  function saveMaterials() {
    storage.setItem(MATERIALS_KEY, JSON.stringify(materials));
  }

  function daysUntil(dateKey) {
    return Math.ceil((new Date(dateKey) - new Date(todayStr())) / 86400000);
  }

  // 進捗の更新。XPは「1教材につき1日1回」だけ付与する(連打での稼ぎ防止)
  function updateMaterialProgress(material, newCurrent) {
    newCurrent = Math.max(0, Math.min(material.total, newCurrent));
    const delta = newCurrent - material.current;
    if (delta === 0) return;
    const today = todayStr();
    material.current = newCurrent;
    material.log = material.log || [];
    material.log.push({ date: today, delta });
    if (delta > 0) {
      const firstToday = material.lastXpDate !== today;
      if (firstToday) {
        material.lastXpDate = today;
        recordComplete();
      }
      if (material.current >= material.total) {
        goalFanfare(material.name);
      } else if (firstToday) {
        celebrate();
      } else {
        showToast(`📖 +${delta}${material.unit}!積み上がってる!`);
      }
    }
    saveMaterials();
    render();
  }

  function recentPace(material) {
    if (!material.log) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffKey = dateStr(cutoff);
    return material.log
      .filter((e) => e.date >= cutoffKey)
      .reduce((sum, e) => sum + e.delta, 0);
  }

  function buildMaterialCard(material) {
    const total = material.total;
    const current = material.current;
    const pct = Math.min(100, Math.round((current / total) * 100));
    const finished = current >= total;
    const card = el("div", "goal-card" + (finished ? " goal-achieved" : ""));

    if (editingMaterialId === material.id) {
      const nameIn = document.createElement("input");
      nameIn.type = "text";
      nameIn.value = material.name;
      nameIn.maxLength = 100;
      nameIn.className = "material-edit-name";
      const row = el("div", "form-options");
      const totalIn = document.createElement("input");
      totalIn.type = "number";
      totalIn.min = "1";
      totalIn.max = "99999";
      totalIn.value = total;
      const dateIn = document.createElement("input");
      dateIn.type = "date";
      dateIn.value = material.targetDate || "";
      const saveBtn = el("button", "btn-primary btn-small", "保存");
      saveBtn.type = "button";
      saveBtn.addEventListener("click", () => {
        const name = nameIn.value.trim();
        const newTotal = parseInt(totalIn.value, 10);
        if (name) material.name = name;
        if (newTotal >= 1) {
          material.total = newTotal;
          material.current = Math.min(material.current, newTotal);
        }
        material.targetDate = dateIn.value;
        editingMaterialId = null;
        saveMaterials();
        render();
      });
      const cancelBtn = el("button", "btn-secondary btn-small", "キャンセル");
      cancelBtn.type = "button";
      cancelBtn.addEventListener("click", () => {
        editingMaterialId = null;
        render();
      });
      const totalLabel = el("label", null, "全体量");
      totalLabel.appendChild(totalIn);
      const dateLabel = el("label", null, "目標日");
      dateLabel.appendChild(dateIn);
      row.appendChild(totalLabel);
      row.appendChild(dateLabel);
      row.appendChild(cancelBtn);
      row.appendChild(saveBtn);
      card.appendChild(nameIn);
      card.appendChild(row);
      return card;
    }

    const head = el("div", "goal-head");
    head.appendChild(el("strong", "goal-title", (finished ? "🎉 " : "📖 ") + material.name));
    const btns = el("div", "task-actions");
    const editBtn = el("button", null, "✏️");
    editBtn.type = "button";
    editBtn.title = "編集";
    editBtn.addEventListener("click", () => {
      editingMaterialId = material.id;
      render();
    });
    const delBtn = el("button", "goal-del", "🗑️");
    delBtn.type = "button";
    delBtn.title = "教材を削除";
    delBtn.addEventListener("click", () => {
      if (delBtn.dataset.armed) {
        materials = materials.filter((m) => m.id !== material.id);
        saveMaterials();
        render();
      } else {
        delBtn.dataset.armed = "1";
        delBtn.textContent = "本当に削除?";
        setTimeout(() => {
          delete delBtn.dataset.armed;
          delBtn.textContent = "🗑️";
        }, 3000);
      }
    });
    btns.appendChild(editBtn);
    btns.appendChild(delBtn);
    head.appendChild(btns);
    card.appendChild(head);

    const progressRow = el("div", "goal-progress-row");
    const bar = el("div", "bar bar-goal");
    const fill = el("div");
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    progressRow.appendChild(bar);
    progressRow.appendChild(
      el("span", "goal-progress-num", `${current} / ${total}${material.unit} (${pct}%)`),
    );
    card.appendChild(progressRow);

    // ペース情報
    const paceLines = [];
    const remaining = total - current;
    if (finished) {
      paceLines.push("完走!おつかれさま🎉");
    } else {
      if (material.targetDate) {
        const days = daysUntil(material.targetDate);
        if (days < 0) paceLines.push(`目標日を${-days}日超過!今日から巻き返そう`);
        else if (days === 0) paceLines.push("今日が目標日!");
        else paceLines.push(`あと${days}日・1日${Math.ceil(remaining / days)}${material.unit}でOK`);
      }
      const week = recentPace(material);
      if (week > 0) {
        const eta = Math.ceil(remaining / (week / 7));
        paceLines.push(`直近7日で+${week}${material.unit}(このペースなら約${eta}日で完走)`);
      }
    }
    if (paceLines.length) card.appendChild(el("div", "m-note", paceLines.join(" / ")));

    // 進捗の更新コントロール
    if (!finished) {
      const controls = el("div", "material-controls");
      for (const step of [1, 5, 10]) {
        const b = el("button", "btn-secondary btn-small", `+${step}`);
        b.type = "button";
        b.addEventListener("click", () => updateMaterialProgress(material, current + step));
        controls.appendChild(b);
      }
      const posIn = document.createElement("input");
      posIn.type = "number";
      posIn.min = "0";
      posIn.max = String(total);
      posIn.value = current;
      posIn.setAttribute("aria-label", "現在位置");
      const setBtn = el("button", "btn-primary btn-small", "ここまで進んだ");
      setBtn.type = "button";
      const commitPos = () => {
        const v = parseInt(posIn.value, 10);
        if (!Number.isNaN(v)) updateMaterialProgress(material, v);
      };
      setBtn.addEventListener("click", commitPos);
      posIn.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitPos();
        }
      });
      controls.appendChild(posIn);
      controls.appendChild(setBtn);
      card.appendChild(controls);
    }

    return card;
  }

  function renderMaterials() {
    materialList.innerHTML = "";
    for (const material of materials) {
      materialList.appendChild(buildMaterialCard(material));
    }
    if (!materials.length) {
      const empty = el(
        "div",
        "goals-empty",
        "問題集・参考書・動画講座を登録すると、進捗バーと「1日◯ページでOK」のペース計算で完走まで伴走します",
      );
      materialList.appendChild(empty);
    }
  }

  // ---- 締め切りレーダー ----

  function collectDeadlines() {
    const items = [];
    for (const t of tasks) {
      if (t.due && !isDone(t)) {
        items.push({ icon: "📌", type: "タスク", title: t.title, date: t.due });
      }
    }
    for (const g of goals) {
      const achieved = g.steps.length > 0 && g.steps.every((s) => s.done);
      if (g.targetDate && !achieved) {
        items.push({ icon: "🎯", type: "目標", title: g.title, date: g.targetDate });
      }
    }
    for (const m of materials) {
      if (m.targetDate && m.current < m.total) {
        items.push({ icon: "📚", type: "教材", title: m.name, date: m.targetDate });
      }
    }
    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }

  function deadlineChip(days) {
    if (days < 0) return { label: `${-days}日超過`, cls: "dl-overdue" };
    if (days === 0) return { label: "今日!", cls: "dl-today" };
    if (days === 1) return { label: "明日", cls: "dl-today" };
    if (days <= 3) return { label: `あと${days}日`, cls: "dl-soon" };
    if (days <= 7) return { label: `あと${days}日`, cls: "dl-week" };
    return { label: `あと${days}日`, cls: "dl-later" };
  }

  function renderDeadlines() {
    const items = collectDeadlines();
    deadlineSection.hidden = items.length === 0;

    // タブタイトルに緊急件数バッジ(今日締切+超過)
    const urgent = items.filter((i) => daysUntil(i.date) <= 0).length;
    document.title = urgent ? `(${urgent}) タスク管理ツール` : "タスク管理ツール";
    if (!items.length) return;

    const shown = deadlineExpanded ? items : items.slice(0, 5);
    deadlineToggle.hidden = items.length <= 5;
    deadlineToggle.textContent = deadlineExpanded
      ? "たたむ"
      : `すべて見る(${items.length}件)`;

    deadlineList.innerHTML = "";
    for (const item of shown) {
      const days = daysUntil(item.date);
      const chip = deadlineChip(days);
      const li = el("li", "deadline-item");
      li.appendChild(el("span", `dl-chip ${chip.cls}`, chip.label));
      li.appendChild(el("span", "dl-icon", item.icon));
      li.appendChild(el("span", "dl-title", item.title));
      li.appendChild(el("span", "dl-date", item.date.slice(5).replace("-", "/")));
      deadlineList.appendChild(li);
    }
  }

  // ページを開いた瞬間に危ない締め切りを知らせる(1回だけ)
  function deadlineAlertOnLoad() {
    const items = collectDeadlines();
    const overdue = items.filter((i) => daysUntil(i.date) < 0).length;
    const today = items.filter((i) => daysUntil(i.date) === 0).length;
    if (!overdue && !today) return;
    const parts = [];
    if (today) parts.push(`今日締切${today}件`);
    if (overdue) parts.push(`${overdue}件が期限超過`);
    setTimeout(() => showToast(`⏰ ${parts.join("・")}!まず1つ片付けよう`), 600);
  }

  // ---- 学びメモ ----

  function saveNotes() {
    storage.setItem(NOTES_KEY, JSON.stringify(notes));
  }

  function extractTags(text) {
    return [...new Set((text.match(/#[^\s#]+/g) || []).map((t) => t.slice(1)))];
  }

  function addNote(text) {
    notes.push({
      id: uid(),
      text,
      tags: extractTags(text),
      date: todayStr(),
      createdAt: Date.now(),
    });
    saveNotes();
    // メモを書くことも立派な1件。ストリーク・XPにカウントする
    recordComplete();
    showToast("📝 記録した!未来の自分が喜ぶやつ");
    render();
  }

  function deleteNote(note) {
    notes = notes.filter((n) => n.id !== note.id);
    saveNotes();
    recordUncomplete(note.date);
    if (flashbackNote && flashbackNote.id === note.id) flashbackNote = null;
    render();
  }

  function dateHeading(dateKey) {
    const today = todayStr();
    if (dateKey === today) return "今日";
    const d = new Date(dateKey + "T00:00:00");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateKey === dateStr(yesterday)) return "昨日";
    const base = `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
    return d.getFullYear() === new Date().getFullYear()
      ? base
      : `${d.getFullYear()}年${base}`;
  }

  // #タグ部分だけ色を付けて本文を描画する
  function renderNoteBody(container, text) {
    const re = /#[^\s#]+/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) {
        container.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      container.appendChild(el("span", "note-tag-inline", m[0]));
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      container.appendChild(document.createTextNode(text.slice(last)));
    }
  }

  function buildNoteCard(note, highlight) {
    const card = el("div", "note-card" + (highlight ? " note-flash" : ""));

    if (editingNoteId === note.id && !highlight) {
      const ta = document.createElement("textarea");
      ta.className = "note-edit-area";
      ta.value = note.text;
      ta.rows = 3;
      ta.maxLength = 2000;
      const row = el("div", "note-form-row");
      const saveBtn = el("button", "btn-primary btn-small", "保存");
      saveBtn.type = "button";
      saveBtn.addEventListener("click", () => {
        const v = ta.value.trim();
        if (v) {
          note.text = v;
          note.tags = extractTags(v);
          saveNotes();
        }
        editingNoteId = null;
        render();
      });
      const cancelBtn = el("button", "btn-secondary btn-small", "キャンセル");
      cancelBtn.type = "button";
      cancelBtn.addEventListener("click", () => {
        editingNoteId = null;
        render();
      });
      row.appendChild(cancelBtn);
      row.appendChild(saveBtn);
      card.appendChild(ta);
      card.appendChild(row);
      requestAnimationFrame(() => ta.focus());
      return card;
    }

    const body = el("div", "note-body");
    renderNoteBody(body, note.text);
    card.appendChild(body);

    const foot = el("div", "note-foot");
    const time = new Date(note.createdAt);
    const timeLabel = highlight
      ? `${dateHeading(note.date)} のメモ`
      : `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
    foot.appendChild(el("span", "note-time", timeLabel));
    const spacer = el("span", "note-spacer");
    foot.appendChild(spacer);

    if (highlight) {
      const close = el("button", "step-del", "✕ 閉じる");
      close.type = "button";
      close.addEventListener("click", () => {
        flashbackNote = null;
        render();
      });
      foot.appendChild(close);
    } else {
      const editBtn = el("button", "note-act", "✏️");
      editBtn.type = "button";
      editBtn.title = "編集";
      editBtn.addEventListener("click", () => {
        editingNoteId = note.id;
        render();
      });
      const delBtn = el("button", "note-act", "🗑️");
      delBtn.type = "button";
      delBtn.title = "削除";
      delBtn.addEventListener("click", () => {
        if (delBtn.dataset.armed) {
          deleteNote(note);
        } else {
          delBtn.dataset.armed = "1";
          delBtn.textContent = "本当に削除?";
          setTimeout(() => {
            delete delBtn.dataset.armed;
            delBtn.textContent = "🗑️";
          }, 3000);
        }
      });
      foot.appendChild(editBtn);
      foot.appendChild(delBtn);
    }
    card.appendChild(foot);
    return card;
  }

  function renderNotes() {
    // タグチップ(使用回数順、上位12個)
    noteTagsBox.innerHTML = "";
    const counts = {};
    for (const n of notes) for (const t of n.tags) counts[t] = (counts[t] || 0) + 1;
    const topTags = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    if (noteTag && !counts[noteTag]) noteTag = null;
    for (const [tag, count] of topTags) {
      const chip = el(
        "button",
        "note-tag-chip" + (noteTag === tag ? " active" : ""),
        `#${tag} (${count})`,
      );
      chip.type = "button";
      chip.addEventListener("click", () => {
        noteTag = noteTag === tag ? null : tag;
        noteLimit = NOTE_PAGE;
        render();
      });
      noteTagsBox.appendChild(chip);
    }

    // 振り返りカード
    flashbackBox.innerHTML = "";
    flashbackBox.hidden = !flashbackNote;
    if (flashbackNote) {
      flashbackBox.appendChild(el("div", "flashback-label", "⏪ この日の自分"));
      flashbackBox.appendChild(buildNoteCard(flashbackNote, true));
    }

    // 絞り込み + 新しい順
    const q = noteQuery.toLowerCase();
    const visible = notes
      .filter((n) => {
        if (noteTag && !n.tags.includes(noteTag)) return false;
        if (q && !n.text.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    notesEmpty.hidden = notes.length > 0;
    noteMoreBtn.hidden = visible.length <= noteLimit;

    noteList.innerHTML = "";
    let currentDate = null;
    for (const note of visible.slice(0, noteLimit)) {
      if (note.date !== currentDate) {
        currentDate = note.date;
        noteList.appendChild(el("div", "note-day-heading", dateHeading(currentDate)));
      }
      noteList.appendChild(buildNoteCard(note, false));
    }
    if (visible.length === 0 && notes.length > 0) {
      noteList.appendChild(el("div", "m-note", "条件に合うメモがありません"));
    }
  }

  // ---- タスク ----

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
      const dot = el(
        "span",
        "dot" + (meta.log[key] ? " on" : "") + (i === 0 ? " today" : ""),
      );
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
      const li = el("li", "task-item" + (done ? " completed" : ""));
      li.dataset.priority = task.priority;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = done;
      checkbox.setAttribute("aria-label", "完了");
      checkbox.addEventListener("change", () => toggle(task.id));

      const body = el("div", "task-body");

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
        const title = el("div", "task-title", task.title);
        title.addEventListener("dblclick", () => startEdit(task.id));

        const metaLine = el("div", "task-meta");
        if (task.repeat === "daily") {
          metaLine.appendChild(el("span", null, "🔁 毎日"));
        }
        const linkedGoal = task.goalId && goals.find((g) => g.id === task.goalId);
        if (linkedGoal) {
          metaLine.appendChild(el("span", "task-goal-tag", `🎯 ${linkedGoal.title}`));
        }
        metaLine.appendChild(
          el("span", null, `優先度: ${PRIORITY_LABEL[task.priority]}`),
        );
        if (task.due) {
          const due = el("span", null, `期限: ${task.due}`);
          if (!done && task.due < today) {
            due.classList.add("overdue");
            due.textContent += "(期限切れ)";
          }
          metaLine.appendChild(due);
        }
        body.appendChild(title);
        body.appendChild(metaLine);
      }

      const actions = el("div", "task-actions");

      const editBtn = el("button", null, "✏️");
      editBtn.title = "編集";
      editBtn.setAttribute("aria-label", "編集");
      editBtn.addEventListener("click", () => startEdit(task.id));

      const deleteBtn = el("button", null, "🗑️");
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
    renderGoals();
    renderMaterials();
    renderNotes();
    renderDeadlines();
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
      if (task.stepId) setStepDone(task.goalId, task.stepId, false);
    } else {
      task.completed = true;
      task.completedOn = today;
      recordComplete();
      const goalDone = task.stepId
        ? setStepDone(task.goalId, task.stepId, true)
        : false;
      if (goalDone) {
        const g = goals.find((g) => g.id === task.goalId);
        goalFanfare(g ? g.title : task.title);
      } else {
        celebrate();
      }
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

  addGoalBtn.addEventListener("click", () => {
    goalForm.hidden = !goalForm.hidden;
    if (!goalForm.hidden) goalTitleInput.focus();
  });

  goalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = goalTitleInput.value.trim();
    if (!title) return;
    createGoal(title, goalCategorySelect.value, goalDateInput.value);
    goalForm.reset();
    goalForm.hidden = true;
    showToast("🎯 プランを作った!まずは次の一歩から");
    render();
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

  noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = noteText.value.trim();
    if (!text) return;
    addNote(text);
    noteForm.reset();
    noteText.focus();
  });

  noteText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      noteForm.requestSubmit();
    }
  });

  noteSearch.addEventListener("input", () => {
    noteQuery = noteSearch.value.trim();
    noteLimit = NOTE_PAGE;
    render();
  });

  noteFlashbackBtn.addEventListener("click", () => {
    const today = todayStr();
    const past = notes.filter((n) => n.date < today);
    const pool = past.length ? past : notes;
    if (!pool.length) {
      showToast("まだ過去のメモがない。今日から書こう!");
      return;
    }
    // 同じメモが連続で出ないように選び直す
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (flashbackNote && pool.length > 1) {
      while (pick.id === flashbackNote.id) {
        pick = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    flashbackNote = pick;
    render();
  });

  noteMoreBtn.addEventListener("click", () => {
    noteLimit += 30;
    render();
  });

  addMaterialBtn.addEventListener("click", () => {
    materialForm.hidden = !materialForm.hidden;
    if (!materialForm.hidden) materialName.focus();
  });

  materialForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = materialName.value.trim();
    const total = parseInt(materialTotal.value, 10);
    if (!name || !(total >= 1)) return;
    materials.push({
      id: uid(),
      name,
      total,
      unit: materialUnit.value,
      targetDate: materialDate.value,
      current: 0,
      log: [],
      createdAt: Date.now(),
    });
    saveMaterials();
    materialForm.reset();
    materialForm.hidden = true;
    showToast("📚 教材を登録した!少しずつ削っていこう");
    render();
  });

  deadlineToggle.addEventListener("click", () => {
    deadlineExpanded = !deadlineExpanded;
    render();
  });

  render();
  deadlineAlertOnLoad();
})();
