import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";

import './TeamChat.css';

function TeamChat() {
    const navigate = useNavigate()
    const { roomHash } = useParams();

    // list for messages
    const [msgs, setMsgs] = useState([]);

    // current chatting message
    const [inputText, setInputText] = useState("");

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const userID = queryParams.get("nickname") || "Anonymous"

    const msgEndRef = useRef(null);
    const scrollToBottom = () => {
        msgEndRef.current?.scrollIntoView({behavior:"smooth"})
    };

    useEffect(scrollToBottom, [msgs]);

    useEffect(() => {
        const q = query(
            collection(db, "chats", roomHash, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const  newMsgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMsgs(newMsgs);
        });

        return () => unsubscribe()
    }, [roomHash]);

    function getTimeStr() {
        const now = new Date();
        const hourStr = now.getHours();
        const minuteStr = now.getMinutes().toString().padStart(2, '0');
        const dayStr = now.getSeconds().toString().padStart(2, '0');
        
        return `${hourStr}:${minuteStr}:${dayStr}`;
    }

    // sending function
    const handleSendMsg = async() => {
        if(inputText.trim() === "") return;

        const currentText = inputText;
        setInputText("");

        await addDoc(collection(db, "chats", roomHash, "messages"), {
            text: currentText,
            sender: userID,
            createdAt: serverTimestamp(),
            time: getTimeStr()
        })
    }

    const renderMsg = msgs.map((msg) => 
        <div key={msg.id} className={`chat-bubble ${msg.sender === userID? 'me': 'others'}`}>
            <div className="nickname-label">{msg.sender}</div>
            <span className={`chat-text ${msg.sender === userID? 'me':'others'}`}>
                {msg.text}
            </span>
            <span className="chat-time">{msg.time}</span>
        </div>);

    const renderChatBlock = () => (
        <>
            {renderMsg}
            <div ref={msgEndRef} />
        </>);
        
    
    return (
        <div className="chat-background">
            <h3>1:1 채팅방</h3>

            <div className="chat-board">
                {renderChatBlock()}
            </div>
            <div className="input-box">
                <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMsg()}
                    placeholder="메시지 입력..."
                    className="input-bubble"
                    autoFocus
                />
                <button onClick={handleSendMsg} style={{padding: '10px'}}>전송</button>
            </div>
            <div style={{marginTop: '10px'}}>
                <button className="quit-button" onClick={() => navigate('/team-lounge')}>나가기</button>
            </div>
        </div>
    );
}

export default TeamChat;