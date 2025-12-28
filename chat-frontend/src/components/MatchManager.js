// src/components/MatchManager.js
import { db } from '../firebase';
import { collection, getDocs, query, limit, doc, setDoc, runTransaction, serverTimestamp } from "firebase/firestore";

/**
 * deterministically generate room ID 
 */
const generateRoomID = (uid1, uid2)  => {
    const sortedUIDs = [uid1, uid2].sort().join('');
    return btoa(sortedUIDs).substring(2, 15);
}

const startMatchingLogic = async (myUID, blockedUsers = []) => {
    if (!myUID) throw new Error("myUID is required");

    try {
        // generate queue query
        const q = query(collection(db, "matchQueue"), limit(10));
        const querySnapshot = await getDocs(q);
        const candidates = querySnapshot.docs.map(d => d.id);

        const roomHash = await runTransaction(db, async(transaction) => {
            let targetPeer = null;

            // Search candidates
            for(const peerID of candidates) {
                if(peerID === myUID) continue;

                const peerRef = doc(db, "matchQueue", peerID);
                const peerDoc = await transaction.get(peerRef);

                if(peerDoc.exists()) {
                    const peerData = peerDoc.data();

                    if(!blockedUsers.includes(peerID) && 
                        !peerData?.blockedUsers.includes(myUID) &&
                        !peerData.matched) {
                        targetPeer = {id: peerID, ref: peerRef};
                        break;
                    }
                }
            }

            // matching with peer
            if(targetPeer) {
                console.log(targetPeer)
                const newRoomHash = generateRoomID(myUID, targetPeer.id);
                const roomRef = doc(db, "privateRooms", newRoomHash);

                const roomSnap = await transaction.get(roomRef);

                if(!roomSnap.exists() || roomSnap.data().status !== "active") {
                    transaction.set(roomRef, {
                        participants: [myUID, targetPeer.id],
                        createdAt: serverTimestamp(),
                        status: "active"
                    }, {merge: true});
                }

                return newRoomHash;
            }

            return null;
        });

        // matching failure -> matchQueue
        if(!roomHash) {
            const myQueueRef = doc(db, "matchQueue", myUID);

            await setDoc(myQueueRef, {
                createdAt: serverTimestamp(),
                blockedUsers: blockedUsers,
                matched: false
            });

            return null;
        }
    }
    catch (e) {
        console.error("매칭 중 에러 발생: ", e);
        return null;
    }
};

export default startMatchingLogic;