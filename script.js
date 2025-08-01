// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAeBUltOgHTifePQXWkIrG0gkY6hV0h_-o",
    authDomain: "kantenchat.firebaseapp.com",
    projectId: "kantenchat",
    storageBucket: "kantenchat.firebasestorage.app",
    messagingSenderId: "49055453642",
    appId: "1:49055453642:web:bc0133d67e8dbb88c63f33",
    measurementId: "G-D86JB1906G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const auth = firebase.auth();

// --- 获取 HTML 元素的引用 ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const userDisplayName = document.getElementById('user-display-name');
const logoutButton = document.getElementById('logout-button');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const roomNameSpan = document.getElementById('room-title');

// --- 聊天室逻辑 ---
const urlParams = new URLSearchParams(window.location.search);
const roomName = urlParams.get('room') || 'general';
roomNameSpan.textContent = `Chat Room: #${roomName}`;
const messagesCollection = firestore.collection('rooms').doc(roomName).collection('messages').orderBy('timestamp');

// --- 认证状态监听 ---
auth.onAuthStateChanged(user => {
    if (user) {
        // 用户已登录
        authContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        userDisplayName.textContent = user.displayName;
        listenForMessages();
    } else {
        // 用户未登录
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

// --- 表单切换逻辑 ---
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// --- 注册逻辑 ---
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const displayName = registerForm['register-name'].value;
    const email = registerForm['register-email'].value;
    const password = registerForm['register-password'].value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // 更新用户的显示名称
            return userCredential.user.updateProfile({
                displayName: displayName
            });
        })
        .then(() => {
            // 注册成功后表单会自动隐藏，因为 onAuthStateChanged 会触发
        })
        .catch(error => {
            authError.textContent = error.message;
        });
});

// --- 登录逻辑 ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            authError.textContent = error.message;
        });
});

// --- 登出逻辑 ---
logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// --- 消息发送逻辑 ---
function sendMessage() {
    const messageText = messageInput.value.trim();
    const currentUser = auth.currentUser;

    if (messageText && currentUser) {
        messagesCollection.add({
            text: messageText,
            username: currentUser.displayName,
            uid: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
            .then(() => {
                messageInput.value = '';
            })
            .catch((error) => console.error("Error sending message: ", error));
    }
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => (e.key === 'Enter' ? sendMessage() : null));

// --- 实时消息监听与渲染 ---
let unsubscribe;
function listenForMessages() {
    if (unsubscribe) unsubscribe();

    unsubscribe = messagesCollection.onSnapshot(snapshot => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const message = doc.data();
            const messageId = doc.id;
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-bubble');

            const currentUser = auth.currentUser;
            if (currentUser && message.uid === currentUser.uid) {
                messageElement.classList.add('user');
            } else {
                messageElement.classList.add('other');
            }

            const usernameElement = document.createElement('div');
            usernameElement.classList.add('username');
            usernameElement.textContent = message.username;

            const timestampElement = document.createElement('div');
            timestampElement.classList.add('timestamp');
            if (message.timestamp) {
                timestampElement.textContent = message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            // 只有管理员才能删除所有消息
            if (isAdmin) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '×';
                deleteBtn.onclick = () => messagesCollection.doc(messageId).delete();
                messageElement.appendChild(deleteBtn);
            }

            messageElement.appendChild(usernameElement);
            messageElement.append(document.createTextNode(message.text));
            messageElement.appendChild(timestampElement);

            messagesContainer.appendChild(messageElement);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}