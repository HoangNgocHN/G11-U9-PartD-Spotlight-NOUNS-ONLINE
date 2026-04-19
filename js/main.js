/* ============================================================
   MAIN — Role router (Sentence Spotlight Online Classroom)
   ============================================================ */

window.addEventListener('load', () => {
  const role = sessionStorage.getItem('ss-role');
  const room = sessionStorage.getItem('ss-room');

  if (!role || !room) {
    // Room screen already handled by inline script in index.html
    return;
  }

  // Show room badge in header
  const tb = document.getElementById('teacher-room-badge');
  const sb = document.getElementById('student-room-badge');
  if (tb) tb.textContent = room;
  if (sb) sb.textContent = room;

  SYNC.init(role);

  if (role === 'student') {
    startStudent();
  } else if (role === 'teacher') {
    startTeacher();
  }
});

function startStudent() {
  document.getElementById('student-view').classList.remove('hidden');

  // Register SYNC handlers for teacher → student events
  SYNC.on(SYNC.MSG.TEACHER_START, () => {
    if (typeof startGame === 'function') startGame();
  });

  SYNC.on(SYNC.MSG.TEACHER_NEXT, () => {
    if (typeof nextStep === 'function') nextStep();
  });

  SYNC.on(SYNC.MSG.TEACHER_RESTART, () => {
    if (typeof startGame === 'function') startGame();
  });

  SYNC.on(SYNC.MSG.TEACHER_ANNOTATION, (data) => {
    window.showStudentAnnotation(data.text);
  });
  SYNC.on(SYNC.MSG.TEACHER_CLEAR_ANNO, () => {
    window.clearStudentAnnotations();
  });

  // Teacher presence indicator
  SYNC.onPeerOnline(() => {
    const el = document.getElementById('student-teacher-status');
    if (!el) return;
    el.textContent = '🟢 Teacher online';
    el.className = 'status-online';
  });
  SYNC.onPeerOffline(() => {
    const el = document.getElementById('student-teacher-status');
    if (!el) return;
    el.textContent = '⚪ Waiting for teacher';
    el.className = 'status-offline';
  });

  // Show "waiting for teacher to start" screen
  if (typeof showWaitingScreen === 'function') showWaitingScreen();
}

function startTeacher() {
  document.getElementById('teacher-view').classList.remove('hidden');
  window.initTeacher();
}

// ============================================================
// STANDALONE ANNOTATION FUNCTIONS (DOM-only)
// ============================================================
window.showStudentAnnotation = function (text) {
  const empty   = document.getElementById('notes-empty');
  const current = document.getElementById('notes-current');
  const recent  = document.getElementById('notes-recent');

  if (!current || !recent) return;

  if (empty) empty.classList.add('hidden');

  if (current.textContent && !current.classList.contains('hidden')) {
    const chip = document.createElement('span');
    chip.className = 'notes-recent-chip';
    chip.textContent = current.textContent;
    recent.insertBefore(chip, recent.firstChild);
    while (recent.children.length > 8) {
      recent.removeChild(recent.lastChild);
    }
  }

  current.textContent = text;
  current.classList.remove('hidden');

  current.style.animation = 'none';
  void current.offsetWidth;
  current.style.animation = '';
};

window.clearStudentAnnotations = function () {
  const empty   = document.getElementById('notes-empty');
  const current = document.getElementById('notes-current');
  const recent  = document.getElementById('notes-recent');

  if (current) {
    current.textContent = '';
    current.classList.add('hidden');
  }
  if (recent) recent.innerHTML = '';
  if (empty) empty.classList.remove('hidden');
};

// Helper for testing
window.resetRole = function () {
  sessionStorage.removeItem('ss-role');
  sessionStorage.removeItem('ss-room');
  location.reload();
};
