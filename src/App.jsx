import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  LayoutDashboard, Users, FileText, Settings, Menu, Download, 
  MapPin, Clock, CheckCircle, AlertCircle, CreditCard, UserPlus, 
  Trash, X, Camera, ShieldCheck, FlaskConical, Navigation, Loader2,
  ArrowLeft, BarChart3, Plus, Upload, GraduationCap, Search, Trash2, 
  Sparkles, Brain, Mail, Filter, RotateCcw, Moon, Sun, FileSpreadsheet, Archive, Send, Copy, Check, ExternalLink, Link as LinkIcon, Smartphone, ClipboardList, Edit3, Calendar, Shield, Settings2, UserMinus, AlertTriangle, ChevronRight, Image as ImageIcon, UserCheck, UserX, Ghost, CheckCircle2, LocateFixed, Lock, LogIn, LogOut, Activity, ShieldAlert, Globe, ChevronLeft, Share, SmartphoneNfc, TrendingUp, RefreshCw
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, 
  onSnapshot, addDoc, updateDoc, deleteDoc, query,
  writeBatch
} from 'firebase/firestore';

/**
 * PRODUCTION CONFIGURATION
 * Verified for Project: ace-attendance-7f9cd
 */
const firebaseConfig = {
  apiKey: "AIzaSyAPH4O52nTSo7SHoQx62ECvEspPiIz4bGc",
  authDomain: "ace-attendance-7f9cd.firebaseapp.com",
  projectId: "ace-attendance-7f9cd",
  storageBucket: "ace-attendance-7f9cd.firebasestorage.app",
  messagingSenderId: "62524550806",
  appId: "1:62524550806:web:0df4c69337530876085cb7",
  measurementId: "G-PCCF9HFR2D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "default-app-id";

// --- SECURITY ENGINE ---
const generateSecureToken = (secret) => {
  const windowTime = Math.floor(Date.now() / 30000);
  const seed = String(secret || 'default') + "-" + windowTime;
  let h1 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return Math.abs(h1 % 1000000).toString().padStart(6, '0');
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// --- MAIN APPLICATION ---

export default function App() {
  // 1. STATE DEFINITIONS (HOISTED)
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('connecting'); 
  const [appUsers, setAppUsers] = useState([]);
  const [appClasses, setAppClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [theme, setTheme] = useState('light');
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [msg, setMsg] = useState(null);
  const [studentModeUid, setStudentModeUid] = useState(() => { const saved = typeof window !== "undefined" ? localStorage.getItem("ecard_uid") : null; return saved || null; });
  const [geofenceStatus, setGeofenceStatus] = useState('SEARCHING');
  const [lastAutoCheckIn, setLastAutoCheckIn] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [lastAutoCheckOut, setLastAutoCheckOut] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [signupName, setSignupName] = useState("");
  // UI States
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 15;

  // Report States
  const [reportRange, setReportRange] = useState('DAILY'); 
  const [reportClassFilter, setReportClassFilter] = useState('ALL');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportUserFilter, setReportUserFilter] = useState("ALL");

  // Modal States
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [userStatusFilter, setUserStatusFilter] = useState("active");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [markingAttendance, setMarkingAttendance] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [cardSortOrder, setCardSortOrder] = useState("first");
  const [expandedCardSection, setExpandedCardSection] = useState(null);
  const [managingRoster, setManagingRoster] = useState(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  const [classForm, setClassForm] = useState({ 
    name: '', instructor: '', address: '', latitude: '', longitude: '', startTime: '09:00', endTime: '11:00', activeDays: [], timezone: 'America/New_York' 
  });
  const [userForm, setUserForm] = useState({ 
    name: '', email: '', role: 'STUDENT', secretKey: '', studentId: '', className: '' 
  });


  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err) {
      setLoginError("Invalid email or password");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!signupName.trim()) { setLoginError("Please enter your full name"); return; }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      // Create e-card for the new user
      await addDoc(collection(db, "artifacts", appId, "public", "data", "users"), {
        name: signupName.trim(),
        email: loginEmail,
        role: "STAFF",
        className: "",
        archived: false,
        studentId: "",
        secretKey: Math.random().toString(36).substring(7).toUpperCase(),
        authUid: userCredential.user.uid
      });
      setLoginEmail("");
      setLoginPassword("");
      console.log("E-card created successfully");
      setSignupName("");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setLoginError("Email already in use");
      else if (err.code === "auth/weak-password") setLoginError("Password must be at least 6 characters");
      else setLoginError("Signup failed. Please try again.");
      console.error("Signup error:", err);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail) { setLoginError("Please enter your email address"); return; }
    try {
      await sendPasswordResetEmail(auth, loginEmail);
      setAuthMode("login");
      alert("Password reset email sent! Check your inbox.");
    } catch (err) {
      setLoginError("Could not send reset email. Check your email address.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      signInAnonymously(auth);
    } catch (err) { console.error("Logout error:", err); }
  };
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // 2. MEMOIZED ANALYTICS (HOISTED)
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayLogsRaw = attendanceRecords.filter(r => r.timestamp && r.timestamp.startsWith(today));
    const uniqueStudentLogs = todayLogsRaw.reduce((acc, log) => {
      if (!acc[log.userId] || new Date(log.timestamp) > new Date(acc[log.userId].timestamp)) {
        acc[log.userId] = log;
      }
      return acc;
    }, {});
    const todayLogs = Object.values(uniqueStudentLogs);
    const students = appUsers.filter(u => u.role === "STUDENT");
    const total = students.length;
    
    const onsiteCount = todayLogs.filter(r => r.status && r.status.includes("PRESENT")).length;
    const tardyCount = todayLogs.filter(r => r.status && r.status.includes("TARDY")).length;
    const excusedCount = todayLogs.filter(r => r.status && r.status.includes("EXCUSED")).length;
    const absentCount = Math.max(0, total - (onsiteCount + tardyCount + excusedCount));

    const attendanceData = [
      { name: 'Present', value: onsiteCount, color: '#22c55e' },
      { name: 'Tardy', value: tardyCount, color: '#f59e0b' },
      { name: 'Absent', value: absentCount, color: '#ef4444' },
      { name: 'Excused', value: excusedCount, color: '#3b82f6' }
    ];

    const getPercent = (val) => total > 0 ? Math.round((val / total) * 100) : 0;

    return { 
        totalStudents: total, 
        attendanceData,
        percentages: {
            present: getPercent(onsiteCount),
            tardy: getPercent(tardyCount),
            absent: getPercent(absentCount),
            excused: getPercent(excusedCount)
        }
    };
  }, [appUsers, attendanceRecords]);

  const filteredReports = useMemo(() => {
    return [...attendanceRecords].filter(r => {
      const logDate = new Date(r.timestamp);
      const now = new Date();
      const logDateStr = logDate.toISOString().split("T")[0];
      
      let matchesRange = true;
      if (reportRange === "DAILY") matchesRange = logDate.toDateString() === now.toDateString();
      else if (reportRange === "WEEKLY") matchesRange = logDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (reportRange === "MONTHLY") matchesRange = logDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (reportRange === "CUSTOM") matchesRange = logDateStr >= reportStartDate && logDateStr <= reportEndDate;
      
      const matchesClass = reportClassFilter === "ALL" || r.className === reportClassFilter;
      const matchesStatus = reportStatusFilter === "ALL" || (r.status && r.status.includes(reportStatusFilter));
      const matchesSearch = String(r.userName || "").toLowerCase().includes(reportSearchQuery.toLowerCase());
      const matchesUser = reportUserFilter === "ALL" || r.userId === reportUserFilter;
      
      return matchesRange && matchesClass && matchesStatus && matchesSearch && matchesUser;
    }).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [attendanceRecords, reportRange, reportClassFilter, reportStatusFilter, reportSearchQuery, reportUserFilter, reportStartDate, reportEndDate]);

  const reportStats = useMemo(() => {
    const total = filteredReports.length;
    const present = filteredReports.filter(r => r.status && r.status.includes('PRESENT')).length;
    const tardy = filteredReports.filter(r => r.status && r.status.includes('TARDY')).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, tardy, rate };
  }, [filteredReports]);


  const timeTrackingReports = useMemo(() => {
    const grouped = {};
    attendanceRecords.forEach(r => {
      const date = new Date(r.timestamp).toDateString();
      const key = `${r.userId}-${date}`;
      if (!grouped[key]) {
        grouped[key] = {
          userId: r.userId,
          userName: r.userName,
          className: r.className,
          date: date,
          arrival: null,
          departure: null,
          status: null,
          arrivalLocation: null,
          departureLocation: null
        };
      }
      const ts = new Date(r.timestamp);
      if (r.status && (r.status.includes("PRESENT") || r.status.includes("TARDY"))) {
        if (!grouped[key].arrival || ts < new Date(grouped[key].arrival)) {
          grouped[key].arrival = r.timestamp;
          grouped[key].status = r.status;
          grouped[key].arrivalLocation = r.distance !== undefined ? (r.distance < 50 ? "ONSITE" : "REMOTE") : "-";
        }
      }
      if (r.status && r.status.includes("CHECKED OUT")) {
        if (!grouped[key].departure || ts > new Date(grouped[key].departure)) {
          grouped[key].departure = r.timestamp;
          grouped[key].departureLocation = r.distance !== undefined ? (r.distance < 50 ? "ONSITE" : "REMOTE") : "-";
        }
      }
    });
    return Object.values(grouped).map(g => {
      let timeOnsite = null;
      if (g.arrival && g.departure) {
        const diff = new Date(g.departure) - new Date(g.arrival);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        timeOnsite = `${hours}h ${mins}m`;
      }
      return { ...g, timeOnsite };
    }).filter(g => {
      const logDate = new Date(g.date);
      const logDateStr = logDate.toISOString().split("T")[0];
      const now = new Date();
      let matchesRange = true;
      if (reportRange === "DAILY") matchesRange = logDate.toDateString() === now.toDateString();
      else if (reportRange === "WEEKLY") matchesRange = logDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (reportRange === "MONTHLY") matchesRange = logDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (reportRange === "CUSTOM") matchesRange = logDateStr >= reportStartDate && logDateStr <= reportEndDate;
      const matchesClass = reportClassFilter === "ALL" || g.className === reportClassFilter;
      const matchesSearch = String(g.userName || "").toLowerCase().includes(reportSearchQuery.toLowerCase());
      const matchesUser = reportUserFilter === "ALL" || g.userId === reportUserFilter;
      return matchesRange && matchesClass && matchesSearch && matchesUser;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceRecords, reportRange, reportClassFilter, reportSearchQuery, reportUserFilter, reportStartDate, reportEndDate]);
  const filteredUsers = useMemo(() => {
    return appUsers.filter(u => {
      const search = cardSearchQuery.toLowerCase();
      return (String(u.name || '').toLowerCase().includes(search) || String(u.studentId || '').toLowerCase().includes(search)) &&
             (classFilter === 'ALL' || u.className === classFilter);
    });
  }, [appUsers, cardSearchQuery, classFilter]);

  const paginatedUsers = useMemo(() => filteredUsers.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage), [filteredUsers, currentPage]);
  const instructorsList = appUsers.filter(u => u.role === 'INSTRUCTOR' || u.role === 'ADMINISTRATOR');

  // 3. HANDLERS
  const handleManualAttendance = async (student, cls, statusLabel) => {
    const selectedDate = attendanceDate;
    const existing = attendanceRecords.find(r => r.userId === student.id && r.timestamp && r.timestamp.startsWith(selectedDate));
    try {
        if (existing) {
            await updateDoc(doc(db, "artifacts", appId, "public", "data", "attendance", existing.id), {
                status: String(statusLabel),
                timestamp: selectedDate + "T" + new Date().toTimeString().split(" ")[0] + ".000Z"
            });
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), {
                userId: student.id,
                userName: String(student.name),
                className: String(cls.name),
                timestamp: selectedDate + "T12:00:00.000Z",
                status: String(statusLabel)
            });
        }
        setMsg({ text: `${String(student.name)} status updated` });
    } catch (err) { setMsg({ text: "Manual Entry Sync Failed" }); }
    setTimeout(() => setMsg(null), 3000);
  };

  const openEditUser = (u) => { 
    setEditingUser(u); 
    setUserForm({ name: u.name, email: u.email, role: u.role, studentId: u.studentId || '', className: u.className || '' }); 
    setIsStaffModalOpen(true); 
  };

  const openEditClass = (cls) => { 
    setEditingClass(cls); 
    setClassForm({ ...cls }); 
    setIsClassModalOpen(true); 
  };

  const handleSaveClass = async (e) => {
    if (e) e.preventDefault();
    try {
        const path = editingClass ? ['artifacts', appId, 'public', 'data', 'classes', editingClass.id] : ['artifacts', appId, 'public', 'data', 'classes'];
        if (editingClass) await updateDoc(doc(db, ...path), classForm);
        else await addDoc(collection(db, ...path), classForm);
        setIsClassModalOpen(false); setEditingClass(null);
        setMsg({ text: "Schedule Matrix Synchronized" });
    } catch (err) { setMsg({ text: "Save Failed" }); }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleSaveUser = async (e) => {
    if (e) e.preventDefault();
    try {
        const data = { ...userForm, archived: false, studentId: userForm.studentId || '', secretKey: userForm.secretKey || Math.random().toString(36).substring(7).toUpperCase() };
        const path = editingUser ? ['artifacts', appId, 'public', 'data', 'users', editingUser.id] : ['artifacts', appId, 'public', 'data', 'users'];
        if (editingUser) await updateDoc(doc(db, ...path), data);
        else await addDoc(collection(db, ...path), data);
        setIsStaffModalOpen(false); setEditingUser(null);
        setMsg({ text: "Identity Verified" });
    } catch (err) { setMsg({ text: "Provisioning Error" }); }
    setTimeout(() => setMsg(null), 3000);
  };

  const handlePhotoUpload = async (userId, file) => {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const sSize = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - sSize) / 2, (img.height - sSize) / 2, sSize, sSize, 0, 0, 400, 400);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { photoUrl: canvas.toDataURL('image/jpeg', 0.8) });
        setMsg({ text: "Biometric Verified" }); setTimeout(() => setMsg(null), 3000);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleEmailCard = (userProfile) => {
    const link = `${window.location.origin}${window.location.pathname}?uid=${userProfile.id}#${userProfile.id}`;
    const subject = "ACE SecureID e-Card Access Setup Instructions";
    const nl = "%0D%0A";
    const body = 
      `Hello ${userProfile.name},${nl}${nl}` +
      `Your SecureID e-Card is ready! Use this link to access your digital ID card:${nl}${nl}` +
      `${link}${nl}${nl}` +
      `────────────────────────────────${nl}` +
      `📱 ADD TO YOUR HOME SCREEN${nl}` +
      `────────────────────────────────${nl}${nl}` +
      `iPhone/iPad:${nl}` +
      `1. Open the link above in Safari${nl}` +
      `2. Tap the Share button (square with arrow)${nl}` +
      `3. Scroll down and tap "Add to Home Screen"${nl}` +
      `4. Tap "Add" to confirm${nl}` +
      `5. Disable the toggle for "Open as Web App"${nl}${nl}` +
      `Android:${nl}` +
      `1. Open the link above in Chrome${nl}` +
      `2. Tap the menu (3 dots) in the top right${nl}` +
      `3. Tap "Add to Home screen"${nl}` +
      `4. Tap "Add" to confirm${nl}` +
      `5. Disable the toggle for "Open as Web App"${nl}${nl}` +
      `────────────────────────────────${nl}` +
      `📍 IMPORTANT: ATTENDANCE CHECK-IN${nl}` +
      `────────────────────────────────${nl}${nl}` +
      `Open your e-Card when you arrive at class to automatically check in.${nl}` +
      `Make sure to allow location access when prompted.${nl}${nl}` +
      `If you have any questions, please contact your instructor.`;
    const a = document.createElement("a");
    a.href = `mailto:${userProfile.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
    a.click();
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Load and add logo (centered)
    let logoHeight = 0;
    try {
      const logoImg = new Image();
      logoImg.src = "/ace-logo.png";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = logoImg.width;
      canvas.height = logoImg.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(logoImg, 0, 0);
      const logoData = canvas.toDataURL("image/png");
      const logoW = 40;
      const logoH = 40;
      doc.addImage(logoData, "PNG", (pageWidth - logoW) / 2, 10, logoW, logoH);
      logoHeight = 55;
    } catch (e) {
      console.log("Logo not loaded", e);
      logoHeight = 15;
    }
    
    // Title (centered below logo)
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ACE Attendance Report", pageWidth / 2, logoHeight, { align: "center" });
    
    // Calculate stats from filtered data
    const totalFiltered = timeTrackingReports.length;
    const presentCount = timeTrackingReports.filter(r => r.status && r.status.includes("PRESENT")).length;
    const tardyCount = timeTrackingReports.filter(r => r.status && r.status.includes("TARDY")).length;
    const absentCount = totalFiltered - presentCount - tardyCount;
    const presentPct = totalFiltered > 0 ? Math.round((presentCount / totalFiltered) * 100) : 0;
    const tardyPct = totalFiltered > 0 ? Math.round((tardyCount / totalFiltered) * 100) : 0;
    const absentPct = totalFiltered > 0 ? Math.round((absentCount / totalFiltered) * 100) : 0;
    
    // Summary section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, logoHeight + 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Records: ${totalFiltered}`, 14, logoHeight + 23);
    doc.text(`Present: ${presentCount} (${presentPct}%)`, 14, logoHeight + 30);
    doc.text(`Tardy: ${tardyCount} (${tardyPct}%)`, 14, logoHeight + 37);
    doc.text(`Absent: ${absentCount} (${absentPct}%)`, 14, logoHeight + 44);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, logoHeight + 54);
    
    // Table
    const tableData = timeTrackingReports.map(r => [
      String(r.userName || ""),
      String(r.className || ""),
      r.date || "",
      r.arrival ? new Date(r.arrival).toLocaleTimeString() : "-",
      r.arrivalLocation || "-",
      r.departure ? new Date(r.departure).toLocaleTimeString() : "-",
      r.departureLocation || "-",
      r.timeOnsite || "-",
      String(r.status || "").replace(" (AUTO)", "").replace(" (MANUAL)", "").replace(" (AUTO-END)", "").replace(" (BULK)", "")
    ]);
    
    autoTable(doc, {
      startY: logoHeight + 65,
      head: [["Name", "Class", "Date", "Clock In", "In Loc", "Clock Out", "Out Loc", "Time", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 20 },
        3: { cellWidth: 18 },
        4: { cellWidth: 16 },
        5: { cellWidth: 18 },
        6: { cellWidth: 16 },
        7: { cellWidth: 18 },
        8: { cellWidth: 20 }
      }
    });
    
    // Total Volunteer Hours Section
    const volunteerData = [];
    const userHours = {};
    timeTrackingReports.forEach(r => {
      if (!userHours[r.userId]) {
        const user = appUsers.find(u => u.id === r.userId);
        userHours[r.userId] = {
          name: r.userName,
          role: user?.role || "STUDENT",
          className: r.className,
          daysWorked: 0,
          totalMinutes: 0
        };
      }
      userHours[r.userId].daysWorked++;
      if (r.arrival && r.departure) {
        const diff = new Date(r.departure) - new Date(r.arrival);
        userHours[r.userId].totalMinutes += diff / 60000;
      }
    });
    
    Object.values(userHours).sort((a, b) => b.totalMinutes - a.totalMinutes).forEach(s => {
      const hours = Math.floor(s.totalMinutes / 60);
      const mins = Math.round(s.totalMinutes % 60);
      volunteerData.push([s.name, s.role, s.className || "-", s.daysWorked, `${hours}h ${mins}m`]);
    });
    
    let grandTotalMinutes = 0;
    timeTrackingReports.forEach(r => {
      if (r.arrival && r.departure) {
        grandTotalMinutes += (new Date(r.departure) - new Date(r.arrival)) / 60000;
      }
    });
    const grandHours = Math.floor(grandTotalMinutes / 60);
    const grandMins = Math.round(grandTotalMinutes % 60);
    
    if (volunteerData.length > 0) {
      const lastTableY = doc.lastAutoTable?.finalY || logoHeight + 100;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Total Volunteer Hours", 14, lastTableY + 15);
      
      autoTable(doc, {
        startY: lastTableY + 20,
        head: [["Name", "Role", "Class", "Days", "Total Hours"]],
        body: volunteerData,
        foot: [["", "", "", "Grand Total:", `${grandHours}h ${grandMins}m`]],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: "bold", fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 35 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 }
        }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    const filename = `ace-attendance-report-${new Date().toISOString().split("T")[0]}.pdf`;

    doc.save(filename);
  };
  // Auto check-out at class end time
  useEffect(() => {
    const checkEndOfClass = async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      
      for (const cls of appClasses) {
        if (!cls.endTime) continue;
        const classTimezone = cls.timezone || "America/New_York";
        const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: classTimezone }));
        const [endH, endM] = cls.endTime.split(":").map(Number);
        const classEndTime = new Date(nowInTz);
        classEndTime.setHours(endH, endM, 0, 0);
        
        // Check if we are within 5 minutes after class end
        const timeSinceEnd = (nowInTz - classEndTime) / 60000;
        if (timeSinceEnd >= 0 && timeSinceEnd <= 5) {
          const classStudents = appUsers.filter(u => u.className === cls.name && u.role === "STUDENT");
          for (const student of classStudents) {
            const hasCheckedIn = attendanceRecords.find(r => r.userId === student.id && r.timestamp?.startsWith(today) && (r.status?.includes("PRESENT") || r.status?.includes("TARDY")));
            const hasCheckedOut = attendanceRecords.find(r => r.userId === student.id && r.timestamp?.startsWith(today) && r.status?.includes("CHECKED OUT"));
            if (hasCheckedIn && !hasCheckedOut) {
              await addDoc(collection(db, "artifacts", appId, "public", "data", "attendance"), {
                userId: student.id, userName: String(student.name), className: String(cls.name),
                timestamp: new Date().toISOString(), status: "CHECKED OUT (AUTO-END)"
              });
            }
          }
        }
      }
    };
    const interval = setInterval(checkEndOfClass, 60000);
    return () => clearInterval(interval);
  }, [appClasses, appUsers, attendanceRecords]);

  const handleCsvImport = async (event, targetClassName) => {
    const file = event.target.files[0];
    if (!file) return;
    setMsg({ text: "Processing Roster..." });
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        const batch = writeBatch(db);
        for (let i = 1; i < lines.length; i++) {
          const [name, studentId, email] = lines[i].split(',').map(item => item.trim());
          if (!name) continue;
          const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
          batch.set(newDocRef, { name, studentId: studentId || '', email: email || '', className: targetClassName, role: 'STUDENT', archived: false, secretKey: Math.random().toString(36).substring(7).toUpperCase() });
        }
        await batch.commit();
        setMsg({ text: "Batch Provisioning Complete" });
      } catch (err) { setMsg({ text: "Import Error" }); }
      setTimeout(() => setMsg(null), 3000);
    };
    reader.readAsText(file);
  };

  // 4. EFFECTS
  useEffect(() => {
    if (!studentModeUid || !appUsers.length || !appClasses.length) return;
    console.log("Student Mode UID:", studentModeUid);
    console.log("App Users:", appUsers.length);
    console.log("App Classes:", appClasses.length);
    const student = appUsers.find(u => u.id === studentModeUid);
    if (!student || !student.className) return;
    console.log("Student found:", student?.name, "Class:", student?.className);
    const targetClass = appClasses.find(c => c.name === student.className);
    if (!targetClass || !targetClass.latitude) return;
    console.log("Target class:", targetClass?.name, "Lat:", targetClass?.latitude, "Lng:", targetClass?.longitude);

    const classTimezoneForDay = targetClass.timezone || "America/New_York";
    const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: classTimezoneForDay }).format(new Date());
    const isClassToday = targetClass.activeDays?.includes(todayName);
    console.log("Today:", todayName, "Active days:", targetClass.activeDays, "Is class today:", isClassToday);

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, parseFloat(targetClass.latitude), parseFloat(targetClass.longitude));
        setGeofenceStatus(dist < 50 ? 'ONSITE' : 'REMOTE');
        console.log("Distance from class:", Math.round(dist), "meters, Status:", dist < 50 ? "ONSITE" : "REMOTE");

        const dateKey = new Date().toDateString();
        if (dist < 50 && isClassToday && lastAutoCheckIn !== dateKey) {
        console.log("Check-in conditions - Dist<50:", dist < 50, "IsClassToday:", isClassToday, "LastAutoCheckIn:", lastAutoCheckIn, "DateKey:", dateKey);
          const classTimezone = targetClass.timezone || "America/New_York";
          const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: classTimezone }));
          const [startH, startM] = targetClass.startTime.split(":").map(Number);
          const classStartTime = new Date(nowInTz);
          classStartTime.setHours(startH, startM, 0, 0);
          const earlyLimit = new Date(classStartTime.getTime() - 15 * 60000);
          const tardyLimit = new Date(classStartTime.getTime() + 10 * 60000);
          
          if (nowInTz < earlyLimit) {
            setMsg({ text: "Check-in opens 15 minutes before class" });
            setTimeout(() => setMsg(null), 5000);
            return;
          }
          
          let logStatus = nowInTz > tardyLimit ? "TARDY (AUTO)" : "PRESENT (AUTO)";
          
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'attendance'), {
            userId: student.id, userName: String(student.name), className: String(student.className),
            timestamp: new Date().toISOString(), status: logStatus, 
            distance: Math.round(dist), handshake: generateSecureToken(student.secretKey || student.id)
          });
          setLastAutoCheckIn(dateKey);
          setMsg({ text: logStatus.includes("TARDY") ? "⚠️ You are marked TARDY for " + student.className : "✅ You are marked PRESENT for " + student.className });
          setTimeout(() => setMsg(null), 5000);
        }
        
        // Auto Check-Out when leaving geofence
        if (dist >= 50 && lastAutoCheckIn === dateKey && lastAutoCheckOut !== dateKey) {
          await addDoc(collection(db, "artifacts", appId, "public", "data", "attendance"), {
            userId: student.id, userName: String(student.name), className: String(student.className),
            timestamp: new Date().toISOString(), status: "CHECKED OUT (AUTO)",
            distance: Math.round(dist), handshake: generateSecureToken(student.secretKey || student.id)
          });
          setLastAutoCheckOut(dateKey);
          setMsg({ text: "👋 You have checked out of " + student.className });
          setTimeout(() => setMsg(null), 5000);
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [studentModeUid, appClasses, appUsers, lastAutoCheckIn, lastAutoCheckOut]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let uid = params.get("uid");
    
    // Also check hash as fallback for iOS home screen apps
    if (!uid && window.location.hash) {
      uid = window.location.hash.replace("#", "");
    }
    
    if (uid) {
      localStorage.setItem("ecard_uid", uid);
      setStudentModeUid(uid);
    } else {
      const savedUid = localStorage.getItem("ecard_uid");
      if (savedUid) setStudentModeUid(savedUid);
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setStatus("ready"); setIsLoggedIn(!u.isAnonymous); }
      else { signInAnonymously(auth).catch(() => setStatus("error")); }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const sync = (name, setter) => {
      return onSnapshot(collection(db, "artifacts", appId, "public", "data", name), (snap) => {
        console.log(name + " collection:", snap.docs.length, "documents");
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(name + " data:", data);
        setter(data);
      }, (err) => console.error("Sync Error for " + name + ":", err));
    };
    const unsubs = [sync('users', setAppUsers), sync('classes', setAppClasses), sync('attendance', setAttendanceRecords)];
    return () => unsubs.forEach(f => f());
  }, [user]);

  // Neumorphic Design Helpers (RE-INTENSIFIED FOR POP)
  const isDark = theme === 'dark';
  const surfaceColor = isDark ? "bg-[#1a202c]" : "bg-[#e0e5ec]"; 
  const flatStyle = isDark 
    ? "shadow-[8px_8px_16px_#0b0e14,-8px_-8px_16px_#293141]" 
    : "shadow-[12px_12px_24px_#a3b1c6,-12px_-12px_24px_#ffffff]"; // Increased spread and depth
  const pressedStyle = isDark 
    ? "shadow-[inset_6px_6px_12px_#0b0e14,inset_-6px_-6px_12px_#293141]" 
    : "shadow-[inset_10px_10px_20px_#a3b1c6,inset_-10px_-10px_20px_#ffffff]"; // Sharper inner sculpting
  const buttonStyle = isDark 
    ? "bg-slate-800 shadow-[5px_5px_10px_#0b0e14,-5px_-5px_10px_#293141] active:shadow-inner" 
    : "bg-[#e0e5ec] shadow-[6px_6px_12px_#a3b1c6,-6px_-6px_12px_#ffffff] active:shadow-inner";
  const inputFieldStyle = `${pressedStyle} ${isDark ? 'bg-slate-800/80' : 'bg-[#e0e5ec]'} border-none outline-none font-bold text-sm transition-all`;

  // 5. EARLY RENDERS
  if (status === 'connecting') return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-blue-500 font-black uppercase tracking-widest animate-pulse">Initializing Identity Protocol...</div>;

  // Login page for staff/admin
  if (!isLoggedIn && !studentModeUid) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#1a202c]" : "bg-[#e0e5ec]"} p-6`}>
      <div className={`w-full max-w-md p-12 rounded-[3rem] ${flatStyle} ${isDark ? "bg-[#1a202c]" : "bg-[#e0e5ec]"} border border-white/10`}>
        <div className="flex justify-center mb-8">
          <img src="/ace-logo.png" alt="ACE Logo" className="h-24 w-auto" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-center mb-8 text-slate-800 dark:text-white">
          {authMode === "login" ? "Staff Login" : authMode === "signup" ? "Create Account" : "Reset Password"}
        </h1>
        <form onSubmit={authMode === "login" ? handleLogin : authMode === "signup" ? handleSignup : handleForgotPassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 block">Email</label>
            <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={`${inputFieldStyle} w-full p-5 rounded-2xl text-slate-800 dark:text-white`} placeholder="Enter your email" />
          </div>
          {authMode === "signup" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 block">Full Name</label>
              <input type="text" required value={signupName} onChange={e => setSignupName(e.target.value)} className={`${inputFieldStyle} w-full p-5 rounded-2xl text-slate-800 dark:text-white`} placeholder="Enter your full name" />
            </div>
          )}
          {authMode !== "forgot" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 block">Password</label>
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={`${inputFieldStyle} w-full p-5 rounded-2xl text-slate-800 dark:text-white`} placeholder="Enter your password" />
            </div>
          )}
          {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}
          <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all">
            {authMode === "login" ? "Sign In" : authMode === "signup" ? "Create Account" : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-6 space-y-3">
          {authMode === "login" && (
            <>
              <button onClick={() => setAuthMode("forgot")} className="w-full text-center text-sm text-blue-500 font-bold hover:underline">Forgot Password?</button>
              <p className="text-center text-sm text-slate-400">Do not have an account? <button onClick={() => setAuthMode("signup")} className="text-blue-500 font-bold hover:underline">Sign Up</button></p>
            </>
          )}
          {authMode === "signup" && (
            <p className="text-center text-sm text-slate-400">Already have an account? <button onClick={() => setAuthMode("login")} className="text-blue-500 font-bold hover:underline">Sign In</button></p>
          )}
          {authMode === "forgot" && (
            <p className="text-center text-sm text-slate-400">Remember your password? <button onClick={() => setAuthMode("login")} className="text-blue-500 font-bold hover:underline">Sign In</button></p>
          )}
        </div>
      </div>
    </div>
  );

  if (studentModeUid) {
    const student = appUsers.find(u => u.id === studentModeUid);
    return (
      <div className={`min-h-screen ${surfaceColor} flex flex-col items-center justify-center p-6 gap-8`}>
        {student ? (
          <>
            <div className="w-full max-w-lg">
              <ECard user={student} isDark={isDark} flatStyle={flatStyle} pressedStyle={pressedStyle} buttonStyle={buttonStyle} onPhotoUpload={handlePhotoUpload} />
            </div>
            {msg && (
              <div className={`w-full max-w-lg p-6 rounded-2xl ${msg.text.includes("TARDY") ? "bg-amber-500" : msg.text.includes("PRESENT") ? "bg-green-500" : "bg-blue-500"} text-white font-black text-center text-lg uppercase tracking-wide animate-pulse shadow-xl`}>
                {msg.text}
              </div>
            )}
            <div className={`w-full max-w-lg p-6 rounded-[2rem] ${flatStyle} ${surfaceColor} border border-white/10 flex flex-col gap-4`}>
               <div className="flex items-center justify-between text-slate-800 dark:text-white">
                  <div className="flex items-center gap-3 text-left">
                     <div className={`w-4 h-4 rounded-full ${geofenceStatus === "ONSITE" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
                     <span className="text-[10px] font-black uppercase tracking-wider">Status: {String(geofenceStatus)}</span>
                  </div>
                  <Activity size={20} className={geofenceStatus === "ONSITE" ? "text-green-500" : "text-red-500"} />
               </div>
               {locationError && (
                 <div className="p-3 rounded-xl bg-red-500/20 text-red-500 text-[10px] font-bold text-center">{locationError}</div>
               )}
               {currentLocation && (
                 <div className="p-3 rounded-xl bg-black/5 text-[10px] space-y-1 text-slate-600 dark:text-slate-300">
                   <p><strong>You:</strong> {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</p>
                   <p><strong>Class:</strong> {appClasses.find(c => c.name === student?.className)?.latitude || "Not set"}, {appClasses.find(c => c.name === student?.className)?.longitude || "Not set"}</p>
                   <p><strong>Distance:</strong> {currentLocation.distance ? Math.round(currentLocation.distance * 3.28) + " ft" : "..."}</p>
                   <p><strong>Today:</strong> {new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())}</p>
                   <p><strong>Class Days:</strong> {appClasses.find(c => c.name === student?.className)?.activeDays?.join(", ") || "Not set"}</p>
                 </div>
               )}
               <button onClick={() => {
                 setLocationError(null);
                 navigator.geolocation.getCurrentPosition(
                   (pos) => {
                     const targetClass = appClasses.find(c => c.name === student?.className);
                     let dist = null;
                     if (targetClass?.latitude) {
                       dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, parseFloat(targetClass.latitude), parseFloat(targetClass.longitude));
                     }
                     setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, distance: dist });
                     setGeofenceStatus(dist && dist < 50 ? "ONSITE" : "REMOTE");
                     setMsg({ text: "Location updated" });
                     setTimeout(() => setMsg(null), 3000);
                   },
                   (err) => setLocationError("Location error: " + err.message),
                   { enableHighAccuracy: true }
                 );
               }} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all">
                 <LocateFixed size={16}/> Check My Location
               </button>
               {/* One-Tap Check In Button */}
               {geofenceStatus === "ONSITE" && (
                 <button onClick={async () => {
                   const targetClass = appClasses.find(c => c.name === student?.className);
                   if (!targetClass) { setMsg({ text: "Class not found" }); return; }
                   const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
                   if (!targetClass.activeDays?.includes(todayName)) {
                     setMsg({ text: "No class scheduled today" });
                     setTimeout(() => setMsg(null), 4000);
                     return;
                   }
                   const classTimezone = targetClass.timezone || "America/New_York";
                   const nowInTz = new Date(new Date().toLocaleString("en-US", { timeZone: classTimezone }));
                   const [startH, startM] = targetClass.startTime.split(":").map(Number);
                   const classStartTime = new Date(nowInTz);
                   classStartTime.setHours(startH, startM, 0, 0);
                   const earlyLimit = new Date(classStartTime.getTime() - 15 * 60000);
                   const tardyLimit = new Date(classStartTime.getTime() + 10 * 60000);
                   if (nowInTz < earlyLimit) {
                     setMsg({ text: "Check-in opens 15 min before class" });
                     setTimeout(() => setMsg(null), 4000);
                     return;
                   }
                   const today = new Date().toISOString().split("T")[0];
                   const existing = attendanceRecords.find(r => r.userId === student.id && r.timestamp?.startsWith(today) && (r.status?.includes("PRESENT") || r.status?.includes("TARDY")));
                   if (existing) {
                     setMsg({ text: "✓ Already checked in today" });
                     setTimeout(() => setMsg(null), 4000);
                     return;
                   }
                   const logStatus = nowInTz > tardyLimit ? "TARDY (MANUAL)" : "PRESENT (MANUAL)";
                   await addDoc(collection(db, "artifacts", appId, "public", "data", "attendance"), {
                     userId: student.id, userName: String(student.name), className: String(student.className),
                     timestamp: new Date().toISOString(), status: logStatus,
                     distance: currentLocation?.distance ? Math.round(currentLocation.distance) : 0
                   });
                   setMsg({ text: logStatus.includes("TARDY") ? "⚠️ Checked in as TARDY" : "✅ Checked in as PRESENT" });
                   setTimeout(() => setMsg(null), 5000);
                 }} className="w-full py-5 bg-green-600 text-white rounded-xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg">
                   <CheckCircle size={22}/> Check In Now
                 </button>
               )}
               {/* Manual Check Out Button */}
               {(() => {
                 const today = new Date().toISOString().split("T")[0];
                 const hasCheckedIn = attendanceRecords.find(r => r.userId === student?.id && r.timestamp?.startsWith(today) && (r.status?.includes("PRESENT") || r.status?.includes("TARDY")));
                 const hasCheckedOut = attendanceRecords.find(r => r.userId === student?.id && r.timestamp?.startsWith(today) && r.status?.includes("CHECKED OUT"));
                 if (hasCheckedIn && !hasCheckedOut) {
                   return (
                     <button onClick={async () => {
                       await addDoc(collection(db, "artifacts", appId, "public", "data", "attendance"), {
                         userId: student.id, userName: String(student.name), className: String(student.className),
                         timestamp: new Date().toISOString(), status: "CHECKED OUT (MANUAL)",
                         distance: currentLocation?.distance ? Math.round(currentLocation.distance) : 0
                       });
                       setMsg({ text: "👋 Successfully checked out" });
                       setTimeout(() => setMsg(null), 5000);
                     }} className="w-full py-5 bg-red-500 text-white rounded-xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg">
                       <LogOut size={22}/> Check Out
                     </button>
                   );
                 }
                 return null;
               })()}
               {geofenceStatus === "REMOTE" && (
                 <div className="p-4 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold text-center">
                   📍 Please open this e-card when you arrive at your class location to check in.
                 </div>
               )}
            </div>
          </>
        ) : <p className="font-black uppercase opacity-20 text-slate-800 dark:text-white">Loading...</p>}
      </div>
    );
  }

  // 6. MAIN RENDER
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className={`min-h-screen ${surfaceColor} text-slate-800 dark:text-white flex font-sans transition-all`}>
        {/* Navigation Sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-80 ${isDark ? 'bg-[#1a202c] border-slate-800' : 'bg-[#e0e5ec] border-slate-300'} border-r z-50 p-8 flex flex-col shadow-2xl bg-inherit`}>
          <div className="mb-12 flex flex-col gap-6 items-center text-center text-slate-800 dark:text-white">
            <img src="/ace-logo.png" alt="ACE Logo" className="h-24 w-auto" />
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">SECURE<br/><span className="text-blue-500 text-4xl">ID</span></h1>
          </div>
          <nav className="space-y-4 flex-1">
            <button onClick={() => setActiveView('DASHBOARD')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm font-black transition-all ${activeView === 'DASHBOARD' ? `text-blue-500 ${pressedStyle}` : 'text-slate-400'}`}><LayoutDashboard size={20}/>Dashboard</button>
            <button onClick={() => setActiveView('ID_CARDS')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm font-black transition-all ${activeView === 'ID_CARDS' ? `text-blue-500 ${pressedStyle}` : 'text-slate-400'}`}><CreditCard size={20}/>Identity Cards</button>
            <button onClick={() => setActiveView('MANAGE')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm font-black transition-all ${activeView === 'MANAGE' ? `text-blue-500 ${pressedStyle}` : 'text-slate-400'}`}><GraduationCap size={20}/>Class Manager</button>
            <button onClick={() => setActiveView('REPORTS')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm font-black transition-all ${activeView === 'REPORTS' ? `text-blue-500 ${pressedStyle}` : 'text-slate-400'}`}><BarChart3 size={20}/>Reports</button>
          </nav>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 ${pressedStyle} mt-auto`}>
            {isDark ? <Sun size={18} className="text-amber-400"/> : <Moon size={18}/>}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isDark ? 'Light' : 'Dark'} Mode</span>
          </button>
          {isLoggedIn && (
            <button onClick={handleLogout} className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 ${pressedStyle} mt-4 text-red-500`}>
              <LogOut size={18}/>
              <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
            </button>
          )}
        </aside>

        <main className="flex-1 ml-80 p-12 overflow-y-auto">
          {msg && <div className="mb-10 p-6 rounded-[2rem] bg-green-500/10 text-green-500 font-black flex items-center gap-4 border border-green-500/20 animate-in slide-in-from-top-4 text-xs tracking-tight shadow-sm"><CheckCircle2 size={18}/>{msg.text}</div>}

          {activeView === "DASHBOARD" && (
            <div className="animate-in fade-in duration-700 pb-20 text-left">
              <h1 className="text-5xl font-black tracking-tighter mb-8 uppercase text-slate-800 dark:text-white">ACE<span className="text-blue-500">Live</span></h1>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className={`p-6 rounded-[2rem] ${flatStyle} ${surfaceColor} border border-white/5 relative`}>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Campus Overview</h2>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${pressedStyle} text-blue-500`}>{stats.totalStudents} Enrolled</span>
                    </div>
                    <TrendingUp size={24} className="text-blue-500" />
                  </div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie data={stats.attendanceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                          {stats.attendanceData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <ReTooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {stats.attendanceData.map(item => (
                      <div key={item.name} className="text-center">
                        <span className="text-lg font-black" style={{color: item.color}}>{item.value}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Present", val: stats.percentages.present, color: "text-green-500" },
                    { label: "Tardy", val: stats.percentages.tardy, color: "text-amber-500" },
                    { label: "Absent", val: stats.percentages.absent, color: "text-red-500" },
                    { label: "Excused", val: stats.percentages.excused, color: "text-blue-500" }
                  ].map(item => (
                    <div key={item.label} className={`p-4 rounded-[1.5rem] ${flatStyle} ${surfaceColor} border border-white/5 flex flex-col items-center justify-center`}>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide">{item.label}</span>
                      <span className={`text-3xl font-black ${item.color}`}>{item.val}%</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {appClasses.map(cls => {
                  const today = new Date().toISOString().split("T")[0];
                  const classStudents = appUsers.filter(u => u.className === cls.name && u.role === "STUDENT");
                  const classLogs = attendanceRecords.filter(r => r.className === cls.name && r.timestamp && r.timestamp.startsWith(today));
                  const uniqueStudentLogs = classLogs.reduce((acc, log) => {
                    if (!acc[log.userId] || new Date(log.timestamp) > new Date(acc[log.userId].timestamp)) {
                      acc[log.userId] = log;
                    }
                    return acc;
                  }, {});
                  const todayLogs = Object.values(uniqueStudentLogs);
                  const onsite = todayLogs.filter(r => r.status && r.status.includes("PRESENT")).length;
                  const tardy = todayLogs.filter(r => r.status && r.status.includes("TARDY")).length;
                  const excused = todayLogs.filter(r => r.status && r.status.includes("EXCUSED")).length;
                  const absent = Math.max(0, classStudents.length - (onsite + tardy + excused));
                  const classPieData = [
                    { name: "Present", value: onsite, color: "#22c55e" },
                    { name: "Tardy", value: tardy, color: "#f59e0b" },
                    { name: "Absent", value: absent, color: "#ef4444" },
                    { name: "Excused", value: excused, color: "#3b82f6" }
                  ];
                  return (
                    <div key={cls.id} className={`p-6 rounded-[2rem] ${flatStyle} ${surfaceColor} border border-white/5`}>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">{String(cls.name)}</h3>
                          <p className="text-xs font-bold text-blue-500">{cls.startTime} - {cls.endTime}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl ${pressedStyle}`}>
                          <span className="text-blue-500 text-xl font-black">{classStudents.length}</span>
                        </div>
                      </div>
                      <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie data={classPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                              {classPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {classPieData.map(item => (
                          <div key={item.name} className="text-center">
                            <span className="text-lg font-black" style={{color: item.color}}>{item.value}</span>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{item.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === "ID_CARDS" && (
             <div className="animate-in fade-in text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
                  <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-800 dark:text-white">Identity <span className="text-blue-500">Cards</span></h1>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex gap-1 mr-4">
                      <button onClick={() => setUserStatusFilter("active")} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${userStatusFilter === "active" ? "bg-green-600 text-white" : buttonStyle + " text-slate-400"}`}>Active</button>
                      <button onClick={() => setUserStatusFilter("archived")} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${userStatusFilter === "archived" ? "bg-amber-600 text-white" : buttonStyle + " text-slate-400"}`}>Archived</button>
                      <button onClick={() => setUserStatusFilter("all")} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${userStatusFilter === "all" ? "bg-blue-600 text-white" : buttonStyle + " text-slate-400"}`}>All</button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setCardSortOrder("first")} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${cardSortOrder === "first" ? "bg-blue-600 text-white" : buttonStyle + " text-slate-400"}`}>First Name</button>
                      <button onClick={() => setCardSortOrder("last")} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase ${cardSortOrder === "last" ? "bg-blue-600 text-white" : buttonStyle + " text-slate-400"}`}>Last Name</button>
                    </div>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className={`mb-8 p-4 rounded-2xl ${flatStyle} ${surfaceColor} border border-white/5`}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input
                      type="text"
                      placeholder="Search by name, email, student ID, or class..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      className={`${inputFieldStyle} w-full pl-12 pr-4 py-4 rounded-xl text-slate-800 dark:text-white`}
                    />
                    {userSearchQuery && (
                      <button onClick={() => setUserSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={18}/></button>
                    )}
                  </div>
                </div>
                
                {/* Search Results */}
                {userSearchQuery.trim() && (
                  <div className="mb-8">
                    {(() => {
                      const query = userSearchQuery.toLowerCase().trim();
                      const filteredUsers = appUsers.filter(u => {
                        const matchesStatus = userStatusFilter === "all" || (userStatusFilter === "active" ? !u.archived : u.archived);
                        const matchesSearch = 
                          String(u.name || "").toLowerCase().includes(query) ||
                          String(u.email || "").toLowerCase().includes(query) ||
                          String(u.studentId || "").toLowerCase().includes(query) ||
                          String(u.className || "").toLowerCase().includes(query);
                        return matchesStatus && matchesSearch;
                      }).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
                      
                      if (filteredUsers.length === 0) {
                        return (
                          <div className={`p-8 rounded-2xl ${flatStyle} ${surfaceColor} border border-white/5 text-center`}>
                            <Ghost className="mx-auto text-slate-400 mb-3" size={48}/>
                            <p className="text-slate-400 font-bold">No users found matching "{userSearchQuery}"</p>
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          <p className="text-sm text-slate-400 font-bold mb-4">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found</p>
                          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                            {filteredUsers.map(u => (
                              <CompactECard key={u.id} user={u} isDark={isDark} flatStyle={flatStyle} pressedStyle={pressedStyle} buttonStyle={buttonStyle} onPhotoUpload={handlePhotoUpload} onEdit={openEditUser} onEmail={() => handleEmailCard(u)} />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {/* Class Cards - only show when not searching */}
                {!userSearchQuery.trim() && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Staff & Instructors Card */}
                  {(() => {
                    const staffUsers = appUsers.filter(u => u.role !== "STUDENT" && (userStatusFilter === "all" || (userStatusFilter === "active" ? !u.archived : u.archived)));
                    if (staffUsers.length === 0) return null;
                    return (
                      <div
                        onClick={() => setExpandedCardSection(expandedCardSection === "staff" ? null : "staff")}
                        className={`p-6 rounded-2xl ${flatStyle} ${surfaceColor} border border-white/5 cursor-pointer hover:scale-[1.02] transition-all`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-4 rounded-xl bg-purple-500/20 text-purple-500"><Users size={28}/></div>
                          <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Staff & Instructors</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{staffUsers.length} members</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Class Cards */}
                  {appClasses.map(cls => {
                    const classStudents = appUsers.filter(u => u.className === cls.name && u.role === "STUDENT" && (userStatusFilter === "all" || (userStatusFilter === "active" ? !u.archived : u.archived)));
                    return (
                      <div
                        key={cls.id}
                        onClick={() => setExpandedCardSection(expandedCardSection === cls.id ? null : cls.id)}
                        className={`p-6 rounded-2xl ${flatStyle} ${surfaceColor} border border-white/5 cursor-pointer hover:scale-[1.02] transition-all`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-4 rounded-xl bg-blue-500/20 text-blue-500"><GraduationCap size={28}/></div>
                          <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">{cls.name}</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{classStudents.length} students</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Unassigned Students Card */}
                  {(() => {
                    const unassigned = appUsers.filter(u => u.role === "STUDENT" && !u.className);
                    if (unassigned.length === 0) return null;
                    return (
                      <div
                        onClick={() => setExpandedCardSection(expandedCardSection === "unassigned" ? null : "unassigned")}
                        className={`p-6 rounded-2xl ${flatStyle} ${surfaceColor} border border-white/5 cursor-pointer hover:scale-[1.02] transition-all`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-4 rounded-xl bg-amber-500/20 text-amber-500"><Users size={28}/></div>
                          <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Unassigned</h2>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{unassigned.length} students</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                )}
                
                {/* Expanded Section */}
                {!userSearchQuery.trim() && expandedCardSection && (
                  <div className="mt-8 animate-in fade-in">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-black uppercase text-slate-800 dark:text-white">
                        {expandedCardSection === "staff" ? "Staff & Instructors" :
                         expandedCardSection === "unassigned" ? "Unassigned Students" :
                         appClasses.find(c => c.id === expandedCardSection)?.name || ""}
                      </h3>
                      <button onClick={() => setExpandedCardSection(null)} className={`px-4 py-2 rounded-xl ${buttonStyle} text-slate-400 text-[10px] font-black uppercase`}>Close</button>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {(() => {
                        let users = [];
                        if (expandedCardSection === "staff") {
                          users = appUsers.filter(u => u.role !== "STUDENT" && (userStatusFilter === "all" || (userStatusFilter === "active" ? !u.archived : u.archived)));
                        } else if (expandedCardSection === "unassigned") {
                          users = appUsers.filter(u => u.role === "STUDENT" && !u.className && (userStatusFilter === "all" || (userStatusFilter === "active" ? !u.archived : u.archived)));
                        } else {
                          const cls = appClasses.find(c => c.id === expandedCardSection);
                          if (cls) users = appUsers.filter(u => u.className === cls.name && u.role === "STUDENT" && (userStatusFilter === "all" || (userStatusFilter === "active" ? !u.archived : u.archived)));
                        }
                        return [...users].sort((a, b) => {
                          const aName = String(a.name || "");
                          const bName = String(b.name || "");
                          if (cardSortOrder === "last") {
                            return aName.split(" ").pop().localeCompare(bName.split(" ").pop());
                          }
                          return aName.localeCompare(bName);
                        }).map(u => (
                          <CompactECard key={u.id} user={u} isDark={isDark} flatStyle={flatStyle} pressedStyle={pressedStyle} buttonStyle={buttonStyle} onPhotoUpload={handlePhotoUpload} onEdit={openEditUser} onEmail={() => handleEmailCard(u)} />
                        ));
                      })()}
                    </div>
                  </div>
                )}
             </div>
          )}

          {activeView === 'MANAGE' && (
            <div className="animate-in fade-in text-left">
               <div className="flex justify-between items-center mb-12 text-slate-800 dark:text-white text-left text-left">
                  <h1 className="text-6xl font-black tracking-tighter uppercase leading-none text-left">Class <span className="text-blue-500 text-left">Manager</span></h1>
                  <div className="flex gap-4 text-left">
                     <button onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', role: 'STUDENT', studentId: '', className: '' }); setIsStaffModalOpen(true); }} className={`px-8 py-5 ${buttonStyle} text-blue-600 font-black rounded-[2rem] flex items-center gap-3 uppercase text-[10px] tracking-widest shadow-lg active:scale-95 text-left`}>
                        <UserPlus size={16}/> Add User
                     </button>
                     <button onClick={() => { setEditingClass(null); setClassForm({ name: '', instructor: '', startTime: '09:00', endTime: '11:00', address: '', latitude: '', longitude: '', activeDays: [], timezone: 'America/New_York' }); setIsClassModalOpen(true); }} className={`px-8 py-5 bg-blue-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-[10px] tracking-widest active:scale-95 text-left`}>
                        + New Class
                     </button>
                  </div>
               </div>
               <div className="grid grid-cols-1 gap-8 text-left">
                  {appClasses.map(cls => {
                     const today = new Date().toISOString().split("T")[0];
                     const classStudents = appUsers.filter(u => u.className === cls.name && u.role === "STUDENT");
                     const todayLogs = attendanceRecords.filter(r => r.className === cls.name && r.timestamp && r.timestamp.startsWith(today));
                     const getStudentStatus = (studentId) => {
                       const logs = todayLogs.filter(l => l.userId === studentId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                       return logs.length > 0 ? logs[0].status : null;
                     };
                     return (
                     <div key={cls.id} className={`p-8 rounded-[2rem] ${flatStyle} ${surfaceColor} border border-white/5 relative overflow-hidden`}>
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex gap-6 items-center relative z-10">
                              <div className={`p-4 rounded-2xl ${pressedStyle} text-blue-500 bg-inherit`}><GraduationCap size={28}/></div>
                              <div className="text-slate-800 dark:text-white">
                                <h3 className="text-2xl font-black uppercase tracking-tight leading-none">{String(cls.name)}</h3>
                                <p className="text-[11px] font-bold text-slate-400 mt-2 tracking-widest uppercase">{String(cls.instructor)} • {cls.startTime} - {cls.endTime}</p>
                              </div>
                           </div>
                           <div className="flex gap-3 relative z-10">
                              <button onClick={() => setMarkingAttendance(cls)} className={`w-11 h-11 flex items-center justify-center rounded-xl ${buttonStyle} text-green-600 transition-all bg-inherit shadow-md`} title="Attendance"><ClipboardList size={20}/></button>
                              <button onClick={() => setManagingRoster(cls)} className={`w-11 h-11 flex items-center justify-center rounded-xl ${buttonStyle} text-blue-500 transition-all bg-inherit shadow-md`} title="Enrollment"><Users size={20}/></button>
                              <label className={`w-11 h-11 flex items-center justify-center rounded-xl ${buttonStyle} text-blue-600 cursor-pointer shadow-md transition-all bg-inherit`} title="Bulk Upload">
                                 <Upload size={20}/><input type="file" className="hidden" accept=".csv" onChange={(e) => handleCsvImport(e, cls.name)} />
                              </label>
                              <button onClick={() => openEditClass(cls)} className={`w-11 h-11 flex items-center justify-center rounded-xl ${buttonStyle} text-slate-500 transition-all bg-inherit shadow-md`} title="Edit"><Edit3 size={20}/></button>
                              <button onClick={() => setClassToDelete(cls)} className={`w-11 h-11 flex items-center justify-center rounded-xl ${buttonStyle} text-red-500 transition-all bg-inherit shadow-md`} title="Delete"><Trash2 size={20}/></button>
                           </div>
                        </div>
                        {classStudents.length > 0 && (
                          <div className={`p-5 rounded-2xl ${pressedStyle} bg-inherit`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Today&apos;s Attendance ({classStudents.length} students)</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                              {classStudents.map(student => {
                                const status = getStudentStatus(student.id);
                                const statusColor = status && status.includes("PRESENT") ? "bg-green-500" : status && status.includes("TARDY") ? "bg-amber-500" : status && status.includes("EXCUSED") ? "bg-blue-500" : "bg-red-500";
                                const statusText = status ? status.replace(" (AUTO)", "") : "ABSENT";
                                return (
                                  <div key={student.id} className={`p-3 rounded-xl ${flatStyle} flex items-center gap-2`}>
                                    <div className={`w-3 h-3 rounded-full ${statusColor} ${status && status.includes("PRESENT") ? "animate-pulse" : ""}`}></div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-black uppercase truncate text-slate-800 dark:text-white">{String(student.name)}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{statusText}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                     </div>
                     );
                  })}
                  </div>
            </div>
          )}

          {activeView === 'REPORTS' && (
             <div className="animate-in fade-in pb-20 text-left text-left text-left">
                <div className="flex justify-between items-center mb-12"><h1 className="text-6xl font-black tracking-tighter uppercase text-slate-800 dark:text-white leading-none">Audit <span className="text-blue-500">Reports</span></h1><button onClick={handleExportPDF} className={`px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] tracking-widest active:scale-95 flex items-center gap-3`}><Download size={18}/> Export PDF</button></div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-left text-left text-left text-left">
                   <div className={`p-10 rounded-[3rem] ${flatStyle} ${surfaceColor} border border-white/5 flex flex-col items-start bg-inherit text-left text-left text-left text-left`}>
                      <span className="text-[11px] font-black uppercase text-slate-400 mb-3 tracking-widest text-left text-left text-left">Total Handshakes</span>
                      <span className="text-4xl font-black text-blue-600 text-left text-left text-left">{reportStats.total}</span>
                   </div>
                   <div className={`p-10 rounded-[3rem] ${flatStyle} ${surfaceColor} border border-white/5 flex flex-col items-start bg-inherit text-left text-left text-left text-left`}>
                      <span className="text-[11px] font-black uppercase text-slate-400 mb-3 tracking-widest text-left text-left text-left">Compliance Rate</span>
                      <span className="text-4xl font-black text-green-500 text-left text-left text-left">{reportStats.rate}%</span>
                   </div>
                   <div className={`p-10 rounded-[3rem] ${flatStyle} ${surfaceColor} border border-white/5 flex flex-col items-start bg-inherit text-left text-left text-left text-left text-left`}>
                      <span className="text-[11px] font-black uppercase text-slate-400 mb-3 tracking-widest text-left text-left text-left text-left">Tardy Frequency</span>
                      <span className="text-4xl font-black text-amber-500 text-left text-left text-left">{reportStats.tardy}</span>
                   </div>
                   <div className={`p-10 rounded-[3rem] ${flatStyle} ${surfaceColor} border border-white/5 flex flex-col items-start bg-inherit text-left text-left text-left text-left text-left`}>
                      <span className="text-[11px] font-black uppercase text-slate-400 mb-3 tracking-widest text-left text-left text-left text-left">Active Range</span>
                      <span className="text-4xl font-black text-slate-500 uppercase text-left text-left text-left">{reportRange}</span>
                   </div>
                </div>
                {/* Time Range Selection */}
                <div className={`p-6 rounded-[2rem] ${flatStyle} ${surfaceColor} mb-8 border border-white/5`}>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Report Period</h3>
                    <div className="flex gap-2">
                      {["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"].map(r => (
                        <button key={r} onClick={() => setReportRange(r)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${reportRange === r ? "bg-blue-600 text-white shadow-lg" : buttonStyle + " text-slate-400"}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  {reportRange === "CUSTOM" && (
                    <div className="flex flex-wrap gap-6 items-center justify-center p-6 mt-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-black uppercase text-blue-500">Start Date:</label>
                        <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className={inputFieldStyle + " p-4 rounded-xl text-sm font-bold text-slate-800 dark:text-white"} />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-black uppercase text-blue-500">End Date:</label>
                        <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className={inputFieldStyle + " p-4 rounded-xl text-sm font-bold text-slate-800 dark:text-white"} />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Filters */}
                <div className={`p-6 rounded-[2rem] ${flatStyle} ${surfaceColor} mb-8 border border-white/5`}>
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Filters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select className={inputFieldStyle + " p-4 rounded-xl appearance-none bg-inherit text-slate-800 dark:text-white"} value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                       <option value="ALL">All Classes</option>
                       {appClasses.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                    </select>
                    <select className={inputFieldStyle + " p-4 rounded-xl appearance-none bg-inherit text-slate-800 dark:text-white"} value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value)}>
                       <option value="ALL">All Statuses</option>
                       <option value="PRESENT">Present</option>
                       <option value="TARDY">Tardy</option>
                       <option value="ABSENT">Absent</option>
                       <option value="EXCUSED">Excused</option>
                    </select>
                    <select className={inputFieldStyle + " p-4 rounded-xl appearance-none bg-inherit text-slate-800 dark:text-white"} value={reportUserFilter} onChange={e => setReportUserFilter(e.target.value)}>
                       <option value="ALL">All Users</option>
                       <optgroup label="Staff">
                         {appUsers.filter(u => u.role !== "STUDENT").map(u => <option key={u.id} value={u.id}>{String(u.name)}</option>)}
                       </optgroup>
                       <optgroup label="Students">
                         {appUsers.filter(u => u.role === "STUDENT").map(u => <option key={u.id} value={u.id}>{String(u.name)} - {u.className || "Unassigned"}</option>)}
                       </optgroup>
                    </select>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input className={inputFieldStyle + " w-full pl-11 p-4 rounded-xl bg-inherit"} placeholder="Search by name..." value={reportSearchQuery} onChange={e => setReportSearchQuery(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className={`rounded-[3rem] ${flatStyle} ${surfaceColor} overflow-hidden border border-white/5 bg-inherit`}>
                   <table className="w-full text-left border-collapse text-slate-800 dark:text-white">
                      <thead className="bg-black/5">
                        <tr className="border-b border-slate-500/10 text-slate-400 uppercase text-[10px] font-black tracking-[0.1em]">
                          <th className="p-4 text-left">Identity</th>
                          <th className="p-4 text-left">Class</th>
                          <th className="p-4 text-left">Date</th>
                          <th className="p-4 text-left">Clock In</th>
                          <th className="p-4 text-left">In Loc</th>
                          <th className="p-4 text-left">Clock Out</th>
                          <th className="p-4 text-left">Out Loc</th>
                          <th className="p-4 text-left">Time</th>
                          <th className="p-4 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                         {timeTrackingReports.map((r, i) => (
                            <tr key={i}>
                               <td className="p-4 font-black text-xs uppercase">{String(r.userName)}</td>
                               <td className="p-4 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{String(r.className)}</td>
                               <td className="p-4 font-bold text-slate-400 text-[10px] uppercase">{r.date}</td>
                               <td className="p-4 font-bold text-green-500 text-[10px]">{r.arrival ? new Date(r.arrival).toLocaleTimeString() : "-"}</td>
                               <td className="p-4">
                                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${r.arrivalLocation === "ONSITE" ? "bg-green-500/20 text-green-500" : r.arrivalLocation === "REMOTE" ? "bg-amber-500/20 text-amber-500" : "text-slate-400"}`}>{r.arrivalLocation || "-"}</span>
                               </td>
                               <td className="p-4 font-bold text-red-400 text-[10px]">{r.departure ? new Date(r.departure).toLocaleTimeString() : "-"}</td>
                               <td className="p-4">
                                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${r.departureLocation === "ONSITE" ? "bg-green-500/20 text-green-500" : r.departureLocation === "REMOTE" ? "bg-amber-500/20 text-amber-500" : "text-slate-400"}`}>{r.departureLocation || "-"}</span>
                               </td>
                               <td className="p-4 font-black text-blue-500 text-xs">{r.timeOnsite || "-"}</td>
                               <td className="p-4">
                                  <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                                     r.status && r.status.includes("PRESENT") ? "bg-green-500/10 text-green-500" :
                                     r.status && r.status.includes("TARDY") ? "bg-amber-500/10 text-amber-500" :
                                     "bg-slate-500/10 text-slate-400"
                                  }`}>{r.status ? String(r.status).replace(" (AUTO)", "").replace(" (MANUAL)", "").replace(" (AUTO-END)", "").replace(" (BULK)", "") : "ABSENT"}</span>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                   {timeTrackingReports.length === 0 && <div className="p-20 text-center opacity-30 uppercase font-black tracking-widest text-xs">No logs found</div>}
                </div>
                
                {/* Total Volunteer Hours Summary */}
                <div className={`mt-8 p-8 rounded-[2rem] ${flatStyle} ${surfaceColor} border border-white/5`}>
                  <h3 className="text-xl font-black uppercase text-slate-800 dark:text-white mb-6 tracking-tight">Total Volunteer Hours</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-slate-800 dark:text-white">
                      <thead className="bg-black/5">
                        <tr className="border-b border-slate-500/10 text-slate-400 uppercase text-[10px] font-black tracking-[0.1em]">
                          <th className="p-4 text-left">Name</th>
                          <th className="p-4 text-left">Role</th>
                          <th className="p-4 text-left">Class</th>
                          <th className="p-4 text-left">Days</th>
                          <th className="p-4 text-left">Total Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                        {(() => {
                          const userHours = {};
                          timeTrackingReports.forEach(r => {
                            if (!userHours[r.userId]) {
                              const user = appUsers.find(u => u.id === r.userId);
                              userHours[r.userId] = {
                                name: r.userName,
                                role: user?.role || "STUDENT",
                                className: r.className,
                                daysWorked: 0,
                                totalMinutes: 0
                              };
                            }
                            userHours[r.userId].daysWorked++;
                            if (r.arrival && r.departure) {
                              const diff = new Date(r.departure) - new Date(r.arrival);
                              userHours[r.userId].totalMinutes += diff / 60000;
                            }
                          });
                          const userList = Object.values(userHours).sort((a, b) => b.totalMinutes - a.totalMinutes);
                          if (userList.length === 0) {
                            return <tr><td colSpan="5" className="p-6 text-center text-slate-400 text-sm">No hours recorded in selected period</td></tr>;
                          }
                          return userList.map((s, i) => {
                            const hours = Math.floor(s.totalMinutes / 60);
                            const mins = Math.round(s.totalMinutes % 60);
                            return (
                              <tr key={i}>
                                <td className="p-4 font-black text-sm uppercase">{s.name}</td>
                                <td className="p-4"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase ${s.role === "ADMINISTRATOR" ? "bg-purple-500/20 text-purple-500" : s.role === "INSTRUCTOR" ? "bg-blue-500/20 text-blue-500" : "bg-green-500/20 text-green-500"}`}>{s.role}</span></td>
                                <td className="p-4 font-bold text-slate-400 text-[10px] uppercase">{s.className || "-"}</td>
                                <td className="p-4 font-black text-blue-500">{s.daysWorked}</td>
                                <td className="p-4 font-black text-green-500 text-lg">{hours}h {mins}m</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                      <tfoot className="bg-blue-500/10">
                        <tr>
                          <td colSpan="4" className="p-4 font-black uppercase text-right text-slate-600 dark:text-slate-300">Grand Total:</td>
                          <td className="p-4 font-black text-blue-600 text-xl">
                            {(() => {
                              let totalMinutes = 0;
                              timeTrackingReports.forEach(r => {
                                if (r.arrival && r.departure) {
                                  totalMinutes += (new Date(r.departure) - new Date(r.arrival)) / 60000;
                                }
                              });
                              const hours = Math.floor(totalMinutes / 60);
                              const mins = Math.round(totalMinutes % 60);
                              return `${hours}h ${mins}m`;
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
             </div>
          )}

          {/* MODALS */}
          {/* Delete/Archive Class Modal */}
          {classToDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
              <div className={`${isDark ? "bg-[#1a202c]" : "bg-[#e0e5ec]"} w-full max-w-md rounded-[2.5rem] ${flatStyle} p-8 border border-white/10 animate-in zoom-in-95`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Manage Class</h2>
                  <button onClick={() => setClassToDelete(null)} className="p-2 hover:bg-slate-500/10 rounded-full transition-all text-slate-400"><X size={20}/></button>
                </div>
                <div className="mb-6">
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">You are about to modify:</p>
                  <div className={`p-4 rounded-xl ${pressedStyle} flex items-center gap-3`}>
                    <div className="p-3 rounded-xl bg-blue-500/20 text-blue-500"><GraduationCap size={24}/></div>
                    <div>
                      <p className="font-black text-lg text-slate-800 dark:text-white uppercase">{classToDelete.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{classToDelete.instructor}</p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18}/>
                    <div>
                      <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">Warning</p>
                      <p className="text-amber-600/80 dark:text-amber-400/80 text-xs mt-1">Archiving will hide the class but preserve all attendance records. Deleting will permanently remove the class and cannot be undone.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={async () => { await setDoc(doc(db, "artifacts", appId, "public", "data", "classes", classToDelete.id), { ...classToDelete, archived: true }, { merge: true }); setClassToDelete(null); setMsg({ text: "Class archived successfully" }); setTimeout(() => setMsg(null), 3000); }} className={`flex-1 py-4 ${buttonStyle} text-amber-600 font-black rounded-2xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all`}><Archive size={18}/> Archive</button>
                  <button onClick={async () => { await deleteDoc(doc(db, "artifacts", appId, "public", "data", "classes", classToDelete.id)); setClassToDelete(null); setMsg({ text: "Class deleted permanently" }); setTimeout(() => setMsg(null), 3000); }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"><Trash2 size={18}/> Delete</button>
                </div>
                <button onClick={() => setClassToDelete(null)} className={`w-full mt-3 py-3 ${buttonStyle} text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all`}>Cancel</button>
              </div>
            </div>
          )}
          {isClassModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 text-left text-left text-left text-left text-left">
              <div className={`${isDark ? 'bg-[#1a202c]' : 'bg-[#e0e5ec]'} w-full max-w-2xl rounded-[3.5rem] ${flatStyle} p-10 border border-white/10 animate-in zoom-in-95 text-left text-left text-left text-left text-left`}>
                <div className="flex justify-between items-center mb-10 text-slate-800 dark:text-white text-left text-left text-left text-left text-left">
                  <h2 className="text-2xl font-black uppercase tracking-tight leading-none text-left text-left text-left text-left text-left">Class Matrix</h2>
                  <button onClick={() => setIsClassModalOpen(false)} className="p-2 hover:bg-slate-500/10 rounded-full transition-all text-slate-400"><X size={24}/></button>
                </div>
                <form onSubmit={handleSaveClass} className="space-y-6 text-left text-left text-left text-left text-left text-left">
                  <div className="space-y-2 text-left text-left text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest text-left block text-left text-left">Class Identity</label>
                    <input required className={inputFieldStyle + " w-full p-5 rounded-2xl text-slate-800 dark:text-white text-left text-left text-left"} placeholder="e.g. Physics 101" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-left text-left text-left text-left text-left">
                    <div className="space-y-2 text-left text-left text-left text-left text-left text-left">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 text-left block text-left text-left text-left">Assign Instructor</label>
                      <select required className={inputFieldStyle + " w-full p-5 rounded-2xl appearance-none bg-inherit text-slate-800 dark:text-white text-left text-left text-left"} value={classForm.instructor} onChange={e => setClassForm({...classForm, instructor: e.target.value})}>
                        <option value="">Select Instructor</option>
                        {instructorsList.map(inst => <option key={inst.id} value={inst.name}>{String(inst.name)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 text-left text-left text-left text-left text-left text-left">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 text-left block text-left text-left text-left">Active Window</label>
                      <div className="flex gap-2 text-left text-left text-left text-left text-left">
                        <input required type="time" className={inputFieldStyle + " flex-1 p-5 rounded-2xl text-slate-800 dark:text-white text-left text-left text-left"} value={classForm.startTime} onChange={e => setClassForm({...classForm, startTime: e.target.value})} />
                        <input required type="time" className={inputFieldStyle + " flex-1 p-5 rounded-2xl text-slate-800 dark:text-white text-left text-left text-left"} value={classForm.endTime} onChange={e => setClassForm({...classForm, endTime: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 block">Class Days</label>
                    <div className="flex gap-2 flex-wrap">
                      {daysOfWeek.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = classForm.activeDays || [];
                            if (days.includes(day)) {
                              setClassForm({...classForm, activeDays: days.filter(d => d !== day)});
                            } else {
                              setClassForm({...classForm, activeDays: [...days, day]});
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wide transition-all ${(classForm.activeDays || []).includes(day) ? "bg-blue-600 text-white shadow-lg" : buttonStyle + " text-slate-400"}`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 text-left block text-left text-left text-left text-left">Street Address</label>
                    <input required className={inputFieldStyle + " w-full p-5 rounded-2xl text-slate-800 dark:text-white text-left text-left text-left text-left text-left"} placeholder="Campus Site Address" value={classForm.address} onChange={e => setClassForm({...classForm, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <div className="space-y-1 text-left text-left text-left text-left text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4 text-left block text-left text-left text-left text-left">Latitude</label>
                      <input type="number" step="any" className={inputFieldStyle + " w-full p-4 rounded-xl text-xs text-slate-800 dark:text-white text-left text-left text-left text-left text-left"} value={classForm.latitude} onChange={e => setClassForm({...classForm, latitude: e.target.value})} />
                    </div>
                    <div className="space-y-1 text-left text-left text-left text-left text-left text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4 text-left block text-left text-left text-left text-left text-left">Longitude</label>
                      <input type="number" step="any" className={inputFieldStyle + " w-full p-4 rounded-xl text-xs text-slate-800 dark:text-white text-left text-left text-left text-left text-left text-left"} value={classForm.longitude} onChange={e => setClassForm({...classForm, longitude: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 block">Timezone</label>
                    <select className={inputFieldStyle + " w-full p-5 rounded-2xl appearance-none bg-inherit text-slate-800 dark:text-white"} value={classForm.timezone || "America/New_York"} onChange={e => setClassForm({...classForm, timezone: e.target.value})}>
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Chicago">Central (CT)</option>
                      <option value="America/Denver">Mountain (MT)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                      <option value="America/Anchorage">Alaska (AKT)</option>
                      <option value="Pacific/Honolulu">Hawaii (HT)</option>
                      <option value="America/Phoenix">Arizona (MST)</option>
                      <option value="America/Puerto_Rico">Atlantic (AST)</option>
                    </select>
                  </div>
                  <div className="flex justify-center pt-4 text-left text-left text-left text-left text-left">
                    <button type="submit" className="px-14 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all text-left text-left text-left text-left text-left">Save Matrix</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {markingAttendance && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 text-left text-left text-left text-left text-left text-left text-left">
              <div className={`${isDark ? 'bg-[#1a202c]' : 'bg-[#e0e5ec]'} w-full max-w-2xl rounded-[3.5rem] ${flatStyle} p-10 border border-white/10 flex flex-col max-h-[90vh] animate-in zoom-in-95 text-left text-left text-left text-left text-left text-left text-left`}>
                <div className="flex justify-between items-center mb-8 shrink-0 text-slate-800 dark:text-white text-left text-left text-left text-left text-left text-left text-left text-left">
                  <div className="text-left">
                    <h3 className="text-3xl font-black uppercase tracking-tight leading-none">Modify Attendance</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">{markingAttendance.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className={inputFieldStyle + " p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white"} />
                  </div>
                  <button onClick={() => setMarkingAttendance(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                {/* Attendance Summary */}
                {(() => {
                  const students = appUsers.filter(u => u.className === markingAttendance.name && u.role === "STUDENT");
                  const todayLogs = attendanceRecords.filter(r => r.className === markingAttendance.name && r.timestamp?.startsWith(attendanceDate));
                  const present = students.filter(s => todayLogs.some(l => l.userId === s.id && l.status?.includes("PRESENT"))).length;
                  const tardy = students.filter(s => todayLogs.some(l => l.userId === s.id && l.status?.includes("TARDY"))).length;
                  const excused = students.filter(s => todayLogs.some(l => l.userId === s.id && l.status?.includes("EXCUSED"))).length;
                  const absent = students.length - present - tardy - excused;
                  return (
                    <div className="grid grid-cols-4 gap-3 mb-6 shrink-0">
                      <div className="p-3 rounded-xl bg-green-500/20 text-center">
                        <p className="text-2xl font-black text-green-500">{present}</p>
                        <p className="text-[9px] font-bold uppercase text-green-600">Present</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/20 text-center">
                        <p className="text-2xl font-black text-amber-500">{tardy}</p>
                        <p className="text-[9px] font-bold uppercase text-amber-600">Tardy</p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/20 text-center">
                        <p className="text-2xl font-black text-red-500">{absent}</p>
                        <p className="text-[9px] font-bold uppercase text-red-600">Absent</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-500/20 text-center">
                        <p className="text-2xl font-black text-blue-500">{excused}</p>
                        <p className="text-[9px] font-bold uppercase text-blue-600">Excused</p>
                      </div>
                    </div>
                  );
                })()}
                {/* Bulk Check-Out Button */}
                {(() => {
                  const students = appUsers.filter(u => u.className === markingAttendance.name && u.role === "STUDENT");
                  const todayLogs = attendanceRecords.filter(r => r.className === markingAttendance.name && r.timestamp?.startsWith(attendanceDate));
                  const studentsToCheckOut = students.filter(s => {
                    const hasCheckedIn = todayLogs.some(l => l.userId === s.id && (l.status?.includes("PRESENT") || l.status?.includes("TARDY")));
                    const hasCheckedOut = todayLogs.some(l => l.userId === s.id && l.status?.includes("CHECKED OUT"));
                    return hasCheckedIn && !hasCheckedOut;
                  });
                  if (studentsToCheckOut.length === 0) return null;
                  return (
                    <button
                      onClick={async () => {
                        for (const student of studentsToCheckOut) {
                          await addDoc(collection(db, "artifacts", appId, "public", "data", "attendance"), {
                            userId: student.id, userName: String(student.name), className: String(markingAttendance.name),
                            timestamp: attendanceDate === new Date().toISOString().split("T")[0] ? new Date().toISOString() : attendanceDate + "T" + markingAttendance.endTime + ":00.000Z",
                            status: "CHECKED OUT (BULK)"
                          });
                        }
                        setMsg({ text: `✓ Checked out ${studentsToCheckOut.length} students` });
                        setTimeout(() => setMsg(null), 4000);
                      }}
                      className="w-full mb-4 py-4 bg-red-500 text-white rounded-xl font-black uppercase text-[11px] tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                    >
                      <LogOut size={18}/> Check Out All ({studentsToCheckOut.length} students)
                    </button>
                  );
                })()}
                  {appUsers.filter(u => u.className === markingAttendance.name && u.role === 'STUDENT').map(student => {
                    const selectedDate = attendanceDate;
                    const record = attendanceRecords.find(r => r.userId === student.id && r.timestamp && r.timestamp.startsWith(selectedDate));
                    
                    return (
                      <div key={student.id} className={`p-5 rounded-3xl ${pressedStyle} flex items-center justify-between transition-all bg-inherit text-left text-left text-left text-left text-left text-left`}>
                        <div className="flex items-center gap-4 text-left text-slate-800 dark:text-white text-left text-left text-left text-left text-left text-left text-left text-left">
                          <img src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`} className="w-12 h-12 rounded-full object-cover shadow-sm text-left text-left text-left text-left text-left text-left text-left text-left"/>
                          <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <p className="font-black text-base uppercase leading-none text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{String(student.name)}</p>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1.5 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left opacity-60">{record ? String(record.status) : 'Awaiting Detection'}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 text-left text-left text-left text-left text-left text-left text-left">
                          {[
                            { l: 'P', s: 'PRESENT (MANUAL)', activeBg: 'bg-green-500' },
                            { l: 'A', s: 'ABSENT (MANUAL)', activeBg: 'bg-red-500' },
                            { l: 'T', s: 'TARDY (MANUAL)', activeBg: 'bg-amber-500' },
                            { l: "E", s: "EXCUSED (MANUAL)", activeBg: "bg-blue-500" }
                          ].map(btn => {
                            const isActive = record?.status && record.status.includes(btn.s.split(" ")[0]);
                            return (
                              <button 
                                key={btn.l}
                                onClick={() => handleManualAttendance(student, markingAttendance, btn.s)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90 ${isActive ? `${btn.activeBg} text-white shadow-innerr` : `${buttonStyle} text-slate-400 bg-inheritt`}`}
                              >
                                {btn.l}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {managingRoster && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 text-left text-slate-800 dark:text-white text-left text-left text-left text-left text-left text-left text-left">
              <div className={`${isDark ? 'bg-[#1a202c]' : 'bg-[#e0e5ec]'} w-full max-w-4xl rounded-[3rem] shadow-2xl p-12 border max-h-[90vh] flex flex-col animate-in zoom-in-95 text-left text-left text-left text-left text-left text-left text-left text-left`}>
                <div className="flex justify-between items-center mb-8 shrink-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                  <h3 className="text-3xl font-black uppercase leading-none tracking-tight text-left text-left text-left text-left text-left text-left text-left text-left text-left">Manage {managingRoster.name}</h3>
                  <button onClick={() => setManagingRoster(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-800 dark:text-white text-left text-left text-left"><X size={28}/></button>
                </div>
                <div className="grid grid-cols-2 gap-10 flex-1 overflow-hidden text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                  <div className="flex flex-col overflow-hidden text-left text-left text-left text-left text-left text-left text-left">
                    <h4 className="text-[10px] font-black uppercase text-blue-500 mb-6 tracking-widest text-left text-left text-left text-left text-left">Active Enrollment</h4>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                      {appUsers.filter(u => u.className === managingRoster.name).map(u => (
                        <div key={u.id} className={`p-5 rounded-2xl ${pressedStyle} flex items-center justify-between bg-inherit text-left text-left text-left text-left text-left text-left text-left text-left text-left`}>
                          <span className="font-black text-sm uppercase text-slate-800 dark:text-white text-left text-left text-left text-left">{String(u.name)}</span>
                          <button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), { className: '' })} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all text-left text-left text-left text-left"><UserMinus size={22}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col overflow-hidden text-left text-left text-left text-left text-left text-left text-left text-left">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left text-left">Campus Directory</h4>
                    <div className="relative mb-6 text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-left text-left text-left text-left text-left text-left text-left text-left" size={16}/><input className={`w-full pl-16 pr-6 py-4 rounded-3xl ${pressedStyle} bg-transparent outline-none text-xs font-bold text-slate-800 dark:text-white text-left text-left text-left text-left text-left text-left`} placeholder="Find identity..." value={rosterSearchQuery} onChange={e => setRosterSearchQuery(e.target.value)} /></div>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                      {appUsers.filter(u => u.className !== managingRoster.name && u.role === 'STUDENT' && u.name.toLowerCase().includes(rosterSearchQuery.toLowerCase())).map(u => (
                        <div key={u.id} className={`p-5 rounded-2xl flex items-center justify-between hover:bg-blue-500/5 transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left`}>
                          <span className="font-bold text-sm text-slate-500 uppercase text-left text-left text-left text-left text-left">{String(u.name)}</span>
                          <button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), { className: managingRoster.name })} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all text-left text-left text-left text-left text-left text-left text-left text-left"><UserPlus size={22}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isStaffModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-6">
              <div className={`${isDark ? "bg-[#1a202c]" : "bg-white"} w-full max-w-lg rounded-[3rem] shadow-2xl p-10 border border-white/10 animate-in zoom-in-95`}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">User Profile</h2>
                  <button onClick={() => { setIsStaffModalOpen(false); setEditingUser(null); }} className="p-2 hover:bg-slate-500/10 rounded-full transition-all text-slate-400"><X size={24}/></button>
                </div>
                <form onSubmit={handleSaveUser} className="space-y-5">
                  <input required className={inputFieldStyle + " w-full p-5 rounded-2xl text-slate-800 dark:text-white"} placeholder="Full Legal Name" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                  <input className={inputFieldStyle + " w-full p-5 rounded-2xl text-slate-800 dark:text-white"} placeholder="Student ID (unique identifier)" value={userForm.studentId} onChange={e => setUserForm({...userForm, studentId: e.target.value})} />
                  <input className={inputFieldStyle + " w-full p-5 rounded-2xl text-slate-800 dark:text-white"} placeholder="Email Address" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                  <select className={inputFieldStyle + " w-full p-5 rounded-2xl appearance-none bg-inherit text-slate-800 dark:text-white"} value={userForm.className} onChange={e => setUserForm({...userForm, className: e.target.value})}>
                    <option value="">Enroll in Class</option>
                    {appClasses.map(c => <option key={c.id} value={c.name}>{String(c.name)}</option>)}
                  </select>
                  <select required className={inputFieldStyle + " w-full p-5 rounded-2xl appearance-none bg-inherit text-slate-800 dark:text-white"} value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                    <option value="STUDENT">Student Role</option>
                    <option value="STAFF">Staff Role</option>
                    <option value="INSTRUCTOR">Instructor Role</option>
                    <option value="ADMIN">Administrator Role</option>
                  </select>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setIsStaffModalOpen(false); setEditingUser(null); }} className={`flex-1 py-5 ${buttonStyle} text-slate-500 font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all`}>Cancel</button>
                    <button type="submit" className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Save</button>
                  </div>
                  {editingUser && (
                    <div className="pt-4 border-t border-slate-500/20 mt-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{editingUser.archived ? "User Status" : "Danger Zone"}</p>
                      <div className="flex gap-3">
                        {editingUser.archived ? (
                          <button type="button" onClick={async () => { await updateDoc(doc(db, "artifacts", appId, "public", "data", "users", editingUser.id), { archived: false }); setIsStaffModalOpen(false); setEditingUser(null); setMsg({ text: "User restored successfully" }); setTimeout(() => setMsg(null), 3000); }} className="flex-1 py-4 bg-green-500 text-white font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"><RefreshCw size={16}/> Restore User</button>
                        ) : (
                          <button type="button" onClick={async () => { await updateDoc(doc(db, "artifacts", appId, "public", "data", "users", editingUser.id), { archived: true }); setIsStaffModalOpen(false); setEditingUser(null); setMsg({ text: "User archived successfully" }); setTimeout(() => setMsg(null), 3000); }} className={`flex-1 py-4 ${buttonStyle} text-amber-600 font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2`}><Archive size={16}/> Archive</button>
                        )}
                        <button type="button" onClick={async () => { if (window.confirm("Permanently delete this user? This cannot be undone.")) { await deleteDoc(doc(db, "artifacts", appId, "public", "data", "users", editingUser.id)); setIsStaffModalOpen(false); setEditingUser(null); setMsg({ text: "User deleted permanently" }); setTimeout(() => setMsg(null), 3000); } }} className="flex-1 py-4 bg-red-500 text-white font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"><Trash2 size={16}/> Delete</button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- IDENTITY CARD COMPONENTS ---

function CompactECard({ user, isDark, flatStyle, pressedStyle, buttonStyle, onPhotoUpload, onEdit, onEmail }) {
  const photoInput = useRef(null);
  const [token, setToken] = useState("000000");

  useEffect(() => {
    const update = () => setToken(generateSecureToken(user.secretKey || user.id));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [user.secretKey, user.id]);

  return (
    <div className={`${isDark ? 'bg-[#1a202c]' : 'bg-[#e0e5ec]'} rounded-[2.5rem] ${flatStyle} p-6 border border-white/10 flex flex-col gap-4 bg-inherit text-left text-left text-left text-left text-left text-left text-left text-left`}>
       <div className="flex items-start justify-between text-left text-slate-800 dark:text-white text-left text-left text-left text-left text-left text-left text-left text-left">
          <div className="flex items-center gap-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
             <div className="relative group shrink-0 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                <div className={`w-16 h-16 rounded-2xl shadow-inner ${isDark ? 'bg-slate-800' : 'bg-white'} overflow-hidden text-left text-left text-left text-left text-left text-left text-left text-left text-left`}>
                   <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} className="w-full h-full object-cover text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"/>
                </div>
                <button type="button" onClick={() => photoInput.current.click()} className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-left text-left text-left"><Camera size={18}/></button>
                <input type="file" ref={photoInput} className="hidden" accept="image/*" onChange={(e) => onPhotoUpload(user.id, e.target.files[0])} />
             </div>
             <div className="text-left text-left text-left text-left text-left text-left text-left text-left">
                <h3 className="text-lg font-black uppercase leading-none tracking-tight text-left text-left text-left text-left text-left text-left text-left">{String(user.name)}</h3>
                <p className="text-sm text-blue-500 font-black mt-1 uppercase tracking-wide text-left text-left text-left text-left text-left text-left text-left text-left">{String(user.className || "Link pending")}</p>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1 text-left text-left text-left text-left text-left text-left text-left text-left">{String(user.role || 'STUDENT')}</p>
                {user.studentId && <p className="text-[10px] font-bold text-slate-500 mt-1">ID: {String(user.studentId)}</p>}
                {user.archived && <span className="inline-block mt-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 text-[9px] font-black uppercase">Archived</span>}
             </div>
          </div>
          <div className="flex gap-2 text-left text-left text-left text-left text-left text-left text-left">
             <button type="button" onClick={onEmail} className={`p-3 rounded-xl ${buttonStyle} text-blue-600 shadow-md bg-inherit hover:scale-105 active:scale-95 transition-all text-left text-left text-left text-left text-left text-left text-left`} title="Email"><Mail size={16}/></button>
             <button type="button" onClick={() => onEdit(user)} className={`p-3 rounded-xl ${buttonStyle} text-slate-500 shadow-md bg-inherit active:scale-95 transition-all text-left text-left text-left text-left text-left text-left text-left`} title="Edit Profile"><Settings2 size={16}/></button>
          </div>
       </div>
       <div className={`p-4 rounded-2xl ${pressedStyle} flex items-center justify-between bg-white/5 text-left text-left text-left text-left text-left text-left text-left text-left text-left`}>
          <div className="flex flex-col text-left text-left text-left text-left text-left text-left text-left text-left text-left">
             <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest text-left text-left text-left text-left text-left text-left text-left text-left">Handshake pin</span>
             <span className="text-sm font-black text-blue-600 tracking-[0.2em] text-left text-left text-left text-left text-left text-left text-left text-left">{String(token)}</span>
          </div>
          <div className="bg-white p-1.5 rounded-lg shadow-sm text-left text-left text-left text-left text-left text-left text-left text-left">
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${user.id}|${token}`} className="w-8 h-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left" />
          </div>
       </div>
    </div>
  );
}

function ECard({ user, isDark, flatStyle, pressedStyle, buttonStyle, onPhotoUpload }) {
  const [token, setToken] = useState("000000");
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const update = () => {
      setToken(generateSecureToken(user.secretKey || user.id));
      setCountdown(30 - (Math.floor(Date.now() / 1000) % 30));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [user.secretKey, user.id]);

  return (
    <div className={`${isDark ? 'bg-[#1a202c]' : 'bg-[#e0e5ec]'} rounded-[4rem] ${flatStyle} p-10 border border-white/10 text-center relative overflow-hidden bg-inherit shadow-2xl text-center text-center text-center text-center text-center text-center text-center`}>
          <div className="flex flex-col items-center gap-8 relative z-10">
          <label className="w-40 h-40 rounded-full overflow-hidden border-8 border-white/10 shadow-2xl cursor-pointer relative group">
             <img src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} className="w-full h-full object-cover"/>
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all">
               <span className="text-white text-[10px] font-black uppercase tracking-wider">Tap to Upload</span>
             </div>
             <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && onPhotoUpload(user.id, e.target.files[0])} />
          </label>
          <div className="space-y-2 text-slate-800 dark:text-white text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">
            <h2 className="text-4xl font-black uppercase tracking-tight leading-none text-center text-center text-center text-center text-center text-center text-center text-center text-center">{String(user.name)}</h2>
            <p className="text-sm text-blue-500 font-black tracking-widest uppercase text-center text-center text-center text-center text-center text-center text-center text-center text-center">{String(user.className || "Authorized Observer")}</p>
          </div>
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center text-center text-center text-center text-center text-center text-center text-center text-center">
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${user.id}|${token}`} className="w-64 h-64 text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center" />
          </div>
          <div className="w-full max-w-[200px] text-center text-center text-center text-center text-center text-center text-center text-center text-center">
             <div className="flex justify-between items-center mb-2 text-slate-400 text-center text-center text-center text-center text-center text-center text-center text-center text-center text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-center text-center text-center text-center text-center text-center text-center text-center">PIN Rotation</span>
                <span className="text-[10px] font-black text-blue-600 text-right text-right text-right text-right text-right text-right text-right text-right text-right text-right">{String(countdown)}s</span>
             </div>
             <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden text-center text-center text-center text-center text-center text-center text-center text-center text-center">
                <div className="h-full bg-blue-600 transition-all duration-1000 text-center text-center text-center text-center text-center text-center text-center text-center text-center" style={{ width: `${(countdown/30)*100}%` }}></div>
             </div>
             <p className="text-3xl font-black text-blue-600 mt-6 tracking-[0.4em] leading-none text-center text-center text-center text-center text-center text-center text-center text-center text-center">{String(token)}</p>
          </div>
       </div>
    </div>
  );
}