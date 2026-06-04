import { useEffect, useRef, useState } from 'react';
import { getMatchChatRequest, postMatchChatRequest } from '../../app/matchApi.js';
import { useAppData } from '../../app/useAppData.js';
import { useGlobalHeader } from '../../app/useGlobalHeader.js';
import styles from './MatchChat.module.css';

export default function MatchChat({ matchId, isActive }) {
  const { currentUser } = useAppData();
  const { t } = useGlobalHeader();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('mangala_chat_open') : null;
    return saved === null ? true : saved === 'true';
  });
  const messagesEndRef = useRef(null);
  
  const getToken = () => {
    return typeof window !== 'undefined' ? (window.localStorage.getItem('mangala.authToken') || window.sessionStorage.getItem('mangala.authToken')) || '' : '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mangala_chat_open', isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!matchId) return;

    let mounted = true;
    
    const fetchChat = async () => {
      try {
        const msgs = await getMatchChatRequest(matchId, getToken());
        if (mounted) {
          setMessages(msgs || []);
        }
      } catch (err) {
        // Chat might not be available or unauthorized
      }
    };

    // Initial fetch
    void fetchChat();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      void fetchChat();
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [matchId, isActive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting || !isActive) return;

    setIsSubmitting(true);
    try {
      const newMsg = await postMatchChatRequest(matchId, inputText.trim(), getToken());
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        document.getElementById('chat-input')?.focus();
      }, 0);
    }
  };

  const toggleChat = () => setIsOpen((prev) => !prev);
  const hasMessages = messages.length > 0;

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatWindow}>
        <div className={styles.chatHeader} onClick={toggleChat} role="button" tabIndex={0}>
          <span>{t('chat.matchChat')} {hasMessages ? `(${messages.length})` : ''}</span>
          <span className={styles.chatHeaderIcon}>{isOpen ? '▼' : '▲'}</span>
        </div>
        
        {isOpen && (
          <div className={styles.chatBody}>
            <div className={styles.messagesContainer}>
              {!hasMessages && (
                <div className={styles.noMessages}>
                  {t('chat.noMessagesYet')}<br />
                  {isActive ? t('chat.sayHi') : t('chat.matchHasEnded')}
                </div>
              )}
              {messages.map((msg) => {
                const isOwn = String(msg.senderId) === String(currentUser?.id);
                return (
                  <div 
                    key={msg.id} 
                    className={`${styles.message} ${isOwn ? styles.ownMessage : styles.opponentMessage}`}
                  >
                    {!isOwn && <span className={styles.messageSender}>{msg.username}</span>}
                    {msg.text}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className={styles.inputForm}>
              <input
                id="chat-input"
                type="text"
                className={styles.inputField}
                placeholder={isActive ? t('chat.typeMessage') : t('chat.matchHasEnded')}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!isActive || isSubmitting}
                maxLength={200}
                autoComplete="off"
              />
              <button 
                type="submit" 
                className={styles.sendButton}
                disabled={!inputText.trim() || !isActive || isSubmitting}
                aria-label={t('chat.send')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.01 21L23 12L2.01 3L2 10l15 2-15 2z" fill="currentColor"/>
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
