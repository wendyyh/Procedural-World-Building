import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import {
  addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, where,
} from 'firebase/firestore'
import { auth, db } from '../../lib/firebase.js'
import { PRESET_SCHEMA_VERSION, parsePreset, validatePreset } from './presetSchema.js'

function presetCollection(userId) {
  if (!db || !userId || auth.currentUser?.uid !== userId) {
    throw new Error('Sign in to access your saved configurations.')
  }
  return collection(db, 'users', userId, 'presets')
}

export function signIn() {
  if (!auth) throw new Error('Cloud saves are not connected in this build.')
  return signInWithPopup(auth, new GoogleAuthProvider())
}

export function signOutUser() {
  if (!auth) return Promise.resolve()
  return signOut(auth)
}

export async function savePreset(userId, kind, name, config, view) {
  const payload = validatePreset(kind, name, config, view)
  const reference = await addDoc(presetCollection(userId), {
    ...payload,
    schemaVersion: PRESET_SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return reference.id
}

export function subscribeToPresets(userId, kind, onValue, onError) {
  const request = query(
    presetCollection(userId),
    where('kind', '==', kind),
    orderBy('updatedAt', 'desc'),
    limit(40),
  )
  return onSnapshot(request, (snapshot) => {
    onValue(snapshot.docs.map((item) => ({
      id: item.id,
      name: typeof item.data().name === 'string' ? item.data().name : 'Untitled save',
      updatedAt: item.data().updatedAt?.toDate?.() ?? null,
    })))
  }, onError)
}

export async function loadPreset(userId, kind, presetId) {
  const reference = doc(presetCollection(userId), presetId)
  const snapshot = await getDoc(reference)
  if (!snapshot.exists()) throw new Error('This save no longer exists.')
  return parsePreset(snapshot.data(), kind)
}
