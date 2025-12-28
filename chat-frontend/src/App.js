import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { auth } from './firebase'; // 수정된 firebase.js에서 가져옴
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

import Main from './pages/Main'
import PrivateChat from './pages/PrivateChat'
import TeamLounge from './pages/TeamLounge'
import TeamChat from './pages/TeamChat'

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async(currUser) => {
            if(!currUser) {
                try{await signInAnonymously(auth);} 
                catch(e) {console.log("Auth Error: ", e)}
            } else {
                setUser(currUser);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    if(loading) {
        return (
            <div className='loading-block'>
                <p>보안 세션 연결 중...</p>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<Main user={user} />}/>
                <Route path='/private-chat' element={<PrivateChat user={user} />}/>
                <Route path='/team-lounge' element={<TeamLounge user={user} />}/>
                <Route path='/team-chat/:roomHash' element={<TeamChat user={user} />}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;