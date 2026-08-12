import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth } from '../services/firebase';

import { syncUserProfile, cleanupGuestData } from '../services/friends';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Log in
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google Login
  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // Guest Login
  const loginAsGuest = () => {
    return signInAnonymously(auth);
  };

  // Log out
  const logout = async () => {
    if (currentUser && currentUser.isAnonymous) {
      try {
        await cleanupGuestData(currentUser.uid);
      } catch (err) {
        console.error("Failed to cleanup guest data on logout:", err);
      }
    }
    return signOut(auth);
  };

  // Link Guest to Email
  const linkGuestAccount = (email, password) => {
    const credential = EmailAuthProvider.credential(email, password);
    return linkWithCredential(auth.currentUser, credential);
  };

  // Link Guest to Google
  const linkGuestWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return linkWithPopup(auth.currentUser, provider);
  };

  // Reset Password via Email
  const resetPassword = (email) => {
    const actionCodeSettings = {
      url: `${window.location.origin}/#reset-password`,
      handleCodeInApp: true,
    };
    return sendPasswordResetEmail(auth, email, actionCodeSettings);
  };

  // Change Password for Logged-In User
  const changePassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("No authenticated email user found.");
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    return updatePassword(auth.currentUser, newPassword);
  };

  // Send Reset Email to Currently Logged-In User
  const sendResetEmailToCurrent = () => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("No authenticated email address available.");
    }
    const actionCodeSettings = {
      url: `${window.location.origin}/#reset-password`,
      handleCodeInApp: true,
    };
    return sendPasswordResetEmail(auth, auth.currentUser.email, actionCodeSettings);
  };

  // Set Account Password directly (for Google/OAuth users setting a password)
  const setAccountPassword = (newPassword) => {
    if (!auth.currentUser) throw new Error("No authenticated user found.");
    return updatePassword(auth.currentUser, newPassword);
  };

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
        if (user) {
          syncUserProfile(user).catch(err => console.error("Profile auto-sync error:", err));
        }
      }, (err) => {
        console.error("Auth state change error:", err);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error("Auth initialization error:", err);
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    loginAsGuest,
    logout,
    linkGuestAccount,
    linkGuestWithGoogle,
    resetPassword,
    changePassword,
    sendResetEmailToCurrent,
    setAccountPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
