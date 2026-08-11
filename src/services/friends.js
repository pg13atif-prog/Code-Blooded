import { ref, get, set, remove, update, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';
import { isInWatchlist, isLiked, isWatched } from './firestore';

// Helper to generate a 6-character alphanumeric code
const generateCode = () => {
  return 'CS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const ensureFriendCode = async (userId, email) => {
  if (!userId) return null;
  
  try {
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    
    let userData = userSnap.exists() ? userSnap.val() : {};
    
    if (userData.friendCode) {
      // If they were a Guest but now have a real email (e.g. they linked an account), update it
      if (email && email !== 'Guest' && (!userData.email || userData.email === 'Guest')) {
        try {
          await set(ref(db, `users/${userId}/email`), email);
        } catch (e) {
          console.error('Failed to update email for linked account', e);
        }
      }
      return userData.friendCode;
    }

    // Generate unique code with max attempts guard
    let newCode = '';
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    
    while (!isUnique && attempts < MAX_ATTEMPTS) {
      attempts++;
      newCode = generateCode();
      const codeSnap = await get(ref(db, `friendCodes/${newCode}`));
      if (!codeSnap.exists()) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      console.error('Failed to generate unique friend code after', MAX_ATTEMPTS, 'attempts');
      return null;
    }

    // Set the code atomically
    const updates = {};
    updates[`users/${userId}/friendCode`] = newCode;
    updates[`users/${userId}/email`] = email || 'Guest';
    updates[`friendCodes/${newCode}`] = userId;

    await update(ref(db), updates);

    return newCode;
  } catch (error) {
    console.error('ensureFriendCode error:', error);
    
    // Try to read existing code even if write failed
    try {
      const userSnap = await get(ref(db, `users/${userId}`));
      if (userSnap.exists() && userSnap.val().friendCode) {
        return userSnap.val().friendCode;
      }
    } catch (readError) {
      console.error('Fallback read error:', readError);
    }
    
    return null;
  }
};


export const searchByFriendCode = async (code) => {
  const codeToSearch = code.trim().toUpperCase();
  let friendId = null;
  
  const codeSnap = await get(ref(db, `friendCodes/${codeToSearch}`));
  if (codeSnap.exists()) {
    friendId = codeSnap.val();
  } else {
    // Fallback for codes generated before rules were fixed
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('friendCode'), equalTo(codeToSearch));
    const snap = await get(q);
    
    if (snap.exists()) {
      const childNodes = [];
      snap.forEach(child => { childNodes.push(child); });
      if (childNodes.length > 0) {
        friendId = childNodes[0].key;
        // Heal the mapping node for future lookups
        set(ref(db, `friendCodes/${codeToSearch}`), friendId).catch(console.error);
      }
    }
  }
  
  if (!friendId) return null;
  
  const userSnap = await get(ref(db, `users/${friendId}`));
  if (!userSnap.exists()) return null;
  
  const data = userSnap.val();
  return {
    uid: friendId,
    friendCode: data.friendCode,
    email: data.email,
    username: data.displayName || (data.email ? data.email.split('@')[0] : 'Guest'),
    favoriteGenre: data.favoriteGenre || 'Unknown',
    avatar: data.avatarUrl || data.avatar || null
  };
};

export const getFriendData = async (userId) => {
  const userSnap = await get(ref(db, `users/${userId}`));
  if (!userSnap.exists()) return null;
  const data = userSnap.val();
  let friendCode = data.friendCode;
  if (!friendCode) {
    try {
      friendCode = await ensureFriendCode(userId, data.email);
    } catch (e) {
      console.error('Error ensuring friend code in getFriendData:', e);
    }
  }
  return {
    uid: userId,
    friendCode: friendCode || null,
    email: data.email,
    username: data.displayName || (data.email ? data.email.split('@')[0] : 'Guest'),
    favoriteGenre: data.favoriteGenre || 'Unknown',
    avatar: data.avatarUrl || data.avatar || null
  };
};

export const sendFriendRequest = async (fromId, toId) => {
  if (!fromId || !toId || fromId === toId) return;
  const updates = {};
  updates[`users/${fromId}/outgoingRequests/${toId}`] = Date.now();
  updates[`users/${toId}/incomingRequests/${fromId}`] = Date.now();
  await update(ref(db), updates);
};

export const cancelFriendRequest = async (fromId, toId) => {
  if (!fromId || !toId) return;
  const updates = {};
  updates[`users/${fromId}/outgoingRequests/${toId}`] = null;
  updates[`users/${toId}/incomingRequests/${fromId}`] = null;
  await update(ref(db), updates);
};

export const acceptFriendRequest = async (userId, friendId) => {
  if (!userId || !friendId) return;
  const updates = {};
  // Remove requests
  updates[`users/${userId}/incomingRequests/${friendId}`] = null;
  updates[`users/${friendId}/outgoingRequests/${userId}`] = null;
  updates[`users/${friendId}/incomingRequests/${userId}`] = null;
  updates[`users/${userId}/outgoingRequests/${friendId}`] = null;
  // Add friend
  updates[`users/${userId}/friends/${friendId}`] = Date.now();
  updates[`users/${friendId}/friends/${userId}`] = Date.now();
  await update(ref(db), updates);
};

export const rejectFriendRequest = async (userId, friendId) => {
  if (!userId || !friendId) return;
  const updates = {};
  updates[`users/${userId}/incomingRequests/${friendId}`] = null;
  updates[`users/${friendId}/outgoingRequests/${userId}`] = null;
  await update(ref(db), updates);
};

export const removeFriend = async (userId, friendId) => {
  if (!userId || !friendId) return;
  const updates = {};
  updates[`users/${userId}/friends/${friendId}`] = null;
  updates[`users/${friendId}/friends/${userId}`] = null;
  await update(ref(db), updates);
};

// Fetch relationships
export const getRelationships = async (userId) => {
  const userSnap = await get(ref(db, `users/${userId}`));
  if (!userSnap.exists()) return { friends: [], incoming: [], outgoing: [] };
  
  const data = userSnap.val();
  const friends = data.friends ? Object.keys(data.friends) : [];
  const incoming = data.incomingRequests ? Object.keys(data.incomingRequests) : [];
  const outgoing = data.outgoingRequests ? Object.keys(data.outgoingRequests) : [];
  
  return { friends, incoming, outgoing };
};

export const updateUserProfile = async (userId, data) => {
  if (!userId) return;
  const updates = {};
  if (data.displayName !== undefined) updates[`users/${userId}/displayName`] = data.displayName;
  if (data.avatarUrl !== undefined) updates[`users/${userId}/avatarUrl`] = data.avatarUrl;
  await update(ref(db), updates);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    const profileUpdates = {};
    if (data.displayName !== undefined) profileUpdates.displayName = data.displayName;
    if (data.avatarUrl !== undefined) profileUpdates.photoURL = data.avatarUrl;

    if (Object.keys(profileUpdates).length > 0) {
      try {
        await updateProfile(auth.currentUser, profileUpdates);
      } catch (e) {
        console.error('Error updating Firebase auth profile:', e);
      }
    }
  }
};

// ── Notifications & Recommendations ──────────────────────────────────────────

export const recommendMovie = async (fromId, fromName, toId, movieData, fromAvatar = null) => {
  if (!fromId || !toId || !movieData) return;

  // Check if target user already has it
  const [inWatchlist, inLiked, inWatched] = await Promise.all([
    isInWatchlist(toId, movieData.id).catch(() => false),
    isLiked(toId, movieData.id).catch(() => false),
    isWatched(toId, movieData.id).catch(() => false)
  ]);

  if (inWatchlist || inLiked || inWatched) {
    let listName = inWatched ? 'Already Watched' : (inLiked ? 'Liked' : 'Watchlist');
    throw new Error(`Your friend already has this movie in their ${listName} list!`);
  }

  // Max 10 recommendations limit check: delete oldest if limit reached
  try {
    const existingNotifs = await getNotifications(toId);
    const recNotifs = existingNotifs.filter(n => n.type === 'recommendation');
    if (recNotifs.length >= 10) {
      recNotifs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      const overLimitCount = recNotifs.length - 9;
      for (let i = 0; i < overLimitCount; i++) {
        await removeNotification(toId, recNotifs[i].id);
      }
    }
  } catch (e) {
    console.error('Error enforcing max 10 recommendations limit:', e);
  }

  // Push notification with deterministic key for un-sending
  const notifId = `rec_${fromId}_${movieData.id}`;
  const updates = {};
  updates[`users/${toId}/notifications/${notifId}`] = {
    id: notifId,
    type: 'recommendation',
    fromId,
    fromName,
    fromAvatar: fromAvatar || null,
    movie: {
      id: movieData.id,
      title: movieData.title || movieData.name,
      poster: movieData.poster || (movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null),
      mediaType: movieData.mediaType || movieData.media_type || 'movie',
      year: movieData.year || movieData.release_date?.split('-')[0] || movieData.first_air_date?.split('-')[0] || '',
      category: movieData.category || ''
    },
    timestamp: Date.now()
  };
  
  await update(ref(db), updates);
};

export const unsendRecommendation = async (fromId, toId, movieId) => {
  if (!fromId || !toId || !movieId) return;
  const notifId = `rec_${fromId}_${movieId}`;
  const updates = {};
  updates[`users/${toId}/notifications/${notifId}`] = null;
  await update(ref(db), updates);
};

export const getNotifications = async (userId) => {
  const snap = await get(ref(db, `users/${userId}/notifications`));
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
};

export const removeNotification = async (userId, notifId) => {
  if (!userId || !notifId) return;
  const updates = {};
  updates[`users/${userId}/notifications/${notifId}`] = null;
  await update(ref(db), updates);
};

export const subscribeToNotifications = (userId, callback) => {
  if (!userId) return () => {};
  const notifRef = ref(db, `users/${userId}/notifications`);
  const unsubscribe = onValue(notifRef, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const data = snap.val();
    const list = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
    callback(list);
  });
  return unsubscribe;
};

export const subscribeToRelationships = (userId, callback) => {
  if (!userId) return () => {};
  const userRef = ref(db, `users/${userId}`);
  const unsubscribe = onValue(userRef, (snap) => {
    if (!snap.exists()) {
      callback({ friends: [], incoming: [], outgoing: [] });
      return;
    }
    const data = snap.val();
    const friends = data.friends ? Object.keys(data.friends) : [];
    const incoming = data.incomingRequests ? Object.keys(data.incomingRequests) : [];
    const outgoing = data.outgoingRequests ? Object.keys(data.outgoingRequests) : [];
    callback({ friends, incoming, outgoing });
  });
  return unsubscribe;
};
