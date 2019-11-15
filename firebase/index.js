import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAp7IVmar_I5pIGx-SXbNk0C8HqZioltYY",
  authDomain: "read-the-room.firebaseapp.com",
  databaseURL: "https://read-the-room.firebaseio.com",
  projectId: "read-the-room",
  storageBucket: "read-the-room.appspot.com",
  messagingSenderId: "120436536741",
  appId: "1:120436536741:web:29867dcd407551f582244c",
  measurementId: "G-CD4BWF2EM4"
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();
