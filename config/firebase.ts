import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDlq9TaxZt4FjnoY6kDansmpOzvnNyo1ts",
    authDomain: "hengout-482ec.firebaseapp.com",
    projectId: "hengout-482ec",
    storageBucket: "hengout-482ec.firebasestorage.app",
    messagingSenderId: "773751805963",
    appId: "1:773751805963:web:5b59a2fa20268937378f0e",
    measurementId: "G-ZEWZEN912F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;


