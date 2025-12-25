import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, where, getDocs } from "firebase/firestore";

import './TeamLounge.css'

function TeamLounge() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q,  (snapshot) => {
            const rooms = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            setRooms(rooms);
        });

        return () => unsubscribe();
    }, []);

    const handleCreateRoom = async() => {
        const roomName = prompt("방 이름을 입력하세요: ");
        const nickname = prompt("닉네임을 입력하세요: ");

        if(!roomName||roomName.trim === "") return;
        if(!nickname||nickname.trim === "") return;

        const roomHash = Math.random().toString(36).substring(2, 11);

        await addDoc(collection(db, "rooms"), {
            roomName: roomName,
            roomHash: roomHash,
            createdAt: serverTimestamp()
        });

        navigate(`/team-chat/${roomHash}?nickname=${nickname}`);
    };

    const enterRoom = async(roomHash) => {
        const nickname = prompt("닉네임을 입력하세요: ");
        if(!nickname || nickname.trim() === "") return;
        navigate(`/team-chat/${roomHash}?nickname=${nickname}`);
    }

    const roomList = rooms.map(room => (
            <div className="room-bubble"
            key={room.id} 
            onClick={() => enterRoom(room.roomHash)}>
                <h3>{room.roomName}</h3>
                <p>현재 {room.users}명 참여 중</p>
            </div>
        ));

    return (
        <div className="lounge-background">
            <h1>랜덤채팅 라운지</h1>
            <div className="room-list">
                {roomList}
            </div>
            <button className="create-room-button" onClick={handleCreateRoom}>+ 새로운 방 만들기</button>
        </div>
    );
}

export default TeamLounge;