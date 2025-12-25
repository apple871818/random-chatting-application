// pages/Main.js
import { useNavigate } from "react-router-dom";

function Main() {
    const navigate = useNavigate();

    return (
        <div style={{ padding: "20px", textAlign: "center" }}>
            <h1>메인 페이지</h1>
            <button onClick={() => navigate('/private-chat')}>1:1 랜덤채팅 시작</button>
            <br /><br />
            <button onClick={() => navigate('/team-lounge')}>팀 채팅 라운지 가기</button>
        </div>
    );
}

export default Main;