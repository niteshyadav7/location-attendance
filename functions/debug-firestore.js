const functions = require('firebase-functions');
try {
  const builder = functions.firestore.document('test/doc');
  console.log('Builder created successfully');
} catch (error) {
  console.error('Error creating builder:', error);
}
