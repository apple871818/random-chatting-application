import { db } from '../firebase'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const getUID = () => {
    let uid = localStorage.getItem("chat_uid");
    if(!uid) {
        uid = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("chat_uid", uid);
    }
    return uid;
}

const handleRegister = async(nickname) => {
    const uid = getUID();
    const expireTime = Date.now() + (24 * 60 * 60 * 1000);

    await setDoc(doc(db, "users", uid), {
        uid: uid,
        nickname: nickname,
        expiresAt: expireTime,
        createdAt: serverTimestamp()
    });
    alert("등록 완료! 24시간동안 유효합니다.")
}

const handleExtend = async() => {
    const uid = localStorage.getItem("chat_uid");
    const newExpireTime = Date.now() + (24 * 60 * 60 * 1000);

    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        expiresAt: newExpireTime
    });
    alert("24시간으로 연장되었습니다.");
}