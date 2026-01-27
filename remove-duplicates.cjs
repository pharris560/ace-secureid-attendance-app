const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function removeDuplicates() {
  console.log("Fetching users from Firebase...\n");
  
  const usersRef = collection(db, "artifacts", "default-app-id", "public", "data", "users");
  const snapshot = await getDocs(usersRef);
  
  const users = [];
  snapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  
  console.log(`Total users found: ${users.length}\n`);
  
  // Group by email (lowercase)
  const emailMap = {};
  users.forEach(u => {
    const email = (u.email || "").toLowerCase().trim();
    if (email && email !== "") {
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(u);
    }
  });
  
  // Find duplicates and delete all but first (by ID alphabetically)
  const toDelete = [];
  Object.keys(emailMap).forEach(email => {
    if (emailMap[email].length > 1) {
      // Sort by ID to keep consistent order
      const sorted = emailMap[email].sort((a, b) => a.id.localeCompare(b.id));
      // Keep first, delete rest
      for (let i = 1; i < sorted.length; i++) {
        toDelete.push(sorted[i]);
      }
    }
  });
  
  console.log(`Found ${toDelete.length} duplicate records to delete:\n`);
  
  for (const user of toDelete) {
    console.log(`Deleting: ${user.name} (${user.email}) - ID: ${user.id}`);
    try {
      await deleteDoc(doc(db, "artifacts", "default-app-id", "public", "data", "users", user.id));
      console.log(`  ✓ Deleted successfully`);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }
  
  console.log(`\n=== COMPLETE ===`);
  console.log(`Deleted ${toDelete.length} duplicate records`);
  
  process.exit(0);
}

removeDuplicates().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
