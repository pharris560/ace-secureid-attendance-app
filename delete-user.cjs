const { initializeApp } = require('firebase/app');
const { getFirestore, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAgNOAFjgL7wLfo8bySNfnC3awJJUoFk4U",
  authDomain: "ace-attendance-7f9cd.firebaseapp.com",
  projectId: "ace-attendance-7f9cd",
  storageBucket: "ace-attendance-7f9cd.firebasestorage.app",
  messagingSenderId: "634474737838",
  appId: "1:634474737838:web:ea99a8d86a4084a67abf53"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteUser() {
  const userId = "dCxc69lY3DIWZsln8LTo";
  console.log(`Deleting Patrick Alexander (email: kakjf) - ID: ${userId}`);
  
  try {
    await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "users", userId));
    console.log("✓ Deleted successfully");
  } catch (err) {
    console.log(`✗ Error: ${err.message}`);
  }
  
  process.exit(0);
}

deleteUser().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
