const functions = require('firebase-functions/v1');
try {
  const builder = functions.firestore.document('test/doc');
  console.log('Builder created successfully with v1');
  
  const schedule = functions.pubsub.schedule('0 23 * * *');
  console.log('Schedule created successfully with v1');
} catch (error) {
  console.error('Error with v1:', error);
}
