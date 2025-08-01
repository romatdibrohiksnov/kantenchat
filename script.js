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

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
const auth = firebase.auth();

// 获取 HTML 元素的引用
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const inputContainer = document.getElementById('input-container');
const roomNameSpan = document.getElementById('room-name');

// 从 URL 获取聊天室名称，默认为 'general'
const urlParams = new URLSearchParams(window.location.search);
const roomName = urlParams.get('room') || 'general';
roomNameSpan.textContent = `#${roomName}`;

// 动态地引用 Firestore 集合
const messagesCollection = firestore.collection('rooms').doc(roomName).collection('messages').orderBy('timestamp');

// 认证提供商
const provider = new firebase.auth.GoogleAuthProvider();

// 登录/登出事件监听
loginButton.addEventListener('click', () => auth.signInWithPopup(provider).catch(error => console.error(error)));
logoutButton.addEventListener('click', () => auth.signOut());

// 监听用户的认证状态
auth.onAuthStateChanged(user => {
    if (user) {
        // 用户已登录
        loginButton.style.display = 'none';
        logoutButton.style.display = 'block';
        userInfo.style.display = 'inline';
        userInfo.textContent = `Welcome, ${user.displayName}`;
        inputContainer.style.display = 'flex';

        usernameInput.value = user.displayName;

        listenForMessages();

    } else {
        // 用户未登录
        loginButton.style.display = 'block';
        logoutButton.style.display = 'none';
        userInfo.style.display = 'none';
        inputContainer.style.display = 'none';
        messagesContainer.innerHTML = '<h2>Please sign in to see the chat.</h2>';
    }
});

// 发送消息的函数
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
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            .catch((error) => console.error("Error sending message: ", error));
    }
}

// 为发送按钮和回车键添加事件监听器
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => (e.key === 'Enter' ? sendMessage() : null));

// 监听消息的函数 (在用户登录后调用)
let unsubscribe; // 用于存储取消监听的函数

function listenForMessages() {
    // 如果已经存在一个监听器，先取消它
    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = messagesCollection.onSnapshot(snapshot => {
        messagesContainer.innerHTML = '';

        snapshot.forEach(doc => {
            const message = doc.data();
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
                const date = message.timestamp.toDate();
                timestampElement.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            messageElement.appendChild(usernameElement);
            messageElement.append(document.createTextNode(message.text));
            messageElement.appendChild(timestampElement);

            messagesContainer.appendChild(messageElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}