import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../app/socketContext';
import { useAppData } from '../app/useAppData';
import { getFriendsRequest } from '../app/friendsApi';
import { getMessagesRequest } from '../app/messagesApi';
import { useGlobalHeader } from '../app/useGlobalHeader';
import styles from './FriendChatWidget.module.css';
import { isGuestUser } from '../app/appState';
import closeIcon from '../assets/close.svg';

function ChatWindow({ friend, onClose, token, currentUserId }) {
  const socket = useSocket();
  const { t } = useGlobalHeader();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const history = await getMessagesRequest(friend.id, token);
        if (active) setMessages(history);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    fetchHistory();
    return () => { active = false; };
  }, [friend.id, token]);

  useEffect(() => {
    if (!socket) return;
    
    const handleReceive = (msg) => {
      if (
        (String(msg.sender_id) === String(friend.id) && String(msg.receiver_id) === String(currentUserId)) ||
        (String(msg.sender_id) === String(currentUserId) && String(msg.receiver_id) === String(friend.id))
      ) {
        setMessages(prev => [...prev, msg]);
        if (String(msg.receiver_id) === String(currentUserId)) {
          socket.emit('mark_read', { messageIds: [msg.id] });
        }
      }
    };

    socket.on('receive_message', handleReceive);
    return () => {
      socket.off('receive_message', handleReceive);
    };
  }, [socket, friend.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    
    socket.emit('send_message', { receiverId: friend.id, content: inputText.trim() }, (response) => {
      if (response && response.success) {
        setMessages(prev => [...prev, response.message]);
      }
    });
    
    setInputText('');
  };

  return (
    <div className={styles.chatWindow}>
      <div className={styles.header} onClick={onClose}>
        <span>{friend.username}</span>
        <button type="button" className={styles.iconButton}>
          <img src={closeIcon} alt="Close" width="16" height="16" />
        </button>
      </div>
      
      <div className={styles.messageArea}>
        {messages.map((m, idx) => {
          const isSelf = String(m.sender_id) === String(currentUserId);
          const timeString = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          return (
            <div key={m.id || idx} className={`${styles.messageRow} ${isSelf ? styles.messageSelf : styles.messageOther}`}>
              <div className={styles.messageBubble}>{m.content}</div>
              <div className={styles.messageTime}>{timeString}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputArea} onSubmit={handleSend}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className={styles.inputField} 
          placeholder={t('chat.typeMessage')}
        />
        <button type="submit" className={styles.sendButton} disabled={!inputText.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}

export default function FriendChatWidget() {
  const { isAuthenticated, currentUser } = useAppData();
  const socket = useSocket();
  const { t } = useGlobalHeader();
  
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!isAuthenticated || isGuestUser(currentUser)) return;
    
    let active = true;
    const loadFriends = async () => {
      try {
        const token = typeof window !== 'undefined' 
          ? (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) 
          : '';
        if (!token) return;
        
        const data = await getFriendsRequest(token);
        if (active) {
          const acceptedFriends = data.filter(f => f.status === 'accepted').map(f => {
            // API returns requester/addressee info, we need the "other" user
            if (String(f.requester_id) === String(currentUser.id)) {
              return { id: f.addressee_id, username: f.username };
            }
            return { id: f.requester_id, username: f.username };
          });
          setFriends(acceptedFriends);
        }
      } catch (err) {
        console.error('Failed to load friends', err);
      }
    };
    
    loadFriends();
    const interval = setInterval(loadFriends, 30000); // refresh friends list
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!socket) return;
    
    const handleReceive = (msg) => {
      // If the chat window is not open, increment unread count
      if (String(msg.receiver_id) === String(currentUser.id)) {
        if (!activeChats.find(f => String(f.id) === String(msg.sender_id))) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
          }));
        }
      }
    };

    socket.on('receive_message', handleReceive);
    return () => {
      socket.off('receive_message', handleReceive);
    };
  }, [socket, currentUser.id, activeChats]);

  if (!isAuthenticated || isGuestUser(currentUser)) {
    return null;
  }

  const token = typeof window !== 'undefined' 
    ? (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) 
    : '';

  const toggleOpen = () => setIsOpen(!isOpen);

  const openChat = (friend) => {
    if (!activeChats.find(f => f.id === friend.id)) {
      setActiveChats(prev => [...prev, friend].slice(-3)); // limit to 3 open chats
    }
    // Clear unread count when opening
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[friend.id];
      return next;
    });
  };

  const closeChat = (friendId) => {
    setActiveChats(prev => prev.filter(f => f.id !== friendId));
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className={styles.widgetContainer}>
      {activeChats.map(friend => (
        <ChatWindow 
          key={friend.id} 
          friend={friend} 
          token={token}
          currentUserId={currentUser.id}
          onClose={() => closeChat(friend.id)} 
        />
      ))}
      
      <div className={`${styles.friendsListWindow} ${!isOpen ? styles.minimized : ''}`}>
        <div className={styles.header} onClick={toggleOpen}>
          <span className={styles.messageLabel}>
            {t('chat.messages')} {totalUnread > 0 && `(${totalUnread})`}
            {!isOpen && totalUnread > 0 && (
              <span className={styles.launcherUnreadBadge}>{totalUnread}</span>
            )}
          </span>
          <span className={styles.iconButton}>{isOpen ? '▼' : '▲'}</span>
        </div>
        
        {isOpen && (
          <div className={styles.body}>
            {friends.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                {t('chat.noFriendsYet')}
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className={styles.friendItem} onClick={() => openChat(friend)}>
                  <div className={styles.friendInfo}>
                    <div className={styles.statusDot} />
                    {friend.username}
                  </div>
                  {unreadCounts[friend.id] > 0 && (
                    <div className={styles.unreadBadge}>{unreadCounts[friend.id]}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
