import { BrowserRouter as HashRouter, Routes, Route } from 'react-router-dom'

import Main from './pages/Main'
import PrivateChat from './pages/PrivateChat'
import TeamLounge from './pages/TeamLounge'
import TeamChat from './pages/TeamChat'

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path='/' element={<Main />}/>
                <Route path='/private-chat' element={<PrivateChat />}/>
                <Route path='/team-lounge' element={<TeamLounge />}/>
                <Route path='/team-chat/:roomHash' element={<TeamChat />}/>
            </Routes>
        </HashRouter>
    );
}

export default App;