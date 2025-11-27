import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  Activity, 
  Calendar, 
  CheckCircle, 
  ChevronRight, 
  TrendingUp, 
  User, 
  Award, 
  BarChart2, 
  Dumbbell,
  Heart,
  Utensils,
  Moon,
  AlertCircle,
  Save,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// --- Firebase Configuration & Initialization ---
// NOTE: These values must be set in your local .env file (e.g., VITE_FIREBASE_API_KEY) 
// for the application to build and run externally.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID // Reusing one consistent ID field
};

// Use projectId as the unique identifier for Firestore path safety
const externalAppId = firebaseConfig.projectId || 'fitness-tracker-prod'; 

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    // Graceful failure if Firebase config is missing during local development
    console.error("Firebase initialization failed. Check your .env file.", error);
    // Use fallback functions to prevent crash
    app = { name: 'fallback' };
    auth = { currentUser: null };
    db = { name: 'fallback' };
}


// --- Program Data (Based on PDF) ---
const PROGRAM_STRUCTURE = {
  phase1: {
    name: "Foundation",
    weeks: [1, 2, 3, 4],
    description: "Building base strength, core stability, and habit formation.",
    schedule: {
      1: { type: 'strength', code: 'A', name: 'Workout A: Squat, Push, Core' }, // Mon
      2: { type: 'cardio', code: 'C1', name: 'Cardio & Mobility' }, // Tue
      3: { type: 'strength', code: 'B', name: 'Workout B: Hinge, Pull, Core' }, // Wed
      4: { type: 'cardio', code: 'C2', name: 'Rowing/Cardio & Posture' }, // Thu
      5: { type: 'strength', code: 'C', name: 'Workout C: Active Core & Rehab' }, // Fri
      6: { type: 'active_recovery', code: 'R1', name: 'Active Recovery' }, // Sat
      0: { type: 'rest', code: 'REST', name: 'Rest & Weekly Check-in' }, // Sun
    }
  },
  phase2: {
    name: "Performance",
    weeks: [5, 6, 7, 8],
    description: "Increasing intensity, heavier weights, and interval cardio.",
    schedule: {
      1: { type: 'strength', code: 'D', name: 'Lower Body Strength' },
      2: { type: 'cardio', code: 'C3', name: 'Interval Cardio (HIIT)' },
      3: { type: 'strength', code: 'E', name: 'Upper Body Strength' },
      4: { type: 'rest', code: 'REST', name: 'Rest / Light Mobility' },
      5: { type: 'strength', code: 'F', name: 'Full Body Power & Core' },
      6: { type: 'cardio', code: 'C4', name: 'Steady State Endurance' },
      0: { type: 'rest', code: 'REST', name: 'Rest & Weekly Check-in' },
    }
  },
  phase3: {
    name: "Refinement",
    weeks: [9, 10, 11, 12],
    description: "Peaking performance, testing maxes, and fine-tuning.",
    schedule: {
      1: { type: 'strength', code: 'G', name: 'Heavy Lower / Full Body' },
      2: { type: 'cardio', code: 'C5', name: 'Cardio Challenge' },
      3: { type: 'strength', code: 'H', name: 'Heavy Upper / Push-Pull' },
      4: { type: 'rest', code: 'REST', name: 'Rest / Mobility' },
      5: { type: 'strength', code: 'I', name: 'Functional Core & Stability' },
      6: { type: 'active_recovery', code: 'R2', name: 'Active Recovery' },
      0: { type: 'rest', code: 'REST', name: 'Final Assessment / Check-in' },
    }
  }
};

// --- External Links (exrx.net) ---
const EXERCISE_LINKS = {
  "Goblet Squats": "https://exrx.net/WeightExercises/Quadriceps/DBGobletSquat",
  "Bench Press": "https://exrx.net/WeightExercises/Pectoral/BBBenchPress",
  "Bent-Over Rows": "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow",
  "Plank Holds": "https://exrx.net/WeightExercises/RectusAbdominis/Plank",
  "Dead Bugs": "https://exrx.net/WeightExercises/RectusAbdominis/DeadBug",
  "Chin Tucks": "https://exrx.net/WeightExercises/Sternocleidomastoid/ChinTuck",
  "Romanian Deadlifts": "https://exrx.net/WeightExercises/OlympicLifts/RomanianDeadlift",
  "Lat Pulldowns/TRX": "https://exrx.net/WeightExercises/LatissimusDorsi/CGLatPulldown",
  "Lunges/Step-Ups": "https://exrx.net/WeightExercises/Quadriceps/DBSplitSquat",
  "Side Planks": "https://exrx.net/WeightExercises/Obliques/SidePlank",
  "Bird-Dogs": "https://exrx.net/WeightExercises/ErectorSpinae/BirdDog",
  "McGill Curl-Up": "https://exrx.net/WeightExercises/RectusAbdominis/ModifiedCurlUp",
  "Glute Bridges": "https://exrx.net/WeightExercises/GluteusMaximus/BWSingleLegHipExtension",
  "Band Pull-Aparts": "https://exrx.net/WeightExercises/RearDelt/BandPullApart",
  "Back Extensions": "https://exrx.net/WeightExercises/ErectorSpinae/BW45BackExtension",
  "Barbell/Goblet Squat": "https://exrx.net/WeightExercises/Quadriceps/BBBackSquat",
  "Walking Lunges": "https://exrx.net/WeightExercises/Quadriceps/DBWalkingLunge",
  "Hip Thrusts": "https://exrx.net/WeightExercises/GluteusMaximus/BBHipThrust",
  "Farmers Carries": "https://exrx.net/WeightExercises/Grip/DBFarmersWalk",
  "Pull-Ups/Hvy Pulldown": "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup",
  "Overhead Press": "https://exrx.net/WeightExercises/DeltoidAnterior/BBOverheadPress",
  "DB Rows": "https://exrx.net/WeightExercises/BackGeneral/DBOneArmRow",
  "Hanging Knee Raise": "https://exrx.net/WeightExercises/RectusAbdominis/HangingKneeRaise",
  "Kettlebell Swings": "https://exrx.net/WeightExercises/HipExtensor/KBSwing",
  "Push-Ups": "https://exrx.net/WeightExercises/Pectoral/BWPushup",
  "TRX Rows": "https://exrx.net/WeightExercises/BackGeneral/SuspendedRow",
  "Bodyweight Squats": "https://exrx.net/WeightExercises/Quadriceps/BWSquat",
  "Squat Variation": "https://exrx.net/WeightExercises/Quadriceps/BBBackSquat",
  "Deadlift Variation": "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift",
  "Bulgarian Split Squat": "https://exrx.net/WeightExercises/Quadriceps/DBBulgarianSplitSquat",
  "Weighted Plank": "https://exrx.net/WeightExercises/RectusAbdominis/WeightedPlank",
  "Incline DB Press": "https://exrx.net/WeightExercises/Pectoral/DBInclinePress",
  "Face Pulls": "https://exrx.net/WeightExercises/RearDelt/CFHighRow",
  "Turkish Get-Ups": "https://exrx.net/WeightExercises/MultipleJoint/KBTurkishGetUp",
  "Single-Arm Carry": "https://exrx.net/WeightExercises/Grip/DBSuitcaseCarry",
  "Ab Wheel/Fallouts": "https://exrx.net/WeightExercises/RectusAbdominis/AbRollout",
  "Foam Roll Thoracic": "https://exrx.net/Rehab/FoamRoll/ThoracicSpine",
  "Wall Angels": "https://exrx.net/WeightExercises/Scapular/BWWallSlide",
  "Scapular Retractions": "https://exrx.net/WeightExercises/Scapular/BWProneHorizontalAbduction"
};

const WORKOUT_DETAILS = {
  // Phase 1 - Foundation
  'A': [
    { name: "Goblet Squats", sets: 3, reps: "10-12", note: "Focus on depth and form (~35 lbs)" },
    { name: "Bench Press", sets: 3, reps: "8-10", note: "Emphasize control (comfortable weight)" },
    { name: "Bent-Over Rows", sets: 3, reps: "10", note: "Squeeze shoulder blades (~60-70 lbs)" },
    { name: "Plank Holds", sets: 3, reps: "30-45s", note: "Core tight" },
    { name: "Dead Bugs", sets: 3, reps: "10/side", note: "Slow & controlled reps for core stability" },
    { name: "Chin Tucks", sets: 2, reps: "10-15", note: "Tuck chin straight back (5s hold) for posture" }
  ],
  'B': [
    { name: "Romanian Deadlifts", sets: 3, reps: "10", note: "Light weight/empty bar, feel hamstring stretch" },
    { name: "Lat Pulldowns/TRX", sets: 3, reps: "12", note: "To engage upper back" },
    { name: "Lunges/Step-Ups", sets: 3, reps: "8/leg", note: "Bodyweight/light weight for balance" },
    { name: "Side Planks", sets: 3, reps: "20-30s/side", note: "Focus on form and bracing" },
    { name: "Bird-Dogs", sets: 3, reps: "5/side", note: "5-sec hold each side, focusing on form" }
  ],
  'C': [
    { name: "McGill Curl-Up", sets: 2, reps: "Endurance", note: "Part of the Big Three Circuit (10s holds)" },
    { name: "Side Plank", sets: 2, reps: "Endurance", note: "Part of the Big Three Circuit (10s holds/side)" },
    { name: "Bird-Dog", sets: 2, reps: "Endurance", note: "Part of the Big Three Circuit (10s holds/side)" },
    { name: "Glute Bridges", sets: 3, reps: "12", note: "Squeeze glutes at top" },
    { name: "Band Pull-Aparts", sets: 3, reps: "15", note: "For posture (rhomboids/rear delts)" },
    { name: "Back Extensions", sets: 3, reps: "12", note: "Bodyweight only, keep pain levels in check" }
  ],
  // Phase 1 - Cardio & Posture Focused Days
  'C1': [
    { name: "Brisk Walk/Jog", sets: 1, reps: "20-30 min", note: "Zone 2 effort (Can speak full sentences)"}, 
    { name: "Foam Roll Thoracic", sets: 1, reps: "5 min", note: "Upper back mobility"},
    { name: "Chin Tucks", sets: 2, reps: "10-15", note: "Daily posture practice"}
  ],
  'C2': [
    { name: "Rowing/Treadmill", sets: 1, reps: "20 min", note: "Moderate pace, focus on form"}, 
    { name: "Wall Angels", sets: 2, reps: "10", note: "Posture correction for rounded shoulders"},
    { name: "Scapular Retractions", sets: 2, reps: "12", note: "Activate mid-back muscles"}
  ],
  'R1': [
    { name: "Light Walk", sets: 1, reps: "30 min", note: "Active recovery (casual outdoor walk/cycle)"}, 
    { name: "Stretching", sets: 1, reps: "15 min", note: "Full body stretch (hips, chest, back)"}
  ],
  
  // Phase 2 - Performance
  'D': [
    { name: "Barbell/Goblet Squat", sets: 3, reps: "6-8", note: "Heavier load, start light on Barbell Back Squats" },
    { name: "Walking Lunges", sets: 3, reps: "10/leg", note: "Weighted (dumbbells in hand)" },
    { name: "Hip Thrusts", sets: 3, reps: "10", note: "Barbell or heavy DB, squeeze glutes" },
    { name: "Farmers Carries", sets: 3, reps: "30s", note: "Heavy hold, challenge lateral core stability" }
  ],
  'E': [
    { name: "Bench Press", sets: 3, reps: "5-6", note: "Strength focus, RPE ~8-9 on last set" },
    { name: "Pull-Ups/Hvy Pulldown", sets: 3, reps: "Max/8-10", note: "Heavy vertical pull, strengthen lats" },
    { name: "Overhead Press", sets: 3, reps: "8", note: "Barbell or DB, build shoulder strength" },
    { name: "DB Rows", sets: 3, reps: "8/arm", note: "Heavier weight than Phase 1" },
    { name: "Hanging Knee Raise", sets: 3, reps: "10", note: "More dynamic core work" }
  ],
  'F': [ // Full-Body Circuit - Perform exercises sequentially, 3 rounds total
    { name: "Kettlebell Swings", sets: 3, reps: "15", note: "Circuit: Power/Hinge explosiveness" },
    { name: "Push-Ups", sets: 3, reps: "12", note: "Circuit: Perfect form" },
    { name: "TRX Rows", sets: 3, reps: "10", note: "Circuit: Control" },
    { name: "Bodyweight Squats", sets: 3, reps: "15", note: "Circuit: Speed/conditioning" },
    { name: "Plank w/ Reach", sets: 3, reps: "10/side", note: "Circuit: Anti-rotation finisher" }
  ],
  // Phase 2 - Cardio Focused Days
  'C3': [{ name: "HIIT Intervals", sets: 1, reps: "5-6 Rounds", note: "1 min hard (RPE 8) / 2 min recovery (walk/easy)"}],
  'C4': [{ name: "Long Jog/Row", sets: 1, reps: "40 min", note: "Steady state endurance, RPE 6-7"}],

  // Phase 3 - Refinement
  'G': [
    { name: "Squat Variation", sets: 3, reps: "5-8", note: "Near max effort (safe), refine technique" },
    { name: "Deadlift Variation", sets: 3, reps: "8-10", note: "Perfect form, controlled negative reps" },
    { name: "Bulgarian Split Squat", sets: 3, reps: "8/leg", note: "Focus on balance and unilateral strength" },
    { name: "Weighted Plank", sets: 3, reps: "45s", note: "Add small plate if core can handle it" }
  ],
  'H': [
    { name: "Bench Press", sets: 3, reps: "3-5", note: "Peak strength test (safely)" },
    { name: "Weighted Pull/Row", sets: 3, reps: "6-8", note: "Heavy back work (max sustainable load)" },
    { name: "Incline DB Press", sets: 3, reps: "8-10", note: "Address upper chest/shoulder balance" },
    { name: "Face Pulls", sets: 3, reps: "15", note: "Rear delt/posture health" }
  ],
  'I': [
    { name: "Turkish Get-Ups", sets: 3, reps: "3/side", note: "Functional stability and control" },
    { name: "Single-Arm Carry", sets: 3, reps: "30s/side", note: "Test anti-lateral flexion strength" },
    { name: "Ab Wheel/Fallouts", sets: 3, reps: "8-10", note: "Advanced anti-extension core work" },
    { name: "McGill Big 3", sets: 1, reps: "Circuit", note: "Quick maintenance/mobility routine" }
  ],
  // Phase 3 - Cardio & Active Recovery
  'C5': [{ name: "Cardio Challenge", sets: 1, reps: "Test", note: "Timed 1.5 Mile Run or 12 Min Cooper Test (Peak)"}],
  'R2': [
    { name: "Yoga/Flow", sets: 1, reps: "30 min", note: "Mobility focus to maintain range of motion"},
    { name: "Inversion Table", sets: 1, reps: "2 min", note: "Spine decompression"}
  ],
  // Universal Rest/Check-in Day
  'REST': [
    { name: "Check-in", sets: 1, reps: "1", note: "Complete weekly review form"}, 
    { name: "Meal Prep", sets: 1, reps: "1", note: "Plan nutrition for next week"}
  ]
};

// --- Components ---

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
    <Activity className="w-10 h-10 animate-spin text-blue-500" />
    <span className="ml-3 text-lg font-medium">Loading Program...</span>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled=false }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center";
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    outline: "border border-slate-60    0 text-slate-300 hover:bg-slate-800",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, title, icon: Icon, className = '' }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
        {Icon && <Icon className="w-5 h-5 text-blue-400" />}
        <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const ProgressBar = ({ current, total, label }) => {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function FitnessApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState({});
  const [checkins, setCheckins] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard, history, checkin

  // Auth & Init
  useEffect(() => {
    // Only proceed if Firebase is initialized (i.e., not using fallback due to missing config)
    if (app.name === 'fallback') {
        console.error("Skipping authentication due to missing Firebase configuration. Please set up your .env file.");
        setLoading(false);
        setUserData({ needsSetup: true }); // Allows user to see setup screen, though it won't save
        return;
    }

    const initAuth = async () => {
      try {
        // Since we are external, we will only use Anonymous sign-in for simplicity
        // for now. This keeps user data separate on the cloud.
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    
    // Auth Listener
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    
    // Fetch Profile
    const unsubProfile = onSnapshot(doc(db, 'artifacts', externalAppId, 'users', user.uid, 'profile', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData({ needsSetup: true }); // Trigger onboarding
      }
      setLoading(false);
    }, (err) => {
      console.error("Profile sync error", err);
      setLoading(false);
    });

    // Fetch Daily Logs (last 30 days)
    const qLogs = query(collection(db, 'artifacts', externalAppId, 'users', user.uid, 'logs'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const newLogs = {};
      snapshot.forEach(doc => {
        newLogs[doc.id] = doc.data();
      });
      setLogs(newLogs);
    }, (err) => console.error("Logs sync error", err));

    // Fetch Checkins
    const qCheckins = query(collection(db, 'artifacts', externalAppId, 'users', user.uid, 'checkins'));
    const unsubCheckins = onSnapshot(qCheckins, (snapshot) => {
      const newCheckins = [];
      snapshot.forEach(doc => newCheckins.push({id: doc.id, ...doc.data()}));
      setCheckins(newCheckins.sort((a,b) => parseInt(a.id) - parseInt(b.id)));
    }, (err) => console.error("Checkins sync error", err));

    return () => {
      unsubProfile();
      unsubLogs();
      unsubCheckins();
    };
  }, [user]);

  // --- Logic Helpers ---

  const calculateProgramDay = () => {
    // Safety check for userData
    if (!userData || !userData.startDate) return { week: 1, day: 1, phase: 'phase1' };
    
    const start = new Date(userData.startDate);
    const now = new Date();
    // Reset hours to compare dates only
    start.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // If not started yet or first day
    const dayIndex = diffDays === 0 ? 0 : diffDays; // 0-indexed days since start
    
    const weekNum = Math.floor(dayIndex / 7) + 1;
    // Map real day of week (0=Sun, 1=Mon) to program day (1=Mon... 0=Sun)
    let programDayCode = (new Date().getDay()); // 0 is Sunday, 1 Monday...
    
    let phase = 'phase1';
    if (weekNum > 4 && weekNum <= 8) phase = 'phase2';
    if (weekNum > 8) phase = 'phase3';
    
    // Bounds check phase
    if (!PROGRAM_STRUCTURE[phase]) phase = 'phase3'; // Fallback if over 12 weeks

    return { week: weekNum, dayCode: programDayCode, phase, dayIndex };
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    // If Firebase is in fallback mode, don't attempt save.
    if (app.name === 'fallback') {
        alert("Cannot save profile. Firebase configuration is missing.");
        return;
    }

    const formData = new FormData(e.target);
    const start = formData.get('startDate');
    await setDoc(doc(db, 'artifacts', externalAppId, 'users', user.uid, 'profile', 'main'), {
      startDate: start,
      name: formData.get('name'),
      startWeight: formData.get('weight'), // Saved as string
      goals: formData.get('goals'),
      createdAt: new Date().toISOString()
    });
  };

  const updateLog = async (dateKey, field, value) => {
    if (app.name === 'fallback') return console.error("Firebase not configured.");
    const logRef = doc(db, 'artifacts', externalAppId, 'users', user.uid, 'logs', dateKey);
    const existing = logs[dateKey] || {};
    await setDoc(logRef, {
      ...existing,
      [field]: value,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };
  
  // Helper to parse the number of sets from the exercise detail object
  const getNumberOfSets = (exercise) => {
    if (typeof exercise.sets === 'number') return exercise.sets;
    
    const setsString = String(exercise.sets);
    const match = setsString.match(/^\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  // Handler for individual set completion
  const handleSetToggle = async (exerciseIndex, setIndex, isComplete) => {
    if (app.name === 'fallback') return console.error("Firebase not configured.");

    const dateKey = new Date().toISOString().split('T')[0];
    const logRef = doc(db, 'artifacts', externalAppId, 'users', user.uid, 'logs', dateKey);
    const todayLog = logs[dateKey] || {};
    
    // Need access to workoutList here to get numSets
    const { dayCode, phase } = calculateProgramDay();
    const phaseData = PROGRAM_STRUCTURE[phase];
    const todaySchedule = phaseData?.schedule?.[dayCode] || { type: 'rest', code: 'REST', name: 'Rest / Active Recovery' };
    const workoutList = todaySchedule ? (WORKOUT_DETAILS[todaySchedule.code] || []) : [];


    // 1. Update set tracking state
    const currentSetStates = todayLog.setsCompleted || {};
    // Ensure the array size matches the required number of sets for this exercise
    const numSets = getNumberOfSets(workoutList[exerciseIndex]);
    const exerciseSetStates = currentSetStates[exerciseIndex] || Array(numSets).fill(false);
    
    const newExerciseSetStates = [...exerciseSetStates];
    newExerciseSetStates[setIndex] = !isComplete; // Toggle the state

    const newSetStates = {
      ...currentSetStates,
      [exerciseIndex]: newExerciseSetStates
    };

    // 2. Check if all sets for this exercise are now complete
    const allSetsComplete = newExerciseSetStates.every(state => state === true);
    
    // 3. Update overall exercise completion status
    const currentCompletedExercises = todayLog.completedExercises || [];
    let newCompletedExercises = [...currentCompletedExercises];

    if (allSetsComplete && !currentCompletedExercises.includes(exerciseIndex)) {
      newCompletedExercises.push(exerciseIndex);
    } else if (!allSetsComplete && currentCompletedExercises.includes(exerciseIndex)) {
      newCompletedExercises = newCompletedExercises.filter(i => i !== exerciseIndex);
    }
    
    // 4. Save to Firestore
    await setDoc(logRef, {
      ...todayLog,
      setsCompleted: newSetStates,
      completedExercises: newCompletedExercises,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };
  
  const saveCheckin = async (e) => {
    e.preventDefault();
    if (app.name === 'fallback') return alert("Cannot save check-in. Firebase configuration is missing.");

    const formData = new FormData(e.target);
    const { week } = calculateProgramDay();
    
    await setDoc(doc(db, 'artifacts', externalAppId, 'users', user.uid, 'checkins', week.toString()), {
      weight: formData.get('weight'),
      waist: formData.get('waist'),
      painLevel: formData.get('painLevel'),
      notes: formData.get('notes'),
      date: new Date().toISOString(),
      week: week
    });
    alert('Weekly check-in saved!');
    setView('dashboard');
  };

  // --- Renderers ---

  if (loading) return <LoadingScreen />;

  // CRITICAL FIX: Ensure user exists and profile data is loaded before rendering main app
  if (!user && app.name !== 'fallback') return <LoadingScreen />; 
  
  if (userData?.needsSetup) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <Card title="Welcome to the Reset Program" className="max-w-md w-full">
          <p className="text-slate-400 mb-6">Let's set your baseline. This 12-week program is designed to rebuild your foundation, performance, and health.</p>
          {app.name === 'fallback' && (
              <div className="bg-red-900/30 text-red-300 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5"/> Data saving disabled. Please set up your Firebase configuration in the `.env` file.
              </div>
          )}
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Name</label>
              <input name="name" required className="w-full bg-slate-950 border border-slate-700 rounded p-2" placeholder="e.g. John" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" name="startDate" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-950 border border-slate-700 rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Weight (lbs)</label>
              <input type="number" name="weight" required className="w-full bg-slate-950 border border-slate-700 rounded p-2" placeholder="180" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Main Goal</label>
              <input name="goals" defaultValue="Lose weight, reduce back pain" className="w-full bg-slate-950 border border-slate-700 rounded p-2" />
            </div>
            <Button className="w-full mt-4" disabled={app.name === 'fallback'}>Start Program</Button>
          </form>
        </Card>
      </div>
    );
  }

  // Double check userData exists before proceeding to dashboard
  if (!userData) return <LoadingScreen />;

  const { week, dayCode, phase } = calculateProgramDay();
  
  // Safe access to schedule
  const phaseData = PROGRAM_STRUCTURE[phase];
  const todaySchedule = phaseData?.schedule?.[dayCode] || { type: 'rest', code: 'REST', name: 'Rest / Active Recovery' };
  const workoutList = todaySchedule ? (WORKOUT_DETAILS[todaySchedule.code] || []) : [];
  
  const dateKey = new Date().toISOString().split('T')[0];
  const todayLog = logs[dateKey] || {};

  // Analytics Data Prep
  const weightData = checkins.map(c => ({ week: `W${c.week}`, weight: c.weight }));
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-blue-500" />
              Reset Program
            </h1>
            <p className="text-xs text-slate-400">Week {week} • {phaseData?.name || 'Program'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('dashboard')} className={`p-2 rounded ${view === 'dashboard' ? 'bg-slate-800 text-blue-400' : 'text-slate-400'}`}>
              <Calendar className="w-5 h-5" />
            </button>
            <button onClick={() => setView('progress')} className={`p-2 rounded ${view === 'progress' ? 'bg-slate-800 text-blue-400' : 'text-slate-400'}`}>
              <TrendingUp className="w-5 h-5" />
            </button>
            <button onClick={() => setView('checkin')} className={`p-2 rounded ${view === 'checkin' ? 'bg-slate-800 text-blue-400' : 'text-slate-400'}`}>
              <CheckCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <>
            {/* Status Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Current Weight</div>
                <div className="text-xl font-bold text-white">{userData.startWeight || '--'} <span className="text-sm font-normal text-slate-500">lbs</span></div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Week Goal</div>
                <div className="text-xl font-bold text-blue-400">90%</div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Calories</div>
                <div className="text-xl font-bold text-green-400">{todayLog.calories || 0} <span className="text-sm font-normal text-slate-500">/ 1800</span></div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Protein</div>
                <div className="text-xl font-bold text-purple-400">{todayLog.protein || 0} <span className="text-sm font-normal text-slate-500">/ 160g</span></div>
              </div>
            </div>

            {/* Today's Workout */}
            <Card title="Today's Plan" icon={Dumbbell} className="border-blue-500/30 ring-1 ring-blue-500/10">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">{todaySchedule.name}</h2>
                <p className="text-slate-400 text-sm">{phaseData?.description}</p>
              </div>

              <div className="space-y-3">
                {workoutList.map((exercise, idx) => {
                  const isDone = todayLog.completedExercises?.includes(idx);
                  const exerciseLink = EXERCISE_LINKS[exercise.name];
                  const numSets = getNumberOfSets(exercise);
                  const setsCompleted = todayLog.setsCompleted?.[idx] || Array(numSets).fill(false);
                  
                  const ExerciseNameComponent = exerciseLink ? (
                    <a 
                      href={exerciseLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={`font-medium text-blue-400 hover:text-blue-300 underline underline-offset-2 ${isDone ? 'line-through' : ''}`}
                      onClick={(e) => e.stopPropagation()} // Prevent click propagation if it causes unwanted behavior
                    >
                      {exercise.name} <ArrowRight className='w-3 h-3 inline ml-1' />
                    </a>
                  ) : (
                    <h4 className={`font-medium ${isDone ? 'text-blue-200 line-through' : 'text-slate-200'}`}>
                      {exercise.name}
                    </h4>
                  );

                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${isDone ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-950 border-slate-800'} transition-all`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {ExerciseNameComponent}
                            {isDone && <CheckCircle className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="text-sm text-slate-400 mt-1 flex gap-3">
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{numSets} Sets</span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{exercise.reps}</span>
                          </div>
                          {exercise.note && <div className="text-xs text-slate-500 mt-1 italic">Tip: {exercise.note}</div>}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                           {/* Individual Set Checkboxes */}
                           <div className="flex gap-1.5 mt-1">
                            {Array.from({ length: numSets }).map((_, setIndex) => {
                              const isSetComplete = setsCompleted[setIndex];
                              return (
                                <span
                                  key={setIndex}
                                  onClick={() => handleSetToggle(idx, setIndex, isSetComplete)}
                                  className={`w-4 h-4 rounded-full border cursor-pointer transition-colors flex items-center justify-center text-[8px] font-bold ${
                                    isSetComplete
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-600 hover:bg-slate-700 text-slate-500'
                                  }`}
                                  title={`Set ${setIndex + 1}`}
                                >
                                  {isSetComplete ? '✓' : setIndex + 1}
                                </span>
                              );
                            })}
                          </div>

                          {/* Weight Logger */}
                          {todaySchedule.type === 'strength' && (
                             <input 
                               placeholder="Lbs"
                               type="number"
                               className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-right text-slate-300 focus:border-blue-500 outline-none"
                               defaultValue={todayLog.weights?.[idx] || ''}
                               onBlur={(e) => {
                                 const currentWeights = todayLog.weights || {};
                                 updateLog(dateKey, 'weights', {...currentWeights, [idx]: e.target.value});
                               }}
                             />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Daily Nutrition & Wellness */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Nutrition Log" icon={Utensils}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Daily Calories</label>
                    <div className="flex gap-2 mt-1">
                      <input 
                        type="number" 
                        className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white"
                        placeholder="e.g. 1800"
                        value={todayLog.calories || ''}
                        onChange={(e) => updateLog(dateKey, 'calories', e.target.value)}
                      />
                      <div className="flex items-center text-xs text-slate-500">Target: 1800</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Protein (g)</label>
                    <div className="flex gap-2 mt-1">
                      <input 
                        type="number" 
                        className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white"
                        placeholder="e.g. 150"
                        value={todayLog.protein || ''}
                        onChange={(e) => updateLog(dateKey, 'protein', e.target.value)}
                      />
                      <div className="flex items-center text-xs text-slate-500">Target: 160g</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-sm text-slate-400">Compliance</span>
                    <span className={`text-sm font-bold ${todayLog.calories <= 1900 && todayLog.calories >= 1700 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {todayLog.calories ? (todayLog.calories <= 1900 && todayLog.calories >= 1700 ? 'On Target' : 'Off Target') : 'No Data'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Wellness" icon={Moon}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Back Pain Level (1-10)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      className="w-full mt-2 accent-blue-500"
                      value={todayLog.painLevel || 0}
                      onChange={(e) => updateLog(dateKey, 'painLevel', e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>No Pain</span>
                      <span className="text-blue-400 font-bold">{todayLog.painLevel || 0}</span>
                      <span>Severe</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Sleep Hours</label>
                    <div className="flex gap-2 mt-1">
                      {[5,6,7,8,9].map(h => (
                        <button
                          key={h}
                          onClick={() => updateLog(dateKey, 'sleep', h)}
                          className={`flex-1 py-1 rounded border text-sm ${todayLog.sleep == h ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                        >
                          {h}+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* CHECK-IN VIEW */}
        {view === 'checkin' && (
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Weekly Check-in: Week {week}</h2>
            <form onSubmit={saveCheckin} className="space-y-6">
              <Card title="Measurements">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Current Weight (lbs)</label>
                    <input name="weight" type="number" step="0.1" required className="w-full bg-slate-950 border border-slate-700 rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Waist (inches)</label>
                    <input name="waist" type="number" step="0.1" className="w-full bg-slate-950 border border-slate-700 rounded p-2" />
                  </div>
                </div>
              </Card>

              <Card title="Reflection">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Avg Pain Level This Week</label>
                    <select name="painLevel" className="w-full bg-slate-950 border border-slate-700 rounded p-2">
                      <option value="1">1 - Minimal/None</option>
                      <option value="3">3 - Mild Stiffnes</option>
                      <option value="5">5 - Moderate</option>
                      <option value="7">7 - High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Wins / Challenges / Notes</label>
                    <textarea name="notes" rows="4" className="w-full bg-slate-950 border border-slate-700 rounded p-2" placeholder="I felt stronger on squats this week..."></textarea>
                  </div>
                </div>
              </Card>
              
              <Button className="w-full py-3" disabled={app.name === 'fallback'}>
                <Save className="w-4 h-4 mr-2" /> Save Weekly Check-in
              </Button>
            </form>
          </div>
        )}

        {/* PROGRESS VIEW */}
        {view === 'progress' && (
          <div className="space-y-6">
            <Card title="Weight Trend">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" stroke="#94a3b8" />
                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                    <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Weekly Check-in History">
              <div className="space-y-3">
                {checkins.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No check-ins yet.</p>
                ) : (
                  checkins.map((c, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-blue-400 font-bold">Week {c.week}</span>
                        <div className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{c.weight} lbs</div>
                        <div className="text-xs text-slate-500">Pain: {c.painLevel}/10</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}