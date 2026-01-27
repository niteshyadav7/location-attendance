const functions = require('firebase-functions');
console.log('functions keys:', Object.keys(functions));
console.log('functions.firestore:', !!functions.firestore);
console.log('functions.v1:', !!functions.v1);
if (functions.v1) {
  console.log('functions.v1.firestore:', !!functions.v1.firestore);
}
