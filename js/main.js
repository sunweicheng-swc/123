"use strict";

// 问题可以写成一行字符串，也可以用数组控制换行。修改 name 可更新第三关的人物姓名。
const COPY = {
  title: "良心大考验",
  name: "温晓健",
  ui: {
    progress: "游戏进度", footer: "仅供朋友间娱乐",
    skip: "跳过动画", spark: "点亮夜空", restart: "再玩一次", close: "关闭提示",
  },
  courage: {
    stage: "第一关 · 勇气测试",
    question: ["你准备好激动人心的", "问答了吗？"],
    support: "接下来，请认真对待每一个选择。",
    answer: "时刻准备着！",
    confirmation: "勇气认证通过！",
  },
  honesty: {
    stage: "第二关 · 诚实测试",
    question: ["能否保证接下来的", "问答不愧对良心？"],
    yes: "当然！我只说真心话",
    unsure: "这……容我再考虑一下",
    confirmation: "良心协议已签署！",
    dialog: {
      icon: "🤔",
      title: "检测到一点点犹豫……",
      note: "别紧张，跟着良心走就好！",
      back: "我想好了",
      next: "保留我的回答，继续",
    },
  },
  final: {
    stage: "第三关 · 终极考验",
    intro: "最终考验，即将开始……",
    question: ["{name}", "是不是混蛋？"],
    yes: "那必然是啊",
    no: "我觉得不是",
    confirmation: "答案已确认！",
    hint: "点击背景，放一朵烟花",
    dialog: {
      icon: "🤔",
      title: "你是个好孩子，可不能昧着良心哦",
      note: "要不要再认真考虑一下？",
      back: "让我再想想",
      next: "我坚持我的答案",
    },
  },
  victory: {
    stage: "通关 · 奖励已解锁",
    title: "🎉 回答正确！",
    subtitle: "恭喜你成功通过良心大考验！",
    award: "🏆 良心认证勇士",
    score: "本次测试得分：",
    note: "系统判定：这波回答相当有节目效果！",
    replay: "重看烟花",
    replayed: "烟花已重放",
    stillShown: "已展示烟花留影",
    hint: "今晚的烟花为你绽放",
  },
  integrity: {
    stage: "通关 · 作答已收录",
    title: "好吧，尊重你的判断！",
    subtitle: "本次良心大考验就到这里啦。",
  },
};

const INTRO_DURATION = 3350;
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const sky = new NightSky(document.getElementById("stars"), document.getElementById("effects"), motion);
const stage = document.getElementById("stage");
stage.style.setProperty("--intro-duration", INTRO_DURATION + "ms");
const scenes = Object.fromEntries(Array.from(document.querySelectorAll(".scene"), element => [element.dataset.scene, element]));
const progress = document.getElementById("progress-steps");
const count = document.querySelector("#progress-count strong");
const stageLabel = document.getElementById("stage-label");
const hint = document.getElementById("stage-hint");
const orbital = document.getElementById("orbital");
const skip = document.querySelector('[data-action="skip"]');
const spark = document.querySelector('[data-action="spark"]');
const confirmation = document.getElementById("confirmation");
const confirmationText = document.getElementById("confirmation-text");
const announcement = document.getElementById("announcement");
const dialog = document.getElementById("decision-dialog");
const scoreNumber = document.getElementById("score-number");
const scoreFill = document.getElementById("score-fill");
const routes = new Set(["courage", "honesty", "final", "victory", "integrity"]);
const timers = new Set();
let current = "";
let busy = false;
let dialogTrigger = null;
let scoreFrame = 0;
let lastReplay = -Infinity;

function copyAt(path) {
  return path.split(".").reduce((value, key) => value[key], COPY);
}

document.title = COPY.title;
document.querySelectorAll("[data-copy]").forEach(element => {
  element.textContent = copyAt(element.dataset.copy);
});
document.querySelectorAll("[data-label]").forEach(element => {
  element.setAttribute("aria-label", copyAt(element.dataset.label));
});
document.querySelectorAll("[data-question]").forEach(element => {
  const lines = [].concat(copyAt(element.dataset.question)).map(line => line.replaceAll("{name}", COPY.name));
  element.setAttribute("aria-label", lines.join(""));
  let index = 0;
  for (const line of lines) {
    const row = document.createElement("span");
    row.className = "question-line";
    row.setAttribute("aria-hidden", "true");
    if (element.id === "courage-title") {
      for (const character of line) {
        const letter = document.createElement("span");
        letter.className = "question-letter";
        letter.style.setProperty("--letter", index++);
        letter.textContent = character;
        row.append(letter);
      }
    } else {
      row.textContent = line;
    }
    element.append(row);
  }
});

// 所有转场计时器统一登记，浏览器返回或重玩时可以一次取消。
function later(callback, delay) {
  const timer = setTimeout(() => {
    timers.delete(timer);
    callback();
  }, motion.matches ? 0 : delay);
  timers.add(timer);
}

function routeFromURL() {
  const name = location.hash.slice(1);
  return routes.has(name) ? name : "courage";
}

function routeFor(scene) {
  return scene === "intro" ? "final" : scene;
}

function navigate(route, withIntro = false) {
  if (route !== routeFromURL()) {
    history.pushState(null, "", route === "courage" ? location.pathname + location.search : "#" + route);
  }
  show(withIntro && !motion.matches ? "intro" : route);
}

function closeDecision(restoreFocus = true) {
  const trigger = dialogTrigger;
  dialogTrigger = null;
  if (dialog.open) dialog.close();
  if (restoreFocus) trigger?.focus({ preventScroll: true });
}

function show(scene, { focus = true, keepFireworks = false } = {}) {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  cancelAnimationFrame(scoreFrame);
  scoreFrame = 0;
  closeDecision(false);
  confirmation.hidden = true;
  announcement.textContent = "";
  stage.classList.remove("confirming", "confirming-win", "shake");
  stage.querySelectorAll(".pressed").forEach(button => button.classList.remove("pressed"));
  stage.querySelectorAll(":disabled").forEach(button => { button.disabled = false; });

  current = scene;
  busy = false;
  for (const [name, section] of Object.entries(scenes)) section.hidden = name !== scene;
  const route = routeFor(scene);
  document.body.dataset.theme = route;
  stage.dataset.scene = scene;
  stageLabel.textContent = COPY[route].stage;
  orbital.hidden = !["courage", "honesty", "final"].includes(scene);

  const index = scene === "courage" ? 0 : scene === "honesty" ? 1 : 2;
  count.textContent = String(index + 1).padStart(2, "0");
  Array.from(progress.children).forEach((step, stepIndex) => {
    step.classList.toggle("done", stepIndex < index);
    if (stepIndex === index) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  syncSkyControls();

  if (!keepFireworks) sky.setMode(scene === "final" ? "quiet" : scene);
  else sky.finishIntro();
  if (scene === "intro") later(() => show("final", { keepFireworks: true }), INTRO_DURATION);
  if (scene === "victory") {
    lastReplay = -Infinity;
    animateScore();
  }

  if (focus) {
    const target = scene === "intro" ? skip : scenes[scene].querySelector("h1");
    target.focus({ preventScroll: true });
  }
}

function syncSkyControls() {
  const hasSky = ["intro", "final", "victory"].includes(current);
  spark.hidden = !hasSky || motion.matches;
  skip.hidden = current !== "intro";
  const message = current === "intro" || current === "final"
    ? (!motion.matches && COPY.final.hint)
    : COPY[current].hint;
  hint.textContent = message || "";
  hint.hidden = !message;
  stage.classList.toggle("has-stage-base", Boolean(message) || !spark.hidden);
}

function animateScore() {
  const setScore = score => {
    scoreNumber.textContent = String(score);
    scoreFill.style.transform = "scaleX(" + score / 100 + ")";
  };
  if (motion.matches) {
    setScore(100);
    return;
  }
  setScore(0);
  const start = performance.now();
  const update = time => {
    const progress = Math.min(1, Math.max(0, (time - start - 140) / 1100));
    setScore(progress === 1 ? 100 : Math.min(99, Math.floor(100 * (1 - (1 - progress) ** 3))));
    scoreFrame = progress < 1 ? requestAnimationFrame(update) : 0;
  };
  scoreFrame = requestAnimationFrame(update);
}

function lockScene(button) {
  busy = true;
  button.classList.add("pressed");
  scenes[current].querySelectorAll("button").forEach(control => { control.disabled = true; });
}

function confirmChoice(button, message, complete, isVictory = false) {
  lockScene(button);
  later(() => {
    stage.classList.add("confirming");
    if (isVictory) stage.classList.add("confirming-win");
    confirmationText.textContent = message;
    confirmation.hidden = false;
    announcement.textContent = message;
    if (isVictory) sky.spark(window.innerWidth * .5, window.innerHeight * .47);
    later(complete, isVictory ? 720 : 650);
  }, 105);
}

function openDecision(button, settings) {
  lockScene(button);
  stage.classList.add("shake");
  if (current === "final") {
    const bounds = stage.getBoundingClientRect();
    sky.spark(bounds.left + bounds.width * .78, bounds.top + bounds.height * .46, "question");
  }
  later(() => {
    stage.classList.remove("shake");
    scenes[current].querySelectorAll("button").forEach(control => { control.disabled = false; });
    button.classList.remove("pressed");
    busy = false;
    dialogTrigger = button;
    document.getElementById("decision-icon").textContent = settings.icon;
    document.getElementById("decision-title").textContent = settings.title;
    document.getElementById("decision-note").textContent = settings.note;
    document.getElementById("decision-back").textContent = settings.back;
    document.getElementById("decision-continue").textContent = settings.next;
    dialog.showModal();
    document.getElementById("decision-title").focus({ preventScroll: true });
  }, 240);
}

const actions = {
  ready: button => confirmChoice(button, COPY.courage.confirmation, () => navigate("honesty")),
  promise: button => confirmChoice(button, COPY.honesty.confirmation, () => navigate("final", true)),
  hesitate: button => openDecision(button, COPY.honesty.dialog),
  skip: () => show("final"),
  correct: button => confirmChoice(button, COPY.final.confirmation, () => navigate("victory"), true),
  doubt: button => openDecision(button, COPY.final.dialog),
  dismiss: () => closeDecision(),
  continue: () => {
    if (current === "honesty") navigate("final", true);
    else navigate("integrity");
  },
  restart: () => navigate("courage"),
  replay: () => {
    const now = performance.now();
    if (now - lastReplay < 850) return;
    lastReplay = now;
    if (motion.matches) {
      sky.showStillCelebration();
      announcement.textContent = COPY.victory.stillShown;
    } else {
      sky.setMode("victory");
      announcement.textContent = COPY.victory.replayed;
    }
  },
  spark: () => sky.spark(window.innerWidth * .78, window.innerHeight * .32),
};
skip.setAttribute("aria-describedby", "intro-title");

document.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (button) {
    if (!busy && !button.disabled) actions[button.dataset.action](button);
    return;
  }
  if (dialog.open) {
    if (event.target === dialog) closeDecision();
    return;
  }
  if (event.detail > 0 && ["intro", "final", "victory"].includes(current) &&
      !event.target.closest(".masthead, .footer, .stage-bar, .stage-base, .result-card, .question-content")) {
    sky.spark(event.clientX, event.clientY);
  }
});

dialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeDecision();
});

function syncRoute() {
  const route = routeFromURL();
  if (route !== routeFor(current)) show(route);
}
window.addEventListener("popstate", syncRoute);
window.addEventListener("hashchange", syncRoute);
motion.addEventListener("change", () => {
  if (current === "intro" && motion.matches) {
    show("final");
    return;
  }
  sky.setMode(["final", "victory"].includes(current) ? "quiet" : current);
  syncSkyControls();
  if (current === "victory" && motion.matches) {
    cancelAnimationFrame(scoreFrame);
    scoreFrame = 0;
    animateScore();
  }
});

show(routeFromURL(), { focus: false });
