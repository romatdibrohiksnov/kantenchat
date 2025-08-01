// 你的 Firebase 应用配置
const firebaseConfig = {
    apiKey: "AIzaSyAeBUltOgHTifePQXWkIrG0gkY6hV0h_-o",
    authDomain: "kantenchat.firebaseapp.com",
    projectId: "kantenchat",
    storageBucket: "kantenchat.firebasestorage.app",
    messagingSenderId: "49055453642",
    appId: "1:49055453642:web:bc0133d67e8dbb88c63f33",
    measurementId: "G-D86JB1906G"
};

// 使用兼容性语法初始化 Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const auth = firebase.auth();

// 确保在整个 DOM 加载完毕后才执行我们的代码
document.addEventListener("DOMContentLoaded", () => {

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
    const isAdmin = urlParams.get('admin') === 'true';
    roomNameSpan.textContent = `Chat Room: #${roomName}`;
    const messagesCollection = firestore.collection('rooms').doc(roomName).collection('messages').orderBy('timestamp');

    // --- 认证功能 ---
    function clearAuthError() {
        authError.textContent = '';
    }

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        clearAuthError();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        clearAuthError();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAuthError();
        const displayName = registerForm['register-name'].value;
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => userCredential.user.updateProfile({ displayName: displayName }))
            .catch(error => { authError.textContent = error.message; });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAuthError();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        auth.signInWithEmailAndPassword(email, password)
            .catch(error => { authError.textContent = error.message; });
    });

    logoutButton.addEventListener('click', () => auth.signOut());

    // --- 消息功能 ---
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
                .then(() => { messageInput.value = ''; })
                .catch((error) => console.error("Error sending message: ", error));
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- 核心逻辑：消息监听与渲染 ---
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

                if (isAdmin || (currentUser && message.uid === currentUser.uid)) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.title = 'Delete message';
                    deleteBtn.onclick = () => {
                        if (confirm('确认删除这条消息吗？')) {
                            messagesCollection.doc(messageId).delete().catch(err => console.error("Error deleting message:", err));
                        }
                    };
                    messageElement.appendChild(deleteBtn);
                }

                messageElement.appendChild(usernameElement);
                messageElement.append(document.createTextNode(message.text));
                messageElement.appendChild(timestampElement);

                messagesContainer.appendChild(messageElement);
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, error => {
            console.error("Error listening for messages: ", error);
        });
    }

    // --- 认证状态机：控制UI显示 ---
    auth.onAuthStateChanged(user => {
        if (user) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'flex';
            userDisplayName.textContent = user.displayName;
            listenForMessages();
        } else {
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            if (unsubscribe) unsubscribe();
        }
    });
});