// Firebase Configuration — Vercel Version
// Credentials dibaca dari window.ENV yang di-set oleh env-config.js

const firebaseConfig = {
  apiKey:            window.ENV.FIREBASE_API_KEY,
  authDomain:        window.ENV.FIREBASE_AUTH_DOMAIN,
  databaseURL:       window.ENV.FIREBASE_DATABASE_URL,
  projectId:         window.ENV.FIREBASE_PROJECT_ID,
  storageBucket:     window.ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId:             window.ENV.FIREBASE_APP_ID
};

console.log("🔥 Initializing Firebase project:", firebaseConfig.projectId);

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized!");
  } else {
    console.log("✅ Using existing Firebase app");
  }
} else {
  console.error("❌ Firebase SDK not loaded!");
}

const rtdb = firebase.database();

rtdb.ref('.info/connected').on('value', (snapshot) => {
  const statusEl = document.getElementById('connectionStatus');
  if (snapshot.val() === true) {
    console.log('✅ Realtime Database: ONLINE!');
    if (statusEl) statusEl.innerHTML = '🔌 Status: <span style="font-weight:600;color:#10b981;">Online ✅</span>';
  } else {
    console.log('❌ Realtime Database: OFFLINE');
    if (statusEl) statusEl.innerHTML = '🔌 Status: <span style="font-weight:600;color:#ef4444;">Offline ❌</span>';
  }
});
