import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

// 데이터 생성
export const createData = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating document:', error)
    throw error
  }
}

// 데이터 조회
export const getData = async (collectionName, conditions = []) => {
  try {
    let q = collection(db, collectionName)
    
    if (conditions.length > 0) {
      q = query(q, ...conditions.map(c => {
        if (c.type === 'where') {
          return where(c.field, c.operator, c.value)
        }
        if (c.type === 'orderBy') {
          return orderBy(c.field, c.direction)
        }
        return null
      }).filter(Boolean))
    }
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting documents:', error)
    throw error
  }
}

// 데이터 수정
export const updateData = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating document:', error)
    throw error
  }
}

// 데이터 삭제
export const deleteData = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId))
  } catch (error) {
    console.error('Error deleting document:', error)
    throw error
  }
}

// 사용자 역할 설정 함수 추가
export const createUserRole = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid)
    await setDoc(userRef, {
      role: 'user',  // 기본 역할을 'user'로 설정
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error setting user role:', error)
    throw error
  }
}

// 이메일 회원가입 함수 수정
export const signUpWithEmail = async (email, password) => {
  try {
    const auth = getAuth()
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    // 회원가입 후 사용자 역할 설정
    await createUserRole(user.uid)
    return user
  } catch (error) {
    console.error('Error signing up with email:', error)
    throw error
  }
}

// 구글 로그인 함수 수정
export const signInWithGoogle = async () => {
  try {
    const auth = getAuth()
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(auth, provider)
    
    // 사용자 문서 확인
    const userRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userRef)
    
    // 사용자 문서가 없으면 새로 생성 (첫 구글 로그인인 경우)
    if (!userDoc.exists()) {
      await createUserRole(user.uid)
    }
    
    return user
  } catch (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
}

// 사용자 역할 확인 함수
export const checkUserRole = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid)
    const userDoc = await getDoc(userRef)
    if (userDoc.exists()) {
      return userDoc.data().role
    }
    return null
  } catch (error) {
    console.error('Error checking user role:', error)
    throw error
  }
}

// 관리자 확인 함수
export const isAdmin = async (uid) => {
  try {
    const role = await checkUserRole(uid)
    return role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
} 