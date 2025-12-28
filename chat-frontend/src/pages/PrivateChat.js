// src/pages/PrivateChat.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, addDoc, collection, getDoc, onSnapshot, query, serverTimestamp, where, getDocs, deleteDoc, updateDoc, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase";
import startMatchingLogic from "../components/MatchManager";
import './PrivateChat.css';

function PrivateChat({user}) {
    const navigate = useNavigate();
    
    // 상태 관리 (UI 업데이트용)
    const [matchingStatus, setMatchingStatus] = useState(""); // matching, chatting, terminated
    const [roomHash, setRoomHash] = useState(null);
    const [msgs, setMsgs] = useState([]);
    const [inputText, setInputText] = useState("");
    const [blockedUsers, setBlockedUsers] = useState([]);
    

    // Scroll 관련 기능
    const msgEndRef = useRef(null);
    const scrollToBottom = useCallback(() => {
        msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(scrollToBottom, [msgs, scrollToBottom]);


    // Listen to the state of room and update matching status
    useEffect(() => {
        if(!roomHash) return;
        
        // 매칭 종료 후 이벤트 처리 함수
        const unsubscribe = onSnapshot(doc(db, "privateRooms", roomHash), (snap) => {
            // 상대방이 방 DB를 없앴을 경우 내 쪽에서 연결 해제
            if(!snap.exists() && matchingStatus === "chatting") {
                setRoomHash(null);
                setMatchingStatus("terminated");
                return;
            }

            // 채팅방이 종료된 경우 내 쪽에서 연결 해제
            const data = snap.data();
            if(data.status === "terminated") {
                if(data.terminatedBy !== user.uid && data.exitReason === "blocked") {
                    alert("상대방이 당신을 차단했습니다.")
                }
                setRoomHash(null);
                setMatchingStatus("terminated");
            }
        });

        return unsubscribe;
    }, [roomHash]);
    
    // message listening
    useEffect(() => {
        if(!roomHash) return;

        (async() => {
            try {
                const myQueueRef = doc(db, "matchQueue", user.uid);
                await deleteDoc(myQueueRef);
            } catch(e) {
                console.log("Error while delete my data from matchQueue: ", e);
            }
        })();

        const q = query(
            collection(db, "privateRooms", roomHash, "messages"),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMsgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().createdAt?.toDate().toLocaleTimeString('ko-KR', {
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                })
            }));
            setMsgs(newMsgs);
        });

        return unsubscribe
    }, [roomHash]);


    // --- 비즈니스 로직 함수들 ---
    const handleStartMatching = async () => {
        if(roomHash) return;

        setMatchingStatus("matching");
        setMsgs([]);
        
        try {
            const newRoomHash = await startMatchingLogic(user.uid, blockedUsers);
            if (newRoomHash) {
                setRoomHash(newRoomHash);
                setMatchingStatus("chatting");
            }
        } catch (err) {
            console.error("Match error:", err);
            alert("매칭에 실패했습니다. 연결 상태를 확인하세요.")
        }
    };

    // UID 초기화 및 로컬스토리지 저장 (최초 1회)
    useEffect(() => {
        if(user && auth.currentUser) {
            console.log("SDK 인증 완료: ", auth.currentUser.uid);
            handleStartMatching(); // 진입 시 바로 매칭 시작
        }
        else {
            console.log("인증세션 대기 중...");
        }
    }, [user]);

    const handleSendMsg = async() => {
        if (!inputText.trim() || !roomHash) return;

        await addDoc(collection(db, "privateRooms", roomHash, "messages"), {
            text: inputText,
            sender: user.uid,
            createdAt: serverTimestamp(),
        });
        setInputText("");
    };

    const handleBlock = async() => {
        if(!roomHash) return;
        
        const roomSnap = await getDoc(doc(db, "privateRooms", roomHash));
        
        if(roomSnap.exists()) {
            const {participants} = roomSnap.data()
            const opponentUID = participants.find(id => id !== user.uid);
            
            if(opponentUID) {
                setBlockedUsers([...blockedUsers, opponentUID]);
                localStorage.setItem("blocked_users", JSON.stringify(blockedUsers));
                alert("상대방을 차단하였습니다.")
            }
        }
        setMatchingStatus("terminated");
        await terminateSession("blocked");
    };

    // 매칭되었던 방을 닫고 데이터 삭제
    const terminateSession = async(reason="exit") => {
        if(!roomHash) return;
        setRoomHash(null);

        await updateDoc(doc(db, "privateRooms", roomHash), {
            status: "terminated",
            exitReason: reason,
            terminatedBy: user.uid
        });

        // 2. 메시지 즉시 삭제 (휘발성 보장)
        const msgsSnap = await getDocs(collection(db, "privateRooms", roomHash, "messages"));
        const deletePromises = msgsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
    };

    // --- 매칭 실시간 리스너 --- =================================================
    useEffect(() => {
        if (!user.uid || matchingStatus !== "matching") return;

        const q = query(
            collection(db, "privateRooms"),
            where("participants", "array-contains", user.uid),
            where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, async(snapshot) => {
            const newRoom = snapshot.docChanges().find(
                change => (change.type ==="added" || 
                (change.type === "modified" && change.doc.data().status === "active")));

            if(newRoom) {
                const roomID = newRoom.doc.id;
                await deleteDoc(doc(db, "matchQueue", user.uid));
                setRoomHash(roomID);
                setMatchingStatus("chatting");
            }
        });
        return unsubscribe;
    }, [matchingStatus]);

    // --- 렌더링 헬퍼 ---
    const renderChatBlock = () => {
        if(matchingStatus === "matching") return <div className="spinner">🌀 매칭 중...</div>
        
        return (
            <div className="chat-messages-container">
                {msgs.map(msg => (
                        <div key={msg.id} className={`chat-bubble ${(msg.sender === user.uid) ? "me" : "others"}`}>
                            <span className={`chat-text ${(msg.sender === user.uid) ? "me" : "others"}`}>{msg.text}</span>
                            <span className="chat-time">{msg.time}</span>
                        </div>
                        ))}
                {matchingStatus === "blocked" && renderTerminatedBlock("해당 사용자와의 대화를 종료했습니다.")}
                {matchingStatus === "blocked_by_peer" && renderTerminatedBlock("상대방이 대화를 종료했습니다.")}
                {matchingStatus === "peer_exited" && renderTerminatedBlock("상대방이 대화를 종료했습니다.")}
                {matchingStatus === "terminated" && renderTerminatedBlock("대화가 종료되었습니다.")}
                <div ref={msgEndRef} />
            </div>
        );
    };

    const renderTerminatedBlock = (message) => (
        <div className="terminated-info-box">
            <p>{message}</p>
            <div className="button-group">
                <button onClick={handleStartMatching}>새 매칭</button>
                <button onClick={() => navigate('/')}>돌아가기</button>
            </div>
        </div>
    );

    return (
        <div className="chat-background">
            <h3>1:1 채팅방</h3>
            <div className="chat-board">{renderChatBlock()}</div>
            
            <div className="input-box">
                <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && matchingStatus === "chatting" && handleSendMsg()}
                disabled={matchingStatus !== "chatting"}
                placeholder="메시지 입력..."
                className="input-bubble"
                autoFocus
                />
                <button onClick={handleSendMsg}>전송</button>
            </div>

            <div className="button-group">
                <button className="block-button" onClick={handleBlock}>차단</button>
                <button className="new-matching-button" onClick={() => {terminateSession();handleStartMatching()}}>새 매칭</button>
                <button className="quit-button" onClick={() => {terminateSession();navigate('/')}}>나가기</button>
            </div>
        </div>
    );
};

export default PrivateChat;