import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import './PrivateChat.css';

function PrivateChat() {
    const navigate = useNavigate()

    // matching, chatting, blocked
    const[matchingStatus, setMatchingStatus] = useState("matching");

    // list for messages
    const [msgs, setMsgs] = useState([]);

    // current chatting message
    const [inputText, setInputText] = useState("");

    const msgEndRef = useRef(null);
    const scrollToBottom = () => {
        msgEndRef.current?.scrollIntoView({behavior:"smooth"})
    };
    useEffect(scrollToBottom, [msgs]);

    const [blockedUsers, setBlockedUsers] = useState([]);

    const handleBlock = () => {
        const targetUser = "others";
        if(!blockedUsers.includes(targetUser)) {
            setBlockedUsers([...blockedUsers, targetUser]);
            alert(`${targetUser}님이 차단되었습니다.`);
        }
        setMatchingStatus("blocked");
    };

    function getTimeStr() {
        const now = new Date();
        const hourStr = now.getHours();
        const minuteStr = now.getMinutes().toString().padStart(2, '0');
        const dayStr = now.getSeconds().toString().padStart(2, '0');
        
        return `${hourStr}:${minuteStr}:${dayStr}`;
    }

    // sending function
    function handleSendMsg() {
        if(inputText.trim() === "") return;

        // generate new msg object
        const newMsg = {
            id: msgs.length+1,
            time: getTimeStr(),
            text: inputText,
            sender: "me"
        }
        
        setMsgs([...msgs, newMsg]);
        setInputText("");
    }

    const startMatching = () => {
        setMatchingStatus("matching");
        setMsgs([]);

        setTimeout(() => {
            setMatchingStatus("chatting");
        }, 2000);
    }

    const renderMsg = msgs.map((msg) => 
        <div key={msg.id} className={`chat-bubble ${msg.sender === "me"? 'me': 'others'}`}>
            <span className={`chat-text ${msg.sender === "me"? 'me':'others'}`}>
                {msg.text}
            </span>
            <span className="chat-time">
                {msg.time}
            </span>
        </div>);

    const renderChatBlock = () => {
        if(matchingStatus === "matching") {
            return (<div className="info-box">
                <div className="spinner">🌀</div>
                <p>새로운 상대를 찾는 중...</p>
            </div>);
        }
        else if(matchingStatus === "chatting") {
            return (<>
                <div className="info-box">
                    <p>매칭되었습니다. 즐거운 시간 되세요!</p>
                </div>
                {renderMsg}
                <div ref={msgEndRef} />
            </>);
        }
        else {
            return (<div className="info-box">
                <p>차단되었습니다.</p>
            </div>);
        }
    }

        useEffect(() => {
            startMatching();
        }, []);

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
                    onKeyDown={(e) => e.key === "Enter" && matchingStatus === "chatting" && handleSendMsg()}
                    placeholder="메시지 입력..."
                    className="input-bubble"
                    disabled={matchingStatus === "blocked"}
                    autoFocus
                />
                <button onclick={handleSendMsg} style={{padding: '10px'}}>전송</button>
            </div>
            <div style={{marginTop: '10px'}}>
                <button className="block-button" onClick={handleBlock}>차단</button>
                <button className="new-matching-button" onClick={startMatching}>새로운 상대</button>
                <button className="quit-button" onClick={() => navigate('/')}>나가기</button>
            </div>
        </div>
    );
}

export default PrivateChat;