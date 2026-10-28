'use strict';

require('dotenv').config({ path: './.env' });

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Kredensial service account Google dibaca dari environment.
// firebase.json adalah RAHASIA dan TIDAK di-commit ke repository.
// Fallback ke file lokal hanya untuk kompatibilitas setup lama yang masih
// menyimpan firebase.json di disk (produksi/server lama).
function loadServiceAccount() {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // private key multi-baris biasa disimpan dengan literal \n di .env
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  const legacyFile = path.join(__dirname, 'firebase.json');
  if (fs.existsSync(legacyFile)) {
    return require(legacyFile);
  }

  throw new Error(
    'Firebase service account tidak ditemukan. Set FIREBASE_PROJECT_ID, ' +
      'FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY di .env, atau sediakan ' +
      'firebase.json lokal.'
  );
}

admin.initializeApp({
  credential: admin.credential.cert(loadServiceAccount()),
});

module.exports = admin.messaging();