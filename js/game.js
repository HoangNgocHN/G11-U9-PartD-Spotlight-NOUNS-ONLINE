/**
 * GAME.JS - Sentence Spotlight (Classroom Edition)
 * =================================================
 * Giống bản offline: queue-based, sai quay lại queue.
 * KHÁC: Teacher control — student chờ TEACHER_NEXT để advance.
 *
 * Phụ thuộc: data.js, sync.js (phải load trước)
 */

// ══════════════════════════════════
//  GAME STATE (student-only)
// ══════════════════════════════════
let queue = [];
let completed = 0;
let totalAnswered = 0;
let mistakes = 0;
let mistakeMap = {};
let answered = false;
let completedSet = new Set();
let currentQIdx = -1;        // index của câu đang hiển thị
let gameStarted = false;     // teacher đã bấm Start chưa
let waitingForNext = false;  // HS đã chọn ít nhất 1 lần, đang chờ TEACHER_NEXT
let questionsShownCount = 0; // tổng số câu đã hiển thị (bao gồm retry) - dùng cho counter neutral

/**
 * HS có thể click đổi ý nhiều lần TRƯỚC khi teacher bấm Next.
 * pendingSelection giữ lựa chọn hiện tại — chỉ commit state (queue/mistake)
 * khi TEACHER_NEXT đến. Như vậy nếu HS chọn sai → nghe GV giải thích → click lại
 * đáp án đúng, thì kết quả cuối cùng mới là cái được tính.
 */
let pendingSelection = null; // { isCorrect, qIdx, chosenText }

// ══════════════════════════════════
//  UTILITY
// ══════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════
//  GAME FLOW — driven by teacher via SYNC
// ══════════════════════════════════

function resetGameState() {
  queue = [];
  completed = 0;
  totalAnswered = 0;
  mistakes = 0;
  mistakeMap = {};
  answered = false;
  completedSet = new Set();
  currentQIdx = -1;
  gameStarted = false;
  waitingForNext = false;
  questionsShownCount = 0;
  pendingSelection = null;

  for (let i = 0; i < QUESTIONS.length; i++) {
    queue.push(i);
  }
}

function startGame() {
  resetGameState();
  gameStarted = true;

  document.getElementById('waiting-screen').style.display = 'none';
  document.getElementById('win-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';

  showQuestion();
}

/**
 * Neutral progress — student không biết đúng/sai
 * Chỉ hiện "Question N" (N = tổng câu đã hiện, bao gồm retry)
 * → counter luôn tăng khi sang câu mới, không tiết lộ correctness
 * Teacher vẫn thấy đầy đủ stats trên panel.
 */
function updateProgress() {
  document.getElementById('progress-label').textContent =
    `Question ${questionsShownCount}`;
  document.getElementById('mistakes-label').textContent = '';
  // progress-fill: tạm dùng % theo questionsShownCount, cap 100
  const pct = Math.min(100, (questionsShownCount / QUESTIONS.length) * 100);
  document.getElementById('progress-fill').style.width = `${pct}%`;
}

// ══════════════════════════════════
//  QUESTION RENDERING
// ══════════════════════════════════

function showQuestion() {
  answered = false;
  waitingForNext = false;
  pendingSelection = null;
  questionsShownCount++;
  updateProgress();

  hideWaitingBanner();

  const qIdx = queue[0];
  currentQIdx = qIdx;
  const q = QUESTIONS[qIdx];

  const wordDisplay = document.getElementById('word-display');
  wordDisplay.innerHTML = `
    <div class="word-label">Which sentence shows</div>
    <div class="word-text">${q.word}</div>
    <div class="word-def">${q.def}</div>
  `;

  const shuffledOptions = shuffle([
    { text: q.correct, isCorrect: true },
    { text: q.wrongs[0], isCorrect: false },
    { text: q.wrongs[1], isCorrect: false },
    { text: q.wrongs[2], isCorrect: false }
  ]);

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  shuffledOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-card';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => answerChoice(btn, opt.isCorrect, qIdx));

    // Touch devices (phone/tablet): simulate hover spotlight when user taps.
    // On touchstart → light up this card (and dim any previously lit one).
    // Class gets cleared when card becomes .disabled in answerChoice().
    btn.addEventListener('touchstart', () => {
      if (answered) return;
      document.querySelectorAll('.option-card').forEach(b => b.classList.remove('touch-lit'));
      btn.classList.add('touch-lit');
    }, { passive: true });

    optionsEl.appendChild(btn);
  });

  document.getElementById('feedback').className = 'feedback';
  document.getElementById('feedback').innerHTML = '';

  const gameArea = document.getElementById('game-area');
  gameArea.style.animation = 'none';
  gameArea.offsetHeight;
  gameArea.style.animation = 'fadeIn 0.4s ease';

  // Tell teacher what question is now showing
  SYNC.send(SYNC.MSG.STUDENT_READY, {
    word: q.word,
    def: q.def,
    correct: q.correct,
    wrongs: q.wrongs,
    questionIndex: completed + 1,        // hiển thị #n/total
    totalQuestions: QUESTIONS.length,
    queueRemaining: queue.length,
    completed: completed,
    mistakes: mistakes,
    isRetry: (mistakeMap[q.word] || 0) > 0
  });
}

// ══════════════════════════════════
//  ANSWER HANDLER
// ══════════════════════════════════

/**
 * HS click 1 option:
 *   - KHÔNG commit state ngay — chỉ ghi vào pendingSelection
 *   - HS có thể click đổi ý nhiều lần cho đến khi GV bấm Next
 *   - Mỗi lần click: card được chọn highlight gold, các card khác vẫn clickable
 *   - Teacher panel update live với lựa chọn mới nhất
 *   - KHÔNG hiện đúng/sai trên màn HS
 */
function answerChoice(btn, isCorrect, qIdx) {
  // Nếu click vào đúng card đang chọn → không làm gì
  if (pendingSelection && pendingSelection.chosenText === btn.textContent) return;

  const q = QUESTIONS[qIdx];
  const isFirstSelection = !answered;

  // Clear highlight cũ trên tất cả, chỉ add vào card mới
  document.querySelectorAll('.option-card').forEach(b => {
    b.classList.remove('selected', 'touch-lit');
  });
  btn.classList.add('selected');

  // Lưu lựa chọn pending (chưa commit — sẽ commit khi teacher bấm Next)
  pendingSelection = {
    isCorrect: isCorrect,
    qIdx: qIdx,
    chosenText: btn.textContent
  };

  if (isFirstSelection) {
    answered = true;
    totalAnswered++;
  }

  // Báo cho teacher biết lựa chọn hiện tại (live — đổi ý nhiều lần cũng update)
  SYNC.send(SYNC.MSG.STUDENT_ANSWERED, {
    isCorrect: isCorrect,
    chosenText: btn.textContent,
    word: q.word,
    completed: completed,
    mistakes: mistakes,
    queueRemaining: queue.length,
    isRevision: !isFirstSelection
  });

  // Hiện banner neutral lần đầu (không cần hiện lại mỗi lần đổi ý)
  if (isFirstSelection) {
    waitingForNext = true;
    showWaitingBanner();
    SYNC.send(SYNC.MSG.STUDENT_WAIT_NEXT, { isCorrect });
  }
}

/**
 * Commit lựa chọn pending vào state thật.
 * Gọi bởi nextStep() khi teacher bấm Next.
 */
function commitPendingChoice() {
  if (!pendingSelection) return;

  const { isCorrect, qIdx } = pendingSelection;
  const q = QUESTIONS[qIdx];

  if (isCorrect) {
    completedSet.add(qIdx);
    queue.shift();
    completed = completedSet.size;
  } else {
    mistakes++;
    mistakeMap[q.word] = (mistakeMap[q.word] || 0) + 1;
    queue.shift();
    reinsertQuestion(qIdx);
  }

  pendingSelection = null;
}

function reinsertQuestion(qIdx) {
  const minPos = Math.min(2, queue.length);
  const maxPos = queue.length;
  const insertAt = minPos + Math.floor(Math.random() * (maxPos - minPos + 1));
  queue.splice(insertAt, 0, qIdx);
}

// ══════════════════════════════════
//  WAITING BANNER — Neutral message (KHÔNG tiết lộ đúng/sai)
//  Teacher sẽ giải thích trực tiếp bằng lời qua Zoom voice.
// ══════════════════════════════════
function showWaitingBanner() {
  const banner = document.getElementById('waiting-banner');
  if (!banner) return;
  banner.classList.remove('hidden', 'waiting-ok', 'waiting-retry');
  banner.classList.add('waiting-neutral');
  banner.innerHTML = '&#128483; <span>Listen to your teacher</span> <span class="waiting-sub">— you can click a different option if you change your mind</span>';
}

function hideWaitingBanner() {
  const banner = document.getElementById('waiting-banner');
  if (!banner) return;
  banner.classList.add('hidden');
}

// ══════════════════════════════════
//  NAVIGATION — called by TEACHER_NEXT handler
// ══════════════════════════════════

function nextStep() {
  // Commit lựa chọn cuối cùng của HS vào state (queue, mistakes, completedSet)
  // trước khi chuyển câu mới
  commitPendingChoice();

  if (queue.length === 0) {
    winGame();
  } else {
    showQuestion();
  }
}

function winGame() {
  document.getElementById('game-screen').style.display = 'none';
  const winScreen = document.getElementById('win-screen');
  winScreen.style.display = 'flex';

  document.getElementById('total-answered').textContent = totalAnswered;
  document.getElementById('total-mistakes').textContent = mistakes;

  const summaryEl = document.getElementById('retry-summary');
  const entries = Object.entries(mistakeMap).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    summaryEl.innerHTML = `
      <h4>Perfect Score!</h4>
      <p style="color:#A5D6A7; font-size:0.95rem;">No mistakes — you know all the words!</p>
    `;
  } else {
    let html = `<h4>Words to Review</h4>`;
    entries.forEach(([word, count]) => {
      html += `
        <div class="retry-item">
          <span class="retry-word">${word}</span>
          <span class="retry-count">${count} mistake${count > 1 ? 's' : ''}</span>
        </div>
      `;
    });
    summaryEl.innerHTML = html;
  }

  // Tell teacher the game is done
  SYNC.send(SYNC.MSG.STUDENT_WON, {
    totalAnswered: totalAnswered,
    mistakes: mistakes,
    mistakeMap: mistakeMap
  });
}

// ══════════════════════════════════
//  SHOW WAITING SCREEN (student before game starts)
// ══════════════════════════════════
function showWaitingScreen() {
  document.getElementById('waiting-screen').style.display = 'flex';
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('win-screen').style.display = 'none';
}
