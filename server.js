const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// 🌟 [수정] CORS 설정을 명확히 하여 프론트엔드 차단을 방지합니다.
app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. 설정 (보안을 위해 환경 변수 권장하지만, 일단 직접 입력 유지)
// ==========================================
const apiKey = "AIzaSyBnq3YMSylce45oA1YAT7Xua8hIsAxA6Dw"; 
const dbURI = "mongodb+srv://hwroh:fk10151015@cluster0.fm49kop.mongodb.net/test?retryWrites=true&w=majority";

// MongoDB 연결 옵션
const connectionOptions = {
    serverSelectionTimeoutMS: 15000, // 대기 시간을 15초로 소폭 늘림
    socketTimeoutMS: 45000,
    family: 4 
};

// MongoDB 연결 실행
mongoose.connect(dbURI, connectionOptions)
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch(err => {
      console.error('❌ MongoDB 연결 실패 상세 이유:', err.message);
  });

// 데이터 모델 정의 (컬렉션 이름을 'profiles'로 강제 지정)
const Profile = mongoose.model('Profile', new mongoose.Schema({
    name: String, 
    age: String, 
    role: String, 
    mbti: String, 
    personality: String, 
    exp: String, 
    awards: String, 
    createdAt: { type: Date, default: Date.now }
}), 'profiles');

// 서버 상태 체크용 메인 페이지
app.get('/', (req, res) => res.send('🚀 AI 매칭 서버가 정상 작동 중입니다!'));

// [API 1] 프로필 저장
app.post('/api/profiles', async (req, res) => {
    try {
        console.log("📥 데이터 수신:", req.body);
        const newProfile = new Profile(req.body);
        await newProfile.save();
        res.status(201).send({ message: "성공적으로 저장되었습니다." });
    } catch (err) { 
        console.error("❌ 저장 에러:", err.message);
        res.status(500).send({ message: "데이터 저장 실패: " + err.message }); 
    }
});

// [API 2] 제미나이 AI 기반 팀 매칭
app.get('/api/match', async (req, res) => {
    try {
        // 1. DB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.error("❌ DB 연결이 끊겨있음");
            return res.status(500).json({ message: "DB 연결 대기 중입니다. 잠시 후 다시 시도하세요." });
        }

        console.log("🔍 [1/3] DB 데이터 조회 중...");
        const allProfiles = await Profile.find();
        
        if (allProfiles.length < 2) {
            return res.status(400).json({ message: `데이터가 부족합니다. (현재 ${allProfiles.length}개/최소 2개 필요)` });
        }

        const participantInfo = allProfiles.map((p, i) => 
            `${i+1}. 이름: ${p.name}, 역할: ${p.role}, MBTI: ${p.mbti}, 강점: ${p.personality}, 경력: ${p.exp}`
        ).join('\n');

        const prompt = `너는 IT 프로젝트 팀 빌딩 전문가야. 아래 참가자 정보를 바탕으로 최적의 팀 구성을 제안하고 이유를 설명해줘.\n\n${participantInfo}`;

        console.log("🤖 [2/3] Gemini API 호출 중...");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        // 🌟 [수정] AI 응답 에러 핸들링 강화
        if (!response.ok) {
            console.error("❌ Gemini API 에러 응답:", data);
            return res.status(response.status).json({ 
                message: "AI 서버 응답 오류", 
                detail: data.error ? data.error.message : "알 수 없는 오류"
            });
        }

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const aiText = data.candidates[0].content.parts[0].text;
            console.log("✅ [3/3] AI 분석 완료!");
            res.json({ aiAnalysis: aiText });
        } else {
            console.error("❌ 예상치 못한 API 응답 구조:", data);
            res.status(500).json({ message: "AI 분석 결과가 비어있습니다.", detail: data });
        }

    } catch (err) {
        console.error("❌ 서버 내부 에러:", err.message);
        res.status(500).json({ message: "서버 내부 에러: " + err.message });
    }
});

// 포트 설정 (Render 포트 10000 대응)
const PORT = process.env.PORT || 3000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 서버 가동 중 (Port: ${PORT})`);
});