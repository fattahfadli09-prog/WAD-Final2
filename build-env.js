// build-env.js
// Script ini dijalankan Vercel saat build (npm run build)
// Fungsinya: replace placeholder di env-config.js dengan nilai asli dari Vercel Environment Variables

const fs = require('fs');

const envConfig = `// env-config.js — AUTO GENERATED saat build, jangan edit manual
window.ENV = {
  FIREBASE_API_KEY:             "${process.env.FIREBASE_API_KEY || ''}",
  FIREBASE_AUTH_DOMAIN:         "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  FIREBASE_DATABASE_URL:        "${process.env.FIREBASE_DATABASE_URL || ''}",
  FIREBASE_PROJECT_ID:          "${process.env.FIREBASE_PROJECT_ID || ''}",
  FIREBASE_STORAGE_BUCKET:      "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  FIREBASE_MESSAGING_SENDER_ID: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  FIREBASE_APP_ID:              "${process.env.FIREBASE_APP_ID || ''}",
  GROQ_API_KEY:                 "${process.env.GROQ_API_KEY || ''}"
};`;

fs.writeFileSync('env-config.js', envConfig);
console.log('✅ env-config.js generated from Vercel Environment Variables');
