// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {getFirestore} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD8GJixBPSBBasTKqgUmySitfDAlQjhGew",
  authDomain: "goalify-20372.firebaseapp.com",
  projectId: "goalify-20372",
  storageBucket: "goalify-20372.firebasestorage.app",
  messagingSenderId: "669741818521",
  appId: "1:669741818521:web:3a5d7f86cbab9a4f37ce08",
  measurementId: "G-P9QC896MSK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);