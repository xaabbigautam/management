// ============================================
// Firebase Configuration
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyAPh-yeFhBUb9qt4Aj7T5T7nGqUi_cEPBU",
  authDomain: "landscape-management-db174.firebaseapp.com",
  databaseURL: "https://landscape-management-db174-default-rtdb.firebaseio.com",
  projectId: "landscape-management-db174",
  storageBucket: "landscape-management-db174.firebasestorage.app",
  messagingSenderId: "886408361050",
  appId: "1:886408361050:web:2738325286e31d05a19463"
};

// ============================================
// Global Variables
// ============================================
let firebaseApp, auth, db;
let isOnline = navigator.onLine;
let isFirebaseInitialized = false;
let firebaseConnectionAttempted = false;
let firebaseConnectionRetryCount = 0;
const MAX_RETRY_COUNT = 3;

let currentUser = null;
let tasks = {};
let employees = {};
let isAdmin = false;
let isSystemAdmin = false;
let currentUserEmail = "";
let currentUserName = "";

// Task listeners array to manage multiple listeners
let taskListeners = [];
let employeeListeners = [];

// ============================================
// Hardcoded Credentials (for offline login)
// ============================================
const teamMembers = {
    'subash@teamlead.com': {
        name: 'Subash Rai',
        password: 'Subash@866',
        zone: 'Downtown',
        role: 'team',
        department: 'Landscaping',
        is_active: true,
        is_hardcoded: true
    },
    'pawan@teamlead.com': {
        name: 'Pawan Koirala',
        password: 'Pawan@592',
        zone: 'Areesh/Green Team/PODs Indoor',
        role: 'team',
        department: 'Maintenance',
        is_active: true,
        is_hardcoded: true
    },
    'sujan@teamlead.com': {
        name: 'Sujan Subedi',
        password: 'Sujan@576',
        zone: 'MUD IP',
        role: 'team',
        department: 'Irrigation',
        is_active: true,
        is_hardcoded: true
    },
    'saroj@teamlead.com': {
        name: 'Saroj Pokhrel',
        password: 'Saroj@511',
        zone: 'PODs/VIP/RC/gate 5',
        role: 'team',
        department: 'VIP Services',
        is_active: true,
        is_hardcoded: true
    },
    'taraknath@teamlead.com': {
        name: 'Taraknath Sharma',
        password: 'Tarak@593',
        zone: 'Golf Landscaping',
        role: 'team',
        department: 'Golf Course',
        is_active: true,
        is_hardcoded: true
    },
    'ghadindra@teamlead.com': {
        name: 'Ghadindra Chaulagain',
        password: 'Ghadin@570',
        zone: 'Irrigation MUD/IP/POD/GATE 5',
        role: 'team',
        department: 'Irrigation',
        is_active: true,
        is_hardcoded: true
    },
    'shambhu@teamlead.com': {
        name: 'Shambhu Kumar Sah',
        password: 'Shambhu@506',
        zone: 'Irrigation Areesh/Downtown',
        role: 'team',
        department: 'Irrigation',
        is_active: true,
        is_hardcoded: true
    },
    'sunil@teamlead.com': {
        name: 'Sunil Kumar Sah Sudi',
        password: 'Sunil@583',
        zone: 'Palm Trees',
        role: 'team',
        department: 'Irrigation',
        is_active: true,
        is_hardcoded: true
    }
};

const adminCredentials = {
    'admin@landscape.com': {
        password: 'Landscape@2025',
        name: 'System Admin',
        role: 'admin',
        is_active: true,
        is_hardcoded: true
    },
    'victor@landscape.com': {
        password: 'Vic123',
        name: 'Victor AM',
        role: 'admin',
        is_active: true,
        is_hardcoded: true
    },
    'james@landscape.com': {
        password: 'Manager2025',
        name: 'James Manager',
        role: 'admin',
        is_active: true,
        is_hardcoded: true
    },
    'mike@landscape.com': {
        password: 'Michael123',
        name: 'Mike AM',
        role: 'admin',
        is_active: true,
        is_hardcoded: true
    },
    'chhabi@landscape.com': {
        password: 'Admin@2025',
        name: 'Chhabi Admin',
        role: 'system_admin',
        is_active: true,
        is_hardcoded: true
    }
};

// Combine all credentials for easy lookup
const allCredentials = { ...teamMembers, ...adminCredentials };

// ============================================
// Core Initialization
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing app...");
    initializeApp();
});

async function initializeApp() {
    try {
        console.log("=== INITIALIZING APP ===");
        
        // Set initial online status
        isOnline = navigator.onLine;
        console.log("Initial online status:", isOnline);
        
        // Setup network listeners
        setupNetworkListeners();
        
        // Setup service worker
        setupServiceWorker();
        
        // Initialize Firebase first
        await initializeFirebase();
        
        // Check if user is already logged in
        checkExistingLogin();
        
        // Update UI
        updateUI();
        
        console.log("App initialized successfully");
        console.log("Firebase status:", isFirebaseInitialized ? "Connected" : "Not connected");
        
    } catch (error) {
        console.error("Initialization error:", error);
        showNotification("App initialized in offline mode", "info");
    }
}

function checkExistingLogin() {
    const savedUser = sessionStorage.getItem('greenfield_user');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            currentUser = userData.name;
            currentUserEmail = userData.email || "";
            currentUserName = userData.name || "";
            isAdmin = userData.isAdmin || false;
            isSystemAdmin = userData.isSystemAdmin || false;
            console.log("User loaded from session:", currentUser);
            
            // If Firebase is connected, setup listeners
            if (isFirebaseInitialized) {
                setupFirebaseRealtimeListeners();
            }
        } catch (e) {
            console.error("Error parsing saved user:", e);
            sessionStorage.removeItem('greenfield_user');
        }
    }
}

// ============================================
// Firebase Initialization
// ============================================
async function initializeFirebase() {
    if (firebaseConnectionAttempted) {
        console.log("Firebase connection already attempted");
        return;
    }
    
    firebaseConnectionAttempted = true;
    
    try {
        console.log("Attempting to initialize Firebase...");
        
        // Check if Firebase is already loaded
        if (typeof firebase === 'undefined') {
            console.log("Loading Firebase scripts...");
            await loadFirebaseScripts();
        }
        
        // Initialize Firebase app
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log("Firebase app initialized");
        } else {
            firebaseApp = firebase.app();
            console.log("Firebase app already initialized");
        }
        
        // Initialize services
        auth = firebase.auth();
        db = firebase.database();
        
        console.log("Firebase services initialized");
        
        // Test database connection with timeout
        const connectionTimeout = setTimeout(() => {
            console.log("Firebase connection timeout");
            if (!isFirebaseInitialized) {
                handleFirebaseConnectionFailure();
            }
        }, 10000);
        
        const testRef = db.ref('.info/connected');
        const connectionListener = testRef.on('value', (snapshot) => {
            const connected = snapshot.val();
            console.log("Firebase database connection:", connected ? "Connected" : "Disconnected");
            
            clearTimeout(connectionTimeout);
            
            if (connected) {
                isFirebaseInitialized = true;
                firebaseConnectionRetryCount = 0;
                updateSyncStatus();
                
                console.log("Firebase connected successfully");
                showNotification("Connected to server", "success");
                
                // If user is logged in, setup listeners
                if (currentUserEmail) {
                    setupFirebaseRealtimeListeners();
                }
                
                // Sync local data with Firebase
                syncLocalDataWithFirebase();
                
                // Process any pending sync
                setTimeout(processPendingSync, 2000);
                
                // Dispatch event for UI updates
                window.dispatchEvent(new Event('firebaseConnected'));
            } else {
                handleFirebaseConnectionFailure();
            }
        }, (error) => {
            console.error("Firebase connection listener error:", error);
            clearTimeout(connectionTimeout);
            handleFirebaseConnectionFailure();
        });
        
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        handleFirebaseConnectionFailure();
    }
}

function handleFirebaseConnectionFailure() {
    isFirebaseInitialized = false;
    console.log("Firebase connection failed, creating mock Firebase");
    
    // Retry logic
    if (firebaseConnectionRetryCount < MAX_RETRY_COUNT) {
        firebaseConnectionRetryCount++;
        console.log(`Retrying Firebase connection (attempt ${firebaseConnectionRetryCount}/${MAX_RETRY_COUNT})...`);
        
        setTimeout(() => {
            firebaseConnectionAttempted = false;
            initializeFirebase();
        }, 5000 * firebaseConnectionRetryCount);
    } else {
        createMockFirebase();
        showNotification("Working offline. Data saved locally.", "warning");
    }
    
    updateSyncStatus();
}

async function loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
        const script1 = document.createElement('script');
        script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
            script2.onload = () => {
                const script3 = document.createElement('script');
                script3.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
                script3.onload = resolve;
                script3.onerror = reject;
                document.head.appendChild(script3);
            };
            script2.onerror = reject;
            document.head.appendChild(script2);
        };
        script1.onerror = reject;
        document.head.appendChild(script1);
    });
}

function createMockFirebase() {
    console.log("Creating mock Firebase for offline mode");
    
    db = {
        ref: (path) => {
            console.log("Mock Firebase ref called for path:", path);
            return {
                on: (eventType, callback, errorCallback) => {
                    console.log("Mock on listener for", path);
                    return () => {};
                },
                once: (eventType) => {
                    console.log("Mock once for", path);
                    return Promise.reject(new Error("Offline mode - Firebase not available"));
                },
                set: (data) => {
                    console.log("Mock set for", path);
                    return Promise.reject(new Error("Offline mode - Firebase not available"));
                },
                update: (data) => {
                    console.log("Mock update for", path);
                    return Promise.reject(new Error("Offline mode - Firebase not available"));
                },
                remove: () => {
                    console.log("Mock remove for", path);
                    return Promise.reject(new Error("Offline mode - Firebase not available"));
                }
            };
        }
    };
}

// ============================================
// Firebase Realtime Listeners
// ============================================
function setupFirebaseRealtimeListeners() {
    if (!isFirebaseInitialized || !db) {
        console.log("Cannot setup Firebase listeners - not initialized");
        return;
    }
    
    console.log("Setting up Firebase realtime listeners...");
    
    // Clear existing listeners
    removeAllListeners();
    
    // ===== TASKS LISTENER =====
    const tasksRef = db.ref('tasks');
    const tasksListener = tasksRef.on('value', (snapshot) => {
        console.log("Firebase tasks update received");
        const firebaseTasks = snapshot.val() || {};
        
        console.log(`Received ${Object.keys(firebaseTasks).length} tasks from Firebase`);
        
        // Update global tasks object
        tasks = firebaseTasks;
        
        // Save to local storage for offline access
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        // Update UI
        updateUI();
        updateStats();
        
        // Notify about new tasks
        notifyNewTasks(firebaseTasks);
        
        // Dispatch event for page-specific updates
        window.dispatchEvent(new Event('taskUpdate'));
        
    }, (error) => {
        console.error("Firebase tasks listener error:", error);
        if (error.code === 'PERMISSION_DENIED') {
            showNotification("Database permission denied. Please contact admin.", "error");
        }
    });
    
    taskListeners.push({ ref: tasksRef, listener: tasksListener });
    
    // ===== EMPLOYEES LISTENER =====
    const employeesRef = db.ref('employees');
    const employeesListener = employeesRef.on('value', (snapshot) => {
        console.log("Firebase employees update received");
        const firebaseEmployees = snapshot.val() || {};
        
        // Merge with hardcoded employees
        employees = { 
            ...firebaseEmployees,
            ...allCredentials
        };
        
        // Save to local storage
        localStorage.setItem('greenfield_employees', JSON.stringify(employees));
        
        console.log(`Employees updated: ${Object.keys(employees).length}`);
        
    }, (error) => {
        console.error("Firebase employees listener error:", error);
    });
    
    employeeListeners.push({ ref: employeesRef, listener: employeesListener });
    
    console.log("Firebase listeners setup complete");
}

function removeAllListeners() {
    taskListeners.forEach(({ ref, listener }) => {
        if (ref && listener) {
            ref.off('value', listener);
        }
    });
    taskListeners = [];
    
    employeeListeners.forEach(({ ref, listener }) => {
        if (ref && listener) {
            ref.off('value', listener);
        }
    });
    employeeListeners = [];
}

function syncLocalDataWithFirebase() {
    console.log("Syncing local data with Firebase...");
    
    const localTasks = JSON.parse(localStorage.getItem('greenfield_tasks') || '{}');
    const localTasksArray = Object.values(localTasks);
    
    if (localTasksArray.length === 0) {
        console.log("No local tasks to sync");
        return;
    }
    
    console.log(`Found ${localTasksArray.length} local tasks to sync`);
    
    localTasksArray.forEach(async (localTask) => {
        try {
            if (isFirebaseInitialized && db) {
                const taskRef = db.ref(`tasks/${localTask.id}`);
                const snapshot = await taskRef.once('value');
                
                if (!snapshot.exists()) {
                    await taskRef.set(localTask);
                    console.log(`Synced local task to Firebase: ${localTask.id}`);
                } else {
                    const remoteTask = snapshot.val();
                    const localTime = localTask.last_updated || new Date(localTask.requested_at).getTime();
                    const remoteTime = remoteTask.last_updated || new Date(remoteTask.requested_at).getTime();
                    
                    if (localTime > remoteTime) {
                        await taskRef.update(localTask);
                        console.log(`Updated Firebase task from local: ${localTask.id}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error syncing task ${localTask.id}:`, error);
        }
    });
}

function notifyNewTasks(newTasks) {
    const oldTaskCount = Object.keys(tasks).length;
    const newTaskCount = Object.keys(newTasks).length;
    
    if (newTaskCount > oldTaskCount) {
        const newTaskKeys = Object.keys(newTasks).filter(key => !tasks[key]);
        if (newTaskKeys.length > 0) {
            showNotification(`New task${newTaskKeys.length > 1 ? 's' : ''} added`, "info");
        }
    }
}

// ============================================
// Network Handling
// ============================================
function setupNetworkListeners() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

function handleOnline() {
    console.log("=== DEVICE IS NOW ONLINE ===");
    isOnline = true;
    
    showNotification('Back online. Connecting to server...', 'success');
    
    if (!isFirebaseInitialized) {
        initializeFirebase().then(() => {
            if (isFirebaseInitialized && currentUserEmail) {
                setupFirebaseRealtimeListeners();
                setTimeout(processPendingSync, 2000);
            }
        });
    } else {
        updateSyncStatus();
        setTimeout(processPendingSync, 2000);
    }
    
    updateUI();
}

function handleOffline() {
    console.log("=== DEVICE IS NOW OFFLINE ===");
    isOnline = false;
    showNotification('You are offline. Using local data only.', 'warning');
    updateSyncStatus();
}

// ============================================
// Service Worker Setup
// ============================================
function setupServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
                
                if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// ============================================
// Login Functions
// ============================================
async function teamLogin(email, password) {
    try {
        console.log("Team login attempt:", email);
        
        if (!email || !password) {
            showNotification("Please enter email and password", "error");
            return false;
        }
        
        const lowerEmail = email.toLowerCase().trim();
        
        if (!validateEmail(lowerEmail)) {
            showNotification("Please enter a valid email address", "error");
            return false;
        }
        
        // Check hardcoded credentials
        if (teamMembers[lowerEmail]) {
            if (teamMembers[lowerEmail].password === password) {
                const employee = teamMembers[lowerEmail];
                console.log("Login successful from hardcoded team member:", employee.name);
                return loginSuccess(employee.name, lowerEmail, false, false, employee);
            } else {
                showNotification("Incorrect password", "error");
                return false;
            }
        }
        
        // Check if it's an admin
        if (adminCredentials[lowerEmail]) {
            showNotification("Please use Admin Login page for admin accounts", "error");
            return false;
        }
        
        // Check Firebase for additional employees
        if (isFirebaseInitialized && db) {
            try {
                const snapshot = await db.ref(`employees/${lowerEmail}`).once('value');
                const employee = snapshot.val();
                
                if (employee && employee.password === password && 
                    employee.is_active !== false && employee.role === 'team') {
                    return loginSuccess(employee.name, lowerEmail, false, false, employee);
                }
            } catch (firebaseError) {
                console.error("Firebase login error:", firebaseError);
            }
        }
        
        showNotification("Invalid credentials", "error");
        return false;
    } catch (error) {
        console.error("Team login error:", error);
        showNotification("Login failed: " + error.message, "error");
        return false;
    }
}

async function adminLogin(email, password) {
    try {
        console.log("Admin login attempt:", email);
        
        if (!email || !password) {
            showNotification("Please enter credentials", "error");
            return false;
        }
        
        const lowerEmail = email.toLowerCase().trim();
        
        if (!validateEmail(lowerEmail)) {
            showNotification("Please enter a valid email address", "error");
            return false;
        }
        
        // Check hardcoded admin credentials
        if (adminCredentials[lowerEmail]) {
            if (adminCredentials[lowerEmail].password === password) {
                const admin = adminCredentials[lowerEmail];
                console.log("Login successful from hardcoded admin:", admin.name);
                return loginSuccess(admin.name, lowerEmail, true, admin.role === 'system_admin', admin);
            } else {
                showNotification("Incorrect password", "error");
                return false;
            }
        }
        
        // Check if it's a team member
        if (teamMembers[lowerEmail]) {
            showNotification("Please use Team Login page for team accounts", "error");
            return false;
        }
        
        // Check Firebase for additional admins
        if (isFirebaseInitialized && db) {
            try {
                const snapshot = await db.ref(`employees/${lowerEmail}`).once('value');
                const employee = snapshot.val();
                
                const isAdminUser = employee && (employee.role === 'admin' || employee.role === 'system_admin');
                if (employee && employee.password === password && isAdminUser && employee.is_active !== false) {
                    return loginSuccess(employee.name, lowerEmail, true, employee.role === 'system_admin', employee);
                }
            } catch (firebaseError) {
                console.error("Firebase login error:", firebaseError);
            }
        }
        
        showNotification("Invalid admin credentials", "error");
        return false;
    } catch (error) {
        console.error("Admin login error:", error);
        showNotification("Login failed: " + error.message, "error");
        return false;
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function loginSuccess(name, email, isAdminFlag, isSystemAdminFlag, userData) {
    currentUser = name;
    currentUserEmail = email;
    currentUserName = name;
    isAdmin = isAdminFlag;
    isSystemAdmin = isSystemAdminFlag;
    
    const userInfo = {
        name: name,
        email: email,
        isAdmin: isAdminFlag,
        isSystemAdmin: isSystemAdminFlag,
        zone: userData.zone || '',
        department: userData.department || '',
        role: userData.role || (isAdminFlag ? 'admin' : 'team'),
        timestamp: new Date().toISOString()
    };
    
    sessionStorage.setItem('greenfield_user', JSON.stringify(userInfo));
    localStorage.setItem('greenfield_user', JSON.stringify(userInfo));
    
    showNotification(`Welcome ${name}!`, "success");
    
    if (isFirebaseInitialized) {
        setupFirebaseRealtimeListeners();
    }
    
    setTimeout(() => {
        if (isAdminFlag) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'team.html';
        }
    }, 500);
    
    return true;
}

// ============================================
// Task Management Functions (REAL-TIME SYNC)
// ============================================
async function addTask(description, zone, photoFile = null, options = {}) {
    try {
        console.log("=== ADD TASK ===");
        console.log("Current user email:", currentUserEmail);
        
        if (!currentUserEmail) {
            showNotification("Please login first", "error");
            return false;
        }
        
        if (!description || !zone) {
            showNotification("Please fill all required fields", "error");
            return false;
        }
        
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        let photoBase64 = null;
        
        // Handle photo
        if (photoFile && photoFile.size > 0) {
            if (photoFile.size > 2 * 1024 * 1024) {
                showNotification("Image must be less than 2MB", "error");
                return false;
            }
            photoBase64 = await convertImageToBase64(photoFile);
        }
        
        const savedUser = JSON.parse(sessionStorage.getItem('greenfield_user') || '{}');
        const isAdminTask = isAdmin || options.is_admin_request || savedUser.isAdmin;
        
        console.log("Is admin task:", isAdminTask);
        console.log("Saved user:", savedUser);
        
        // CRITICAL FIX: Ensure all tasks are visible to everyone
        const taskData = {
            id: taskId,
            description: description.trim(),
            zone: zone,
            requested_by: currentUserEmail,
            requested_by_name: currentUserName || savedUser.name || 'Unknown',
            requested_at: new Date().toISOString(),
            
            // Fixed: All tasks should have proper status
            status: isAdminTask ? 'approved' : 'pending',
            is_admin_request: isAdminTask,
            needs_approval: !isAdminTask, // Team tasks need approval, admin tasks don't
            
            photoBase64: photoBase64,
            last_updated: Date.now(),
            department: savedUser.department || 'Not specified',
            
            assigned_to: options.assigned_to || null,
            assigned_to_name: options.assigned_to_name || null,
            is_assigned: !!options.assigned_to,
            is_urgent: options.is_urgent || false,
            priority: options.is_urgent ? 'urgent' : 'normal',
            assigned_by: options.assigned_to ? currentUserName || savedUser.name : null,
            assigned_at: options.assigned_to ? new Date().toISOString() : null,
            due_date: options.due_date || null,
            
            created_by_admin: isAdminTask,
            visible_to_all: true, // CRITICAL: All tasks visible to everyone
            created_at: new Date().toISOString(),
            ...options
        };
        
        console.log("Task data created:", taskData);
        
        // Save to local storage immediately
        saveTaskToLocalStorage(taskId, taskData);
        
        // Try to save to Firebase if connected
        if (isFirebaseInitialized && db) {
            try {
                await db.ref(`tasks/${taskId}`).set(taskData);
                console.log("Task saved to Firebase:", taskId);
                
                showNotification(`Task ${isAdminTask ? 'created' : 'submitted for approval'}! Synced to all devices.`, "success");
                return true;
            } catch (firebaseError) {
                console.error("Firebase save failed:", firebaseError);
                showNotification("Task saved locally. Will sync when online.", "warning");
                
                queueTaskForSync(taskId, taskData);
                return true;
            }
        } else {
            showNotification("Task saved locally. Will sync when online.", "warning");
            queueTaskForSync(taskId, taskData);
            return true;
        }
        
    } catch (error) {
        console.error("Error adding task:", error);
        showNotification("Failed to add task: " + error.message, "error");
        return false;
    }
}

function saveTaskToLocalStorage(taskId, taskData) {
    const existingTasks = JSON.parse(localStorage.getItem('greenfield_tasks') || '{}');
    existingTasks[taskId] = taskData;
    localStorage.setItem('greenfield_tasks', JSON.stringify(existingTasks));
    tasks = existingTasks;
    updateUI();
}

async function createAdminTask(description, zone, photoFile = null, assignedTo = null, isUrgent = false) {
    const options = {
        is_admin_request: true,
        assigned_to: assignedTo,
        assigned_to_name: assignedTo ? getEmployeeName(assignedTo) : null,
        is_assigned: !!assignedTo,
        is_urgent: isUrgent,
        priority: isUrgent ? 'urgent' : 'normal',
        assigned_by: assignedTo ? currentUserName : null,
        assigned_at: assignedTo ? new Date().toISOString() : null
    };
    
    return await addTask(description, zone, photoFile, options);
}

async function createUrgentTask(description, zone, photoFile = null, assignedTo = null) {
    return await createAdminTask(description, zone, photoFile, assignedTo, true);
}

async function assignTask(taskId, employeeEmail, dueDate = null) {
    try {
        if (!isAdmin) {
            showNotification("Only admins can assign tasks", "error");
            return false;
        }
        
        if (!isFirebaseInitialized || !db) {
            showNotification("Cannot connect to server", "error");
            return false;
        }
        
        if (!validateEmail(employeeEmail)) {
            showNotification("Please enter a valid email address", "error");
            return false;
        }
        
        let employeeName = getEmployeeName(employeeEmail);
        
        const updates = {
            assigned_to: employeeEmail,
            assigned_to_name: employeeName,
            assigned_by: currentUser,
            assigned_at: new Date().toISOString(),
            is_assigned: true,
            due_date: dueDate || null,
            last_updated: Date.now()
        };
        
        await db.ref(`tasks/${taskId}`).update(updates);
        
        // Update local storage
        if (tasks[taskId]) {
            tasks[taskId] = { ...tasks[taskId], ...updates };
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        }
        
        showNotification(`Task assigned to ${employeeName}. Synced to all devices.`, "success");
        
        return true;
    } catch (error) {
        console.error("Error assigning task:", error);
        showNotification("Failed to assign task: " + error.message, "error");
        return false;
    }
}

async function approveTask(taskId, approvalNote = '') {
    try {
        if (!isAdmin) {
            showNotification("Only admins can approve tasks", "error");
            return false;
        }
        
        if (!isFirebaseInitialized || !db) {
            showNotification("Cannot connect to server", "error");
            return false;
        }
        
        const updates = {
            status: 'approved',
            approved_by: currentUserEmail,
            approved_by_name: currentUserName,
            approved_at: new Date().toISOString(),
            visible_to_all: true,
            needs_approval: false,
            last_updated: Date.now()
        };
        
        if (approvalNote) {
            updates.approval_note = approvalNote;
        }
        
        await db.ref(`tasks/${taskId}`).update(updates);
        
        if (tasks[taskId]) {
            tasks[taskId] = { ...tasks[taskId], ...updates };
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        }
        
        showNotification("Task approved! Synced to all devices." + (approvalNote ? " (Note added)" : ""), "success");
        
        return true;
    } catch (error) {
        console.error("Error approving task:", error);
        showNotification("Failed to approve task: " + error.message, "error");
        return false;
    }
}

async function rejectTask(taskId, rejectionReason = '') {
    try {
        if (!isAdmin) {
            showNotification("Only admins can reject tasks", "error");
            return false;
        }
        
        if (!isFirebaseInitialized || !db) {
            showNotification("Cannot connect to server", "error");
            return false;
        }
        
        const updates = {
            status: 'rejected',
            rejected_by: currentUserEmail,
            rejected_by_name: currentUserName,
            rejected_at: new Date().toISOString(),
            rejection_reason: rejectionReason,
            visible_to_all: true,
            last_updated: Date.now()
        };
        
        await db.ref(`tasks/${taskId}`).update(updates);
        
        if (tasks[taskId]) {
            tasks[taskId] = { ...tasks[taskId], ...updates };
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        }
        
        showNotification("Task rejected. Synced to all devices.", "info");
        
        return true;
    } catch (error) {
        console.error("Error rejecting task:", error);
        showNotification("Failed to reject task: " + error.message, "error");
        return false;
    }
}

// ============================================
// MARK COMPLETE FUNCTIONS FOR EMPLOYEES
// ============================================
async function markTaskComplete(taskId) {
    try {
        const savedUser = JSON.parse(sessionStorage.getItem('greenfield_user') || '{}');
        
        // Get the task
        const task = tasks[taskId];
        if (!task) {
            showNotification('Task not found', 'error');
            return false;
        }
        
        console.log("Marking task complete:", taskId);
        console.log("Task assigned to:", task.assigned_to);
        console.log("Current user:", savedUser.email);
        console.log("Task status:", task.status);
        
        // Check if task is assigned to current user OR if user is admin
        if (task.assigned_to !== savedUser.email && !savedUser.isAdmin) {
            showNotification('This task is not assigned to you', 'error');
            return false;
        }
        
        // Check if task is already completed
        if (task.status === 'completed') {
            showNotification('Task is already completed', 'info');
            return false;
        }
        
        // Team tasks need to be approved before completion
        if (!task.is_admin_request && task.needs_approval && task.status !== 'approved') {
            showNotification('This task needs admin approval before it can be completed', 'error');
            return false;
        }
        
        const updates = {
            status: 'completed',
            completed_by: savedUser.email,
            completed_by_name: savedUser.name,
            completed_at: new Date().toISOString(),
            visible_to_all: true,
            last_updated: Date.now()
        };
        
        // Try Firebase first
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).update(updates);
        } else {
            queueTaskUpdateForSync(taskId, updates);
        }
        
        // Always update local storage
        if (tasks[taskId]) {
            tasks[taskId] = { ...tasks[taskId], ...updates };
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        }
        
        showNotification('Task completed!' + (isFirebaseInitialized ? ' Synced to all devices.' : ' Saved locally.'), 'success');
        
        // Trigger UI update
        updateUI();
        
        return true;
    } catch (error) {
        console.error('Error marking task complete:', error);
        showNotification('Failed to mark task as complete: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// Task Actions (Cancel, Delete)
// ============================================
async function cancelTask(taskId) {
    try {
        const savedUser = JSON.parse(sessionStorage.getItem('greenfield_user') || '{}');
        
        const task = tasks[taskId];
        if (!task) {
            showNotification('Task not found', 'error');
            return false;
        }
        
        if (task.requested_by !== savedUser.email && !isSystemAdmin) {
            showNotification('You can only cancel your own tasks', 'error');
            return false;
        }
        
        const updates = {
            status: 'cancelled',
            cancelled_by: savedUser.email,
            cancelled_at: new Date().toISOString(),
            visible_to_all: true,
            last_updated: Date.now()
        };
        
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).update(updates);
        } else {
            queueTaskUpdateForSync(taskId, updates);
        }
        
        tasks[taskId] = { ...tasks[taskId], ...updates };
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        showNotification('Task cancelled!' + (isFirebaseInitialized ? ' Synced to all devices.' : ' Saved locally.'), 'success');
        
        return true;
    } catch (error) {
        console.error('Error cancelling task:', error);
        showNotification('Failed to cancel task: ' + error.message, 'error');
        return false;
    }
}

async function deleteTask(taskId) {
    try {
        if (!isSystemAdmin) {
            showNotification("Only system admin can delete tasks", "error");
            return false;
        }
        
        if (!confirm("Are you sure you want to delete this task from all devices?")) {
            return false;
        }
        
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).remove();
        } else {
            queueTaskDeleteForSync(taskId);
        }
        
        if (tasks[taskId]) {
            delete tasks[taskId];
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        }
        
        showNotification('Task deleted!' + (isFirebaseInitialized ? ' Synced to all devices.' : ' Removed locally.'), 'success');
        
        return true;
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// Offline Sync Queue Functions
// ============================================
function queueTaskForSync(taskId, taskData) {
    const pendingSync = JSON.parse(localStorage.getItem('greenfield_pending_sync') || '[]');
    pendingSync.push({
        taskId: taskId,
        taskData: taskData,
        timestamp: Date.now(),
        action: 'add'
    });
    localStorage.setItem('greenfield_pending_sync', JSON.stringify(pendingSync));
    console.log(`Task ${taskId} queued for sync`);
}

function queueTaskUpdateForSync(taskId, updates) {
    const pendingSync = JSON.parse(localStorage.getItem('greenfield_pending_sync') || '[]');
    pendingSync.push({
        taskId: taskId,
        updates: updates,
        timestamp: Date.now(),
        action: 'update'
    });
    localStorage.setItem('greenfield_pending_sync', JSON.stringify(pendingSync));
    console.log(`Task ${taskId} update queued for sync`);
}

function queueTaskDeleteForSync(taskId) {
    const pendingSync = JSON.parse(localStorage.getItem('greenfield_pending_sync') || '[]');
    pendingSync.push({
        taskId: taskId,
        timestamp: Date.now(),
        action: 'delete'
    });
    localStorage.setItem('greenfield_pending_sync', JSON.stringify(pendingSync));
    console.log(`Task ${taskId} delete queued for sync`);
}

async function processPendingSync() {
    if (!isFirebaseInitialized || !db) return;
    
    const pendingSync = JSON.parse(localStorage.getItem('greenfield_pending_sync') || '[]');
    if (pendingSync.length === 0) return;
    
    console.log(`Processing ${pendingSync.length} pending sync items`);
    
    const successfulSyncs = [];
    
    for (const syncItem of pendingSync) {
        try {
            if (syncItem.action === 'add') {
                await db.ref(`tasks/${syncItem.taskId}`).set(syncItem.taskData);
                successfulSyncs.push(syncItem);
                console.log(`Synced pending task: ${syncItem.taskId}`);
            } else if (syncItem.action === 'update') {
                await db.ref(`tasks/${syncItem.taskId}`).update(syncItem.updates);
                successfulSyncs.push(syncItem);
                console.log(`Updated pending task: ${syncItem.taskId}`);
            } else if (syncItem.action === 'delete') {
                await db.ref(`tasks/${syncItem.taskId}`).remove();
                successfulSyncs.push(syncItem);
                console.log(`Deleted pending task: ${syncItem.taskId}`);
            }
        } catch (error) {
            console.error(`Failed to sync ${syncItem.taskId}:`, error);
        }
    }
    
    if (successfulSyncs.length > 0) {
        const remainingSyncs = pendingSync.filter(item => 
            !successfulSyncs.some(success => 
                success.taskId === item.taskId && success.timestamp === item.timestamp
            )
        );
        localStorage.setItem('greenfield_pending_sync', JSON.stringify(remainingSyncs));
        showNotification(`Synced ${successfulSyncs.length} pending tasks`, "success");
    }
}

// ============================================
// Employee Management
// ============================================
async function addEmployee(employeeData) {
    try {
        if (!isSystemAdmin) {
            showNotification("Only system admin can add employees", "error");
            return false;
        }
        
        if (!isFirebaseInitialized || !db) {
            showNotification("Cannot connect to server", "error");
            return false;
        }
        
        const { name, email, password, department, zone, role = 'team' } = employeeData;
        
        if (!name || !email || !password) {
            showNotification("Please fill all required fields", "error");
            return false;
        }
        
        const lowerEmail = email.toLowerCase().trim();
        
        if (!validateEmail(lowerEmail)) {
            showNotification("Please enter a valid email address", "error");
            return false;
        }
        
        const snapshot = await db.ref(`employees/${lowerEmail}`).once('value');
        if (snapshot.exists()) {
            showNotification("Employee with this email already exists", "error");
            return false;
        }
        
        const employee = {
            name: name.trim(),
            email: lowerEmail,
            password: password,
            department: department || 'Landscaping',
            zone: zone || 'Not assigned',
            role: role,
            created_by: currentUserEmail,
            created_by_name: currentUserName,
            created_at: new Date().toISOString(),
            is_active: true,
            last_login: null
        };
        
        await db.ref(`employees/${lowerEmail}`).set(employee);
        
        employees[lowerEmail] = employee;
        localStorage.setItem('greenfield_employees', JSON.stringify(employees));
        
        showNotification(`Employee ${name} added! Synced to all devices.`, "success");
        
        return true;
    } catch (error) {
        console.error("Error adding employee:", error);
        showNotification("Failed to add employee: " + error.message, "error");
        return false;
    }
}

async function getAllEmployees() {
    try {
        const localEmployees = JSON.parse(localStorage.getItem('greenfield_employees') || '{}');
        
        if (isFirebaseInitialized && db) {
            const snapshot = await db.ref('employees').once('value');
            const firebaseEmployees = snapshot.val() || {};
            
            const merged = { 
                ...firebaseEmployees,
                ...allCredentials,
                ...localEmployees
            };
            
            localStorage.setItem('greenfield_employees', JSON.stringify(merged));
            employees = merged;
            
            return merged;
        }
        
        return { ...allCredentials, ...localEmployees };
        
    } catch (error) {
        console.error("Error getting employees:", error);
        return { ...allCredentials, ...JSON.parse(localStorage.getItem('greenfield_employees') || '{}') };
    }
}

function getEmployeeName(email) {
    if (!email) return null;
    
    if (teamMembers[email]) {
        return teamMembers[email].name;
    }
    if (adminCredentials[email]) {
        return adminCredentials[email].name;
    }
    
    if (employees[email]) {
        return employees[email].name;
    }
    
    return email;
}

// ============================================
// Utility Functions
// ============================================
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    if (existingNotifications.length > 3) {
        existingNotifications[0].remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                          type === 'success' ? 'check-circle' : 
                          type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="margin-left: auto; background: none; border: none; color: white; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
    
    if ('Notification' in window && Notification.permission === 'granted' && type !== 'info') {
        new Notification('Landscaping Task Manager', {
            body: message,
            icon: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/leaf.svg'
        });
    }
}

function updateStats() {
    const taskArray = Object.values(tasks || {});
    const stats = {
        'totalTasks': taskArray.length,
        'pendingTasks': taskArray.filter(t => t.status === 'pending').length,
        'approvedTasks': taskArray.filter(t => t.status === 'approved').length,
        'completedTasks': taskArray.filter(t => t.status === 'completed').length,
        'needsApprovalTasks': taskArray.filter(t => t.needs_approval && t.status === 'pending').length,
        'urgentTasks': taskArray.filter(t => t.is_urgent).length
    };
    
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function updateSyncStatus() {
    const syncStatusElement = document.getElementById('syncStatusText');
    
    if (!syncStatusElement) return;
    
    if (isOnline && isFirebaseInitialized) {
        syncStatusElement.innerHTML = '<i class="fas fa-wifi"></i> Online - Live Sync';
        syncStatusElement.style.color = '#4caf50';
    } else if (isOnline && !isFirebaseInitialized) {
        syncStatusElement.innerHTML = '<i class="fas fa-wifi"></i> Online - No Server';
        syncStatusElement.style.color = '#ff9800';
    } else {
        syncStatusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        syncStatusElement.style.color = '#c62828';
    }
}

function updateUI() {
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    console.log("Update UI called. Page:", page);
    console.log("Total tasks:", Object.keys(tasks).length);
    console.log("Firebase:", isFirebaseInitialized ? "Connected" : "Disconnected");
    
    updateSyncStatus();
    updateStats();
    
    setTimeout(() => {
        if (page === 'team.html' || page === '') {
            if (typeof window.renderCurrentTab === 'function') {
                window.renderCurrentTab();
            }
        } else if (page === 'admin.html') {
            if (typeof window.updateAdminDashboard === 'function') {
                window.updateAdminDashboard();
            }
            if (typeof window.renderApprovalTasks === 'function') {
                window.renderApprovalTasks();
            }
            if (typeof window.filterTasks === 'function') {
                window.filterTasks();
            }
        }
    }, 100);
}

function exportToExcel() {
    if (!isAdmin) {
        showNotification("Only admins can export data", "error");
        return;
    }
    
    try {
        if (typeof XLSX === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => exportToExcel();
            document.head.appendChild(script);
            return;
        }
        
        const tasksArray = Object.values(tasks || {}).map(task => ({
            'Task ID': task.id,
            'Description': task.description,
            'Zone': task.zone,
            'Status': task.status,
            'Requested By': task.requested_by_name || task.requested_by,
            'Requested Date': task.requested_at ? new Date(task.requested_at).toLocaleString() : '',
            'Approved By': task.approved_by || '',
            'Approved Date': task.approved_at ? new Date(task.approved_at).toLocaleString() : '',
            'Completed Date': task.completed_at ? new Date(task.completed_at).toLocaleString() : '',
            'Priority': task.priority || 'normal',
            'Is Urgent': task.is_urgent ? 'Yes' : 'No',
            'Needs Approval': task.needs_approval ? 'Yes' : 'No',
            'Department': task.department || '',
            'Assigned To': task.assigned_to || ''
        }));
        
        if (tasksArray.length === 0) {
            showNotification("No tasks to export", "info");
            return;
        }
        
        const ws = XLSX.utils.json_to_sheet(tasksArray);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        
        const date = new Date().toISOString().split('T')[0];
        const filename = `Greenfield_Tasks_${date}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        showNotification("Exported to Excel successfully!", "success");
    } catch (error) {
        console.error("Export error:", error);
        showNotification("Failed to export: " + error.message, "error");
    }
}

function logout() {
    removeAllListeners();
    
    currentUser = null;
    currentUserEmail = "";
    currentUserName = "";
    isAdmin = false;
    isSystemAdmin = false;
    
    sessionStorage.removeItem('greenfield_user');
    localStorage.removeItem('greenfield_user');
    
    showNotification("Logged out successfully", "info");
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function getStatusIcon(status) {
    const icons = {
        'pending': 'clock',
        'approved': 'check-circle',
        'completed': 'flag-checkered',
        'cancelled': 'times-circle',
        'rejected': 'times-circle'
    };
    return icons[status] || 'question-circle';
}

function getAllTasks() {
    return Object.values(tasks || {});
}

function refreshData() {
    if (isFirebaseInitialized && db) {
        db.ref('tasks').once('value').then(snapshot => {
            tasks = snapshot.val() || {};
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
            updateUI();
            showNotification("Data refreshed from server", "success");
        });
    } else {
        tasks = JSON.parse(localStorage.getItem('greenfield_tasks') || '{}');
        updateUI();
        showNotification("Data refreshed from local cache", "info");
    }
}

// ============================================
// Global Export
// ============================================
window.approveTask = approveTask;
window.rejectTask = rejectTask;
window.addTask = addTask;
window.createAdminTask = createAdminTask;
window.createUrgentTask = createUrgentTask;
window.assignTask = assignTask;
window.addEmployee = addEmployee;
window.getAllEmployees = getAllEmployees;
window.convertImageToBase64 = convertImageToBase64;
window.showNotification = showNotification;
window.updateStats = updateStats;
window.exportToExcel = exportToExcel;
window.logout = logout;
window.teamLogin = teamLogin;
window.adminLogin = adminLogin;
window.getStatusIcon = getStatusIcon;
window.markTaskComplete = markTaskComplete;
window.cancelTask = cancelTask;
window.deleteTask = deleteTask;
window.validateEmail = validateEmail;
window.getAllTasks = getAllTasks;
window.getEmployeeName = getEmployeeName;
window.refreshData = refreshData;
window.updateUI = updateUI;
window.updateSyncStatus = updateSyncStatus;
window.processPendingSync = processPendingSync;

// Auto-update sync status every 10 seconds
setInterval(updateSyncStatus, 10000);

// Process pending sync every 30 seconds if online
setInterval(() => {
    if (isOnline && isFirebaseInitialized) {
        processPendingSync();
    }
}, 30000);

// Initial update
setTimeout(updateSyncStatus, 1000);