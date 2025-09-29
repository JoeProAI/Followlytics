'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const signUp = async (email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      createdAt: new Date(),
      xConnected: false,
      xUsername: null,
    })
  }

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(auth, provider)
    
    // Create user document in Firestore if it doesn't exist
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date(),
      xConnected: false,
      xUsername: null,
    }, { merge: true })
  }

  const logout = async () => {
    await signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔍 Auth state changed:', user ? `User: ${user.uid}` : 'No user')
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
