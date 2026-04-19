/* ============================================================
   TEACHER — Control panel logic for Sentence Spotlight
   ============================================================ */

window.teacherState = {
  currentQuestion: null,     // { word, def, correct, wrongs, questionIndex, totalQuestions, ... }
  studentAnswered: false,
  studentCorrect: false,
  studentOnline: false,
  gameStarted: false,
  gameWon: false,

  // Stats
  totalCorrect: 0,
  totalWrong: 0,
  annotationHistory: []
};

var teacherState = window.teacherState;

window.initTeacher = function () {
  setupTeacherSyncHandlers();
  setupTeacherButtons();
  updateTeacherUI();
};

// ============== SYNC HANDLERS ==============
function setupTeacherSyncHandlers() {
  SYNC.on(SYNC.MSG.STUDENT_HELLO, () => {
    teacherState.studentOnline = true;
    updateStudentStatus();
  });

  SYNC.on(SYNC.MSG.STUDENT_READY, (data) => {
    teacherState.currentQuestion = data;
    teacherState.studentAnswered = false;
    teacherState.studentCorrect = false;
    teacherState.gameStarted = true;
    teacherState.gameWon = false;
    updateTeacherUI();
  });

  SYNC.on(SYNC.MSG.STUDENT_ANSWERED, (data) => {
    teacherState.studentAnswered = true;
    teacherState.studentCorrect = data.isCorrect;
    teacherState.lastAnswerData = data; // lưu để commit khi bấm Next

    // KHÔNG cộng stats ở đây — HS có thể đổi ý. Chỉ commit khi bấm Next.
    // Hiển thị số lần đổi ý (nếu có) để GV biết HS đã thay đổi
    updateStudentAnswerDisplay(data);
    updateNextButton();
  });

  SYNC.on(SYNC.MSG.STUDENT_WAIT_NEXT, () => {
    updateNextButton();
  });

  SYNC.on(SYNC.MSG.STUDENT_WON, (data) => {
    teacherState.gameWon = true;
    teacherState.currentQuestion = null;
    document.getElementById('t-student-answer').innerHTML =
      '&#127881; <strong>Student finished!</strong> ' +
      data.totalAnswered + ' answers, ' + data.mistakes + ' mistakes';
    updateTeacherUI();
    updateNextButton();
  });

  SYNC.onPeerOnline(() => {
    teacherState.studentOnline = true;
    updateStudentStatus();
  });
  SYNC.onPeerOffline(() => {
    teacherState.studentOnline = false;
    updateStudentStatus();
  });
}

// ============== BUTTON HANDLERS ==============
function setupTeacherButtons() {
  document.getElementById('t-start-btn').addEventListener('click', onStartClicked);
  document.getElementById('t-next-btn').addEventListener('click', onNextClicked);
  document.getElementById('t-restart-btn').addEventListener('click', onRestartClicked);
  document.getElementById('t-anno-send').addEventListener('click', onSendAnnotation);
  document.getElementById('t-anno-clear').addEventListener('click', onClearAnnotations);

  document.getElementById('t-anno-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSendAnnotation();
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.id === 't-anno-input') return;

    if (e.key === 'Enter') {
      const nextBtn  = document.getElementById('t-next-btn');
      const startBtn = document.getElementById('t-start-btn');
      if (!nextBtn.disabled && nextBtn.offsetParent !== null) {
        onNextClicked();
      } else if (!startBtn.disabled && startBtn.offsetParent !== null) {
        onStartClicked();
      }
    }
  });
}

function onStartClicked() {
  if (!teacherState.studentOnline) {
    alert('Student is not connected yet. Wait for student to join first.');
    return;
  }
  SYNC.send(SYNC.MSG.TEACHER_START, {});
  teacherState.gameStarted = true;
  document.getElementById('t-start-btn').style.display = 'none';
  document.getElementById('t-next-btn').style.display  = 'flex';
}

function onNextClicked() {
  // COMMIT stats dựa trên lựa chọn CUỐI CÙNG của HS (sau khi đổi ý)
  if (teacherState.studentAnswered) {
    if (teacherState.studentCorrect) teacherState.totalCorrect++;
    else                             teacherState.totalWrong++;
    updateStats();
  }

  SYNC.send(SYNC.MSG.TEACHER_NEXT, {});
  teacherState.studentAnswered = false;
  teacherState.studentCorrect = false;
  teacherState.lastAnswerData = null;
  document.getElementById('t-next-btn').disabled = true;
  document.getElementById('t-next-sub').textContent = 'Waiting for student to answer...';
  document.getElementById('t-student-answer').textContent = 'Student is reading the new question...';
}

function onRestartClicked() {
  SYNC.send(SYNC.MSG.TEACHER_RESTART, {});
  // Reset local stats
  teacherState.totalCorrect = 0;
  teacherState.totalWrong = 0;
  teacherState.studentAnswered = false;
  teacherState.studentCorrect = false;
  teacherState.gameWon = false;
  teacherState.gameStarted = false;
  teacherState.currentQuestion = null;
  updateStats();
  updateTeacherUI();
  document.getElementById('t-restart-btn').style.display = 'none';
  document.getElementById('t-next-btn').style.display    = 'none';
  document.getElementById('t-start-btn').style.display   = 'flex';
}

function onSendAnnotation() {
  const input = document.getElementById('t-anno-input');
  const text = input.value.trim();
  if (!text) return;

  SYNC.send(SYNC.MSG.TEACHER_ANNOTATION, { text });
  addAnnotationToHistory(text);
  input.value = '';
  input.focus();
}

function onClearAnnotations() {
  SYNC.send(SYNC.MSG.TEACHER_CLEAR_ANNO, {});
  teacherState.annotationHistory = [];
  renderAnnotationHistory();
}

function sendQuickWord(word) {
  SYNC.send(SYNC.MSG.TEACHER_ANNOTATION, { text: word });
  addAnnotationToHistory(word);
}

function addAnnotationToHistory(text) {
  teacherState.annotationHistory.unshift({
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  renderAnnotationHistory();
}

function renderAnnotationHistory() {
  const list = document.getElementById('t-anno-history');
  list.innerHTML = '';

  if (teacherState.annotationHistory.length === 0) {
    list.innerHTML = '<li class="empty">No words sent yet</li>';
    return;
  }

  teacherState.annotationHistory.forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = '<span>' + entry.text + '</span><span class="anno-time">' + entry.time + '</span>';
    list.appendChild(li);
  });
}

// ============== UI UPDATES ==============
function updateTeacherUI() {
  const q = teacherState.currentQuestion;

  if (teacherState.gameWon) {
    document.getElementById('t-correct-word').textContent = '🏁 Finished';
    document.getElementById('t-correct-def').textContent = 'Click "Play Again" to restart';
    document.getElementById('t-progress').textContent = 'Done';
    document.getElementById('t-anno-quick-btns').innerHTML = '';
    document.getElementById('t-next-btn').style.display    = 'none';
    document.getElementById('t-start-btn').style.display   = 'none';
    document.getElementById('t-restart-btn').style.display = 'flex';
    return;
  }

  if (!q) {
    document.getElementById('t-correct-word').textContent = '—';
    document.getElementById('t-correct-def').textContent = 'Waiting for student to connect, then click Start';
    document.getElementById('t-progress').textContent = '—';
    document.getElementById('t-anno-quick-btns').innerHTML = '';
    return;
  }

  document.getElementById('t-correct-word').textContent = q.word;
  document.getElementById('t-correct-def').innerHTML =
    '<div class="t-def-line"><em>' + (q.def || '') + '</em></div>' +
    '<div class="t-answer-line">&#9989; <strong>"' + (q.correct || '') + '"</strong></div>';

  const retryTag = q.isRetry ? '<span class="t-retry-tag">REVIEW</span> ' : '';
  document.getElementById('t-progress').innerHTML =
    retryTag + q.questionIndex + ' / ' + q.totalQuestions +
    ' <span class="t-progress-sub">(' + q.queueRemaining + ' left in queue)</span>';

  renderQuickButtons(q);
  updateNextButton();
}

function renderQuickButtons(question) {
  const container = document.getElementById('t-anno-quick-btns');
  container.innerHTML = '';

  if (!question || !question.word) return;

  // Key words to help student: word itself + meaningful words from def
  const defWords = (question.def || '')
    .replace(/[(),.\/"']/g, '')
    .split(' ')
    .filter(w => w.length > 3);

  const allWords = [...new Set([
    question.word,
    ...defWords
  ])];

  allWords.slice(0, 10).forEach(word => {
    const btn = document.createElement('button');
    btn.className = 't-quick-btn';
    btn.textContent = word;
    btn.onclick = () => sendQuickWord(word);
    container.appendChild(btn);
  });
}

function updateStudentAnswerDisplay(data) {
  const el = document.getElementById('t-student-answer');
  const revisionTag = data.isRevision
    ? ' <span style="color:#FFB74D; font-size:0.8em; font-weight:600;">(changed choice ↻)</span>'
    : '';
  if (data.isCorrect) {
    el.innerHTML = '&#9989; <strong>CORRECT</strong> — picked: "' + data.chosenText + '"' + revisionTag;
    el.style.color = '#6BCB77';
  } else {
    el.innerHTML = '&#10060; <strong>WRONG</strong> — picked: "' + data.chosenText + '"' + revisionTag;
    el.style.color = '#F87171';
  }
}

function updateNextButton() {
  const btn = document.getElementById('t-next-btn');
  const sub = document.getElementById('t-next-sub');

  if (teacherState.gameWon) {
    btn.style.display = 'none';
    return;
  }

  if (!teacherState.gameStarted) {
    btn.disabled = true;
    sub.textContent = 'Click Start first';
    return;
  }

  if (teacherState.studentAnswered) {
    btn.disabled = false;
    if (teacherState.studentCorrect) {
      sub.textContent = '✅ Student picked correctly — click when ready to continue';
    } else {
      sub.textContent = '📚 Explain — student can still change choice. Click Next to commit.';
    }
  } else {
    btn.disabled = true;
    sub.textContent = 'Waiting for student to answer...';
  }
}

function updateStudentStatus() {
  const el = document.getElementById('teacher-student-status');
  if (teacherState.studentOnline) {
    el.textContent = '🟢 Student online';
    el.className = 'status-online';
  } else {
    el.textContent = '⚪ Student offline';
    el.className = 'status-offline';
  }
}

function updateStats() {
  document.getElementById('t-stat-correct').textContent = teacherState.totalCorrect;
  document.getElementById('t-stat-wrong').textContent   = teacherState.totalWrong;
  const total = teacherState.totalCorrect + teacherState.totalWrong;
  const acc   = total === 0 ? 0 : Math.round(100 * teacherState.totalCorrect / total);
  document.getElementById('t-stat-acc').textContent = acc + '%';
}
