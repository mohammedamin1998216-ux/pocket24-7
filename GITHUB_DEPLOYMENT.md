# GitHub Deployment & Firebase Setup Guide

When you export your app to GitHub or deploy it to a external hosting provider (like GitHub Pages, Vercel, Netlify, or Firebase Hosting), you need to configure your own **Firebase Project**. 

Because the default Firebase sandbox is managed securely inside Google's AI Studio developer container, external deployments cannot write to it directly or perform Google Authentication without configuration. This guide will walk you through setting up your own Firebase Backend in under 5 minutes!

---

## Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g., `pocket24-trading`).
3. Click **Continue** and complete the project creation.

---

## Step 2: Enable Authentication (Google Sign-In)
1. In the left-hand menu of your Firebase Console, click on **Build** -> **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, select **Google** as a provider.
4. Enable the Google provider, configure your project support email, and click **Save**.
5. **Crucial for external domains (like GitHub Pages or custom domains):**
   - Under **Authentication** -> **Settings** -> **Authorized domains**, make sure your deployment domain (e.g., `your-username.github.io` or `your-app.vercel.app`) is added to the list. (By default, `localhost` is already allowed).

---

## Step 3: Create a Firestore Database
1. In the left-hand menu, click on **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose your database location and click **Next**.
4. Select **Start in test mode** (or production mode) and click **Create**.
5. In the **Rules** tab of Firestore, paste the security rules (you can find these in the `firestore.rules` file in this repository):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
6. Click **Publish** to save the security rules.

---

## Step 4: Register your Web App & Get Credentials
1. Go to **Project Settings** (the gear icon next to "Project Overview").
2. Scroll down to the "Your apps" section and click the **Web icon (`</>`)**.
3. Register your app (e.g., `pocket24-web`).
4. You will be shown a `firebaseConfig` object. Copy those values!

---

## Step 5: Configure Environment Variables
To securely feed your credentials into the React application without hardcoding them:

### A. Local Development
Create a file named `.env` in the root of your project directory and add your credentials:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### B. Hosting Providers (Vercel, Netlify, GitHub Pages)
Add these exact same environment variables under the **Environment Variables** section of your hosting provider's dashboard settings:
* `VITE_FIREBASE_API_KEY`
* `VITE_FIREBASE_AUTH_DOMAIN`
* `VITE_FIREBASE_PROJECT_ID`
* `VITE_FIREBASE_STORAGE_BUCKET`
* `VITE_FIREBASE_MESSAGING_SENDER_ID`
* `VITE_FIREBASE_APP_ID`

Once deployed with these environment variables, your app will automatically connect to your live Firebase backend and Authentication will work flawlessly!
