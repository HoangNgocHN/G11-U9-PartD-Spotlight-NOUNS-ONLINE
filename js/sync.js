/* ============================================================
   SYNC — Firebase Realtime Database (ONLINE classroom)
   ============================================================
   Sentence Spotlight — Classroom Edition

   Dùng cùng Firebase project với Listen & Click, nhưng path khác:
     - L&C:  rooms/{code}/...
     - SS:   ss-rooms/{code}/...
   → Không đụng nhau dù chạy cùng lúc.

   PUBLIC API (giống bản Listen & Click):
     SYNC.init(role), SYNC.send(type, data),
     SYNC.on(type, handler), SYNC.onPeerOnline/Offline(h),
     SYNC.MSG.*, SYNC.getRoomCode()
   ============================================================ */

// ============================================================
// Firebase config — same project as Listen & Click
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCNGj9q9I6m3MWXoKFBNmGLPbfhYvc58bk",
  authDomain:        "listenandclick-online.firebaseapp.com",
  databaseURL:       "https://listenandclick-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "listenandclick-online",
  storageBucket:     "listenandclick-online.firebasestorage.app",
  messagingSenderId: "784314042401",
  appId:             "1:784314042401:web:8c9ae01478b19295513b60",
  measurementId:     "G-540XNG1HHH"
};

// Path prefix — KHÁC với Listen & Click để tránh đụng
const DB_PREFIX = 'ss-rooms';
// ============================================================

const SYNC = (function () {

  let db = null;
  let roomRef = null;
  let presenceRef = null;
  let role = null;
  let roomCode = null;

  const handlers = {};
  const receivedIds = new Set();
  let lastPeerSeen = 0;
  let peerOnlineCalled = false;

  const MSG = {
    STUDENT_HELLO:      'STUDENT_HELLO',
    STUDENT_READY:      'STUDENT_READY',      // new question shown, sends full question data
    STUDENT_ANSWERED:   'STUDENT_ANSWERED',   // student picked { isCorrect, chosenText, word }
    STUDENT_WAIT_NEXT:  'STUDENT_WAIT_NEXT',  // post-answer, awaiting teacher advance
    STUDENT_WON:        'STUDENT_WON',        // all questions done { totalAnswered, mistakes, mistakeMap }

    TEACHER_HELLO:      'TEACHER_HELLO',
    TEACHER_START:      'TEACHER_START',      // begin game (first question)
    TEACHER_NEXT:       'TEACHER_NEXT',       // advance to next question
    TEACHER_RESTART:    'TEACHER_RESTART',    // play again from win screen
    TEACHER_ANNOTATION: 'TEACHER_ANNOTATION',
    TEACHER_CLEAR_ANNO: 'TEACHER_CLEAR_ANNO',

    HEARTBEAT:          'HEARTBEAT'
  };

  function makeId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function init(myRole) {
    role = myRole;
    roomCode = sessionStorage.getItem('ss-room');

    if (!roomCode) {
      console.error('[SYNC] No room code.');
      alert('⚠️ Room code missing. Please reload the page.');
      return false;
    }

    if (typeof firebase === 'undefined') {
      console.error('[SYNC] Firebase SDK not loaded.');
      alert('⚠️ Firebase SDK chưa load. Kiểm tra internet & index.html.');
      return false;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.database();

    roomRef     = db.ref(DB_PREFIX + '/' + roomCode + '/messages');
    presenceRef = db.ref(DB_PREFIX + '/' + roomCode + '/presence/' + role);

    presenceRef.set({ online: true, at: firebase.database.ServerValue.TIMESTAMP });
    presenceRef.onDisconnect().remove();

    const peerRole = (role === 'student') ? 'teacher' : 'student';
    db.ref(DB_PREFIX + '/' + roomCode + '/presence/' + peerRole).on('value', (snap) => {
      const v = snap.val();
      if (v && v.online) {
        lastPeerSeen = Date.now();
        if (!peerOnlineCalled) {
          peerOnlineCalled = true;
          if (handlers._peerOnline) handlers._peerOnline();
        }
      } else {
        if (peerOnlineCalled) {
          peerOnlineCalled = false;
          if (handlers._peerOffline) handlers._peerOffline();
        }
      }
    });

    // listen only to NEW messages (not history)
    const startAt = Date.now();
    roomRef.orderByChild('timestamp').startAt(startAt).on('child_added', (snap) => {
      const msg = snap.val();
      if (msg) processIncoming(msg);
    });

    send(role === 'student' ? MSG.STUDENT_HELLO : MSG.TEACHER_HELLO, {});

    if (role === 'teacher') {
      setInterval(pruneOldMessages, 30000);
    }

    return true;
  }

  function processIncoming(msg) {
    if (!msg || msg.from === role) return;
    if (msg.id && receivedIds.has(msg.id)) return;
    if (msg.id) {
      receivedIds.add(msg.id);
      if (receivedIds.size > 300) {
        const arr = Array.from(receivedIds);
        receivedIds.clear();
        arr.slice(-150).forEach(id => receivedIds.add(id));
      }
    }

    if (msg.type === MSG.HEARTBEAT ||
        msg.type === MSG.STUDENT_HELLO ||
        msg.type === MSG.TEACHER_HELLO) {
      lastPeerSeen = Date.now();
    }

    const handler = handlers[msg.type];
    if (handler) handler(msg.data);
  }

  function send(type, data) {
    if (!roomRef) {
      console.warn('[SYNC] Not initialized, drop:', type);
      return;
    }
    roomRef.push({
      id: makeId(),
      from: role,
      type: type,
      data: data || {},
      timestamp: firebase.database.ServerValue.TIMESTAMP
    }).catch(err => console.warn('[SYNC] send error:', err));
  }

  function pruneOldMessages() {
    if (!roomRef) return;
    const cutoff = Date.now() - 60000;
    roomRef.orderByChild('timestamp').endAt(cutoff).limitToFirst(50).once('value', (snap) => {
      const updates = {};
      snap.forEach(child => { updates[child.key] = null; });
      if (Object.keys(updates).length > 0) {
        roomRef.update(updates).catch(() => {});
      }
    });
  }

  function on(type, handler) { handlers[type] = handler; }
  function onPeerOnline(h)   { handlers._peerOnline  = h; }
  function onPeerOffline(h)  { handlers._peerOffline = h; }

  function getRoomCode() { return roomCode; }

  return { init, send, on, onPeerOnline, onPeerOffline, MSG, getRoomCode };
})();
