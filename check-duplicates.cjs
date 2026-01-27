const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAgNOAFjgL7wLfo8bySNfnC3awJJUoFk4U",
  authDomain: "ace-attendance-7f9cd.firebaseapp.com",
  projectId: "ace-attendance-7f9cd",
  storageBucket: "ace-attendance-7f9cd.firebasestorage.app",
  messagingSenderId: "634aborrar474737838",
  appId: "1:634474737838:web:ea99a8d86a4084a67abf53"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDuplicates() {
  console.log("Fetching users from Firebase...\n");
  
  const usersRef = collection(db, "artifacts", "default-app-id", "public", "data", "users");
  const snapshot = await getDocs(usersRef);
  
  const users = [];
  snapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  
  console.log(`Total users found: ${users.length}\n`);
  
  // Check for duplicates by name
  const nameMap = {};
  users.forEach(u => {
    const name = (u.name || "").toLowerCase().trim();
    if (!nameMap[name]) nameMap[name] = [];
    nameMap[name].push(u);
  });
  
  console.log("=== DUPLICATE NAMES ===");
  let hasDuplicateNames = false;
  Object.keys(nameMap).forEach(name => {
    if (nameMap[name].length > 1) {
      hasDuplicateNames = true;
      console.log(`\nName: "${nameMap[name][0].name}" (${nameMap[name].length} records)`);
      nameMap[name].forEach(u => {
        console.log(`  - ID: ${u.id}, Email: ${u.email || "N/A"}, Archived: ${u.archived || false}, Role: ${u.role || u.roles?.join(",") || "N/A"}`);
      });
    }
  });
  if (!hasDuplicateNames) console.log("No duplicate names found.\n");
  
  // Check for duplicates by email
  const emailMap = {};
  users.forEach(u => {
    const email = (u.email || "").toLowerCase().trim();
    if (email && email !== "") {
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(u);
    }
  });
  
  console.log("\n=== DUPLICATE EMAILS ===");
  let hasDuplicateEmails = false;
  Object.keys(emailMap).forEach(email => {
    if (emailMap[email].length > 1) {
      hasDuplicateEmails = true;
      console.log(`\nEmail: "${email}" (${emailMap[email].length} records)`);
      emailMap[email].forEach(u => {
        console.log(`  - ID: ${u.id}, Name: ${u.name || "N/A"}, Archived: ${u.archived || false}`);
      });
    }
  });
  if (!hasDuplicateEmails) console.log("No duplicate emails found.\n");
  
  // Show archived users
  console.log("\n=== ARCHIVED USERS ===");
  const archivedUsers = users.filter(u => u.archived === true);
  if (archivedUsers.length > 0) {
    archivedUsers.forEach(u => {
      console.log(`  - ID: ${u.id}, Name: ${u.name || "N/A"}, Email: ${u.email || "N/A"}`);
    });
  } else {
    console.log("No archived users found.\n");
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total users: ${users.length}`);
  console.log(`Active users: ${users.filter(u => !u.archived).length}`);
  console.log(`Archived users: ${archivedUsers.length}`);
  
  process.exit(0);
}

checkDuplicates().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
