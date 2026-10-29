import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID if present in config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  apiKey?: string;
  personalityPrompt?: string;
  speakingStyle?: string;
  createdAt?: string;
  updatedAt?: string;
}

export { onAuthStateChanged, type User };

/**
 * Signs in with Google using a popup and initializes or updates the user profile in Firestore
 */
export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if (user) {
      // Sync or initialize user profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          apiKey: '',
          personalityPrompt: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await setDoc(
          userRef,
          {
            email: user.email || '',
            displayName: user.displayName || userSnap.data()?.displayName || 'User',
            photoURL: user.photoURL || userSnap.data()?.photoURL || '',
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }
    }
    return user;
  } catch (err: any) {
    console.error('Google Sign-In Error:', err);
    throw err;
  }
};

/**
 * Signs out the current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err: any) {
    console.error('Logout Error:', err);
    throw err;
  }
};

/**
 * Subscribes to real-time changes of the user profile document in Firestore
 */
export const subscribeUserProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void
) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('subscribeUserProfile error:', err);
      callback(null);
    }
  );
};

/**
 * Updates a user profile in Firestore
 */
export const saveUserProfileData = async (
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        ...updates,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err: any) {
    console.error('saveUserProfileData error:', err);
    throw err;
  }
};

export interface MemoryItem {
  id?: string;
  text: string;
  category: string;
  timestamp: string;
  updatedAt?: string;
}

export interface ConversationItem {
  id?: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

export interface ReminderItem {
  id?: string;
  title: string;
  time: string;
  dueTimestamp: number;
  completed: boolean;
  notified?: boolean;
  createdAt?: string;
}

// Memory CRUD helpers
export const subscribeMemories = (callback: (memories: MemoryItem[]) => void) => {
  const q = query(collection(db, 'memories'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MemoryItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MemoryItem, 'id'>)
      }));
      callback(list);
    },
    (err) => {
      console.warn('⚠️ Firestore memories subscription notice:', err.message || err);
    }
  );
};

export const addMemory = async (text: string, category: string = 'general') => {
  try {
    return await addDoc(collection(db, 'memories'), {
      text,
      category,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('⚠️ addMemory Firestore notice:', err.message || err);
    return null;
  }
};

export const updateMemory = async (id: string, text: string, category?: string) => {
  try {
    const ref = doc(db, 'memories', id);
    return await updateDoc(ref, {
      text,
      ...(category ? { category } : {}),
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('⚠️ updateMemory Firestore notice:', err.message || err);
  }
};

export const deleteMemory = async (id: string) => {
  try {
    const ref = doc(db, 'memories', id);
    return await deleteDoc(ref);
  } catch (err: any) {
    console.warn('⚠️ deleteMemory Firestore notice:', err.message || err);
  }
};

// Conversation history CRUD helpers
export const subscribeConversations = (callback: (items: ConversationItem[]) => void) => {
  const q = query(collection(db, 'conversations'), orderBy('timestamp', 'asc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ConversationItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ConversationItem, 'id'>)
      }));
      callback(list);
    },
    (err) => {
      console.warn('⚠️ Firestore conversations subscription notice:', err.message || err);
    }
  );
};

export const addConversationMessage = async (role: 'user' | 'assistant', message: string) => {
  try {
    return await addDoc(collection(db, 'conversations'), {
      role,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('⚠️ addConversationMessage Firestore notice:', err.message || err);
    return null;
  }
};

export const clearAllConversations = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'conversations'));
    const promises = snapshot.docs.map((d) => deleteDoc(doc(db, 'conversations', d.id)));
    await Promise.all(promises);
  } catch (err: any) {
    console.warn('⚠️ clearAllConversations Firestore notice:', err.message || err);
  }
};

// Reminders CRUD helpers
export const subscribeReminders = (callback: (items: ReminderItem[]) => void) => {
  const q = query(collection(db, 'reminders'), orderBy('dueTimestamp', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ReminderItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ReminderItem, 'id'>)
      }));
      callback(list);
    },
    (err) => {
      console.warn('⚠️ Firestore reminders subscription notice:', err.message || err);
    }
  );
};

export const addReminderDoc = async (title: string, timeStr: string, dueTimestamp: number) => {
  try {
    return await addDoc(collection(db, 'reminders'), {
      title,
      time: timeStr,
      dueTimestamp,
      completed: false,
      notified: false,
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.warn('⚠️ addReminderDoc Firestore notice:', err.message || err);
    return null;
  }
};

export const updateReminderDoc = async (id: string, updates: Partial<ReminderItem>) => {
  try {
    const ref = doc(db, 'reminders', id);
    return await updateDoc(ref, updates);
  } catch (err: any) {
    console.warn('⚠️ updateReminderDoc Firestore notice:', err.message || err);
  }
};

export const deleteReminderDoc = async (id: string) => {
  try {
    const ref = doc(db, 'reminders', id);
    return await deleteDoc(ref);
  } catch (err: any) {
    console.warn('⚠️ deleteReminderDoc Firestore notice:', err.message || err);
  }
};
