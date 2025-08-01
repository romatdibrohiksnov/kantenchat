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

// 获取 HTML 元素的引用
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const usernameInput = document.getElementById('username-input');

// 引用 Firestore 中的 'messages' 集合，并按时间戳排序
const messagesCollection = firestore.collection('messages').orderBy('timestamp');

// 发送消息的函数
function sendMessage() {
    const messageText = messageInput.value.trim();
    const username = usernameInput.value.trim() || 'Anonymous'; // 如果没有名字，默认为匿名

    if (messageText) {
        // 在 'messages' 集合中添加一个新文档
        messagesCollection.add({
            text: messageText,
            username: username,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // 使用服务器时间以保证一致性
        })
        .then(() => {
            // 发送后清空输入框
            messageInput.value = '';
            // 滚动到底部
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch((error) => {
            console.error("发送消息时出错: ", error);
        });
    }
}

// 为发送按钮添加点击事件监听器
sendButton.addEventListener('click', sendMessage);

// 为消息输入框的回车键添加事件监听器
messageInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 监听 Firestore 的实时更新
messagesCollection.onSnapshot(snapshot => {
    // 在添加新消息前清空容器
    messagesContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
        const message = doc.data();
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-bubble');

        // 检查消息是否来自当前用户，以应用不同样式
        const currentUser = usernameInput.value.trim() || 'Anonymous';
        if (message.username === currentUser) {
            messageElement.classList.add('user');
        } else {
            messageElement.classList.add('other');
        }
        
        // 创建一个用于显示用户名的元素
        const usernameElement = document.createElement('div');
        usernameElement.classList.add('username');
        usernameElement.textContent = message.username;
        
        messageElement.appendChild(usernameElement);
        messageElement.append(document.createTextNode(message.text));
        
        messagesContainer.appendChild(messageElement);
    });

    // 自动滚动到最新消息
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});