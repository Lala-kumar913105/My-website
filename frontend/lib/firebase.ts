import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCoeIoY6glky3nK2QU9VmP76iSCbWi2RoI",
  authDomain: "ecommerce-app-2d156.firebaseapp.com",
  projectId: "ecommerce-app-2d156",
  storageBucket: "ecommerce-app-2d156.firebasestorage.app",
  messagingSenderId: "869360159964",
  appId: "1:869360159964:web:7cae975bd38f4926bbf819",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);